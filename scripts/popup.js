/**
 * ISSS Dashboard Incapacidades
 * popup.js - Lógica principal
 */

const DASHBOARD_URL = "https://portal.isss.gob.sv/patrono/comun/dashboard.xhtml";

// Estado global
let sessionData = null;
let allRecords = [];
let summaryData = {};

/**
 * Función que se inyectará y ejecutará en la página web para extraer todas las incapacidades
 * usando la sesión activa, cookies y headers del propio navegador.
 */
async function extractAllDataInPage() {
  const ROWS_PER_PAGE = 6; // Usamos 6 igual que la paginación original para evitar bloqueos del servidor
  const baseUrl = "https://portal.isss.gob.sv/patrono/comun/dashboard.xhtml";
  
  // Buscar ViewState actual
  let currentViewState = null;
  const viewStateEl = document.querySelector('input[name="javax.faces.ViewState"]');
  if (viewStateEl) {
    currentViewState = viewStateEl.value;
  } else {
    throw new Error("No se pudo encontrar el ViewState de la sesión.");
  }

  let allExtractedRecords = [];
  let hasMore = true;
  let firstRecord = 0;
  
  // Función auxiliar para extraer de una respuesta XML
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

    // PrimeFaces pagination returns only the <tr> elements, so we must wrap them in a table
    // otherwise the DOMParser might strip the invalid standalone <tr> tags.
    const wrappedHTML = `<table><tbody>${tableHTML}</tbody></table>`;
    const htmlDoc = parser.parseFromString(wrappedHTML, "text/html");
    const tbody = htmlDoc.querySelector("tbody");
    
    if (!tbody) return { records: [], hasMore: false, viewState: newViewState };

    if (tbody.querySelector(".ui-datatable-empty-message")) {
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

    // Ya no dependemos de ROWS_PER_PAGE para saber si hay más, lo controlaremos en el loop principal
    return { 
      records, 
      viewState: newViewState
    };
  }

  // Bucle para extraer páginas
  while (hasMore) {
    const form = document.getElementById("formicap") || document.querySelector("form");
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

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const xmlText = await response.text();
    const parsedData = parseTableHTML(xmlText);
    
    if (parsedData.records && parsedData.records.length > 0) {
      const prevLength = allExtractedRecords.length;
      
      // Añadir evitando duplicados
      for (const rec of parsedData.records) {
          if (!allExtractedRecords.some(r => r.numeroIncapacidad === rec.numeroIncapacidad)) {
              allExtractedRecords.push(rec);
          }
      }
      
      if (allExtractedRecords.length === prevLength) {
          hasMore = false; // El servidor devolvió registros repetidos, terminamos
      } else {
          firstRecord += parsedData.records.length;
      }
    } else {
      hasMore = false; // El servidor devolvió una página vacía
    }

    if (parsedData.viewState) {
      currentViewState = parsedData.viewState;
    }
    
    // Pausa para evitar rate limits
    await new Promise(r => setTimeout(r, 600));
  }

  return allExtractedRecords;
}

/**
 * Inyecta un script para obtener la información básica de sesión
 */
async function getSessionFromPage() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return resolve(null);
      const activeTab = tabs[0];
      if (!activeTab.url || !activeTab.url.includes("portal.isss.gob.sv")) return resolve(null);

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const nameEl = document.querySelector('.panelHeader p:first-child');
          const viewStateEl = document.querySelector('input[name="javax.faces.ViewState"]');
          return {
            name: nameEl ? nameEl.innerText.trim() : null,
            viewState: viewStateEl ? viewStateEl.value : null,
            tabId: null // Se llenará afuera
          };
        }
      }, (results) => {
        if (chrome.runtime.lastError || !results || !results[0].result) {
          resolve(null);
        } else {
          const data = results[0].result;
          data.tabId = activeTab.id; // Guardar el ID de la pestaña para después
          resolve(data);
        }
      });
    });
  });
}

/**
 * Muestra el estado de la sesión en la UI
 */
function displaySessionStatus(data) {
  const statusDiv = document.getElementById("sessionStatus");
  const startBtn = document.getElementById("startBtn");

  if (data && data.name && data.viewState) {
    const initial = data.name.charAt(0).toUpperCase();
    statusDiv.innerHTML = `
      <div class="user-card fade-in">
        <div class="user-avatar">${initial}</div>
        <div class="user-details">
          <h4>${data.name}</h4>
          <div class="user-badges">
            <span class="badge" title="Rol">EMPLEADOR</span>
          </div>
        </div>
      </div>
      <div class="session-alert success fade-in" style="margin-top: 15px;">
        ✅ Conexión establecida con ISSS
      </div>
    `;
    startBtn.style.display = "block";
    startBtn.disabled = false;
  } else {
    statusDiv.innerHTML = `
      <div class="session-alert error fade-in">
        ⚠️ Sesión no detectada<br>
        <small style="display:block; margin-top:8px;">Debes estar logueado en el <a href="${DASHBOARD_URL}" target="_blank" style="color:var(--danger); font-weight:600;">Dashboard del ISSS</a> para continuar.</small>
      </div>
    `;
    startBtn.style.display = "none";
    startBtn.disabled = true;
  }
}

/**
 * Muestra un indicador de carga
 */
function showLoading(message = "Cargando...") {
  const statusDiv = document.getElementById("sessionStatus");
  statusDiv.innerHTML = `
    <div class="loading-container fade-in">
      <div class="bouncing-dots">
        <div></div><div></div><div></div>
      </div>
      <p class="loading-text" id="progressText">${message}</p>
    </div>
  `;
}

/**
 * Carga todos los casos y muestra los resultados ejecutando el script en la página
 */
async function loadAll() {
  allRecords = [];
  summaryData = {};
  
  const table = document.getElementById("results");
  const summaryDiv = document.getElementById("summary");
  table.innerHTML = "";
  summaryDiv.innerHTML = "";

  showView('welcome');
  showLoading("Extrayendo registros... Por favor espera.");

  try {
    // Inyectar y ejecutar la extracción directamente en el contexto de la página
    chrome.scripting.executeScript({
      target: { tabId: sessionData.tabId },
      func: extractAllDataInPage
    }, (results) => {
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }
      
      const records = results[0].result;
      
      if (!records) {
        throw new Error("No se obtuvieron registros o hubo un error en la extracción.");
      }

      allRecords = records;
      
      // Procesar datos y mostrar resultados
      processResults();
      showView('results');
    });

  } catch (error) {
    console.error("Error durante la extracción:", error);
    const statusDiv = document.getElementById("sessionStatus");
    statusDiv.innerHTML = `
      <div class="session-alert error fade-in">
        ⚠️ Ocurrió un error al extraer los datos.<br>
        <small>${error.message}</small>
      </div>
      <button class="btn fade-in" id="retryBtn">🔄 Reintentar</button>
    `;
    document.getElementById("retryBtn").addEventListener("click", loadAll);
  }
}

/**
 * Procesa los resultados y los muestra en la tabla
 */
function processResults() {
  // Agrupar por estado
  const summaryData = {};
  allRecords.forEach(record => {
    const estado = record.estado || "Desconocido";
    if (!summaryData[estado]) {
      summaryData[estado] = 0;
    }
    summaryData[estado]++;
  });

  const table = document.getElementById("results");
  table.innerHTML = "";

  // Crear filas de la tabla de resumen
  let total = 0;
  for (const [estado, count] of Object.entries(summaryData)) {
    total += count;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="label" style="font-size: 13px;">${estado}</td>
      <td class="count" style="font-size: 14px;">${count}</td>
    `;
    table.appendChild(tr);
  }

  // Si no hay datos
  if (total === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="2" style="text-align: center; color: #64748b; padding: 15px;">
        No se encontraron incapacidades registradas.
      </td>
    `;
    table.appendChild(tr);
  }

  const summaryDiv = document.getElementById("summary");
  summaryDiv.innerHTML = `
    <div class="summary-box">
      <table class="summary-table" style="width: 100%;">
        <tr><td>Total de Incapacidades:</td><td class="count" style="font-size: 16px;">${total}</td></tr>
      </table>
    </div>
  `;
}

/**
 * Exporta los datos a Excel (.xlsx) usando SheetJS
 */
function exportToExcel() {
  if (allRecords.length === 0) {
    alert("No hay datos para exportar.");
    return;
  }

  const exportBtn = document.getElementById('exportExcel');
  exportBtn.disabled = true;
  exportBtn.textContent = '⏳ Generando Excel...';

  try {
    // Si la librería xlsx no está definida, intentar cargarla
    if (typeof XLSX === 'undefined') {
      console.error("La librería XLSX no está cargada.");
      alert("Error: Librería de exportación no encontrada.");
      return;
    }

    // Preparar datos para Excel (mapeando a los nombres de las columnas que queremos)
    const dataForExcel = allRecords.map(record => ({
      "# De incapacidad": record.numeroIncapacidad,
      "Nombre": record.nombre,
      "Dui": record.dui,
      "Fecha de inicio": record.fechaInicio,
      "Fecha fin": record.fechaFin,
      "Días de incapacidad": record.dias,
      "Centro de atención ISSS": record.centroAtencion,
      "Estado": record.estado
    }));

    // Crear un nuevo libro de trabajo y una hoja
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dataForExcel);

    // Ajustar el ancho de las columnas
    const colWidths = [
      { wch: 15 }, // # De incapacidad
      { wch: 40 }, // Nombre
      { wch: 15 }, // Dui
      { wch: 15 }, // Fecha de inicio
      { wch: 15 }, // Fecha fin
      { wch: 20 }, // Días de incapacidad
      { wch: 30 }, // Centro de atención ISSS
      { wch: 20 }  // Estado
    ];
    ws['!cols'] = colWidths;

    // Añadir la hoja al libro de trabajo
    XLSX.utils.book_append_sheet(wb, ws, "Incapacidades");

    // Generar el archivo y descargar
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Incapacidades_ISSS_${dateStr}.xlsx`);

    // Feedback visual
    exportBtn.textContent = '✅ ¡Exportado!';
    exportBtn.style.background = '#059669';

    setTimeout(() => {
      exportBtn.textContent = '📥 Exportar a Excel';
      exportBtn.style.background = '#107c41';
      exportBtn.disabled = false;
    }, 2000);

  } catch (error) {
    console.error("Error al exportar:", error);
    exportBtn.textContent = '❌ Error al exportar';
    exportBtn.style.background = '#dc2626';
    
    setTimeout(() => {
      exportBtn.textContent = '📥 Exportar a Excel';
      exportBtn.style.background = '#107c41';
      exportBtn.disabled = false;
    }, 2000);
  }
}

/**
 * Cambia entre vistas
 */
function showView(viewName) {
  document.getElementById('welcomeView').style.display = viewName === 'welcome' ? 'block' : 'none';
  document.getElementById('resultsView').style.display = viewName === 'results' ? 'block' : 'none';
}

/**
 * Inicia el dashboard
 */
async function startDashboard() {
  await loadAll();
}

/**
 * Flujo principal de inicialización
 */
async function initializeApp() {
  showView('welcome');
  showLoading("Verificando sesión en ISSS...");
  
  sessionData = await getSessionFromPage();
  displaySessionStatus(sessionData);
}

/**
 * Vuelve a la vista de inicio
 */
async function backToWelcome() {
  await initializeApp();
}

// Inicialización
document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp();

  // Configurar event listeners
  document.getElementById("startBtn").addEventListener("click", startDashboard);
  document.getElementById("exportExcel").addEventListener("click", exportToExcel);
  document.getElementById("backBtn").addEventListener("click", backToWelcome);

  const syncBtn = document.getElementById("syncBtn");
  if (syncBtn) {
    syncBtn.addEventListener("click", () => {
      syncBtn.disabled = true;
      syncBtn.textContent = "⏳ Sincronizando...";
      
      chrome.tabs.sendMessage(sessionData.tabId, { action: "manualSync" }, (response) => {
        if (chrome.runtime.lastError) {
           syncBtn.textContent = "❌ Error (Recarga la pág)";
           setTimeout(()=> { syncBtn.textContent = "🔄 Sincronizar (Manual)"; syncBtn.disabled=false; }, 2000);
        } else {
           syncBtn.textContent = "✅ Enviado";
           syncBtn.style.background = '#059669';
           setTimeout(()=> {
               syncBtn.textContent = "🔄 Sincronizar (Manual)"; 
               syncBtn.style.background = 'var(--primary-dark)';
               syncBtn.disabled=false;
           }, 2000);
        }
      });
    });
  }

  const logsBtn = document.getElementById("logsBtn");
  if (logsBtn) {
    logsBtn.addEventListener("click", () => {
      chrome.storage.local.get(['syncLogs'], (result) => {
          const logs = result.syncLogs || [];
          if (logs.length === 0) {
              alert("No hay logs de sincronización registrados aún.");
              return;
          }
          const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ISSS_Sync_Logs_${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
      });
    });
  }
});