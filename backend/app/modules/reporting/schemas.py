# backend/app/modules/rapports/schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


# ========== RAPPORT ==========

class RapportBase(BaseModel):
    """Schéma de base pour un rapport"""
    dossier_id: int
    type_rapport: str = Field(..., description="cloture, tracking")
    contenu: Dict[str, Any] = Field(..., description="Contenu complet du rapport en JSON")


class RapportCreate(RapportBase):
    """Schéma pour la création d'un rapport"""
    generateur_id: int


class RapportResponse(BaseModel):
    """Schéma pour la réponse (affichage)"""
    id: int
    dossier_id: int
    type_rapport: str
    contenu: Dict[str, Any]
    date_generation: datetime
    generateur_id: int
    generateur_nom: Optional[str] = None
    
    # Informations supplémentaires pour l'affichage
    numero_bl: Optional[str] = None
    fournisseur: Optional[str] = None
    
    class Config:
        from_attributes = True


class RapportResume(BaseModel):
    """Schéma pour la liste des rapports (résumé)"""
    id: int
    dossier_id: int
    numero_bl: Optional[str] = None
    fournisseur: Optional[str] = None
    type_rapport: str
    date_generation: datetime
    generateur_nom: Optional[str] = None
    contenu_resume: Dict[str, Any] = Field(
        default_factory=dict,
        description="Résumé du contenu (total_documents, documents_obtenus, est_en_surestarie)"
    )


# ========== FILTRES ==========

class RapportFilters(BaseModel):
    """Filtres pour la liste des rapports"""
    dossier_id: Optional[int] = None
    type_rapport: Optional[str] = None
    date_debut: Optional[datetime] = None
    date_fin: Optional[datetime] = None


# ========== GÉNÉRATION DE RAPPORT ==========

class RapportGenerationRequest(BaseModel):
    """Requête pour générer un rapport"""
    type_rapport: str = Field(..., description="cloture, tracking")
    dossier_id: int


class RapportGenerationResponse(BaseModel):
    """Réponse après génération"""
    success: bool
    message: str
    rapport_id: Optional[int] = None
    contenu: Optional[Dict[str, Any]] = None