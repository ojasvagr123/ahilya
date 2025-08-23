from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select
from datetime import datetime
import io, csv, json, os, smtplib
from email.message import EmailMessage
from typing import Optional, List

from ..db import get_session
from ..models import Report, ReportType
from ..schemas import ReportIn, ReportOut
from ..deps import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

# -----------------------------
# SMTP helper (handles 465/587)
# -----------------------------
def _send_via_smtp(msg: EmailMessage):
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    pw   = os.getenv("SMTP_PASS")
    if not (user and pw):
        raise RuntimeError("SMTP_USER/PASS missing")

    # Debug so we see what values FastAPI is actually using
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

# -----------------------------
# Create report (unchanged)
# -----------------------------
@router.post("", response_model=ReportOut)
def create_report(
    body: ReportIn,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    if body.type not in ("sms", "url", "voip"):
        raise HTTPException(status_code=400, detail="type must be sms|url|voip")
    rep = Report(
        type=ReportType(body.type),
        payload_json=body.payload or {},
        lat=body.lat,
        lon=body.lon,
        area=body.area or "Unknown",
        created_by=user.id,
    )
    session.add(rep)
    session.commit()
    session.refresh(rep)
    return ReportOut(
        id=rep.id,
        type=rep.type.value,
        payload=rep.payload_json,
        lat=rep.lat,
        lon=rep.lon,
        area=rep.area,
        created_at=rep.created_at.isoformat(),
    )

# -----------------------------
# Helpers
# -----------------------------
def _query_reports(
    session: Session,
    type: Optional[str],
    area: Optional[str],
    start: Optional[datetime],
    end: Optional[datetime],
    limit: Optional[int],
):
    stmt = select(Report).order_by(Report.created_at.desc())
    if type:
        if type not in ("sms", "url", "voip"):
            raise HTTPException(status_code=400, detail="type must be sms|url|voip")
        stmt = stmt.where(Report.type == ReportType(type))
    if area:
        stmt = stmt.where(Report.area == area)
    if start:
        stmt = stmt.where(Report.created_at >= start)
    if end:
        stmt = stmt.where(Report.created_at <= end)
    if limit:
        stmt = stmt.limit(limit)
    return session.exec(stmt).all()

def _csv_for_reports(rows: List[Report]) -> bytes:
    headers = ["id", "type", "area", "lat", "lon", "payload", "created_at"]
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    for r in rows:
        w.writerow([
            r.id,
            r.type.value if isinstance(r.type, ReportType) else r.type,
            r.area or "",
            r.lat or "",
            r.lon or "",
            json.dumps(r.payload_json or {}, ensure_ascii=False),
            r.created_at.isoformat() if getattr(r, "created_at", None) else "",
        ])
    return buf.getvalue().encode("utf-8")

# -----------------------------
# Export CSV
# -----------------------------
@router.get("/export")
def export_reports_csv(
    type: str | None = Query(default=None, description="sms | url | voip"),
    area: str | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    limit: int = Query(default=10000, le=100000),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    rows = _query_reports(session, type, area, start, end, limit)
    filename = f"reports_{datetime.now():%Y%m%d_%H%M%S}.csv"
    return StreamingResponse(
        io.BytesIO(_csv_for_reports(rows)),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# -----------------------------
# Share to department (demo)
# -----------------------------
class ShareReq(BaseModel):
    department: str                 # "CYBER_CRIME" | "TEAMMATE" (demo)
    report_ids: List[int] = []      # optional; if empty, use filters below
    note: str | None = None
    # optional filters to share what's visible if report_ids not provided
    type: str | None = None         # "sms" | "url" | "voip"
    area: str | None = None
    start: datetime | None = None
    end: datetime | None = None
    limit: int | None = 10000

@router.post("/share")
def share_reports(
    body: ShareReq,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    # Resolve target email from demo mapping
    dept_emails = {
        "CYBER_CRIME": os.getenv("DEMO_CYBER_EMAIL"),
        "TEAMMATE": os.getenv("DEMO_TEAMMATE_EMAIL"),
    }
    to_addr = dept_emails.get(body.department)
    if not to_addr:
        raise HTTPException(status_code=400, detail="Unknown department or email not configured")

    # Gather rows either by explicit IDs or by filters
    if body.report_ids:
        rows = session.exec(select(Report).where(Report.id.in_(body.report_ids))).all()
    else:
        rows = _query_reports(session, body.type, body.area, body.start, body.end, body.limit)

    if not rows:
        raise HTTPException(status_code=404, detail="No reports to share")

    csv_bytes = _csv_for_reports(rows)
    filename = f"reports_{datetime.now():%Y%m%d_%H%M%S}.csv"

    # Email configuration
    smtp_user = os.getenv("SMTP_USER")
    from_addr = os.getenv("FROM_EMAIL") or smtp_user
    if not (smtp_user and from_addr):
        raise HTTPException(status_code=500, detail="SMTP not configured (USER/FROM_EMAIL)")

    # Compose message
    subject = f"Ahilya RakshaSutra: {len(rows)} report(s) for {body.department}"
    text = f"""Hello,

Please find attached {len(rows)} report(s) from Ahilya RakshaSutra.

Requested by: {getattr(user, 'name', 'admin')} (id: {getattr(user, 'id', 'unknown')})
Department: {body.department}
Note: {body.note or '-'}

Time: {datetime.now().isoformat()}
"""
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg.set_content(text)
    msg.add_attachment(csv_bytes, maintype="text", subtype="csv", filename=filename)

    # Send (single path, uses helper)
    try:
        _send_via_smtp(msg)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"SMTP error: {e}")

    return {"ok": True, "sent_to": to_addr, "count": len(rows), "filename": filename}
