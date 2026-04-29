const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();

const PORT = process.env.PORT || 3000;
const AUTH_HEADERS = {
    Authorization: "Token 9b7661d9292aab2c339b95bf251063791c2a62ff",
    "Content-Type": "application/json",
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

        console.log(`Validando cédula: ${cedula}`);

        const response = await fetch(ALQUERIA_USUARIOS_URL, { headers: AUTH_HEADERS });
        
        if (!response.ok) {
            throw new Error(`Error al consultar MCM_USUARIOS: ${response.status}`);
        }

        const data = await response.json();
        
        let usuarioEncontrado = null;
        
        if (data.result && Array.isArray(data.result)) {
            usuarioEncontrado = data.result.find(usuario => 
                usuario.CEDULA && usuario.CEDULA.toString() === cedula.toString()
            );
        }

        if (usuarioEncontrado) {
            console.log(`✅ Usuario encontrado: ${usuarioEncontrado.CEDULA}`);
            res.json({
                existe: true,
                usuario: usuarioEncontrado
            });
        } else {
            console.log(`❌ Usuario no encontrado: ${cedula}`);
            res.json({
                existe: false,
                mensaje: "Usuario no encontrado"
            });
        }
    } catch (err) {
        console.error("Error en la validación:", err);
        res.status(500).json({ 
            existe: false,
            error: "Error al validar usuario" 
        });
    }
});

// ========== ENDPOINT PARA ENVIAR UBICACIÓN ==========
app.post("/api/enviar-ubicacion", async (req, res) => {
    try {
        const { CEDULA, LATITUD, LONGITUD } = req.body;

        console.log(`📍 Datos recibidos:`, { CEDULA, LATITUD, LONGITUD });

        if (!CEDULA || LATITUD === undefined || LONGITUD === undefined) {
            return res.status(400).json({ 
                success: false,
                mensaje: "Cédula, latitud o longitud no proporcionada"
            });
        }

        const cedulaString = CEDULA.toString().trim();

        // ✅ CORREGIDO: Se envían LATITUD y LONGITUD por separado
        const payload = {
            CEDULA: cedulaString,
            LATITUD: parseFloat(LATITUD),
            LONGITUD: parseFloat(LONGITUD)
        };

        console.log(`📍 Enviando a Alqueria:`, JSON.stringify(payload, null, 2));

        const response = await fetch(ALQUERIA_DATA_URL, {
            method: 'POST',
            headers: AUTH_HEADERS,
            body: JSON.stringify(payload)
        });

        console.log(`📍 Response status:`, response.status);
        const data = await response.json();
        console.log(`📍 Response data:`, JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log(`✅ Ubicación enviada correctamente para: ${cedulaString}`);
            res.json({
                success: true,
                mensaje: "Ubicación enviada correctamente",
                data: data
            });
        } else {
            console.error(`❌ Error al enviar ubicación: ${response.status}`, data);
            res.status(response.status).json({
                success: false,
                error: "Error al enviar ubicación",
                details: data
            });
        }
    } catch (err) {
        console.error("Error al enviar ubicación:", err);
        res.status(500).json({ 
            success: false,
            error: "Error al enviar ubicación",
            details: err.message
        });
    }
});

// ========== ENDPOINT ANTIGUO (MANTENER PARA COMPATIBILIDAD) ==========
app.get("/api/Levapan/pdv", async (req, res) => {
    try {
        const tipo = req.query.tipo;
        let apiUrl;
        
        if (tipo === 'independiente') {
            apiUrl = "https://botai.smartdataautomation.com/api_backend_ai/dinamic-db/report/119/Levapan_PDVs_independientes";
        } else {
            apiUrl = "https://botai.smartdataautomation.com/api_backend_ai/dinamic-db/report/119/Levapan_PDVs";
        }
        
        console.log(`Consultando API: ${apiUrl}`);
        
        const response = await fetch(apiUrl, { headers: AUTH_HEADERS });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error("Error en el proxy alqueria PDV:", err);
        res.status(500).json({ error: "Error al obtener datos de alqueria PDV" });
    }
});

// ========== HEALTH CHECK ==========
app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// ========== DEBUG ==========
app.post("/api/debug", (req, res) => {
    console.log("=== DEBUG DATA ===");
    console.log("Headers:", req.headers);
    console.log("Body:", JSON.stringify(req.body, null, 2));
    res.json({ 
        received: req.body,
        message: "Datos recibidos en debug"
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor proxy escuchando en puerto ${PORT}`);
    console.log(`📍 Endpoints disponibles:`);
    console.log(`   - GET  /api/validar?cedula=XXXXX`);
    console.log(`   - POST /api/enviar-ubicacion`);
    console.log(`   - POST /api/debug`);
    console.log(`   - GET  /health`);
});