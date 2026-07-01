from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from ...database import get_db
from ...core.dependencies import get_current_user
from app.modules.auth.models import Utilisateur
from .schemas import AlerteResponse, AlerteListResponse
from .service import AlerteService

router = APIRouter(prefix="/alertes", tags=["Alertes"])

@router.get("/", response_model=AlerteListResponse)
def get_alertes(
    est_lue: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """Récupère la liste des alertes (admin voit tout, acheteur voit ses dossiers)"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non authentifié")
    
    service = AlerteService(db)
    alertes = service.get_alertes(est_lue, skip, limit)
    
    # Filtrer par accès si non admin
    if current_user.role != "admin":
        from app.modules.dossiers.models import DossierImportation
        user_dossiers = db.query(DossierImportation.id).filter(
            DossierImportation.utilisateur_id == current_user.id
        ).all()
        user_dossier_ids = [d[0] for d in user_dossiers]
        alertes = [a for a in alertes if a.dossier_id in user_dossier_ids]
    
    total = len(alertes)
    non_lues = len([a for a in alertes if not a.est_lue])
    
    return {
        "alertes": alertes,
        "total": total,
        "non_lues": non_lues
    }

@router.get("/dossier/{dossier_id}", response_model=List[AlerteResponse])
def get_alertes_by_dossier(
    dossier_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """Récupère les alertes d'un dossier spécifique"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non authentifié")
    
    # Vérifier accès
    if current_user.role != "admin":
        from app.modules.dossiers.models import DossierImportation
        dossier = db.query(DossierImportation).filter(DossierImportation.id == dossier_id).first()
        if not dossier or dossier.utilisateur_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit")
    
    service = AlerteService(db)
    result = service.get_alertes_by_dossier(dossier_id)
    
    return result

@router.put("/{alerte_id}/lue", response_model=AlerteResponse)
def marquer_alerte_lue(
    alerte_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """Marque une alerte comme lue"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non authentifié")
    
    service = AlerteService(db)
    result = service.marquer_comme_lue(alerte_id, current_user)
    
    return result

@router.put("/marquer-toutes-lues")
def marquer_toutes_alertes_lues(
    dossier_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """Marque toutes les alertes comme lues (admin ou par dossier)"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non authentifié")
    
    # Si non admin et pas de dossier_id, interdire
    if current_user.role != "admin" and not dossier_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non autorisé à marquer toutes les alertes"
        )
    
    service = AlerteService(db)
    count = service.marquer_toutes_comme_lues(dossier_id)
    
    return {"message": f"{count} alerte(s) marquée(s) comme lue(s)"}

@router.get("/stats")
def get_alertes_stats(
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """Statistiques des alertes pour le dashboard"""
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non authentifié")
    
    service = AlerteService(db)
    stats = service.get_stats()
    
    return stats

@router.post("/generer")
def generer_alertes_manuellement(
    dossier_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """Génère manuellement les alertes (admin uniquement)"""
    if not current_user or current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin requis")
    
    service = AlerteService(db)
    
    if dossier_id:
        alertes = service.generer_alertes_pour_dossier(dossier_id)
        count = len(alertes)
    else:
        count = service.generer_alertes_pour_tous_dossiers()
    
    return {"message": f"{count} alerte(s) générée(s)", "count": count}

