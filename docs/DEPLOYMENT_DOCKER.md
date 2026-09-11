# Docker Deployment Runbook (Windows Server + SQL Server)

This covers a fresh production deployment of this platform to a Windows Server host using Docker, fronted by [Caddy](https://caddyserver.com/) for automatic HTTPS on both `evopen.co.uk` (frontend) and `api.evopen.co.uk` (backend), with Microsoft SQL Server as the database. This is a different path from `docs/DEPLOYMENT.md`, which documents the older bare-metal Linux/PM2/MySQL setup — use this doc instead if deploying via Docker with SQL Server.

**Note on the database engine change**: `backend/prisma/schema.prisma`'s `datasource` provider is now `sqlserver` (was `mysql`). Since this is a brand-new server with no existing data to migrate, schema is applied with `prisma db push` rather than `prisma migrate deploy` — the migration files under `backend/prisma/migrations/` are written in MySQL's SQL dialect from before this switch and are **not** run against SQL Server; they're kept only as historical record. If you later want tracked, reversible migrations for SQL Server, generate a fresh baseline with `prisma migrate dev --name init` against a real SQL Server instance once the schema has stabilized.

## 0. What gets built

- `mssql` — SQL Server 2022 (Linux container), data persisted in a named volume.
- `mssql-init` — one-shot container that creates the `EVChargePointDB` database on first boot, then exits (SQL Server has no MySQL-style `MYSQL_DATABASE` env var to do this automatically).
- `backend` — Express/Prisma API, built from `backend/Dockerfile`. Runs `prisma db push` on container start, then `node server.js`.
- `frontend` — Next.js static export (`output: 'export'`), built from `frontend/Dockerfile` and served by a small nginx image. `NEXT_PUBLIC_API_URL` is baked in at **build time**, so it must be set correctly before building.
- `caddy` — reverse proxy in front of both, terminates TLS for `evopen.co.uk` / `www.evopen.co.uk` / `api.evopen.co.uk` and auto-issues/renews Let's Encrypt certificates. Only `caddy` publishes ports (80/443) to the host.

## 1. Prerequisites on the Windows Server

Docker's Linux container images (used by everything in this compose file, including the SQL Server image itself — Microsoft only ships `mssql/server` as a Linux image) need a Linux container runtime. On Windows Server the two realistic options are:

**Option A — WSL2 + Docker Desktop (works on Windows Server 2022, build 20348+)**
1. Enable required features (run in an elevated PowerShell, then reboot):
   ```powershell
   Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart
   Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart
   Restart-Computer
   ```
2. Set WSL2 as default: `wsl --set-default-version 2` (install the WSL2 kernel update from Microsoft if prompted).
3. Install Docker Desktop and select the WSL2 backend during setup.

**Option B — Ubuntu VM under Hyper-V (more robust if A gives you trouble)**
1. Enable the Hyper-V role, create an Ubuntu Server VM, install Docker + the Compose plugin inside it as you would on any Linux box.
2. Forward host ports 80/443 to the VM's IP (`Hyper-V NAT` or a simple port-proxy: `netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=<vm-ip>`, same for port 80).
3. Do the rest of this runbook (clone, `.env`, `docker compose up`) inside that VM.

Either way, confirm Docker works: `docker version` and `docker compose version`.

**Memory**: SQL Server's container requires at least 2GB RAM available to it (Microsoft recommends 4GB+ for anything beyond light testing) on top of whatever the other containers need — undersizing this is the most common reason `mssql` crash-loops on startup. Make sure the Windows Server VM/host has enough headroom.

## 2. Firewall

Open inbound 80 and 443 (elevated PowerShell):
```powershell
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```
Do **not** expose SQL Server (1433) or the backend (5000) directly — they're only reachable inside the Docker network; only `caddy` binds to the host.

## 3. DNS

Before starting Caddy, point these A records at the server's public IP (Caddy can't issue certificates until DNS resolves and ports 80/443 are reachable from the internet):
- `evopen.co.uk` → server IP
- `www.evopen.co.uk` → server IP
- `api.evopen.co.uk` → server IP

## 4. Get the code and configure

```powershell
git clone <repo-url> C:\evopen
cd C:\evopen
copy .env.docker.example .env
notepad .env   # fill in MSSQL_SA_PASSWORD, JWT_SECRET, API_KEY_PEPPER, MAIL_*
```

`MSSQL_SA_PASSWORD` must satisfy SQL Server's complexity policy (8+ characters, at least 3 of: uppercase, lowercase, digit, symbol) — the container refuses to start otherwise, and `mssql-init` will hang waiting on a health check that never passes.

Generate the other secrets with `openssl rand -hex 32` (available in Git Bash, or WSL). Keep `JWT_SECRET` and `API_KEY_PEPPER` distinct — see `CLAUDE.md` for why.

`NEXT_PUBLIC_API_URL` in `.env` is already defaulted to `https://api.evopen.co.uk/api/v1` in the example file — leave it unless the API domain differs.

## 5. Build and start

```powershell
docker compose up -d --build
docker compose logs -f mssql-init   # confirm it created the database, then exited 0
docker compose logs -f backend      # watch "prisma db push" run, then "Server running securely on port 5000"
docker compose logs -f caddy        # watch it obtain certificates for all three hostnames
```

`backend` waits on `mssql-init` completing successfully before it starts, so schema creation always happens before the API tries to connect.

## 6. First-time setup: seed the initial Super Admin

```powershell
docker compose exec backend node prisma/seed.js
```
This creates the first `SUPER_ADMIN` and default `SystemConfig` — safe to re-run, it no-ops if the admin already exists (see `backend/prisma/seed.js` for the email/password it uses, or set `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env` beforehand to control them).

## 7. Verify

- `https://evopen.co.uk` loads the frontend over HTTPS.
- `https://api.evopen.co.uk/api/v1/open-data/feed` returns `200` with the OCPI-style envelope.
- Log in as the seeded Super Admin; confirm the dashboard loads and CORS isn't blocking requests (browser console should show no CORS errors — `backend/server.js`'s `allowedOrigins` must list `https://evopen.co.uk`/`https://www.evopen.co.uk`, which it now does).
- `docker compose logs -f backend` for a few minutes, watching for unexpected errors (especially mail sending, if `MAIL_*` isn't fully configured).

## 8. Deploying updates

```powershell
cd C:\evopen
git pull origin main
docker compose up -d --build
```
This rebuilds only the images whose source changed, re-runs `prisma db push` (a no-op if the schema hasn't changed), and restarts containers with zero manual steps. If a schema change would actually drop/alter data, `prisma db push` prompts for `--accept-data-loss` — if you see that, stop and read exactly what it says it would do before adding the flag. If `NEXT_PUBLIC_API_URL` changes, you must rebuild the `frontend` image (`docker compose build frontend`) since it's baked in at build time, not read at runtime.

## 9. Backups

```powershell
docker compose exec mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$env:MSSQL_SA_PASSWORD" -C -Q `
  "BACKUP DATABASE [EVChargePointDB] TO DISK = N'/var/opt/mssql/backup.bak' WITH INIT"
docker cp $(docker compose ps -q mssql):/var/opt/mssql/backup.bak .\EVChargePointDB_backup_$(Get-Date -Format yyyyMMdd_HHmmss).bak
```
Uploaded location/EVSE images live in the `backend_uploads` named volume — back it up too:
```powershell
docker run --rm -v evopen_backend_uploads:/data -v ${PWD}:/backup alpine tar czf /backup/uploads_backup.tar.gz -C /data .
```
(Volume name is prefixed with the compose project name — check `docker volume ls` if the exact name differs.)

## 10. Rollback

```powershell
git checkout <previous-commit-or-tag>
docker compose up -d --build
```
The `mssql_data` volume is untouched by a code rollback. To restore a specific backup:
```powershell
docker cp .\EVChargePointDB_backup_YYYYMMDD_HHMMSS.bak $(docker compose ps -q mssql):/var/opt/mssql/restore.bak
docker compose exec mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$env:MSSQL_SA_PASSWORD" -C -Q `
  "RESTORE DATABASE [EVChargePointDB] FROM DISK = N'/var/opt/mssql/restore.bak' WITH REPLACE"
```
