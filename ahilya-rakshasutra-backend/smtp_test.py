# smtp_test.py
import os, smtplib
from email.message import EmailMessage
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    raise SystemExit("python-dotenv not installed. Run: pip install python-dotenv")

# Load .env that sits next to this file
env_path = Path(__file__).with_name(".env")
if not env_path.exists():
    raise SystemExit(f".env not found at {env_path}. Put smtp_test.py next to your .env.")

load_dotenv(env_path)

host = os.getenv("SMTP_HOST", "smtp.gmail.com")
port = int(os.getenv("SMTP_PORT", "587"))
user = os.getenv("SMTP_USER") or ""
pw   = os.getenv("SMTP_PASS") or ""
from_addr = os.getenv("FROM_EMAIL", user)
to_addr   = os.getenv("DEMO_TEAMMATE_EMAIL", from_addr)

print(f"[ENV] host={host} port={port} user={user} from={from_addr} pass_len={len(pw)}")
if len(pw) != 16:
    raise SystemExit("Password length is not 16. This is not a Gmail App Password. Fix .env.")

msg = EmailMessage()
msg["Subject"] = "SMTP sanity check"
msg["From"] = from_addr
msg["To"] = to_addr
msg.set_content("If you receive this, SMTP login + send works.")

try:
    if port == 465:
        s = smtplib.SMTP_SSL(host, port, timeout=20)
    else:
        s = smtplib.SMTP(host, port, timeout=20)
        s.starttls()
    s.set_debuglevel(1)  # shows SMTP dialog; comment this if too noisy
    s.login(user, pw)
    s.send_message(msg)
    s.quit()
    print("SUCCESS: login + send worked.")
except Exception as e:
    print("FAIL:", repr(e))
    raise
