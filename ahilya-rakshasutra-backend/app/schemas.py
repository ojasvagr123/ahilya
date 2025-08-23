from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field

# Auth
class RegisterIn(BaseModel):
    name: str
    phone: str
    password: str

class LoginIn(BaseModel):
    phone: str
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    name: str
    phone: str
    role: str

class AuthOut(BaseModel):
    token: TokenOut
    user: UserOut

# Reports
ReportType = Literal["sms", "url", "voip"]

class ReportIn(BaseModel):
    type: ReportType
    payload: Dict[str, Any] = Field(default_factory=dict)
    lat: float
    lon: float
    area: Optional[str] = "Unknown"

class ReportOut(BaseModel):
    id: int
    type: ReportType
    payload: Dict[str, Any]
    lat: float
    lon: float
    area: str
    created_at: str

# Admin
class SummaryOut(BaseModel):
    counts: Dict[str, int]
    latest: List[ReportOut]
