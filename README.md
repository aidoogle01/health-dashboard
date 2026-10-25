# Health dashboard — MyFitnessPal + Oura Ring + Garmin

A self-hosted dashboard that pulls nutrition, sleep, recovery, and activity data
from your three services on a schedule and updates the page live (no refresh).

It is built to help you move the numbers, not just show them. The design follows
the UX research in [`docs/research/Health dashboard UX and Oura design.md`](docs/research/Health%20dashboard%20UX%20and%20Oura%20design.md):
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

## Set up your real data (cloud, always on)

This takes about 20 minutes. You need a [Railway](https://railway.com) account (Hobby plan, about $5/month),
an active Oura Membership (Oura's API requires it), and your Garmin and MyFitnessPal logins.

### 1. Deploy to Railway
1. In Railway, choose **New Project → Deploy from GitHub repo** and pick `aidoogle01/health-dashboard`.
2. Open the new service's **Settings**:
   - **Source → Branch**: `main`.
   - **Config-as-code → Railway config file**: `/railway.json`.
     This makes Railway build the `Dockerfile` in the repo root.
3. **Add a volume** (right-click the service, or ⌘K → "Volume") and mount it at **`/data`**.
   This is where your synced data and sign-in sessions live; without it every redeploy forgets them.
4. **Settings → Networking → Generate Domain**. Copy the address, e.g. `https://meals-dashboard.up.railway.app`.
5. **Variables**: add
   | Name | Value |
   |---|---|
   | `DASHBOARD_PASSWORD` | a long password you'll use to open the dashboard (required; the app won't start without it) |
   | `PUBLIC_URL` | the domain from step 4 |
6. Deploy. Open the domain and sign in with any username and your `DASHBOARD_PASSWORD`.
   You'll see sample data and a **Connect accounts** button.

### 2. Connect Oura (official API, OAuth)
Oura retired personal access tokens at the end of 2025, so you register a free personal app once:
1. Go to <https://cloud.ouraring.com/oauth/applications> → **New application**.
2. Set the **Redirect URI** to `<PUBLIC_URL>/auth/oura/callback` (exact match, https).
3. Copy the **Client ID** and **Client Secret** into Railway variables `OURA_CLIENT_ID` and `OURA_CLIENT_SECRET`. Railway redeploys.
4. In the dashboard, **Connections → Connect Oura**, approve on Oura's page, and you're sent back. The first sync pulls 90 days.

### 3. Connect Garmin
**Connections → Garmin**: enter your Garmin email and password. If your account uses two-step
verification, a code box appears; enter the code Garmin emails or texts you. Your password is used
once and never stored; the session Garmin issues is kept on your volume and refreshed automatically.

Garmin has no personal API, so this uses the community-maintained
[python-garminconnect](https://github.com/cyberjunky/python-garminconnect). Garmin occasionally changes its
sign-in; if the Garmin chip shows an error, bump the version in `connectors/requirements.txt` and redeploy.

### 4. Connect MyFitnessPal
**Connections → MyFitnessPal**: enter your username and paste your browser's cookie (the panel shows
how to copy it). Leave the cookie empty if your diary is public (MyFitnessPal → Settings → Diary
Settings → Diary Sharing). **Test and connect** checks it can read today's diary before saving.
The cookie lasts about a month; the chip tells you when to paste a fresh one.

MyFitnessPal has no public API and challenges traffic from cloud servers more than home connections.
If it blocks your server, use **Import MFP CSV** with the export from MyFitnessPal Premium
(Settings → Export data) for history.

### Run it on your own computer instead
```bash
npm install
python3 -m venv .venv && .venv/bin/pip install -r connectors/requirements.txt
cp .env.example .env   # set DASHBOARD_PASSWORD and the Oura app keys
PYTHON_BIN=.venv/bin/python node --env-file=.env --import tsx src/index.ts
# open http://localhost:3100 (Oura redirect URI: http://localhost:3100/auth/oura/callback)
```

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
docker build -t health-dashboard .
docker run -p 3100:3100 --env-file .env -v dashboard-data:/data health-dashboard
```

It must run on a host that **stays on**, with a **persistent disk** mounted at
`/data`. Free tiers that sleep when idle (such as Render free) stop the scheduler
and lose saved sign-ins. See "Set up your real data" above for Railway.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/dashboard?days=365` | Days, activities, source status, goals, experiments |
| GET / PUT | `/api/goals` | Read or replace your goals |
| POST / DELETE | `/api/experiments[/:id]` | Start or remove a two-week experiment |
| GET | `/api/connections` | Which sources are connected (never returns credentials) |
| GET | `/auth/oura/start`, `/auth/oura/callback` | Oura OAuth sign-in |
| POST | `/api/connect/garmin`, `/api/connect/garmin/code` | Garmin sign-in, then verification code if asked |
| POST | `/api/connect/mfp` | Save a MyFitnessPal username and cookie after a test read |
| DELETE | `/api/connect/:source` | Disconnect `oura`, `garmin` or `mfp` |
| GET | `/api/stream` | Server-sent `update` events |
| POST | `/api/sync` | `{"source":"oura"\|"garmin"\|"mfp"}` or `{}` for all |
| POST | `/api/import/mfp` | MyFitnessPal CSV body (`Content-Type: text/csv`) |
| GET | `/health` | Liveness (no auth) |

## Tests

```bash
npm test        # parsers, mappers and insight maths
npm run typecheck
```
