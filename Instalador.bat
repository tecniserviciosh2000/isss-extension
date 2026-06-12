@echo off
setlocal enabledelayedexpansion

:: ==========================================
:: Elevación de privilegios a Administrador
:: ==========================================
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Solicitando privilegios de administrador...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

:: ==========================================
:: Configuración del Instalador
:: ==========================================
set INSTALL_DIR=C:\WalmartCasosExtension
set REPO_URL=https://github.com/tecniserviciosh2000/walmart-casos-extension.git
set TASK_NAME=WalmartCasosExtensionUpdater
echo ===================================================
echo Instalador de Walmart Casos Extension
echo ===================================================

echo Descargando la ultima version de la extension desde GitHub...

set "PS_TEMP=%TEMP%\ext_install_script.ps1"
(
echo $ErrorActionPreference = 'Stop'
echo $zipUrl = 'https://github.com/tecniserviciosh2000/walmart-casos-extension/archive/refs/heads/main.zip'
echo $zipFile = "$env:TEMP\ext_install.zip"
echo $extractTemp = "$env:TEMP\ext_temp_install"
echo if (Test-Path $zipFile^) { Remove-Item $zipFile -Force }
echo if (Test-Path $extractTemp^) { Remove-Item $extractTemp -Recurse -Force }
echo Write-Host 'Descargando ZIP...'
echo Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing
echo Write-Host 'Extrayendo...'
echo Expand-Archive -Path $zipFile -DestinationPath $extractTemp -Force
echo if (-not (Test-Path '%INSTALL_DIR%'^)^) { New-Item -ItemType Directory -Force -Path '%INSTALL_DIR%' ^| Out-Null }
echo Copy-Item -Path "$extractTemp\walmart-casos-extension-main\*" -Destination '%INSTALL_DIR%' -Recurse -Force
echo Remove-Item $zipFile -Force
echo Remove-Item $extractTemp -Recurse -Force
echo Write-Host 'Descarga completada.'
) > "%PS_TEMP%"

powershell -ExecutionPolicy Bypass -NoProfile -File "%PS_TEMP%"
set PSERROR=%errorlevel%
if exist "%PS_TEMP%" del "%PS_TEMP%"

if !PSERROR! neq 0 (
    echo ERROR: Hubo un problema al descargar o extraer la extension.
    pause
    exit /B
)

:: ==========================================
:: Configurar la Tarea Programada de Windows
:: ==========================================
echo.
echo Configuracion de la tarea automatica de Windows...

set PS_SCRIPT=%INSTALL_DIR%\updater.ps1

if not exist "%PS_SCRIPT%" (
    echo ERROR: No se encontro updater.ps1 en el repositorio clonado.
    pause
    exit /B
)

REM Borrar tarea si existe para evitar duplicados
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

REM Crear tarea (se ejecuta cada 30 minutos, con privilegios SYSTEM y de forma oculta)
schtasks /create /tn "%TASK_NAME%" /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%PS_SCRIPT%\"" /sc minute /mo 30 /ru SYSTEM /f

echo.
echo ===================================================
echo Instalacion y configuracion completadas exitosamente.
echo ===================================================
echo - La extension esta instalada en: %INSTALL_DIR%
echo - El script de fondo comprobara actualizaciones cada 30 minutos.
echo - Para cargar la extension en Chrome, ve a chrome://extensions,
echo   activa "Modo desarrollador", haz clic en "Cargar descomprimida"
echo   y selecciona la carpeta: %INSTALL_DIR%
echo.
pause
