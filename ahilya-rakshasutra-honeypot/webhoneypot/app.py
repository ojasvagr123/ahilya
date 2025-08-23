import os
from flask import Flask, request, Response

BACKEND = os.environ.get("BACKEND_API_BASE", "http://localhost:8080").rstrip("/")
TOKEN = os.environ.get("INGEST_TOKEN", "dev")
DEFAULT_AREA = os.environ.get("HONEYPOT_AREA", "Unknown")

import requests

app = Flask(__name__)

LOGIN_HTML = """<!doctype html><html><head><meta charset="utf-8"><title>Secure Bank | Login</title>
<style>body{font-family:system-ui;background:#0b1220;color:#e5e7eb;display:grid;place-items:center;height:100vh}
form{background:#0f172a;border:1px solid #1f2937;border-radius:12px;padding:24px;width:340px}
label{display:block;font-size:12px;color:#94a3b8;margin-bottom:6px}
input{width:100%;padding:10px;border-radius:8px;border:1px solid #334155;background:#0b1220;color:#e5e7eb}
button{width:100%;padding:10px;border-radius:8px;background:#2563eb;color:white;border:0;margin-top:12px}</style></head>
<body><form method="post" action=""><h2 style="margin:0 0 12px 0">Secure Bank Login</h2>
<label>Username</label><input name="username" /><label style="margin-top:8px">Password</label>
<input name="password" type="password" /><button>Sign in</button>
<p style="font-size:12px;color:#94a3b8;margin-top:10px">For demo only.</p></form></body></html>"""

@app.get("/bank/login")
def fake_login_page():
    # Only render. The POST below performs logging.
    return Response(LOGIN_HTML, mimetype="text/html")

@app.post("/bank/login")
def fake_login_submit():
    ua = request.headers.get("user-agent", "")
    ip = request.headers.get("x-forwarded-for", request.remote_addr) or "unknown"
    area = request.args.get("area") or DEFAULT_AREA
    # Send to your FastAPI ingest endpoint (you’ll add it if not present)
    try:
        requests.post(
            f"{BACKEND}/honeypot/web/ingest",
            json={"ip": ip, "user_agent": ua, "path": "/honeypot/bank/login", "area": area},
            headers={"X-INGEST-TOKEN": TOKEN},
            timeout=2,
        )
    except Exception:
        pass
    return Response(
        "<html><body style='font-family:system-ui;background:#0b1220;color:#e5e7eb;display:grid;place-items:center;height:100vh'><div>Thanks. Your request is being processed.</div></body></html>",
        mimetype="text/html",
    )

@app.get("/healthz")
def healthz():
    return {"ok": True}
