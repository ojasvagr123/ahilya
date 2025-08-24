from sqlmodel import SQLModel, Session, create_engine
from fastapi import Depends
import os
from dotenv import load_dotenv
from sqlalchemy.orm import declarative_base
Base = declarative_base()

load_dotenv()

DB_URL = os.getenv("DB_URL", "sqlite:///./rakshasutra.db") 
engine = create_engine(DB_URL, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
    