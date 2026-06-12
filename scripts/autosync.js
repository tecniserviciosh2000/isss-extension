// scripts/autosync.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "manualSync") {
        runAutoSync().then(() => sendResponse({status: "ok"}));
        return true;
    }
});
console.log("🔄 ISSS Extension: Motor de Auto-Sincronización iniciado.");

// Esperar a que config.js esté disponible
setTimeout(() => {
    if (typeof CONFIG === 'undefined') {
        console.error("Configuración no cargada, no se puede iniciar Auto-Sync.");
        return;
    }
    
    // Ejecutar una vez pasados 10 segundos para dar tiempo a que la página cargue bien
    setTimeout(runAutoSync, 10000); 
    // Iniciar el loop infinito
    setInterval(runAutoSync, CONFIG.SYNC_INTERVAL_MS);
}, 1000);

async function runAutoSync() {
    console.log("⏱️ ISSS Auto-Sync: Iniciando extracción y sincronización en segundo plano...");
    
    // 1. Obtener info patronal del DOM
    const nameCards = document.querySelectorAll('.datosPatronoCard');
    let patronoNombre = "DESCONOCIDO";
    let patronoNumero = "DESCONOCIDO";
    
    nameCards.forEach(card => {
        const title = card.querySelector('h4');
        const text = card.querySelector('p');
        if (title && text) {
            if (title.textContent.includes('Nombre del patrono')) {
                patronoNombre = text.textContent.trim();
            } else if (title.textContent.includes('Número patronal')) {
                patronoNumero = text.textContent.trim();
            }
        }
    });

    // 2. Extraer datos paginados (Reusando lógica de paginación Primefaces)
    const baseUrl = window.location.href;
    let currentViewState = null;
    const viewStateEl = document.querySelector('input[name="javax.faces.ViewState"]');
    if (viewStateEl) {
        currentViewState = viewStateEl.value;
    }
    
    if (!currentViewState) {
        console.warn("⚠️ ISSS Auto-Sync: No hay ViewState, asumiendo sesión expirada. Sincronización cancelada.");
        return;
    }

    let allExtractedRecords = [];
    let hasMore = true;
    let firstRecord = 0;
    const ROWS_PER_PAGE = 6;
    
    function parseTableHTML(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        const updates = xmlDoc.getElementsByTagName("update");
        let tableHTML = null;
        let newViewState = null;

        for (let i = 0; i < updates.length; i++) {
            const id = updates[i].getAttribute("id");
            if (id === "formicap:icapstabla") {
                tableHTML = updates[i].textContent;
            } else if (id && id.includes("javax.faces.ViewState")) {
                newViewState = updates[i].textContent;
            }
        }

        if (!tableHTML) return { records: [], hasMore: false, viewState: newViewState };

        const wrappedHTML = `<table><tbody>${tableHTML}</tbody></table>`;
        const htmlDoc = parser.parseFromString(wrappedHTML, "text/html");
        const tbody = htmlDoc.querySelector("tbody");
        
        if (!tbody || tbody.querySelector(".ui-datatable-empty-message")) {
            return { records: [], hasMore: false, viewState: newViewState };
        }

        const rows = tbody.querySelectorAll("tr");
        const records = [];

        rows.forEach(row => {
            const cells = row.querySelectorAll("td");
            if (cells.length >= 8) {
                records.push({
                    numeroIncapacidad: cells[0].textContent.trim(),
                    nombre: cells[1].textContent.trim(),
                    dui: cells[2].textContent.trim(),
                    fechaInicio: cells[3].textContent.trim(),
                    fechaFin: cells[4].textContent.trim(),
                    dias: cells[5].textContent.trim(),
                    centroAtencion: cells[6].textContent.trim(),
                    estado: cells[7].textContent.trim()
                });
            }
        });

        return { 
            records, 
            hasMore: records.length === ROWS_PER_PAGE,
            viewState: newViewState
        };
    }

    try {
        while (hasMore) {
            const form = document.getElementById("formicap") || document.querySelector("form");
            if(!form) break;
            
            const params = new URLSearchParams(new FormData(form));
            params.set("javax.faces.partial.ajax", "true");
            params.set("javax.faces.source", "formicap:icapstabla");
            params.set("javax.faces.partial.execute", "formicap:icapstabla");
            params.set("javax.faces.partial.render", "formicap:icapstabla");
            params.set("formicap:icapstabla", "formicap:icapstabla");
            params.set("formicap:icapstabla_pagination", "true");
            params.set("formicap:icapstabla_first", firstRecord.toString());
            params.set("formicap:icapstabla_rows", ROWS_PER_PAGE.toString());
            params.set("formicap:icapstabla_skipChildren", "true");
            params.set("formicap:icapstabla_encodeFeature", "true");
            params.set("javax.faces.ViewState", currentViewState);

            const response = await fetch(baseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Faces-Request": "partial/ajax",
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: params.toString()
            });

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const xmlText = await response.text();
            const parsedData = parseTableHTML(xmlText);
            
            if (parsedData.records.length > 0) {
                allExtractedRecords = allExtractedRecords.concat(parsedData.records);
            } else {
                hasMore = false;
            }
            
            if (!parsedData.hasMore) hasMore = false;
            if (parsedData.viewState) currentViewState = parsedData.viewState;
            
            firstRecord += ROWS_PER_PAGE;
            
            // Pausa sutil para no saturar
            await new Promise(r => setTimeout(r, 600));
        }
        
        // 3. Formatear y Enviar al Webhook
        if (allExtractedRecords.length === 0) {
            console.log("🤷‍♂️ ISSS Auto-Sync: Cero registros encontrados en tabla, no se enviará webhook.");
            return;
        }

        const payload = {
            timestamp: new Date().toISOString(),
            seguridad: {
                numero_patronal: patronoNumero,
                nombre_patrono: patronoNombre
            },
            total_registros: allExtractedRecords.length,
            incapacidades: allExtractedRecords.map(rec => {
                // Convertir DD/MM/YYYY a YYYY-MM-DD
                const partsInicio = rec.fechaInicio.split('/');
                const partsFin = rec.fechaFin.split('/');
                
                return {
                    id_incapacidad: rec.numeroIncapacidad.replace(/\s/g, ''),
                    dui: rec.dui.replace(/\s/g, ''),
                    nombre_empleado: rec.nombre,
                    fecha_inicio: partsInicio.length === 3 ? `${partsInicio[2]}-${partsInicio[1]}-${partsInicio[0]}` : rec.fechaInicio,
                    fecha_fin: partsFin.length === 3 ? `${partsFin[2]}-${partsFin[1]}-${partsFin[0]}` : rec.fechaFin,
                    dias_incapacidad: parseInt(rec.dias, 10) || 0,
                    centro_atencion: rec.centroAtencion,
                    estado: rec.estado
                };
            })
        };

        // Delegar el fetch al background script para saltar cualquier restricción CORS/CSP
        chrome.runtime.sendMessage({
            action: "sendWebhook",
            url: CONFIG.WEBHOOK_URL,
            payload: payload
        }, (webhookRes) => {
            if (chrome.runtime.lastError) {
                console.error("❌ ISSS Auto-Sync: Error interno de extensión", chrome.runtime.lastError);
                return;
            }

            const logEntry = {
                date: new Date().toISOString(),
                status: webhookRes.status,
                recordsSent: allExtractedRecords.length,
                response: webhookRes.responseText || "Sin respuesta del servidor"
            };
            
            chrome.storage.local.get(['syncLogs'], (result) => {
                const logs = result.syncLogs || [];
                logs.unshift(logEntry);
                if (logs.length > 50) logs.pop(); // Mantener solo los últimos 50
                chrome.storage.local.set({ syncLogs: logs });
            });

            if (webhookRes.ok) {
                console.log(`✅ ISSS Auto-Sync: Sincronización exitosa. ${allExtractedRecords.length} registros enviados.`);
            } else {
                console.error(`❌ ISSS Auto-Sync: Error enviando al Webhook HTTP ${webhookRes.status}`);
            }
        });
    } catch(e) {
        console.error("❌ Error grave en Auto-Sync:", e);
    }
}
