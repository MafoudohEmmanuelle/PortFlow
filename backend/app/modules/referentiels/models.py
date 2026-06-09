from sqlalchemy.sql import func
from sqlalchemy import Column,Integer,Boolean,String,DateTime
from app.database import Base

class Armateur(Base):
    __tablename__ = "armateurs"
    
    id = Column(Integer, primary_key=True)
    nom = Column(String(100), nullable=False)
    lien_tracking= Column(String(255), nullable=True)
    actif = Column(Boolean, default=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Armateur {self.nom}>"

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True)
    nom = Column(String(100), nullable=False)
    actif = Column(Boolean, default=True)
    code = Column(String(20), nullable=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now()) 
    responsable = Column(String(25), nullable=True)
    def __repr__(self):
        return f"<Document {self.nom}>"