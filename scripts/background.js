/**
 * ISSS Dashboard Incapacidades
 * background.js - Lógica para manejar la apertura del Side Panel o Popup
 */

const ISSS_ORIGIN = 'https://portal.isss.gob.sv';

// Listener para el clic en el icono de la extensión
chrome.action.onClicked.addListener(async (tab) => {
    if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
        try {
            await chrome.sidePanel.open({ windowId: tab.windowId });
            console.log("Side Panel abierto correctamente.");
        } catch (error) {
            console.error("Error al intentar abrir Side Panel:", error);
            openFallbackPopup();
        }
    } else {
        console.log("Side Panel no soportado. Usando fallback a ventana popup.");
        openFallbackPopup();
    }
});

/**
 * Abre una ventana emergente (popup) como alternativa al panel lateral
 */
function openFallbackPopup() {
    chrome.windows.create({
        url: 'views/popup.html',
        type: 'popup',
        width: 600,
        height: 700,
        focused: true
    });
}

// Configuración inicial al instalar o actualizar la extensión
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extensión ISSS Dashboard instalada/actualizada.");

    // Habilitar el panel lateral
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
            .catch((err) => console.warn("No se pudo configurar openPanelOnActionClick:", err));
    }
    
    // Habilitar la extensión solo en la URL especificada (opcional pero buena práctica)
    chrome.sidePanel.setOptions({
      path: 'views/sidepanel.html',
      enabled: true
    });
});

// Listener para enviar Webhooks saltando restricciones de CORS de la página
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "sendWebhook") {
        fetch(request.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request.payload)
        })
        .then(async res => {
            let body = "";
            try { body = await res.text(); } catch(e) {}
            sendResponse({ ok: res.ok, status: res.status, responseText: body });
        })
        .catch(err => {
            sendResponse({ ok: false, status: 0, responseText: err.message });
        });
        return true; // Indica que la respuesta será asíncrona
    }
});