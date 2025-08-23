# app/routers/predict.py
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from app.ml_service import service

router = APIRouter(prefix="/predict", tags=["predict"])

TypeLit = Literal["SMS", "VOIP", "URL"]

class Item(BaseModel):
    id: Optional[int | str] = None
    text: str = Field(..., min_length=1)
    type: TypeLit

@router.post("/batch")
def predict_batch(items: List[Item]):
    return service.predict_batch([i.model_dump() for i in items])
