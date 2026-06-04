from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings

# Créer le moteur de connexion
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Vérifie la connexion avant de l'utiliser
)

# Créer une session locale
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base pour les modèles SQLAlchemy
Base = declarative_base()

# Dépendance pour obtenir la base de données
def get_db():
    """
    Dépendance FastAPI pour obtenir une session de base de données.
    À utiliser dans les endpoints.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()