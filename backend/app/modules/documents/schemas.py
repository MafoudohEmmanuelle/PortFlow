# backend/app/modules/documents/schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class DocumentDossierBase(BaseModel):
    """Schéma de base pour un document associé à un dossier"""
    obtenu: bool = False
    date_reception: Optional[date] = None


class DocumentDossierCreate(DocumentDossierBase):
    """Schéma pour la CRÉATION d'une association"""
    document_type_id: int 
    dossier_id: int


class DocumentDossierUpdate(BaseModel):
    """Schéma pour la MISE À JOUR (cocher obtenu)"""
    obtenu: bool
    date_reception: Optional[date] = None


class DocumentDossierResponse(DocumentDossierBase):
    """Schéma pour la RÉPONSE (affichage)"""
    id: int
    dossier_id: int
    document_type_id: int
    date_creation: datetime
    date_modification: Optional[datetime] = None
    document_nom: Optional[str] = None
    document_code: Optional[str] = None
    
    class Config:
        from_attributes = True