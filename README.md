# Health dashboard — MyFitnessPal + Oura Ring + Garmin

A self-hosted dashboard that pulls nutrition, sleep, recovery, and activity data
from your three services on a schedule and updates the page live (no refresh).

- **Today tiles**: sleep score, readiness, steps, calories eaten vs goal, calories
  burned, resting HR, HRV, Body Battery, each with a 14-day sparkline and a
  comparison to your 7-day average
- **Trends**: sleep & readiness, energy balance (eaten vs burned), macros, steps,
  sleep stages, resting HR, HRV. Hover or use the arrow keys for values; every
  chart has a table view.
- **Recent Garmin activities**
- **Source status**: last sync, next sync, and the exact error when a connection fails

## How the auto-updating works

```
 Oura API ─┐                           ┌─ /api/dashboard (JSON)
 Garmin  ──┼─► scheduler ─► store ─────┤
 MFP     ──┘   (per-source interval)   └─ /api/stream (Server-Sent Events) ─► browser refetches
```

Each source syncs on its own interval: Oura every 30 min, Garmin every 15, MFP
every 10. You can change these in the env file. The first run backfills
`BACKFILL_DAYS` of history. Later runs re-fetch the last `RESYNC_DAYS` days,
because data often arrives late (last night's sleep, meals you log afterwards).
When a sync finishes, the server pushes an event and every open dashboard
reloads its data. **Sync now** starts an immediate sync.

## Quick start

```bash
pnpm install --filter @mealwise/dashboard
cp apps/dashboard/.env.example apps/dashboard/.env   # fill in what you have
cd apps/dashboard && node --env-file=.env --import tsx src/index.ts
# open http://localhost:3100
```

With no credentials set, the dashboard runs on **demo data**, so you can see it
working right away. Any source you connect switches to real data. The others stay
on demo data only if `DEMO_MODE=true`.

## Connecting each source

### Oura Ring (official API)
1. Option A: create a token at <https://cloud.ouraring.com/personal-access-tokens>
   and set `OURA_ACCESS_TOKEN`.
2. Option B (OAuth, which Oura is moving to): register an app at
   <https://cloud.ouraring.com/oauth/applications>, complete the authorization
   once, then set `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET` and
   `OURA_REFRESH_TOKEN`. Oura refresh tokens can only be used once, so the
   dashboard saves each new token in `DATA_DIR`. Keep that directory between
   restarts.

### Garmin (unofficial)
Garmin's official Health API is open only to approved business partners. This
connector signs in to Garmin Connect the way the website does, using
[`garmin-connect`](https://www.npmjs.com/package/garmin-connect). Set
`GARMIN_EMAIL` and `GARMIN_PASSWORD`.
- The session is cached in `DATA_DIR`, so the dashboard only signs in again when
  the session expires. Garmin may block accounts that sign in too often.
- **Accounts with two-factor authentication (MFA) are not supported** by the library.
- Garmin can change its login flow without notice. If the Garmin chip shows a
  sign-in error, update the `garmin-connect` package first.

### MyFitnessPal (no public API)
MyFitnessPal closed its API to new developers. There are two ways in:
1. **Live sync (diary page)**: set `MFP_USERNAME`. If your diary is private,
   also set `MFP_COOKIE`: copy the whole `Cookie` request header from a
   logged-in browser (DevTools → Network → any myfitnesspal.com request). The
   cookie expires after a while. When it does, the chip shows *"session
   expired"* and you paste a new one.
2. **CSV import**: export your data (MyFitnessPal Premium → *Export data*), then
   click **Import MFP CSV** and pick the *Nutrition Summary* file. Use this to
   load history, or as a fallback if the diary page changes.

## Configuration

See [`.env.example`](./.env.example). Key settings:

| Variable | Default | Purpose |
|---|---|---|
| `DASHBOARD_PASSWORD` | – | HTTP basic-auth password. **Set this** whenever the dashboard is reachable from outside your machine: it shows health data. |
| `DATA_DIR` | `./data` | JSON store for synced data and refreshed tokens (file mode 600) |
| `BACKFILL_DAYS` / `RESYNC_DAYS` | 30 / 3 | History fetched on startup / days re-fetched on each sync |
| `*_SYNC_MINUTES` | 30 / 15 / 10 | Sync interval per source |

## Deploying

```bash
docker build -f apps/dashboard/Dockerfile -t health-dashboard .
docker run -p 3100:3100 --env-file apps/dashboard/.env -v dashboard-data:/data health-dashboard
```

It must run on a host that **stays on**, with a **persistent disk** mounted at
`/data`. Free tiers that sleep when idle (such as Render free) stop the scheduler
and lose saved tokens. A small always-on VM or a paid instance with a disk works.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/dashboard?days=30` | Days, activities, source status |
| GET | `/api/stream` | Server-sent `update` events |
| POST | `/api/sync` | `{"source":"oura"\|"garmin"\|"mfp"}` or `{}` for all |
| POST | `/api/import/mfp` | MyFitnessPal CSV body (`Content-Type: text/csv`) |
| GET | `/health` | Liveness (no auth) |

## Tests

```bash
pnpm --filter @mealwise/dashboard test        # parsers & mappers
pnpm --filter @mealwise/dashboard typecheck
```
