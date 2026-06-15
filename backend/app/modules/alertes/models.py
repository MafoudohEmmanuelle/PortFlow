from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from ...database import Base

class Alerte(Base):
    __tablename__ = "alertes"
    
    id = Column(Integer, primary_key=True)
    dossier_id = Column(Integer, ForeignKey("dossiers_importation.id", ondelete="CASCADE"), nullable=False)
    
    type_alerte = Column(String(50), nullable=False, default="info")  # document_manquant, approche_arrivee, franchise_expiration
    niveau = Column(String(20), default="info")                       # info, warning, critique
    message = Column(Text, nullable=False)
    
    est_lue = Column(Boolean, default=False)
    date_alerte = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Alerte(id={self.id}, dossier={self.dossier_id}, type='{self.type_alerte}')>"