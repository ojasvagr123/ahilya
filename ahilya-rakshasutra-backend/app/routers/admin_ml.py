# app/routers/admin_ml.py
from __future__ import annotations
import os
from pathlib import Path
from typing import List, Literal
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from urllib.parse import quote

router = APIRouter(prefix="/admin-ml", tags=["admin-ml"])

# Project root: .../ahilya-rakshasutra-backend
PROJECT_ROOT = Path(__file__).resolve().parents[2]
# Use env if provided, else <project>/uploads  (matches your folder)
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(PROJECT_ROOT / "uploads"))).resolve()

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}

class FileItem(BaseModel):
    name: str
    path: str         # absolute path on server
    size: int
    ext: str          # "png", "jpg", ...
    type: str         # "image" | "other"
    url: str          # preview URL for the frontend

class FilesResponse(BaseModel):
    files: List[FileItem]

@router.get("/files", response_model=FilesResponse)
def list_files():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    items: List[FileItem] = []
    for p in sorted(UPLOAD_DIR.iterdir(), key=lambda x: x.name.lower()):
        if not p.is_file():
            continue
        ext = p.suffix.lower()
        ftype = "image" if ext in IMAGE_EXTS else "other"
        # We return a URL the client can use directly. No guessing.
        preview_url = f"/admin-ml/file?path={quote(str(p.resolve()))}"
        items.append(FileItem(
            name=p.name,
            path=str(p.resolve()),
            size=p.stat().st_size,
            ext=ext.lstrip("."),
            type=ftype,
            url=preview_url
        ))
    return FilesResponse(files=items)

# Raw file streaming for previews
@router.get("/file")
def get_file(path: str):
    p = Path(path)
    if not p.is_absolute():
        p = (UPLOAD_DIR / path).resolve()
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail="File not found on server")
    # FastAPI will set content-type correctly for common image types
    return FileResponse(p)

# ---------- RUN ENDPOINT ----------
class RunRequest(BaseModel):
    path: str
    model: Literal["auto", "deepfake", "malware"] = "auto"

class RunResponse(BaseModel):
    path: str
    model: str
    label: str
    confidence: float

@router.post("/run", response_model=RunResponse)
def run(req: RunRequest):
    p = Path(req.path)
    if not p.is_absolute():
        p = (UPLOAD_DIR / req.path).resolve()
    if not p.exists() or not p.is_file():
        raise HTTPException(status_code=404, detail="File not found on server")

    ext = p.suffix.lower()
    model = req.model
    if model == "auto":
        if ext in IMAGE_EXTS:
            model = "deepfake"
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    try:
        from app.ml_service import run_file
        res = run_file(str(p), model)  # returns {path, model, prediction, score, ...}
        return RunResponse(
            path=res["path"],
            model=res["model"],
            label=res["prediction"],
            confidence=float(res["score"]),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
