# Future Development Roadmap

Phase 0 (pre-launch security blockers) and Phase 1 (data-integrity bugs) from the previous version of this roadmap have been completed and verified live against the dev database — see `docs/GAP_ANALYSIS.md` for exactly what changed in each case. What remains is platform hardening, developer experience, and net-new features.

## Phase 2 — Platform Hardening
- [ ] **Redis-backed rate limiting** (`rate-limit-redis`) for both `globalRateLimiter` and `feedRateLimiter`, so limits hold correctly once the backend runs as more than one process/instance.
- [ ] Standardize on one response envelope for the internal admin API (`{ success, data, message }`) — normalize `authController.login` and `dashboardController.getDashboardMetrics`, and unify the three different pagination `meta` shapes into one shared shape/helper. This needs corresponding frontend call-site updates, so do it as its own scoped change rather than mixed into other work. Leave the public OCPI-style feeds (`{ name, message, meta, data }`) as an intentionally separate, documented convention.
- [ ] Extract the duplicated `safeJsonParse`/CSV-split helpers (currently copy-pasted across `chargePointController`, `connectorController`, `locationController`, `openDataController`) into a shared backend utility module (`backend/src/utils/apiKeyHash.js` is a precedent for where shared helpers now live).
- [ ] Replace the in-JS aggregation in `dashboardController.getDashboardMetrics` (connector-status tallies, 7-day chart) with DB-side `groupBy`/aggregate queries as session/connector volume grows.
- [ ] Turn the silent "route self-check" warnings (`authRoutes.js`, `moderationRoutes.js`, `tariffRoutes.js`, `openDataRoutes.js`) into hard startup failures so a misconfigured route can't silently ship as a no-op.
- [ ] Remove the now-fully-orphaned `trafficController.js`, `maintenanceInterceptor.checkPortalGate`, and `rateLimiter.js`'s `publicFeedLimiter` — or wire them up if they're still wanted.
- [ ] Consolidate the two public feed implementations (`publicApiController.getPublicDataset` vs. `openDataController.getPublicFeed`) into one, now that both are at least correctness-fixed — pick the actively-used OCPI-shaped one and deprecate the other explicitly.
- [ ] Add re-verification (or at minimum a confirmation email) when a user changes their account email via `userController.updateProfile`.
- [ ] Add a UI affordance for the `isMaster` API-key flag beyond the current checkbox/toggle in `open-data/keys/page.jsx` — e.g. a confirmation dialog before granting master privileges, given how broad that grant is (full read/write over every operator's data via `operator_reference_id`).
- [ ] Consider adding per-key audit visibility for master-key syncs specifically (which operator was touched, when) rather than the current generic `AuditLog` entries, since a single master key can now legitimately touch many different companies' records.

## Phase 3 — Observability & Developer Experience
- [ ] Stand up an automated test suite (backend: at minimum integration tests for the tenant-scoping and auth middleware — the manual curl-based tests run during the last fix pass are a good starting point for what to automate first; frontend: at minimum smoke tests for the auth flow and the developer-keys pages). None currently exists.
- [ ] Either finish wiring up `swagger-ui-express`/`yamljs` (already installed as dependencies) into an actual OpenAPI spec served from the backend, or remove the unused dependencies.
- [ ] Add structured request/error logging (the app currently relies on scattered `console.error` calls) to make production debugging and the `RequestLog`/`AuditLog` tables easier to cross-reference.
- [ ] Add a visible "revoked" filter/tab to the developer-keys UI now that revoked keys persist (soft-deleted via `isActive: false`) rather than disappearing — currently they show inline with a "Revoked" badge, which is functional but could get noisy with a lot of history.

## Phase 4 — Feature Roadmap
- [ ] OCPI 2.2.1 protocol validation layer for both inbound partner sync/ingest and the outbound public feed, now that the ingestion path's tenant-isolation gaps are closed.
- [ ] API key scoping (read-only vs. write-enabled keys) for partner integrations — pairs naturally with the now-completed API-key hashing work.
- [ ] Webhook alerts for sustained high 429/500 error rates on partner sync endpoints, built on top of the existing `RequestLog` telemetry.
- [ ] Exportable CSV/PDF traffic-metrics and audit-log reports from the Super Admin portal.
- [ ] A real forgot-password flow (frontend already links to `/forgot-password`; no backend endpoint or frontend page currently exists for it).
- [ ] A key-rotation flow (generate a replacement key, grace-period both keys, revoke the old one) now that keys are one-time-visible — today's only path is generate new + manually revoke old, with no overlap window.
