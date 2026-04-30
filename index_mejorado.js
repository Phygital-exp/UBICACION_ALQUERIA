const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();

const PORT = process.env.PORT || 3000;

// ========== CONFIGURACIÓN DE AUTENTICACIÓN ==========
const AUTH_HEADERS = {
    "Authorization": "Token 9b7661d9292aab2c339b95bf251063791c2a62ff",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
};

const ALQUERIA_USUARIOS_URL = "https://botai.smartdataautomation.com/api_backend_ai/dinamic-db/report/119/usuarios_alqueria";
const ALQUERIA_DATA_URL = "https://botai.smartdataautomation.com/api_backend_ai/dinamic-db/report/119/alqueria_geo_usuarios";

app.use(cors());
app.use(express.json());

// ========== ENDPOINT PARA VALIDAR USUARIO ==========
app.get("/api/validar", async (req, res) => {
    try {
        const cedula = req.query.cedula;

        if (!cedula) {
            return res.status(400).json({ 
                existe: false, 
                mensaje: "Cédula no proporcionada" 
            });
        }

        console.log(`\n🔍 VALIDACIÓN INICIADA - Cédula: ${cedula}`);
        console.log(`📤 Headers enviados:`, JSON.stringify(AUTH_HEADERS, null, 2));
        console.log(`🌐 URL destino: ${ALQUERIA_USUARIOS_URL}`);

        // Hacer la solicitud
        const response = await fetch(ALQUERIA_USUARIOS_URL, { 
            headers: AUTH_HEADERS,
            method: 'GET'
        });

        console.log(`📥 Status recibido: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorData = await response.text();
            console.error(`❌ Error ${response.status} en ALQUERIA_USUARIOS`);
            console.error(`📋 Response:`, errorData);
            
            return res.status(response.status).json({
                existe: false,
                error: `Error ${response.status} al consultar API`,
                detalles: errorData.substring(0, 200)
            });
        }

        const data = await response.json();
        console.log(`✅ Datos recibidos:`, typeof data);

        let usuarioEncontrado = null;

        if (data.result && Array.isArray(data.result)) {
            console.log(`📊 Total de usuarios en BD: ${data.result.length}`);
            usuarioEncontrado = data.result.find(usuario => 
                usuario.CEDULA && usuario.CEDULA.toString() === cedula.toString()
            );
        }

        if (usuarioEncontrado) {
            console.log(`✅ Usuario encontrado:`, usuarioEncontrado);
            res.json({
                existe: true,
                usuario: usuarioEncontrado
            });
        } else {
            console.log(`❌ Usuario NO encontrado: ${cedula}`);
            res.json({
                existe: false,
                mensaje: "Usuario no encontrado",
                cedula_buscada: cedula
            });
        }
    } catch (err) {
        console.error(`\n❌ ERROR EN VALIDACIÓN:`, err.message);
        console.error(`Stack:`, err.stack);
        res.status(500).json({ 
            existe: false,
            error: "Error al validar usuario",
            detalles: err.message
        });
    }
});

// ========== ENDPOINT PARA ENVIAR UBICACIÓN ==========
app.post("/api/enviar-ubicacion", async (req, res) => {
    try {
        const { CEDULA, LATITUD, LONGITUD } = req.body;

        console.log(`\n📍 ENVÍO DE UBICACIÓN INICIADO`);
        console.log(`📥 Datos recibidos:`, { CEDULA, LATITUD, LONGITUD });

        if (!CEDULA || LATITUD === undefined || LONGITUD === undefined) {
            return res.status(400).json({ 
                success: false,
                mensaje: "Cédula, latitud o longitud no proporcionada"
            });
        }

        const cedulaString = CEDULA.toString().trim();

        const payload = {
            CEDULA: cedulaString,
            LATITUD: parseFloat(LATITUD),
            LONGITUD: parseFloat(LONGITUD)
        };

        console.log(`📤 Enviando a Alqueria:`, JSON.stringify(payload, null, 2));
        console.log(`📋 Headers:`, JSON.stringify(AUTH_HEADERS, null, 2));

        const response = await fetch(ALQUERIA_DATA_URL, {
            method: 'POST',
            headers: AUTH_HEADERS,
            body: JSON.stringify(payload)
        });

        console.log(`📥 Response status: ${response.status}`);

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Ubicación enviada correctamente para: ${cedulaString}`);
            console.log(`📊 Respuesta:`, JSON.stringify(data, null, 2));
            
            res.json({
                success: true,
                mensaje: "Ubicación enviada correctamente",
                data: data
            });
        } else {
            const errorData = await response.text();
            console.error(`❌ Error ${response.status} al enviar ubicación`);
            console.error(`📋 Response:`, errorData);
            
            res.status(response.status).json({
                success: false,
                error: `Error ${response.status} al enviar ubicación`,
                detalles: errorData.substring(0, 200)
            });
        }
    } catch (err) {
        console.error(`\n❌ ERROR AL ENVIAR UBICACIÓN:`, err.message);
        console.error(`Stack:`, err.stack);
        res.status(500).json({ 
            success: false,
            error: "Error al enviar ubicación",
            detalles: err.message
        });
    }
});

// ========== ENDPOINT DE DEBUG ==========
app.post("/api/debug", (req, res) => {
    console.log("\n=== DEBUG REQUEST ===");
    console.log("Headers recibidos:", JSON.stringify(req.headers, null, 2));
    console.log("Body recibido:", JSON.stringify(req.body, null, 2));
    res.json({ 
        received: req.body,
        headers: req.headers,
        message: "Debug - Datos recibidos correctamente"
    });
});

app.get("/api/debug", (req, res) => {
    console.log("\n=== DEBUG GET ===");
    console.log("Query:", req.query);
    console.log("AUTH_HEADERS en servidor:", JSON.stringify(AUTH_HEADERS, null, 2));
    res.json({ 
        query: req.query,
        auth_headers: AUTH_HEADERS,
        urls: {
            usuarios: ALQUERIA_USUARIOS_URL,
            datos: ALQUERIA_DATA_URL
        }
    });
});

// ========== HEALTH CHECK ==========
app.get("/health", (req, res) => {
    res.json({ 
        status: "OK", 
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor proxy escuchando en puerto ${PORT}`);
    console.log(`📍 Endpoints disponibles:`);
    console.log(`   - GET  /api/validar?cedula=XXXXX`);
    console.log(`   - POST /api/enviar-ubicacion`);
    console.log(`   - GET  /api/debug`);
    console.log(`   - POST /api/debug`);
    console.log(`   - GET  /health`);
    console.log(`\n📋 URLs configuradas:`);
    console.log(`   Usuarios: ${ALQUERIA_USUARIOS_URL}`);
    console.log(`   Datos: ${ALQUERIA_DATA_URL}`);
    console.log(`\n🔑 Token: ${AUTH_HEADERS.Authorization.substring(0, 20)}...`);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
});
