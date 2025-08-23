from sqlmodel import SQLModel, Session, create_engine
import os

DB_URL = os.getenv("DB_URL", "sqlite:///./rakshasutra.db")
connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
engine = create_engine(DB_URL, echo=False, connect_args=connect_args)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
