#!/usr/bin/env python3
"""
Connector bridge for the health dashboard.

Garmin and MyFitnessPal have no public API for personal use, and both block
ordinary server HTTP clients by TLS fingerprint. The maintained Python
libraries get past that (python-garminconnect, curl_cffi), so the Node server
runs this script as a long-lived child process and talks to it over stdin/stdout,
one JSON object per line:

    -> {"id": 1, "method": "garmin.login", "params": {...}}
    <- {"id": 1, "result": {...}}        or   {"id": 1, "error": "message"}

The process stays alive so a Garmin login can pause for a two-step verification
code and resume on the same session. Passwords are never written anywhere; only
the session tokens Garmin issues are returned for the server to store.
"""

import json
import sys
import traceback

try:
    from garminconnect import Garmin
except Exception:  # pragma: no cover - reported per call
    Garmin = None

try:
    from curl_cffi import requests as cffi_requests
except Exception:  # pragma: no cover - reported per call
    cffi_requests = None

# A Garmin login waiting for its verification code, keyed by nothing: one user.
_pending_garmin = None


def _need(lib, name):
    if lib is None:
        raise RuntimeError(f"{name} is not installed. Run: pip install -r connectors/requirements.txt")


def garmin_login(params):
    """Start a Garmin login. Returns {status: "ok", tokens} or {status: "needs_mfa"}."""
    global _pending_garmin
    _need(Garmin, "garminconnect")
    client = Garmin(params["email"], params["password"], return_on_mfa=True)
    status, _ = client.login()
    if status == "needs_mfa":
        _pending_garmin = client
        return {"status": "needs_mfa"}
    return {"status": "ok", "tokens": client.client.dumps(), "displayName": client.display_name}


def garmin_mfa(params):
    """Finish a pending Garmin login with the code Garmin sent."""
    global _pending_garmin
    if _pending_garmin is None:
        raise RuntimeError("No Garmin sign-in is waiting for a code. Start again.")
    client = _pending_garmin
    client.resume_login(None, str(params["code"]).strip())
    _pending_garmin = None
    return {"status": "ok", "tokens": client.client.dumps(), "displayName": client.display_name}


def garmin_sync(params):
    """Daily summaries, sleep and recent activities for an inclusive date list."""
    _need(Garmin, "garminconnect")
    client = Garmin()
    client.login(params["tokens"])  # inline JSON tokenstore; refreshes automatically
    days = []
    for date in params["dates"]:
        summary = _safe(lambda: client.get_user_summary(date)) or {}
        sleep = _safe(lambda: client.get_sleep_data(date))
        days.append({"date": date, "summary": summary, "sleep": sleep})
    activities = _safe(lambda: client.get_activities(0, int(params.get("activityLimit", 30)))) or []
    return {"days": days, "activities": activities, "tokens": client.client.dumps()}


def mfp_fetch(params):
    """Fetch MyFitnessPal diary pages as a browser would. Parsing happens in Node."""
    _need(cffi_requests, "curl_cffi")
    session = cffi_requests.Session(impersonate="chrome")
    headers = {"Accept": "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9"}
    if params.get("cookie"):
        headers["Cookie"] = params["cookie"]
    pages = []
    for date in params["dates"]:
        url = f"https://www.myfitnesspal.com/food/diary/{params['username']}?date={date}"
        res = session.get(url, headers=headers, timeout=30, allow_redirects=True)
        pages.append({"date": date, "status": res.status_code, "url": str(res.url), "html": res.text})
    return {"pages": pages}


def _safe(fn):
    try:
        return fn()
    except Exception:
        return None


METHODS = {
    "garmin.login": garmin_login,
    "garmin.mfa": garmin_mfa,
    "garmin.sync": garmin_sync,
    "mfp.fetch": mfp_fetch,
    "ping": lambda _p: {"ok": True, "garmin": Garmin is not None, "curl_cffi": cffi_requests is not None},
}


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req_id = None
        try:
            req = json.loads(line)
            req_id = req.get("id")
            fn = METHODS.get(req.get("method"))
            if fn is None:
                raise RuntimeError(f"Unknown method {req.get('method')}")
            out = {"id": req_id, "result": fn(req.get("params") or {})}
        except Exception as exc:  # noqa: BLE001 - every failure goes back to Node
            message = str(exc) or exc.__class__.__name__
            print(traceback.format_exc(), file=sys.stderr, flush=True)
            out = {"id": req_id, "error": message}
        sys.stdout.write(json.dumps(out) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
