from sqlalchemy.sql import func
from ...database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from .enum import StatutDossier

class DossierImportation(Base):
    __tablename__ = "dossiers_importation"
    
    id = Column(Integer, primary_key=True)
    fournisseur = Column(String(255), nullable=False)
    numero_bl = Column(String(255), nullable=False)
    armateur_id = Column(Integer, ForeignKey("armateurs.id"), nullable=False)
    utilisateur_id = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)
    delai_franchise_jours = Column(Integer, nullable=False, default=11)
    statut = Column(String(255), nullable=False, default=StatutDossier.EN_ATTENTE.value)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())
    eta_initial= Column(DateTime(timezone=True), nullable=True)
    date_depart = Column(DateTime(timezone=True), nullable=True)
    date_arrivee = Column(DateTime(timezone=True), nullable=True)
    date_sortie_port = Column(DateTime(timezone=True), nullable=True)
    date_modification = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<DossierImportation(id={self.id}, fournisseur='{self.fournisseur}', numero_bl='{self.numero_bl}', statut='{self.statut}')>"