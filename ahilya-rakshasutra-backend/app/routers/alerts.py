# app/routers/alerts.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session
from typing import Optional, List
from datetime import datetime
import io, csv, os, re, smtplib
from email.message import EmailMessage

from ..db import get_session
from ..deps import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])

# ---------------- SMTP helper (465 or 587) ----------------
def _send_via_smtp(msg: EmailMessage):
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    pw   = os.getenv("SMTP_PASS")
    if not (user and pw):
        raise RuntimeError("SMTP_USER/PASS missing")

    print(f"[SMTP DEBUG] host={host} port={port} user={user} pass_len={len(pw)}")
    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=20) as s:
            s.login(user, pw)
            s.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=20) as s:
            s.starttls()
            s.login(user, pw)
            s.send_message(msg)

# ---------------- recipients parsing ----------------
EMAIL_RE = re.compile(r"^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$", re.IGNORECASE)

def _parse_emails_csv(content: bytes) -> list[str]:
    """Accepts headered CSV with 'email' or one email per line."""
    text = content.decode("utf-8-sig", errors="ignore")
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    emails: list[str] = []
    seen = set()

    # Headered CSV?
    if lines and ("," in lines[0] or ";" in lines[0]):
        f = io.StringIO(text)
        reader = csv.DictReader(f)
        pick = None
        if reader.fieldnames:
            low = [c.strip().lower() for c in reader.fieldnames]
            for c in low:
                if c in {"email", "mail", "e-mail"}:
                    pick = c; break
        for row in reader:
            raw = (row.get(pick) if pick else None) or next(iter(row.values() or []), "")
            e = str(raw).strip()
            if EMAIL_RE.match(e) and e not in seen:
                seen.add(e); emails.append(e)
        return emails

    # Otherwise one per line
    for l in lines:
        if EMAIL_RE.match(l) and l not in seen:
            seen.add(l); emails.append(l)
    return emails

def _parse_emails_text(to_text: str) -> list[str]:
    emails: list[str] = []
    seen = set()
    for token in re.split(r"[,\s]+", to_text or ""):
        token = token.strip()
        if EMAIL_RE.match(token) and token not in seen:
            seen.add(token); emails.append(token)
    return emails

def _send_email_bcc(subject: str, html_body: str, recipients: list[str]) -> tuple[int, int, list[dict]]:
    """
    Send to many recipients via BCC in small batches.
    Returns (sent_count, failed_count, batch_details).
    """
    from_addr = os.getenv("FROM_EMAIL") or os.getenv("SMTP_USER")
    if not from_addr:
        raise HTTPException(status_code=500, detail="SMTP FROM not configured")

    # crude text fallback
    text_body = re.sub(r"<[^>]+>", "", html_body)

    batch_size = 40
    sent = failed = 0
    details: list[dict] = []

    for i in range(0, len(recipients), batch_size):
        batch = recipients[i:i+batch_size]
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = from_addr
        msg["To"] = from_addr
        msg["Bcc"] = ", ".join(batch)
        msg.set_content(text_body)
        msg.add_alternative(html_body, subtype="html")
        try:
            _send_via_smtp(msg)
            sent += len(batch)
            details.append({"batch": i // batch_size + 1, "ok": True, "count": len(batch)})
        except Exception as e:
            failed += len(batch)
            details.append({"batch": i // batch_size + 1, "ok": False, "count": len(batch), "err": str(e)[:200]})
    return sent, failed, details

# ---------------- API: preview (optional) ----------------
@router.post("/preview_emails")
def preview_emails(
    file: Optional[UploadFile] = File(None),
    to_text: str = Form(""),
    user=Depends(get_current_user),
):
    emails: list[str] = []
    if file:
        content = file.file.read()
        emails.extend(_parse_emails_csv(content))
    emails.extend(_parse_emails_text(to_text))
    # de-dup
    emails = list(dict.fromkeys(emails))
    return {"count": len(emails), "emails": emails[:50]}

# ---------------- API: send email alert ----------------
@router.post("/send")
def send_email_alert(
    subject: str = Form("Ahilya Alert"),
    category: str = Form("GENERAL"),
    message: str = Form(...),
    # recipients: CSV file and/or textarea
    file: Optional[UploadFile] = File(None),
    to_text: str = Form(""),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    emails: list[str] = []
    if file:
        content = file.file.read()
        emails.extend(_parse_emails_csv(content))
    emails.extend(_parse_emails_text(to_text))
    emails = list(dict.fromkeys(e for e in emails if e))  # de-dup

    if not emails:
        raise HTTPException(status_code=400, detail="No valid email recipients found")

    # Simple HTML
    html = f"""
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:640px">
      <h2 style="margin:0 0 12px">Alert: {category}</h2>
      <p style="white-space:pre-wrap">{message}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:16px 0" />
      <p style="color:#666;font-size:12px">Sent by Ahilya RakshaSutra • {datetime.now().strftime("%d %b %Y %H:%M")}</p>
    </div>
    """

    sent, failed, batches = _send_email_bcc(subject, html, emails)
    return {
        "ok": failed == 0,
        "sent": sent,
        "failed": failed,
        "batches": batches,
        "recipients": len(emails)
    }
