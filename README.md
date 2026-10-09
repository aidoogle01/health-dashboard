# Health dashboard — MyFitnessPal + Oura Ring + Garmin

A self-hosted dashboard that pulls nutrition, sleep, recovery, and activity data
from your three services on a schedule and updates the page live (no refresh).

It is built to help you move the numbers, not just show them. The design follows
the UX research in [`reports/Health dashboard UX and Oura design.md`](../../reports/Health%20dashboard%20UX%20and%20Oura%20design.md):
compare yourself with your own usual range, forgive missed days, show how sure
each insight is, and turn insights into small experiments.

- **Today**: one main focus for the day (Oura's "One Big Thing" pattern), with
  low days explained in four steps: the fact, a likely reason, one action, and
  reassurance. Goal bars with a pace marker and a "3 of 5 days this week" line.
  Recovery signals labelled *Higher than usual*, *Within your usual* or *Lower
  than usual* against the middle 80% of your last 30 days.
- **Habits**: weekly goals ("5 of 7 days") with spare days built in. Days with
  no data never count against you, and a streak shows only while it's alive.
  Each night's bedtime and wake time against your target window.
- **Insights**: next-morning readiness, sleep score or HRV after days with each
  habit vs without. Each habit needs 10 days on each side before it is shown,
  and comes with a 95% range, a confidence word and other differences between
  the groups. A **Try for 2 weeks** experiment button compares the result with
  the two weeks before ("inconclusive" is a valid result). Also a week in
  review that leads with wins, and nutrition as 7-day averages against a range,
  not a running deficit.
- **Trends**: daily dots, 7-day averages, goal lines and your usual-range band.
  Each recent activity shows how recovered you were the next morning.

Goals (sleep, bedtime, steps, protein, fibre, calories, days per week, weekly
intensity) are editable from the **Goals** button. Calories can be hidden
entirely.

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
| `BACKFILL_DAYS` / `RESYNC_DAYS` | 90 / 3 | History fetched on startup / days re-fetched on each sync |
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
| GET | `/api/dashboard?days=365` | Days, activities, source status, goals, experiments |
| GET / PUT | `/api/goals` | Read or replace your goals |
| POST / DELETE | `/api/experiments[/:id]` | Start or remove a two-week experiment |
| GET | `/api/stream` | Server-sent `update` events |
| POST | `/api/sync` | `{"source":"oura"\|"garmin"\|"mfp"}` or `{}` for all |
| POST | `/api/import/mfp` | MyFitnessPal CSV body (`Content-Type: text/csv`) |
| GET | `/health` | Liveness (no auth) |

## Tests

```bash
pnpm --filter @mealwise/dashboard test        # parsers, mappers and insight maths
pnpm --filter @mealwise/dashboard typecheck
```
