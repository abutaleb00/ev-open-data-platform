# Run as Administrator on the Windows Server (or remotely via Invoke-Command).
# Pulls the latest code and redeploys both backend and frontend in place.
# Safe to re-run - each step is idempotent. Does NOT create the IIS sites, the
# backend Windows service, or TLS certs - run setup-iis-sites.ps1 and
# install-backend-service.ps1 once first (see docs/DEPLOYMENT_IIS.md).

param(
    [string]$RepoRoot = "C:\evopen"
)

# Deliberately NOT using $ErrorActionPreference = "Stop": PowerShell (especially over
# PSRemoting) treats a native command's normal stderr output - which git and npm both
# use for routine progress/warnings - as a terminating error under that setting, aborting
# the script even though the command actually succeeded. Native command failures are
# instead detected explicitly via $LASTEXITCODE below.

function Write-Step($msg) {
    Write-Host ""
    Write-Host "=== $msg ===" -ForegroundColor Cyan
}

function Invoke-Checked($description) {
    if ($LASTEXITCODE -ne 0) {
        throw "$description failed with exit code $LASTEXITCODE"
    }
}

Write-Step "Pulling latest code"
Set-Location $RepoRoot
git pull origin main 2>&1 | Write-Host
Invoke-Checked "git pull"

# --- Backend ---
# Stop the service before touching node_modules/prisma - the running Node process holds
# the Prisma query engine DLL open, and `prisma generate` fails with EPERM trying to
# replace it while that lock is held. Confirmed live on the first real redeploy run.
Write-Step "Backend: stopping Windows service"
Stop-Service evopen-backend -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Step "Backend: installing dependencies"
Set-Location "$RepoRoot\backend"
npm install --omit=dev 2>&1 | Write-Host
Invoke-Checked "backend npm install"

# npm's install-script allowlist blocks postinstall/preinstall scripts for packages it
# doesn't recognize yet (see npm warn allow-scripts). Prisma's postinstall fetches its
# query engine binaries and won't run without this - approve the known set, then force
# them to actually run via `npm rebuild` (approve-scripts alone doesn't re-trigger
# scripts on already-installed packages). Update this list if new scripted deps are added.
Write-Step "Backend: approving and running required install scripts"
npm approve-scripts "@prisma/client" "@prisma/engines" "@scarf/scarf" "prisma" 2>&1 | Write-Host
npm rebuild 2>&1 | Write-Host
Invoke-Checked "backend npm rebuild"

Write-Step "Backend: generating Prisma Client"
npx prisma generate 2>&1 | Write-Host
Invoke-Checked "prisma generate"

Write-Step "Backend: applying schema changes (prisma db push)"
Write-Host "If this prompts for --accept-data-loss, STOP and review what it would drop before re-running with that flag manually." -ForegroundColor Yellow
npx prisma db push 2>&1 | Write-Host
Invoke-Checked "prisma db push"

Write-Step "Backend: starting Windows service"
Start-Service evopen-backend -ErrorAction Stop
Start-Sleep -Seconds 3
$svc = Get-Service evopen-backend
if ($svc.Status -ne "Running") {
    throw "evopen-backend did not come back up after restart - check backend\logs\service-err.log"
}
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:5000/api/v1/open-data/feed" -UseBasicParsing -TimeoutSec 10
    Write-Host "Backend health check: HTTP $($r.StatusCode)" -ForegroundColor Green
} catch {
    throw "Backend health check failed: $($_.Exception.Message)"
}

# --- Frontend ---
Write-Step "Frontend: installing dependencies"
Set-Location "$RepoRoot\frontend"
npm install 2>&1 | Write-Host
Invoke-Checked "frontend npm install"

Write-Step "Frontend: approving and running required install scripts"
npm approve-scripts "sharp" "unrs-resolver" 2>&1 | Write-Host
npm rebuild sharp unrs-resolver 2>&1 | Write-Host

Write-Step "Frontend: building static export"
if (-not (Test-Path ".env")) {
    throw "frontend\.env is missing (needs NEXT_PUBLIC_API_URL) - see docs/DEPLOYMENT_IIS.md section 4."
}
npm run build 2>&1 | Write-Host
Invoke-Checked "frontend build"

if (-not (Test-Path "out\index.html")) {
    throw "Build did not produce out\index.html - check the build output above."
}

Write-Step "Done"
Write-Host "IIS serves frontend\out directly, so the new build is live immediately." -ForegroundColor Green
Write-Host "Verify: https://evopen.co.uk and https://api.evopen.co.uk/api/v1/open-data/feed" -ForegroundColor Green
