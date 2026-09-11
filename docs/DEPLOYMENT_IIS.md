# IIS Deployment Runbook (Windows Server + SQL Server, no Docker)

This deploys the platform natively on Windows Server: IIS serves the static frontend and reverse-proxies API traffic to a Node process running as a Windows service, with SQL Server installed directly on the box. This avoids the Linux-container-on-Windows-Server complexity that the Docker path (`docs/DEPLOYMENT_DOCKER.md`) requires — recommended if you're not already committed to Docker, since everything here is a first-class Windows citizen (IIS, SQL Server, Windows services).

## 0. Architecture

- **`evopen-api` IIS site** (`api.evopen.co.uk`) — physical path holds only `deploy/iis/api-web.config`; every request is reverse-proxied via URL Rewrite + ARR to `http://127.0.0.1:5000`.
- **Node backend** — runs as a Windows service (via NSSM), bound to port 5000, `backend/.env` supplies config. IIS is the only thing that talks to it; the port is never exposed externally (Windows Firewall blocks inbound by default unless a rule explicitly opens it — don't add one for 5000).
- **`evopen-frontend` IIS site** (`evopen.co.uk` / `www.evopen.co.uk`) — physical path is `frontend/out`, the Next.js static export. Pure static file serving, no Node involved at runtime.
- **SQL Server** — installed natively on the same box (or reachable elsewhere), not containerized.

## 1. Prerequisites

Install on the Windows Server (all one-time):

1. **IIS role** — `deploy/iis/setup-iis-sites.ps1` does this via `Install-WindowsFeature`, or use Server Manager → Add Roles → Web Server (IIS).
2. **URL Rewrite** and **Application Request Routing (ARR)** — these are IIS extensions, not part of the base role, and must be installed separately. Download and run the installers from the official pages:
   - https://www.iis.net/downloads/microsoft/url-rewrite
   - https://www.iis.net/downloads/microsoft/application-request-routing
   (If you use Chocolatey, `choco search urlrewrite` / `choco search arr` first to confirm current package IDs before installing.)
3. **Node.js** (LTS matching what you develop against) — https://nodejs.org.
4. **SQL Server** — SQL Server Express is free and sufficient for this app's scale; Developer edition is free but licensed for non-production use only, so don't use it here. During setup, enable **Mixed Mode Authentication** (SQL + Windows) and note the `sa` password, or create a dedicated login for this app afterward (recommended — least-privilege over using `sa` day-to-day):
   ```sql
   CREATE LOGIN evopen_app WITH PASSWORD = 'Something_Strong1!';
   CREATE DATABASE EVChargePointDB;
   USE EVChargePointDB;
   CREATE USER evopen_app FOR LOGIN evopen_app;
   ALTER ROLE db_owner ADD MEMBER evopen_app;
   ```
5. **NSSM** (https://nssm.cc/) — used to run the Node backend as a Windows service. Extract `nssm.exe` somewhere on `PATH`.
6. **simple-acme** (https://www.simple-acme.com/, formerly "win-acme" — same tool, same `wacs.exe`, rebranded) — free ACME/Let's Encrypt client with native IIS integration, used for TLS certs in step 9. Via winget: `winget install --id simple-acme.simple-acme -e`.

All six of the above (except SQL Server's manual EULA/auth steps) install cleanly via `winget`:
```powershell
winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
winget install --id NSSM.NSSM -e --silent --accept-package-agreements --accept-source-agreements
winget install --id simple-acme.simple-acme -e --silent --accept-package-agreements --accept-source-agreements
winget install --id Microsoft.IIS.URLRewrite -e --silent --accept-package-agreements --accept-source-agreements
winget install --id Microsoft.IIS.ApplicationRequestRouting -e --silent --accept-package-agreements --accept-source-agreements
```
If `winget install` fails with "Failed when opening source(s)", run `winget source reset --force` first.

**SQL Server Express**: the small web-installer bootstrapper (`SQL20XX-SSEI-Expr.exe`, what `winget install --id Microsoft.SQLServer.2022.Express` fetches) is a GUI/WinForms tool — running it over a remote/non-interactive PowerShell session (`Invoke-Command`) can silently hang or die with no error. Download and run the full offline installer instead, and do it from an actual interactive session (RDP console, not remoted):
```powershell
Invoke-WebRequest -Uri "https://download.microsoft.com/download/3/8/d/38de7036-2433-4207-8eae-06e247e17b25/SQLEXPR_x64_ENU.exe" -OutFile "C:\SQLEXPR_x64_ENU.exe"
C:\SQLEXPR_x64_ENU.exe /QUIET /ACTION=Install /IACCEPTSQLSERVERLICENSETERMS /INSTANCENAME=SQLEXPRESS /SECURITYMODE=SQL /SAPWD=<StrongPassword> /SQLSYSADMINACCOUNTS=BUILTIN\Administrators /TCPENABLED=1 /FEATURES=SQLENGINE
```
This installs a **named instance** (`SQLEXPRESS`) with mixed-mode auth and TCP/IP enabled — but named instances default to a **dynamic port**, and Prisma's `sqlserver://` connection string needs a fixed `host:port` (it doesn't do SQL Browser/instance-name resolution). Pin it to the standard port and open it locally:
```powershell
$regPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQLServer\SuperSocketNetLib\Tcp\IPAll"
Set-ItemProperty -Path $regPath -Name "TcpDynamicPorts" -Value ""
Set-ItemProperty -Path $regPath -Name "TcpPort" -Value "1433"
Restart-Service "MSSQL`$SQLEXPRESS" -Force
New-NetFirewallRule -DisplayName "SQL Server TCP 1433" -Direction Inbound -Protocol TCP -LocalPort 1433 -Action Allow -Profile Any
```
(That firewall rule only matters for connections from *other* machines — a local `localhost:1433` connection works regardless. Skip it if the app only ever connects locally.)

## 2. Firewall

```powershell
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```
Do not open 1433 (SQL Server) or 5000 (Node) to the internet — both should only ever be reached from `localhost`/the IIS box itself.

## 3. DNS

Point these A records at the server's public IP before requesting TLS certs (win-acme validates over HTTP, so DNS + port 80 must work first):
- `evopen.co.uk` → server IP
- `www.evopen.co.uk` → server IP
- `api.evopen.co.uk` → server IP

## 4. Get the code and configure

```powershell
git clone <repo-url> C:\evopen
cd C:\evopen\backend
notepad .env    # create it fresh - there's no committed template, see the table below
```

Set in `backend\.env`:
| Variable | Value |
|---|---|
| `DATABASE_URL` | `sqlserver://localhost:1433;database=EVChargePointDB;user=evopen_app;password=<password>;encrypt=true;trustServerCertificate=true` |
| `JWT_SECRET` | `openssl rand -hex 32` (Git Bash has `openssl`) |
| `API_KEY_PEPPER` | `openssl rand -hex 32`, distinct from `JWT_SECRET` |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USER` / `MAIL_PASS` / `SYSTEM_EMAIL_FROM` | your real mail provider — omitting these just disables verification emails, doesn't crash the app |
| `PORT` | `5000` |

## 5. Install backend dependencies and apply the schema

```powershell
cd C:\evopen\backend
npm install --omit=dev
```
Modern npm gates lifecycle scripts for packages it doesn't recognize yet (`npm warn allow-scripts ...`) — Prisma's `postinstall` (fetches its query engine binaries) is one of them, and won't run without explicit approval. Approve and trigger it:
```powershell
npm approve-scripts "@prisma/client" "@prisma/engines" "@scarf/scarf" "prisma"
npm rebuild
```
(`npm approve-scripts` alone doesn't retroactively run scripts on already-installed packages — `npm rebuild` is what actually triggers them.) Then generate the client and apply the schema:
```powershell
npx prisma generate
npx prisma db push
```
`db push` creates all tables on the fresh `EVChargePointDB` database directly from `schema.prisma` — the migration files under `prisma/migrations` are historical MySQL-dialect SQL from before this app moved to SQL Server and are not used here (see `docs/DEPLOYMENT_DOCKER.md`'s note on the same topic).

Seed the first Super Admin:
```powershell
node prisma/seed.js
```

## 6. Install the backend as a Windows service

```powershell
cd C:\evopen
.\deploy\iis\install-backend-service.ps1 -RepoRoot "C:\evopen"
```
Confirm it's listening: `Invoke-WebRequest http://127.0.0.1:5000/api/v1/open-data/feed` should return `200`.

## 7. Build the frontend

`NEXT_PUBLIC_API_URL` is baked in at **build time** (it's a client-side static export, nothing reads env vars at runtime):
```powershell
cd C:\evopen\frontend
notepad .env
```
Set `NEXT_PUBLIC_API_URL=https://api.evopen.co.uk/api/v1` in `frontend\.env` (the same file `src/lib/axios.js` reads from, per `CLAUDE.md`), then:
```powershell
npm install
```
Same `allow-scripts` gate as the backend applies here too (`sharp` and `unrs-resolver`):
```powershell
npm approve-scripts "sharp" "unrs-resolver"
npm rebuild sharp unrs-resolver
npm run build
```
This produces `frontend\out`, including `web.config` (copied automatically from `frontend\public\web.config` by Next's static export — it configures the default document and a custom 404 page; deliberately has **no** `staticContent`/mimeType overrides — `.json` and `.webmanifest` are already registered at the applicationHost.config level on IIS, and redeclaring them at the site level throws a 500.19 lock-violation error).

## 8. Create the IIS sites

```powershell
cd C:\evopen
.\deploy\iis\setup-iis-sites.ps1 -RepoRoot "C:\evopen"
```
This installs the IIS role/features, enables ARR's proxy mode, and creates both sites on HTTP (port 80) with the correct host headers. If `Default Web Site` is still running and also bound to port 80 with no host header, consider stopping it (`Stop-Website "Default Web Site"`) so it doesn't intercept anything unexpected.

At this point `http://evopen.co.uk` and `http://api.evopen.co.uk` should already work over plain HTTP — verify before moving to TLS.

## 9. TLS via simple-acme

Run `wacs.exe` interactively, or scripted (fully unattended, no prompts):
```powershell
wacs.exe --target iissite --siteid <evopen-frontend-site-id> --host "evopen.co.uk,www.evopen.co.uk" --installation iis --accepttos --emailaddress "you@example.com" --closeonfinish
wacs.exe --target iissite --siteid <evopen-api-site-id> --host "api.evopen.co.uk" --installation iis --accepttos --emailaddress "you@example.com" --closeonfinish
```
(Get site IDs with `Get-Website | Select Name, Id`.) `wacs.exe` is a console app, so unlike the SQL Server installer this runs fine over a remote/non-interactive session. It adds the HTTPS bindings and certificates to each site automatically, and registers a scheduled task for renewal — no manual cert management afterward.

## 10. Verify

- `https://evopen.co.uk` loads the frontend over HTTPS.
- `https://api.evopen.co.uk/api/v1/open-data/feed` returns `200` with the OCPI-style envelope.
- Log in as the seeded Super Admin; check the browser console for CORS errors (`backend/server.js`'s `allowedOrigins` must list `https://evopen.co.uk`/`https://www.evopen.co.uk` — it does).
- `Get-Content backend\logs\service-out.log -Wait` for a few minutes, watching for unexpected errors.

## 11. Deploying updates

```powershell
cd C:\evopen
.\deploy\iis\redeploy.ps1 -RepoRoot "C:\evopen"
```
This automates every step above for a code update: `git pull`, backend `npm install` + the `allow-scripts` approve/rebuild dance + `prisma generate` + `prisma db push` + service restart + a health check, then frontend `npm install` + rebuild + `npm run build`. It's safe to re-run. If a schema change would need `--accept-data-loss`, the script deliberately does **not** pass that flag automatically — it'll stop with Prisma's prompt/output so you can review what it would drop before re-running `npx prisma db push --accept-data-loss` manually in `backend/`.

The frontend site's physical path already points at `frontend\out`, so the rebuild is live immediately — no IIS restart needed for frontend-only changes.

## 12. Backups

```powershell
sqlcmd -S localhost -U evopen_app -P "<password>" -Q `
  "BACKUP DATABASE [EVChargePointDB] TO DISK = N'C:\backups\EVChargePointDB_$(Get-Date -Format yyyyMMdd_HHmmss).bak'"
```
Also back up `backend\uploads\` (location/EVSE images) — it's not tracked in git and holds real user-submitted files.

## 13. Rollback

```powershell
git checkout <previous-commit-or-tag>
.\deploy\iis\redeploy.ps1 -RepoRoot "C:\evopen"
```
To restore a database backup:
```sql
RESTORE DATABASE [EVChargePointDB] FROM DISK = N'C:\backups\<file>.bak' WITH REPLACE;
```
