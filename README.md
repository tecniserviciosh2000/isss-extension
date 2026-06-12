# 📊 Walmart LATAM - Casos Dashboard (Tririga)

![Version](https://img.shields.io/badge/version-1.1-blue.svg)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

Una extensión moderna y eficiente para Google Chrome que permite visualizar, analizar y exportar el conteo de casos por estado directamente desde el sistema IBM Tririga de Walmart LATAM.

---

## ✨ Características Principales

*   **⚡ Conexión en Tiempo Real:** Verifica automáticamente la sesión activa en Tririga y obtiene tu perfil de usuario.
*   **🛡️ Arquitectura Resiliente:** Incorpora un sistema de reintentos automáticos (*Retry Pattern*) para evitar que los fallos temporales de la red o del servidor afecten el reporte.
*   **🎨 Diseño Premium (Glassmorfismo):** Interfaz limpia, moderna y amplia, diseñada específicamente para entornos de escritorio (PC), garantizando que el texto de los estados largos no sufra quiebres visuales.
*   **📊 Resumen Consolidado:** Agrupa inteligentemente los 16 estados en tres grandes categorías operativas: **Presupuestos, Facturación y Walmart**.
*   **📸 Exportación Rápida:** Funcionalidad integrada (`html2canvas`) para copiar la tabla de resultados al portapapeles o descargarla como imagen PNG con un solo clic.

---

## 🛠️ Instalación (Modo Desarrollador)

Para instalar esta extensión en tu navegador Chrome (o navegadores basados en Chromium como Edge o Brave):

1. Clona este repositorio o descarga el código fuente como `.zip`.
2. Extrae los archivos en una carpeta local de tu PC.
3. Abre tu navegador y ve a la página de extensiones: `chrome://extensions/`.
4. Activa el **"Modo desarrollador"** (interruptor en la esquina superior derecha).
5. Haz clic en el botón **"Cargar descomprimida"** (Load unpacked) y selecciona la carpeta donde extrajiste el código.
6. ¡Listo! Verás el icono de la extensión en tu barra de herramientas. (Te recomendamos "Fijarla" para un acceso rápido).

---

## 💻 Uso

1. **Inicio de Sesión:** Asegúrate de tener una pestaña abierta con una sesión activa en [Tririga (Retail Link)](https://retaillink.login.wal-mart.com).
2. **Abre la Extensión:** Al hacer clic en el icono, la herramienta validará automáticamente tu sesión y mostrará tus datos de cuenta.
3. **Inicia el Dashboard:** Haz clic en *🚀 Iniciar Dashboard*. La extensión consultará de forma asíncrona los conteos para los diferentes estados con una agradable animación de progreso.
4. **Exportación:** Una vez cargados los datos, usa los botones inferiores para copiar la imagen o guardarla y compartir tu estatus diario.

---

## 📁 Estructura del Proyecto

```text
walmart-casos-extension/
├── manifest.json       # Configuración principal (Manifest V3)
├── README.md           # Documentación del proyecto
├── assets/
│   └── icons/          # Iconos de la extensión (16, 64, 128)
├── lib/
│   └── html2canvas.min.js  # Librería para exportar el dashboard a imagen
├── scripts/
│   ├── background.js   # Service worker para manejar la creación de ventanas
│   └── popup.js        # Lógica principal, peticiones fetch y manejo del DOM
└── views/
    ├── popup.html      # Interfaz visual de la ventana emergente (Glassmorfismo UI)
    └── sidepanel.html  # UI adaptada para el soporte nativo del Side Panel
```

---

## 👨‍💻 Autor

Desarrollado y mantenido por **Ing. Isidro Marroquín**
*TECNISERVICIOS H DOS MIL S.A DE C.V*
