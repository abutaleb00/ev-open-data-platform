# Platform System Architecture

## 1. System Overview

The EV Open Data Platform is a multi-tenant SaaS for EV Charge Point Operators (CPOs):

- **Operators** (`Company` records, `COMPANY_ADMIN` / `STAFF` users) manage their own `Location` → `ChargePoint` (EVSE) → `Connector` inventory and `Tariff` pricing through a Next.js admin portal.
- **Super Admins** (`SUPER_ADMIN` role, no `companyId`) oversee every tenant: approving companies, moderating submissions, configuring platform-wide rate limiting and maintenance gates, and viewing traffic/audit telemetry.
- **The public** consumes an OCPI-flavored open-data feed of approved locations/EVSEs/tariffs, with no authentication.
- **Partners** push data into the platform (register/update operator + station data) using per-company `ApiKey` credentials, and can also pull/patch individual records via the same key.

```
                         ┌─────────────────────────┐
                         │   Next.js Frontend       │
                         │  (static export, SPA-ish)│
                         │  App Router, Zustand,    │
                         │  Axios, Leaflet          │
                         └────────────┬─────────────┘
                                      │ HTTPS (Bearer JWT / cookies)
                                      ▼
        ┌────────────────────────────────────────────────────┐
        │                Nginx / Reverse Proxy                │
        │        (adds X-Forwarded-For, TLS termination)      │
        └────────────────────────┬─────────────────────────────┘
                                  ▼
        ┌────────────────────────────────────────────────────┐
        │              Express 5 app (server.js)              │
        │  trust proxy → helmet → globalRateLimiter → CORS →  │
        │  body parsers → /uploads static → routers           │
        └────────────────────────┬─────────────────────────────┘
                                  ▼
        ┌────────────────────────────────────────────────────┐
        │        Prisma Client (relationMode: "prisma")       │
        └────────────────────────┬─────────────────────────────┘
                                  ▼
                         ┌──────────────────┐
                         │   MySQL (single   │
                         │   database)       │
                         └──────────────────┘
```

Production deployment (inferred from the repo's `instruction` notes): app runs under **PM2** at `/var/www/evopen-api`, behind an **Nginx** reverse proxy, backed by a **MySQL** database (`EVChargePointDB`). The frontend is built via `next build` (`output: 'export'`) and the resulting static `frontend/out` bundle is served as static files (there is no Node server process for the frontend in production).

## 2. Request Lifecycle (Backend)

Defined top-to-bottom in `backend/server.js`:

1. **`app.set('trust proxy', 1)`** — required so `req.ip` / `X-Forwarded-For` reflect the real client behind Nginx/Cloudflare, not the proxy's loopback address. This affects rate limiting, `RequestLog.ipAddress`, and `AuditLog.ipAddress` everywhere.
2. **`helmet()`** — standard security headers, with `crossOriginResourcePolicy: 'cross-origin'` explicitly relaxed so the Next.js frontend (a different origin) can load images from `/uploads`.
3. **`globalRateLimiter`** (`express-rate-limit`) — static 300 requests / 15 minutes per IP, applied to the whole `/api/` prefix. This is a coarse DoS/scrape guard independent of the platform's per-feature rate limiting (see §5).
4. **Body parsers** — `express.json`/`express.urlencoded`, both capped at `10mb`.
5. **CORS** — explicit allow-list (`allowedOrigins` array in `server.js`: production frontend domain + `localhost:3000` + `127.0.0.1:3000`), `credentials: true`. Requests with no `Origin` header (server-to-server, Postman) are allowed through unconditionally.
6. **`/uploads` static file serving** — `express.static` over `backend/uploads`, publicly world-readable (location/charge-point images uploaded via `uploadMiddleware.js`, no auth check on read).
7. **Route mounting** — everything under `/api/v1/...` (§4).
8. **Fallback 404 handler** for unmatched routes.
9. A **leftover dev-only route**, `GET /api/v1/charge-points-test`, dumps all `ChargePoint` rows unscoped and unauthenticated — should not exist in a deployed build (see `docs/GAP_ANALYSIS.md`).

Per-request, most protected routes additionally pass through:

- **`authMiddleware.protect`** (`backend/src/middlewares/authMiddleware.js`) — extracts JWT from `Authorization: Bearer` header or a `token` cookie, verifies it, reloads the `User` (+ `company`) fresh from the DB on every request, and enforces account/company lifecycle state (`User.status === 'ACTIVE'`, `Company.status` must be `ACTIVE` unless the caller is `SUPER_ADMIN`, with a distinct 403 message for `PENDING` companies). Attaches the full `req.user` object (including `company`).
- **`authMiddleware.restrictTo(...roles)`** — role allow-list, must run after `protect`.
- **`authMiddleware.verifyPartnerApiKey`** — for partner/ingestion routes; validates `x-api-key` header against `ApiKey.key` (stored **in plaintext**), requires `isActive` and an `ACTIVE` parent company, attaches `req.partnerCompanyId`.
- **`maintenanceInterceptor`** (`checkLocationsGate`, `checkTariffsGate`, `checkPortalGate`) — reads the single `SystemConfig` row (`findFirst()`) and short-circuits with `503 MAINTENANCE_PAUSED` if the relevant feed/portal has been toggled off by a Super Admin. `checkPortalGate` is defined but currently unused by any route.

## 3. Multi-Tenancy Model

Tenancy root is `Company`. Two identifiers matter:

- **`Company.id`** (internal PK) — used by the admin portal / internal API (`companyId` foreign keys on `User`, `Location`, `Tariff`, `ApiKey`).
- **`Company.operatorReferenceId`** (nullable, unique) — the OCPI-style external identifier partners use when pushing/pulling data (`operatorSyncController`, traffic/audit tenant lookups keyed by this field for `SUPER_ADMIN`-less scoping in a couple of places).

Standard scoping pattern in controllers (see `CLAUDE.md` for the canonical snippet): `isSuperAdmin ? {} : { companyId: ... }`, or the relation-walking equivalent for nested resources (`ChargePoint` → via `location.companyId`; `Connector` → via `chargePoint.location.companyId`; `Session` → via `connector.chargePoint.location.companyId`). `AuditLog` has no direct `companyId`, so it's scoped via `{ user: { companyId } }`.

This pattern is applied correctly in `chargePointController`, `connectorController`, `tariffController`, `sessionController` (reads), `auditController`, `analyticsController`, `dashboardController`, and most of `openDataController`'s dashboard-facing endpoints. It is **missing or broken** in several places — see `docs/GAP_ANALYSIS.md` §1 for the ranked list; those are the highest-priority items in `docs/ROADMAP.md`.

## 4. API Surface (all mounted under `/api/v1` in `server.js`)

| Base path | Router file | Auth | Purpose |
|---|---|---|---|
| `/auth` | `authRoutes.js` | none | Register (company + admin), login, email verification |
| `/companies` | `companyRoutes.js` | `protect` (+ `restrictTo`) | Company CRUD, self-service profile update |
| `/locations` | `locationRoutes.js` | `protect` + `upload.array('images',5)` on writes | Location CRUD + image upload |
| `/charge-points` | `chargePointRoutes.js` | `protect` | ChargePoint (EVSE) CRUD |
| `/connectors` | `connectorRoutes.js` | `protect` | Connector CRUD |
| `/tariffs` | `tariffRoutes.js` | `protect` + `restrictTo` | Tariff CRUD |
| `/public` | `publicApiRoutes.js` | **none** | Legacy/duplicate unauthenticated OCPI-style dataset export (`GET /dataset`) |
| `/admin/moderation` | `moderationRoutes.js` | `protect` + `restrictTo('SUPER_ADMIN')` | Approval queue, maintenance toggles, user activation override |
| `/analytics` | `analyticsRoutes.js` | `protect` | Tenant-scoped overview stats (`GET /overview`) |
| `/sessions` | `sessionRoutes.js` | `protect` | Live charging sessions & transaction history |
| `/users` | `userRoutes.js` | `protect` | Self-service profile/password |
| `/audit` | `auditRoutes.js` | `protect` | Paginated audit log viewer |
| `/dashboard` | `dashboardRoutes.js` | `protect` | Aggregated dashboard metrics + 7-day chart |
| `/open-data` | `openDataRoutes.js` | mixed (see below) | Public feed, partner ingestion/sync/patch, API key management, dashboard previews |
| `/admin` | `adminRoutes.js` | `protect` + inline `SUPER_ADMIN` check | Platform-wide user/company status, global rate-limit config |

### `/open-data` detail (the most security-sensitive router — `openDataController.js` + `operatorSyncController.js`)

| Method & path | Middleware | Notes |
|---|---|---|
| `GET /feed` | `feedRateLimiter` → `logApiRequest` → `checkLocationsGate` | Public OCPI feed of approved locations/EVSEs |
| `GET /tariffs` | `checkTariffsGate` | Public tariff feed |
| `POST /sync-operator` | `verifyPartnerApiKey` | Bulk operator+location+EVSE+connector upsert from partner payload. Regular keys: confined to their own company. Master keys (`ApiKey.isMaster`): resolve/auto-create any operator by `operator_reference_id`/name |
| `POST /ingest` | `verifyPartnerApiKey` | Bulk location/EVSE upsert by numeric ID |
| `PATCH /external/locations/:id` | `verifyPartnerApiKey` | Partial location update |
| `PATCH /external/locations/:locationId/evses/:evseId` | `verifyPartnerApiKey` | Partial EVSE update |
| `PATCH /external/evses/:evseId/connectors/:connectorId` | `verifyPartnerApiKey` | Partial connector update |
| `PATCH /location/:id/metadata` | `protect` | Internal metadata edit, correctly tenant-checked |
| `GET /admin/traffic-metrics`, `GET /admin/rate-limit-telemetry` | `protect` | Traffic/telemetry dashboards |
| `GET /preview/feed`, `GET /preview/tariffs` | `protect` | Tenant-scoped preview of the public feed for the operator's own portal |
| `GET /keys`, `POST /keys`, `PATCH /keys/:id`, `DELETE /keys/:id` | `protect` | Partner API key management (list/generate/grant-or-revoke master flag/revoke) |

## 5. Rate Limiting Layers

Two independent, differently-scoped limiters exist — see `CLAUDE.md` §3 for the do/don't summary:

1. **`globalRateLimiter`** (`server.js`) — static, in-memory, 300 req/15 min per IP across all `/api/`.
2. **`feedRateLimiter`** (`backend/src/middlewares/requestTracker.js`) — dynamic, DB-backed configuration (`SystemConfig.feedRateLimitMax` / `feedRateLimitWindow` / `rateLimitingEnabled`), cached in-process and refreshed on boot or via `PUT /admin/config/rate-limit`. Applied only to the public `GET /open-data/feed`. On trip, writes a `RequestLog(statusCode: 429)` row synchronously inside its `handler`.
3. **`publicFeedLimiter`** (`backend/src/middlewares/rateLimiter.js`) — a third, stricter (1 req/30s) limiter is defined but **not currently imported/mounted anywhere**; likely an earlier iteration of `feedRateLimiter` left in place.

All rate limiting is **in-memory per Node process** — correctness assumes a single backend instance. See `docs/GAP_ANALYSIS.md` / `docs/ROADMAP.md` for the Redis-backed follow-up.

## 6. Auth & Identity

- **Registration** (`POST /auth/register`): creates a `Company` (`status: 'PENDING'`) and its first `User` (`role: COMPANY_ADMIN`, `isActivated: false`) in one transaction, emails an activation link (`activationToken`, nodemailer), writes an `AuditLog` entry.
- **Email verification** (`GET /auth/verify-email`): flips `isActivated: true`, archives the token in place (`ARCHIVED_<id>_<random>`) rather than nulling it (keeps the unique constraint intact while marking it spent).
- **Login** (`POST /auth/login`): `bcrypt.compare`, issues `jwt.sign({ id, role, companyId }, JWT_SECRET, { expiresIn: '1d' })`. Rejects unauthenticated/inactive accounts; does **not** check the parent company's status at login time (only `protect` does, on the next request).
- **Session state**: stateless JWT, no refresh tokens, no forgot-password flow exists anywhere in the backend or frontend.
- **Company admin approval flow**: `SUPER_ADMIN` flips `Company.status` between `ACTIVE`/`SUSPENDED` via `PUT /admin/companies/:id/status`, which cascades activation/suspension to that company's users.
- **Partner API keys**: `ApiKey` stores the key two ways (`backend/src/utils/apiKeyHash.js`) — `key` is a one-way HMAC-SHA256 hash used only for the auth lookup in `verifyPartnerApiKey`, and `encryptedKey` is a reversible AES-256-GCM encryption of the same value. `GET /open-data/keys` decrypts and returns the real value every time (not just once at creation) so a Super Admin or the owning company can copy it anytime — a deliberate recoverability-over-strict-secrecy tradeoff (see `docs/GAP_ANALYSIS.md`); keys created before `encryptedKey` existed return `key: null` (permanently non-recoverable). `verifyPartnerApiKey` hashes the incoming `x-api-key` header before the DB lookup, and attaches both `req.partnerCompanyId` and `req.isMasterKey` (from `ApiKey.isMaster`). `DELETE /open-data/keys/:id` soft-revokes a key (`isActive: false`); `PATCH /open-data/keys/:id` (`SUPER_ADMIN`-only) grants/revokes the `isMaster` flag, which controls `syncOperatorData`'s cross-operator sync privilege.

## 7. Data Model (Prisma / MySQL, `relationMode: "prisma"`)

```
Company 1──* User
Company 1──* Location 1──* ChargePoint 1──* Connector 1──* Session
Company 1──* Tariff  ─────────────────────────*┘ (Connector.tariffId, optional)
Location  1──* Media
ChargePoint 1──* Media
User 1──* AuditLog
Company 1──* ApiKey
SystemConfig               (singleton row — always accessed via findFirst())
RequestLog                 (append-only traffic/telemetry log)
```

Key notes:
- `relationMode = "prisma"` means **no real foreign-key constraints in MySQL** — referential integrity and cascading deletes are entirely application-enforced via manual `$transaction` chains. Any new relation added to the schema needs its own hand-written cascade logic.
- Many OCPI-shaped attributes are stored as JSON-encoded `String @db.Text` columns rather than native JSON (MySQL JSON columns exist but weren't used) — see `CLAUDE.md` §2 for the full list and the `safeJsonParse` convention used to read them back.
- `SystemConfig` is a singleton table (one row) holding both maintenance-gate flags (`locationsBlocked`, `tariffsBlocked`, `portalBlocked`, `keysBlocked`, `globalAlert`/`alertMessage`) and the dynamic feed rate-limit configuration. It must always be looked up with `findFirst()`, never a hardcoded ID (see `docs/GAP_ANALYSIS.md` for the one place that violates this).
- `RequestLog` is the backing table for both the 429-throttle telemetry and general traffic analytics (`GET /open-data/admin/traffic-metrics`, `GET /open-data/admin/rate-limit-telemetry`, and the Super Admin "Traffic Analytics" frontend page).

## 8. Frontend Architecture

- **Next.js App Router, static export** (`next.config.mjs`: `output: 'export'`, `images.unoptimized: true`, `trailingSlash: true`). No server-side rendering or Edge Middleware runs in production — the deployed artifact is a plain static bundle (`frontend/out`).
- **Route groups**:
  - `src/app/(public)/` — `login`, `register`, `verify-email`, plus a public marketing `open-data` landing page.
  - `src/app/(dashboard)/` — everything behind auth: `analytics`, `audit`, `charge-points`, `connectors`, `locations` (+ `locations/enrich`), `tariffs`, `sessions/live`, `transactions`, `developer-keys`, `open-data/keys`, `open-data/preview`, `settings`, `company/dashboard`, `company/settings`, `maintenance`, and the `super-admin/*` subtree (`dashboard`, `approvals`, `companies`, `users`, `request-logs`, `traffic-analytics`).
- **State**: a single Zustand store (`src/store/authStore.js`, with `persist` middleware → `localStorage['ev-auth-storage']`) holding `{ user, token }`. Login also mirrors `token`/`userRole` into cookies (intended for middleware-based routing, see below).
- **API layer**: `src/lib/axios.js` exports a configured Axios instance — attaches `Authorization: Bearer <token>` from the `token` cookie on every request, and on a `401` response clears auth state (store + cookies) and hard-redirects to `/login?expired=true`. New API calls should always go through this instance.
- **Auth gating**: `src/proxy.js` is correctly written per Next.js 16's `proxy.js` convention (the renamed successor to `middleware.js` — right path, right `export function proxy`, right `config.matcher`) and would redirect by role/token at the network boundary. It's inert in this deployment purely because `output: 'export'` disables Proxy/Middleware in static export mode — confirmed by an actual `next build`, which prints a warning to that effect. The actual, functioning gate is client-side in `src/app/(dashboard)/layout.jsx`: redirects to `/login` if no token, and filters the sidebar's `MENU_ITEMS` by `user.role`. This only hides navigation, not direct URL access — page-level protection relies on the backend API rejecting unauthorized requests. If the deployment ever moves off static export, `src/proxy.js` starts working with no code changes.
- **Maps**: Leaflet + react-leaflet (`src/components/maps/LiveLeafletMapInstance.jsx`), tiles from the public OpenStreetMap tile server, marker icons loaded at runtime from `unpkg.com`/`raw.githubusercontent.com` CDNs rather than bundled.

## 9. Documentation Cross-References
- Known bugs, security gaps, dead code, response-shape inconsistencies: `docs/GAP_ANALYSIS.md`
- Prioritized remediation and feature roadmap: `docs/ROADMAP.md`
- Day-to-day conventions and commands: `../CLAUDE.md`
