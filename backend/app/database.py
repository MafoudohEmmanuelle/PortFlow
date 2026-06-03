from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

#Configure the database URL
DATABASE_URL = f"postgresql://{settings.db_user}:{settings.db_password}@{settings.db_host}:{settings.db_port}/{settings.db_name}"

#Create the SQLAlchemy engine
engine= create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.debug
    )

#Create a local session
LocalSession= sessionmaker(autocommit=False, autoflush=False, bind=engine)

#Common base class for all models
Base= declarative_base()

def get_db():
    db= LocalSession()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)