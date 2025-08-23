from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

# Load .env from backend root, regardless of cwd
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH)

from .db import init_db
from app.routers.auth import router as auth_router
from app.routers.reports import router as reports_router
from app.routers.admin import router as admin_router
from app.routers import predict
from app.routers.alerts import router as alerts_router

app = FastAPI(title="Ahilya RakshaSutra API", version="0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

@app.on_event("startup")
def on_startup():
    init_db()  # just migrations/DDL; do NOT run models here

app.include_router(auth_router)
app.include_router(reports_router)
app.include_router(admin_router)
app.include_router(predict.router)
app.include_router(alerts_router)

@app.get("/health")
def health():
    return {"ok": True}
