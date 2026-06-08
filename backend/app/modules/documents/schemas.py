# backend/app/modules/documents/schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class DossierDocumentBase(BaseModel):
    """Schéma de base pour un document associé à un dossier"""
    obtenu: bool = False
    date_reception: Optional[date] = None
class DossierDocumentCreate(DossierDocumentBase):
    """Schéma pour la CRÉATION d'une association"""
    dossier_id: int
    document_id: int 
class DossierDocumentUpdate(BaseModel):
    """Schéma pour la MISE À JOUR (cocher obtenu)"""
    obtenu: bool
    date_reception: Optional[date] = None
class DossierDocumentResponse(DossierDocumentBase):
    """Schéma pour la RÉPONSE (affichage)"""
    id: int
    dossier_id: int
    document_id: int
    date_modification: Optional[datetime] = None
    document_nom: Optional[str] = None
    document_code: Optional[str] = None
    
    class Config:
        from_attributes = True