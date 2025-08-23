from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..db import get_session
from ..models import User, Role
from ..schemas import RegisterIn, LoginIn, AuthOut, TokenOut, UserOut
from ..auth import hash_password, verify_password, create_access_token
import os

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=AuthOut)
def register(body: RegisterIn, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.phone == body.phone)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone already registered")
    user = User(name=body.name, phone=body.phone, password_hash=hash_password(body.password))
    # Promote to admin if phone matches .env ADMIN_PHONE
    admin_phone = os.getenv("ADMIN_PHONE")
    if admin_phone and body.phone == admin_phone:
        user.role = Role.ADMIN
    session.add(user)
    session.commit()
    session.refresh(user)
    token = create_access_token(user.phone, {"role": user.role})
    return AuthOut(token=TokenOut(access_token=token),
                   user=UserOut(id=user.id, name=user.name, phone=user.phone, role=user.role))

@router.post("/login", response_model=AuthOut)
def login(body: LoginIn, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.phone == body.phone)).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user.phone, {"role": user.role})
    return AuthOut(token=TokenOut(access_token=token),
                   user=UserOut(id=user.id, name=user.name, phone=user.phone, role=user.role))
