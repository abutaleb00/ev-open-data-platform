# Run as Administrator on the target Windows Server.
# Creates the two IIS sites (static frontend + reverse-proxy-only API site) used by
# docs/DEPLOYMENT_IIS.md. Idempotent-ish: re-running recreates sites/pools if they exist.

param(
    [string]$RepoRoot = "C:\evopen"
)

Import-Module WebAdministration

# 1. IIS role + the features these sites need (static content, default doc, custom errors,
#    and the rewrite/proxy pieces the API site depends on - those two are NOT covered by
#    Install-WindowsFeature; see step 2 below and docs/DEPLOYMENT_IIS.md).
Install-WindowsFeature -Name Web-Server, Web-Static-Content, Web-Default-Doc, Web-Http-Errors, `
    Web-Http-Redirect, Web-Http-Logging, Web-Filtering, Web-Stat-Compression -IncludeManagementTools

# 2. URL Rewrite + Application Request Routing (ARR) must be installed manually first -
#    see docs/DEPLOYMENT_IIS.md section 1. This script assumes both are already installed.
if (-not (Get-WebGlobalModule -Name "RewriteModule" -ErrorAction SilentlyContinue)) {
    Write-Warning "URL Rewrite module not detected. Install it before continuing (docs/DEPLOYMENT_IIS.md, section 1)."
}

# Enable ARR's proxy feature server-wide - without this, the rewrite rule in
# deploy/iis/api-web.config will match but silently fail to forward the request.
Set-WebConfigurationProperty -pspath "MACHINE/WEBROOT/APPHOST" -filter "system.webServer/proxy" -name "enabled" -value "True"

# 3. Stage the API site's physical folder (it holds nothing but web.config - all it does
#    is bind the hostname/TLS cert and reverse-proxy to the Node service on 127.0.0.1:5000).
$apiSitePath = Join-Path $RepoRoot "deploy\iis\api-site"
New-Item -ItemType Directory -Force -Path $apiSitePath | Out-Null
Copy-Item (Join-Path $RepoRoot "deploy\iis\api-web.config") (Join-Path $apiSitePath "web.config") -Force

$frontendPath = Join-Path $RepoRoot "frontend\out"
if (-not (Test-Path $frontendPath)) {
    Write-Warning "$frontendPath does not exist yet - build the frontend first (npm run build) before browsing to the site."
}

# 4. Frontend site: evopen.co.uk + www.evopen.co.uk, pure static files.
if (Test-Path "IIS:\AppPools\evopen-frontend-pool") { Remove-WebAppPool -Name "evopen-frontend-pool" }
New-WebAppPool -Name "evopen-frontend-pool"
Set-ItemProperty "IIS:\AppPools\evopen-frontend-pool" -Name managedRuntimeVersion -Value ""

if (Get-Website -Name "evopen-frontend" -ErrorAction SilentlyContinue) { Remove-Website -Name "evopen-frontend" }
New-Website -Name "evopen-frontend" -PhysicalPath $frontendPath -ApplicationPool "evopen-frontend-pool" `
    -Port 80 -HostHeader "evopen.co.uk"
New-WebBinding -Name "evopen-frontend" -Protocol http -Port 80 -HostHeader "www.evopen.co.uk"

# 5. API site: api.evopen.co.uk, reverse proxy only.
if (Test-Path "IIS:\AppPools\evopen-api-pool") { Remove-WebAppPool -Name "evopen-api-pool" }
New-WebAppPool -Name "evopen-api-pool"
Set-ItemProperty "IIS:\AppPools\evopen-api-pool" -Name managedRuntimeVersion -Value ""

if (Get-Website -Name "evopen-api" -ErrorAction SilentlyContinue) { Remove-Website -Name "evopen-api" }
New-Website -Name "evopen-api" -PhysicalPath $apiSitePath -ApplicationPool "evopen-api-pool" `
    -Port 80 -HostHeader "api.evopen.co.uk"

Write-Host ""
Write-Host "Sites created: evopen-frontend, evopen-api (both HTTP-only for now)."
Write-Host "Next steps (see docs/DEPLOYMENT_IIS.md):"
Write-Host "  1. Consider stopping/removing 'Default Web Site' so it doesn't shadow these host-header bindings."
Write-Host "  2. Run win-acme to issue TLS certs and add HTTPS bindings for all three hostnames."
Write-Host "  3. Install and start the backend Windows service (deploy\iis\install-backend-service.ps1)."
