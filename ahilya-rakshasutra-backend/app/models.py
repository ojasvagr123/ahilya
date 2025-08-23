from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field, Column, JSON

class Role(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    phone: str = Field(unique=True, index=True)
    password_hash: str
    role: Role = Field(default=Role.USER)

class ReportType(str, Enum):
    sms = "sms"
    url = "url"
    voip = "voip"

class Report(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    type: ReportType
    payload_json: dict = Field(sa_column=Column(JSON))
    lat: float
    lon: float
    area: str = Field(default="Unknown")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: int = Field(foreign_key="user.id")

class HoneypotEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ip: str
    ua: str
    path: str
    area: str = Field(default="Unknown")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ModelResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    report_id: int = Field(foreign_key="report.id")
    model: str
    prob: float
    label: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Alert(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    area: str
    message: str
    attachments_json: dict = Field(sa_column=Column(JSON), default={})
    channels_json: dict = Field(sa_column=Column(JSON), default={})
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: int = Field(foreign_key="user.id")
