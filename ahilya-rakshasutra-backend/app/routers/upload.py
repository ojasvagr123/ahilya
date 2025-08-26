from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
import os, shutil
from ..db import get_session
from ..models import Upload
from ..deps import get_current_user

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    name: str = Form(...),
    location: str = Form(...),
    filetype: str = Form(...),  # 'image' or 'app'
    db: Session = Depends(get_session),
    user=Depends(get_current_user)
):
    if filetype not in ["image", "app"]:
        raise HTTPException(status_code=400, detail="filetype must be 'image' or 'app'")

    # Save file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Save metadata to DB
    record = Upload(
        filename=file.filename,
        filetype=filetype,
        name=name,
        location=location,
        path=file_path,
        uploaded_by=user.id
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {
        "id": record.id,
        "filename": record.filename,
        "filetype": record.filetype,
        "name": record.name,
        "location": record.location,
        "message": "Upload successful"
    }
