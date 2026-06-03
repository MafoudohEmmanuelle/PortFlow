# backend/app/modules/dossiers/schemas.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.modules.documents.schemas import DocumentDossierResponse


class DossierCreate(BaseModel):
    """Schéma pour la CRÉATION d'un dossier"""
    numero_bl: str = Field(..., min_length=1, description="Numéro de BL")
    fournisseur: str = Field(..., min_length=1, description="Nom du fournisseur")
    
    #l'acheteur peut choisir l'armateur dans une liste
    armateur_id: Optional[int] = Field(None, description="ID de l'armateur")
    
    # Liste des IDs des documents nécessaires (cases à cocher)
    documents_necessaires: List[int] = Field(
        ..., 
        min_length=1,
        description="IDs des types de documents nécessaires"
    )
    delai_franchise_jours: int = Field(default=11, ge=1, le=30)
    

class DossierUpdate(BaseModel):
    """Schéma pour la MISE À JOUR d'un dossier"""
    numero_bl: Optional[str] = None
    fournisseur: Optional[str] = None
    armateur_id: Optional[int] = None
    documents_necessaires: Optional[List[int]] = None
    delai_franchise_jours: Optional[int] = Field(None, ge=1, le=30)


class DossierArriveeUpdate(BaseModel):
    """Schéma pour marquer l'arrivée (coche dans l'interface)"""
    date_arrivee: datetime = Field(default_factory=datetime.now)


class DossierSortiePortUpdate(BaseModel):
    """Schéma pour marquer la sortie du port (coche dans l'interface)"""
    date_sortie_port: datetime = Field(default_factory=datetime.now)


class DossierResponse(BaseModel):
    """Schéma pour la RÉPONSE (affichage)"""
    id: int
    numero_bl: str
    fournisseur: str
    armateur_id: Optional[int] = None
    armateur_nom: Optional[str] = None
    delai_franchise_jours: int
    statut: str
    date_creation: datetime
    eta_initial: Optional[datetime] = None
    date_depart: Optional[datetime] = None
    date_arrivee: Optional[datetime] = None
    date_sortie_port: Optional[datetime] = None
    # Documents associés
    documents: List[DocumentDossierResponse] = []
    # Propriétés calculées (seront remplies par le backend)
    documents_manquants_count: int = 0
    tous_documents_obtenus: bool = False
    
    class Config:
        from_attributes = True