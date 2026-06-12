// scripts/config.js

// ---------------------------------------------------------
// ARCHIVO DE CONFIGURACIÓN DE LA EXTENSIÓN (Equivalente a .env)
// ---------------------------------------------------------

const CONFIG = {
    // Versión actual de la extensión
    VERSION: "1.0.0",

    // URL de tu Webhook a donde se enviarán las incapacidades cada 5 minutos
    // Reemplázala con la URL real de tu sistema
    WEBHOOK_URL: "https://webhook.site/9c5615fc-5070-4d89-9149-ce0c2be8202a", 
    
    // Intervalo de sincronización en milisegundos (5 minutos)
    SYNC_INTERVAL_MS: 5 * 60 * 1000 
};
