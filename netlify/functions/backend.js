// netlify/functions/validate-license.js
const crypto = require('crypto');

// Base de datos simple en memoria (para producción usar una DB real)
let licenseDB = {
    "ABCD1234EFGH5678": {
        valid: true,
        expiry_date: "2024-12-31",
        max_usage: 100,
        usage_count: 0,
        hardware_ids: [],
        created_at: "2024-01-01"
    },
    "TEST1234TEST5678": {
        valid: true,
        expiry_date: "2024-12-31",
        max_usage: 50,
        usage_count: 0,
        hardware_ids: [],
        created_at: "2024-01-01"
    }
};

// Función para generar licencias (solo para testing)
function generateLicense() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

exports.handler = async (event, context) => {
    // Configurar CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { license_key, hardware_id, action } = JSON.parse(event.body);

        if (!license_key || !hardware_id) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    valid: false,
                    message: 'Datos incompletos'
                })
            };
        }

        const license = licenseDB[license_key];

        if (!license) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    valid: false,
                    message: 'Licencia no encontrada'
                })
            };
        }

        // Verificar fecha de vencimiento
        const now = new Date();
        const expiry = new Date(license.expiry_date);

        if (now > expiry) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    valid: false,
                    message: 'Licencia vencida'
                })
            };
        }

        // Verificar uso máximo
        if (license.usage_count >= license.max_usage) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    valid: false,
                    message: 'Límite de uso excedido'
                })
            };
        }

        // Para validación simple
        if (action === 'validate') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    valid: true,
                    message: 'Licencia válida',
                    expiry_date: license.expiry_date,
                    usage_count: license.usage_count,
                    max_usage: license.max_usage
                })
            };
        }

        // Para activación
        if (action === 'activate') {
            // Verificar si ya está activada en este hardware
            if (license.hardware_ids.includes(hardware_id)) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        activated: true,
                        message: 'Licencia ya activada en este equipo',
                        expiry_date: license.expiry_date
                    })
                };
            }

            // Activar licencia
            license.hardware_ids.push(hardware_id);
            license.usage_count++;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    activated: true,
                    message: 'Licencia activada exitosamente',
                    expiry_date: license.expiry_date
                })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Acción no válida' })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                valid: false,
                message: 'Error interno del servidor'
            })
        };
    }
};

// netlify/functions/generate-license.js (para generar licencias de prueba)
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { admin_key, max_usage = 100 } = JSON.parse(event.body);

        // Verificar clave de administrador (cambiar por tu clave)
        if (admin_key !== 'ZEN_ADMIN_2024') {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ error: 'No autorizado' })
            };
        }

        const newLicense = generateLicense();

        // Agregar a la base de datos
        licenseDB[newLicense] = {
            valid: true,
            expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 año
            max_usage: max_usage,
            usage_count: 0,
            hardware_ids: [],
            created_at: new Date().toISOString().split('T')[0]
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                license_key: newLicense,
                expiry_date: licenseDB[newLicense].expiry_date,
                max_usage: max_usage
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Error interno del servidor' })
        };
    }
};