from fastapi import APIRouter, HTTPException
from pathlib import Path
from pydantic import BaseModel
import mimetypes

router = APIRouter(prefix="/admin/files", tags=["admin-files"])

UPLOAD_DIR = Path("uploads")

class FileInfo(BaseModel):
    name: str
    path: str
    type: str  # image, csv, other

@router.get("/", response_model=list[FileInfo])
def list_files():
    files = []
    for f in UPLOAD_DIR.glob("*"):
        if f.is_file():
            mime, _ = mimetypes.guess_type(str(f))
            if f.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                ftype = "image"
            elif f.suffix.lower() == ".csv":
                ftype = "csv"
            else:
                ftype = "other"
            files.append(FileInfo(name=f.name, path=str(f), type=ftype))
    return files
