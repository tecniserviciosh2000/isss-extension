// scripts/config.js

// ---------------------------------------------------------
// ARCHIVO DE CONFIGURACIÓN DE LA EXTENSIÓN (Equivalente a .env)
// ---------------------------------------------------------

const CONFIG = {
    // Versión actual de la extensión
    VERSION: "1.0.0",

    // URL de tu Webhook a donde se enviarán las incapacidades cada 5 minutos
    // Reemplázala con la URL real de tu sistema
    WEBHOOK_URL: "https://app.tsh2000.cloud/api/webhooks/isss_capture.php", 
    
    // Intervalo de sincronización en milisegundos (5 minutos)
    SYNC_INTERVAL_MS: 5 * 60 * 1000 
};
