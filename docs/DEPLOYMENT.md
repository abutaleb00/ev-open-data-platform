# Production Deployment & Database Migration Runbook

This covers deploying this session's fixes (see `docs/GAP_ANALYSIS.md`) to an **existing VPS that already has a live database** — not a fresh install. It follows the deployment pattern already established in this repo's `instruction` file (`/var/www/evopen-api`, PM2, direct MySQL access on the VPS), with the missing safety steps (backup, verification, breaking-change handling) added in.

## 0. First: confirm which database you're about to touch

During this session's fix work, `DATABASE_URL` in `backend/.env` pointed at `127.0.0.1:4306` (MySQL database `EVChargePointDB`) — the same database name your VPS instructions reference (`use EVChargePointDB`). Before doing anything else, confirm whether that's:

- **The same database as your VPS**, reached via an SSH tunnel or port-forward — in which case the schema changes (`ApiKey.isMaster`, `ApiKey.encryptedKey`) and all the test data cleanup from this session were already applied directly to production, and step 4 below is likely already done (verify, don't re-assume).
- **A separate local/dev copy** (e.g., a Docker container mapping host port 4306) — in which case none of this has touched your VPS yet, and every step below is still needed there.

Check by comparing `DATABASE_URL`'s host in your VPS's `backend/.env` against the one you've been developing against, or just run step 0a below directly on the VPS — it's non-destructive and tells you immediately.

```bash
# On the VPS, in the backend directory:
mysql -u <user> -p -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='EVChargePointDB' AND TABLE_NAME='ApiKey';"
# If both `isMaster` and `encryptedKey` are already listed, the schema migration is done - skip to step 3 (env vars) and step 6 (API key regeneration).
```

## 1. Back up the database (non-negotiable)

Do this even though the schema change itself is additive and low-risk — you're also deploying several behavior changes (API key hashing, moderation defaults) that you want a clean rollback point for regardless of the schema.

```bash
mysqldump -u <user> -p EVChargePointDB > EVChargePointDB_backup_$(date +%Y%m%d_%H%M%S).sql
```

Copy that file off the VPS (`scp`) before proceeding. Do not skip this because the migration "looks safe" — that's exactly when backups get skipped and then needed.

## 2. Pull the code and install dependencies

```bash
cd /var/www/evopen-api
git pull origin main
cd backend && npm install
cd ../frontend && npm install
```

No new npm packages were added by this session's fixes (the new `backend/src/utils/apiKeyHash.js` only uses Node's built-in `crypto`), so `npm install` should be a no-op unless your `package-lock.json` drifted for unrelated reasons.

## 3. Environment variable checklist

Update `backend/.env` on the VPS with whichever of these you don't already have:

| Variable | Status | Notes |
|---|---|---|
| `DATABASE_URL` | required, existing | Unchanged. |
| `JWT_SECRET` | required, existing | Unchanged. |
| `API_KEY_PEPPER` | **new, recommended, sensitive** | Used to both hash and (reversibly) encrypt partner API keys (`backend/src/utils/apiKeyHash.js`). Falls back to `JWT_SECRET` if unset. Set a distinct value so rotating one secret doesn't silently invalidate the other. Treat this with the same care as `JWT_SECRET` or a database password — because API keys are now recoverable (not just hashed), whoever holds this value can decrypt every live API key in the database. Generate one with `openssl rand -hex 32`, keep it out of source control, and note that rotating it breaks BOTH the hash lookup and the decryption for every existing key (both are derived from this same value) — treat it as a one-time setup value, not something to rotate casually, and if you ever must rotate it, every partner integration needs a freshly generated key afterward. |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USER` / `MAIL_PASS` / `SYSTEM_EMAIL_FROM` | **behavior changed** | These no longer have hardcoded fallback credentials. If they weren't already set correctly in your VPS's `.env`, registration-verification emails will now silently stop sending (a warning is logged, but the request itself still succeeds) instead of attempting a connection with the old baked-in third-party credentials. Verify these are set to your real mail provider before deploying if you rely on email verification. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | new, optional | Only read by `prisma/seed.js`. Irrelevant here since you're not re-seeding an existing database — just don't accidentally re-run `npx prisma db seed` against production expecting it to change anything (it no-ops if the admin email already exists). |

`frontend/.env`'s `NEXT_PUBLIC_API_URL` is unchanged by this session's work.

## 4. Apply the schema change

There are two additive, safe schema changes from this session's work, both on `ApiKey`:
- `isMaster BOOLEAN NOT NULL DEFAULT false` — every existing row defaults to `false`, so no existing API key gains cross-operator sync privilege automatically.
- `encryptedKey TEXT NULL` — a reversible (AES-256-GCM) copy of the raw key, added so `GET /open-data/keys` can decrypt and return a key's value again anytime instead of only once at creation. Existing rows get `NULL` here (their raw value was never stored, only a one-way hash) - they'll show as "not recoverable" until revoked and regenerated. See `docs/GAP_ANALYSIS.md` for the security tradeoff this introduces (a database compromise can now recover live keys) - keep `API_KEY_PEPPER` as protected as `JWT_SECRET`.

Skip this step entirely if step 0 already confirmed both columns exist.

**Option A — match your existing practice (`db push`):**

This is what your `instruction` file already documents, and what was used to apply this same change during this session's testing.

```bash
cd /var/www/evopen-api/backend
npx prisma db push
```

Note: this session deliberately did **not** need `--accept-data-loss` for this particular change (it's a pure additive column with a default) — if Prisma prompts for that flag here, stop and read what it says it would drop before adding the flag; that's not expected for this migration.

**Option B — establish real migration tracking (recommended once, going forward):**

Your database currently has no `_prisma_migrations` bookkeeping table (confirmed during this session: `prisma migrate deploy` fails with `P3005: database schema is not empty`, because the schema was built with `db push`, not tracked migrations). If you want future schema changes to go through the safer `prisma migrate deploy` flow instead of `db push --accept-data-loss`, baseline your existing schema once:

```bash
cd /var/www/evopen-api/backend

# Tell Prisma the two pre-existing migrations are already applied (they are - they represent your current schema history):
npx prisma migrate resolve --applied 20260710150352_init
npx prisma migrate resolve --applied 20260711073935_add_ip_address_tracking

# Now both new migrations can be applied safely and tracked:
npx prisma migrate deploy
```

This applies, in order: `prisma/migrations/20260823053508_add_api_key_master_flag/migration.sql` (`ALTER TABLE ApiKey ADD COLUMN isMaster BOOLEAN NOT NULL DEFAULT false;`) and `prisma/migrations/20260823082222_add_api_key_encrypted_value/migration.sql` (`ALTER TABLE ApiKey ADD COLUMN encryptedKey TEXT NULL;`) through Prisma's tracked migration runner. After this, all future schema changes on this VPS can use `prisma migrate deploy` instead of `db push`, which refuses to run anything it can't apply safely (rather than needing you to remember `--accept-data-loss`).

Either option produces an identical resulting schema — pick A if you want the fastest path today, B if you want to stop relying on `db push` for future changes.

## 5. Regenerate the Prisma Client

Required either way, so the running Node process has the new `isMaster`/`encryptedKey` fields available on `prisma.apiKey`:

```bash
npx prisma generate
```

## 6. Restart the application

```bash
pm2 restart all
# or, if you run backend/frontend as separate PM2 processes:
pm2 restart evopen-api
pm2 restart evopen-frontend   # only if the frontend also runs under PM2 rather than being served as a static export
```

## 7. Required post-deploy actions (breaking changes from this session)

These are not database migration steps, but they are consequences of the code changes that need action on your part immediately after deploying — skipping them will cause real integrations to fail silently.

### 7a. Regenerate every partner API key

API keys are now stored as an HMAC hash instead of plaintext (`backend/src/utils/apiKeyHash.js`). **Every API key that existed before this deploy will stop authenticating the instant the new code goes live** — the stored value no longer matches a hash of itself. Keys generated *after* this deploy will also carry a reversible `encryptedKey` copy, so you (or the owning company) can copy their value again anytime from `GET /open-data/keys` — you don't have to write it down carefully this time, but you do still need to regenerate.

1. Before restarting (or immediately after, accepting a short window of partner-integration downtime), list every active key so you know who to notify:
   ```bash
   # As a SUPER_ADMIN, via the Postman collection (docs/postman/EV-Open-Data-Platform.postman_collection.json) or curl:
   curl -s https://your-api-domain/api/v1/open-data/keys -H "Authorization: Bearer <super-admin-jwt>"
   ```
2. For each company that needs a working key, generate a replacement:
   ```bash
   curl -s -X POST https://your-api-domain/api/v1/open-data/keys \
     -H "Authorization: Bearer <super-admin-jwt>" -H "Content-Type: application/json" \
     -d '{"name": "Production Key (regenerated)", "companyId": <id>}'
   ```
   The raw key is only ever shown in this response — copy it immediately.
3. If that integration relies on cross-operator sync (the `operator_reference_id`-based flow — e.g. whatever called `POST /open-data/sync-operator` with a different company's data than the key's own), grant it master privilege:
   ```bash
   curl -s -X PATCH https://your-api-domain/api/v1/open-data/keys/<newKeyId> \
     -H "Authorization: Bearer <super-admin-jwt>" -H "Content-Type: application/json" \
     -d '{"isMaster": true}'
   ```
4. Distribute the new raw key(s) to whoever/whatever calls these endpoints (update their config/secrets store).
5. Revoke the old, now-useless key rows once you've confirmed the replacements work (`DELETE /open-data/keys/:id`) — optional cleanup, they're already non-functional either way.

### 7b. Check for the old `Company.status: 'APPROVED'` bug's leftovers

A prior version of `operatorSyncController.js` set auto-provisioned companies to the invalid status `'APPROVED'` instead of `'ACTIVE'`. This session found and fixed one such row in the dev database (`MaanRishfa Ltd`). Check your production data for the same issue and correct it — a company stuck on `'APPROVED'` will fail every `ACTIVE`-only check (its users can't get past login's next-request check, its API keys fail `verifyPartnerApiKey`):

```bash
mysql -u <user> -p -e "SELECT id, name, status FROM EVChargePointDB.Company WHERE status NOT IN ('PENDING','ACTIVE','SUSPENDED');"
```

Fix any hits via `PUT /api/v1/admin/companies/:id/status` with `{"status": "ACTIVE"}` (or `SUSPENDED`, if that's actually what you want for that operator).

### 7c. Tell your team about the moderation default change

Locations/Charge Points created by a `COMPANY_ADMIN`/`STAFF` user (not `SUPER_ADMIN`) now start `isApproved: false` and must be approved via `GET/PATCH /admin/moderation/...` before they appear on the public feed. Previously everything was auto-approved. If your operators expect immediate visibility, make sure whoever handles moderation knows to check `GET /admin/moderation/submissions` regularly, or the new inventory they submit will look like it "isn't showing up."

## 8. Verification

Run through this after restarting, before considering the deploy done:

1. `curl https://your-api-domain/api/v1/open-data/feed` — should return `200` with `{ name: "Location", ... }`, no auth needed, and `RateLimit-*` headers present.
2. Log in as an existing real user (`POST /auth/login`) — confirm `200` and a valid token.
3. Test one regenerated API key against `POST /open-data/sync-operator` (or whichever partner endpoint that integration actually uses) — confirm it authenticates and behaves as expected for its master/regular privilege level.
4. Check `pm2 logs` for a few minutes for unexpected errors (particularly around mail sending, if `MAIL_*` wasn't already configured correctly — see step 3).
5. Optionally, run the full Postman collection (`docs/postman/EV-Open-Data-Platform.postman_collection.json`) against the production `baseUrl` with a **disposable Super Admin session** — it's designed to be fully self-contained and self-cleaning (creates its own company/tariff/location/etc. and deletes them all at the end via the Cleanup folder), so it won't disturb real data. Skip `Auth > Register` when doing this against production, since that one request isn't part of the auto-cleanup chain (see its description) and would leave a real test company behind.

## 9. Rollback plan

- **Code**: `git checkout <previous-commit-or-tag>` on the VPS, `npm install`, `npx prisma generate`, `pm2 restart all`. The `isMaster` and `encryptedKey` columns are harmless to leave in place even on old code — old code simply never reads or writes them. Rolling back does mean losing the "copy key anytime" capability until you roll forward again; it doesn't affect auth either way.
- **API keys**: if you roll back the code, the hashed keys generated under the new code will no longer authenticate against the old plaintext-comparison code. Keep a record of which keys were regenerated in step 7a so you can reissue plaintext-compatible ones again if you truly need to roll back (this should be rare — prefer rolling forward with a fix instead).
- **Database**: only restore from the step 1 backup if something has gone genuinely wrong with data integrity — a schema rollback isn't needed for the `isMaster` column itself (dropping it is optional cleanup, not required for the old code to function).
