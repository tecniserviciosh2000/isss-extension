# updater.ps1
$ErrorActionPreference = "SilentlyContinue"

# El script asume que está en el directorio de instalación
$installPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
cd $installPath

$logPath = "$installPath\updater.log"

function Write-Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logPath -Value "[$timestamp] $message"
}

Write-Log "--- Iniciando comprobación de actualización ---"

$remoteUrl = 'https://raw.githubusercontent.com/tecniserviciosh2000/isss-extension/main/manifest.json'
$localManifestPath = "$installPath\manifest.json"

try {
    # Evitar problemas de versión TLS
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    
    # Añadir timestamp para evitar caché usando concatenación segura
    $timestampForUrl = (Get-Date).Ticks
    $requestUri = $remoteUrl + "?t=" + $timestampForUrl
    $remoteManifest = Invoke-RestMethod -Uri $requestUri -UseBasicParsing
    $remoteVersion = $remoteManifest.version

    if (Test-Path $localManifestPath) {
        $localManifest = Get-Content -Path $localManifestPath -Raw | ConvertFrom-Json
        $localVersion = $localManifest.version
        
        Write-Log "Versión Local: $localVersion | Versión Remota: $remoteVersion"

        if ($localVersion -ne $remoteVersion) {
            Write-Log "Actualización detectada. Descargando nueva versión en formato ZIP..."
            
            $zipUrl = "https://github.com/tecniserviciosh2000/isss-extension/archive/refs/heads/main.zip"
            $zipFile = "$env:TEMP\isss-extension-update.zip"
            $extractTemp = "$env:TEMP\isss-extension-temp"
            
            # Limpiar temporales si existen
            if (Test-Path $zipFile) { Remove-Item $zipFile -Force }
            if (Test-Path $extractTemp) { Remove-Item $extractTemp -Recurse -Force }
            
            try {
                Invoke-WebRequest -Uri $zipUrl -OutFile $zipFile -UseBasicParsing
                Expand-Archive -Path $zipFile -DestinationPath $extractTemp -Force
                
                # Copiar los archivos extraídos (Github añade una carpeta raíz con el nombre del repo y la rama)
                $sourcePath = "$extractTemp\isss-extension-main\*"
                Copy-Item -Path $sourcePath -Destination $installPath -Recurse -Force
                
                # Limpiar la basura
                Remove-Item $zipFile -Force
                Remove-Item $extractTemp -Recurse -Force
                
                Write-Log "Actualización completada exitosamente a la versión $remoteVersion."
            } catch {
                Write-Log "Error durante la descarga o extracción del ZIP: $($_.Exception.Message)"
            }
        } else {
            Write-Log "La extensión está actualizada."
        }
    } else {
         Write-Log "Error: No se encontró el manifest.json local en $localManifestPath."
    }
} catch {
    Write-Log "Error al verificar la actualización: $($_.Exception.Message)"
}
