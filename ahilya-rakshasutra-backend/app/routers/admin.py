from typing import List
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from ..db import get_session
from ..models import Report, HoneypotEvent
from ..schemas import SummaryOut, ReportOut
from ..deps import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/summary", response_model=SummaryOut)
def summary(session: Session = Depends(get_session), _admin=Depends(get_current_admin)):
    sms = session.exec(select(Report).where(Report.type == "sms")).all()
    url = session.exec(select(Report).where(Report.type == "url")).all()
    voip = session.exec(select(Report).where(Report.type == "voip")).all()
    honeypot = session.exec(select(HoneypotEvent)).all()
    latest_q = session.exec(select(Report).order_by(Report.created_at.desc()).limit(20)).all()
    latest = [
        ReportOut(
            id=r.id, type=r.type.value, payload=r.payload_json, lat=r.lat, lon=r.lon,
            area=r.area, created_at=r.created_at.isoformat()
        )
        for r in latest_q
    ]
    return {"counts": {
        "sms": len(sms), "url": len(url), "voip": len(voip), "honeypot": len(honeypot)
    }, "latest": latest}

@router.get("/heatmap")
def heatmap(sinceHours: int = 24, session: Session = Depends(get_session), _admin=Depends(get_current_admin)):
    # sinceHours ignored for now, demo simplicity
    rows = session.exec(select(Report).order_by(Report.created_at.desc()).limit(500)).all()
    return [
        {"id": r.id, "lat": r.lat, "lon": r.lon, "type": r.type.value}
        for r in rows
    ]

@router.get("/reports")
def list_reports(
    type: str = Query("all", regex="^(all|sms|url|voip)$"),
    limit: int = 200,
    session: Session = Depends(get_session),
    _admin=Depends(get_current_admin)
):
    stmt = select(Report).order_by(Report.created_at.desc()).limit(limit)
    if type != "all":
        stmt = select(Report).where(Report.type == type).order_by(Report.created_at.desc()).limit(limit)
    rows = session.exec(stmt).all()
    return [
        {
            "id": r.id, "type": r.type.value, "payload": r.payload_json,
            "lat": r.lat, "lon": r.lon, "area": r.area,
            "created_at": r.created_at.isoformat()
        } for r in rows
    ]
