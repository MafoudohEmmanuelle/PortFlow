from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class AlerteCreate(BaseModel):
    """Création d'une alerte (interne)"""
    dossier_id: int
    type_alerte: str
    niveau: str
    message: str

class AlerteUpdate(BaseModel):
    """Mise à jour d'une alerte (marquer comme lue)"""
    est_lue: Optional[bool] = None

class AlerteResponse(BaseModel):
    """Réponse pour une alerte"""
    id: int
    dossier_id: int
    type_alerte: str
    niveau: str
    message: str
    est_lue: bool
    date_alerte: datetime
    
    class Config:
        from_attributes = True

class AlerteListResponse(BaseModel):
    """Liste des alertes avec résumé"""
    alertes: List[AlerteResponse]
    total: int
    non_lues: int