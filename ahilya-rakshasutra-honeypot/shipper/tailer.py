import os, time, json, requests

BACKEND = os.environ.get("BACKEND_API_BASE", "http://localhost:8080").rstrip("/")
TOKEN = os.environ.get("INGEST_TOKEN", "dev")
LOG = "/cowrie-var/log/cowrie/cowrie.json"

def send(ev):
    try:
        # Map Cowrie event to your FastAPI model
        requests.post(
            f"{BACKEND}/honeypot/cowrie/ingest",
            json={
                "timestamp": ev.get("timestamp"),
                "src_ip": ev.get("src_ip"),
                "message": ev.get("message"),
                "sensor": ev.get("sensor"),
            },
            headers={"X-INGEST-TOKEN": TOKEN},
            timeout=2,
        )
    except Exception:
        pass

def tail(path):
    with open(path, "r", encoding="utf-8") as f:
        f.seek(0, 2)
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.5)
                continue
            try:
                ev = json.loads(line.strip())
                # Filter interesting events if you want. For demo, send most.
                if ev.get("eventid", "").startswith("cowrie."):
                    send(ev)
            except Exception:
                continue

if __name__ == "__main__":
    # Wait for Cowrie log to exist
    while not os.path.exists(LOG):
        time.sleep(1)
    tail(LOG)
