from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text
from sqlalchemy.sql import func
import enum
from ...database import Base

class UserRole(str, enum.Enum):
    admin = "admin"
    acheteur = "acheteur"

class Utilisateur(Base):
    """Table utilisateurs - correspond à init_db.py"""
    __tablename__ = "utilisateurs"
    
    id = Column(Integer, primary_key=True)
    nom = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    mot_de_passe = Column(String(255), nullable=False)  # hashed password
    role = Column(Enum(UserRole), default=UserRole.acheteur, nullable=False)
    actif = Column(Boolean, default=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Utilisateur {self.nom} ({self.role})>"