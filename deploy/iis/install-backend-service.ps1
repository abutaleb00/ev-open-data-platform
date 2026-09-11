# Run as Administrator on the target Windows Server.
# Installs backend/server.js as a Windows service using NSSM (https://nssm.cc/), so it
# auto-restarts on crash and auto-starts on server reboot. IIS never runs Node code
# directly - it only reverse-proxies to this service (see deploy/iis/api-web.config).
#
# Prerequisite: download NSSM from https://nssm.cc/ and either put nssm.exe on PATH,
# or set $nssm below to its full path.

param(
    [string]$RepoRoot = "C:\evopen",
    [string]$Nssm = "nssm.exe"
)

$backendPath = Join-Path $RepoRoot "backend"
$nodeExe = (Get-Command node -ErrorAction Stop).Source
$logDir = Join-Path $backendPath "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

if (Get-Service evopen-backend -ErrorAction SilentlyContinue) {
    Write-Host "Service already exists - stopping and removing before reinstall."
    Stop-Service evopen-backend -ErrorAction SilentlyContinue
    & $Nssm remove evopen-backend confirm
}

& $Nssm install evopen-backend $nodeExe "server.js"
& $Nssm set evopen-backend AppDirectory $backendPath
& $Nssm set evopen-backend AppStdout (Join-Path $logDir "service-out.log")
& $Nssm set evopen-backend AppStderr (Join-Path $logDir "service-err.log")
& $Nssm set evopen-backend AppRotateFiles 1
& $Nssm set evopen-backend AppRotateBytes 10485760
& $Nssm set evopen-backend Start SERVICE_AUTO_START

Start-Service evopen-backend
Start-Sleep -Seconds 2
Get-Service evopen-backend

Write-Host ""
Write-Host "Backend running as a Windows service on 127.0.0.1:5000 (see backend\.env for PORT)."
Write-Host "Logs: $logDir\service-out.log / service-err.log"
Write-Host "To redeploy after a code change: Stop-Service evopen-backend; (rebuild/npm install/prisma steps); Start-Service evopen-backend"
