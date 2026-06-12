# 🏥 ISSS - Portal Patronos Dashboard

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

Una extensión moderna y eficiente para Google Chrome que permite extraer, exportar y sincronizar automáticamente todas las incapacidades de tus empleados directamente desde el **Portal de Patronos del ISSS** en El Salvador.

---

## ✨ Características Principales

*   **⚡ Extracción Instantánea:** Consolida todas las páginas de incapacidades en una sola vista en menos de 3 segundos sin recargar la página.
*   **🛡️ Sistema Anti-Cierre de Sesión:** Mantiene activa tu sesión del ISSS en segundo plano para que nunca más se te cierre inesperadamente mientras trabajas.
*   **🔄 Sincronización Automática (Webhook):** Envía silenciosamente la lista actualizada de incapacidades a tu servidor/sistema interno cada 5 minutos mediante un webhook. Incluye botón de Sincronización Manual y Descarga de Logs.
*   **🎨 Diseño Premium (Glassmorfismo):** Interfaz limpia, moderna y amplia, fácil de entender y usar.
*   **📸 Exportación Rápida a Excel:** Genera un archivo nativo `.xlsx` con un solo clic.

---

## 🛠️ Instalación Automática

1. Descarga y ejecuta el archivo `Instalador.bat` (Requiere permisos de Administrador para configurar tareas).
2. El instalador descargará la extensión y configurará un actualizador automático.
3. Abre Chrome y ve a `chrome://extensions/`.
4. Activa el **"Modo desarrollador"**.
5. Haz clic en **"Cargar descomprimida"** y selecciona la carpeta `C:\ISSSExtension`.

## 🛠️ Instalación Manual

1. Clona este repositorio o descarga el código fuente como `.zip`.
2. Abre tu navegador y ve a la página de extensiones: `chrome://extensions/`.
3. Activa el **"Modo desarrollador"**.
4. Haz clic en el botón **"Cargar descomprimida"** y selecciona la carpeta del código.

---

## 💻 Uso

1. **Configura tu Webhook (Opcional):** Abre `scripts/config.js` y coloca la URL de tu API para que la extensión sincronice los datos automáticamente.
2. **Inicio de Sesión:** Asegúrate de tener una pestaña abierta con una sesión activa en el [Portal Patronos ISSS](https://portal.isss.gob.sv).
3. **Abre la Extensión:** Al hacer clic en el icono, la herramienta extraerá de forma asíncrona todos los registros del ISSS.
4. **Sincroniza o Exporta:** Una vez cargados los datos, usa los botones inferiores para Exportar a Excel o forzar un envío a tu sistema.

---

## 👨‍💻 Autor

Desarrollado por **Isidro Marroquín**
*TECNISERVICIOS H DOS MIL S.A DE C.V*
