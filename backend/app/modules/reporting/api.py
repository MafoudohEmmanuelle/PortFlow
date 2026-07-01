# backend/app/modules/rapports/api.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.modules.auth.models import Utilisateur
from app.modules.reporting import service, schemas
from app.modules.dossiers.service import DossierImportationService
from app.modules.dossiers.models import DossierImportation

router = APIRouter(prefix="/rapports", tags=["Rapports"])


# ========== GÉNÉRATION DE RAPPORT ==========

@router.post("/generer", response_model=schemas.RapportGenerationResponse)
def generer_rapport(
    request: schemas.RapportGenerationRequest,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Génère un rapport (clôture ou tracking) pour un dossier.
    """
    rapport_service = service.RapportService(db)
    
    # Vérifier l'accès au dossier
    dossier_service = DossierImportationService(db)
    dossier_service.get_dossier(request.dossier_id, current_user)
    
    # Générer le rapport selon le type
    if request.type_rapport == "cloture":
        contenu = rapport_service.generer_rapport_cloture(request.dossier_id)
    elif request.type_rapport == "tracking":
        contenu = rapport_service.generer_rapport_tracking(request.dossier_id)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Type de rapport '{request.type_rapport}' non supporté. Utilisez 'cloture' ou 'tracking'"
        )
    
    # Sauvegarder le rapport
    rapport = rapport_service.sauvegarder_rapport(
        dossier_id=request.dossier_id,
        type_rapport=request.type_rapport,
        contenu=contenu,
        current_user=current_user
    )
    
    return schemas.RapportGenerationResponse(
        success=True,
        message=f"Rapport de {request.type_rapport} généré avec succès",
        rapport_id=rapport.id,
        contenu=contenu
    )


@router.post("/cloture/{dossier_id}", response_model=schemas.RapportGenerationResponse)
def generer_rapport_cloture(
    dossier_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Génère un rapport de clôture pour un dossier.
    """
    rapport_service = service.RapportService(db)
    
    # Vérifier l'accès au dossier
    dossier_service = DossierImportationService(db)
    dossier_service.get_dossier(dossier_id, current_user)
    
    # Générer le rapport
    contenu = rapport_service.generer_rapport_cloture(dossier_id)
    
    # Sauvegarder
    rapport = rapport_service.sauvegarder_rapport(
        dossier_id=dossier_id,
        type_rapport="cloture",
        contenu=contenu,
        current_user=current_user
    )
    
    return schemas.RapportGenerationResponse(
        success=True,
        message=f"Rapport de clôture généré avec succès",
        rapport_id=rapport.id,
        contenu=contenu
    )


@router.post("/tracking/{dossier_id}", response_model=schemas.RapportGenerationResponse)
def generer_rapport_tracking(
    dossier_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Génère un rapport de tracking pour un dossier.
    """
    rapport_service = service.RapportService(db)
    
    # Vérifier l'accès au dossier
    dossier_service = DossierImportationService(db)
    dossier_service.get_dossier(dossier_id, current_user)
    
    # Générer le rapport
    contenu = rapport_service.generer_rapport_tracking(dossier_id)
    
    # Sauvegarder
    rapport = rapport_service.sauvegarder_rapport(
        dossier_id=dossier_id,
        type_rapport="tracking",
        contenu=contenu,
        current_user=current_user
    )
    
    return schemas.RapportGenerationResponse(
        success=True,
        message=f"Rapport de tracking généré avec succès",
        rapport_id=rapport.id,
        contenu=contenu
    )


# ========== CONSULTATION ==========

@router.get("/{rapport_id}", response_model=schemas.RapportResponse)
def get_rapport(
    rapport_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Récupère un rapport par son ID.
    """
    rapport_service = service.RapportService(db)
    rapport = rapport_service.get_rapport(rapport_id, current_user)
    
    # Ajouter les informations du dossier
    dossier = db.query(DossierImportation).filter(
        DossierImportation.id == rapport.dossier_id
    ).first()
    
    return schemas.RapportResponse(
        id=rapport.id,
        dossier_id=rapport.dossier_id,
        type_rapport=rapport.type_rapport,
        contenu=rapport.contenu,
        date_generation=rapport.date_generation,
        generateur_id=rapport.generateur_id,
        numero_bl=dossier.numero_bl if dossier else None,
        fournisseur=dossier.fournisseur if dossier else None
    )


@router.get("/dossier/{dossier_id}", response_model=List[schemas.RapportResume])
def get_rapports_by_dossier(
    dossier_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Récupère tous les rapports d'un dossier (accessible seulement si l'utilisateur a accès au dossier).
    """
    rapport_service = service.RapportService(db)
    rapports = rapport_service.get_rapports_by_dossier(dossier_id, current_user, skip, limit)
    
    result = []
    for r in rapports:
        # Récupérer le nom du générateur
        generateur = db.query(Utilisateur).filter(Utilisateur.id == r.generateur_id).first()
        
        result.append(schemas.RapportResume(
            id=r.id,
            dossier_id=r.dossier_id,
            type_rapport=r.type_rapport,
            date_generation=r.date_generation,
            generateur_nom=generateur.nom if generateur else None,
            contenu_resume=rapport_service._get_rapport_resume(r.contenu)
        ))
    
    return result


@router.get("/user/all", response_model=List[schemas.RapportResume])
def get_all_rapports_user(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Récupère tous les rapports accessibles à l'acheteur (ses dossiers).
    """
    rapport_service = service.RapportService(db)
    rapports = rapport_service.get_all_rapports_by_user(current_user, skip, limit)
    
    return [schemas.RapportResume(**r) for r in rapports]


@router.get("/admin/all", response_model=List[schemas.RapportResume])
def get_all_rapports_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_admin: Utilisateur = Depends(get_current_admin)
):
    """
    Récupère tous les rapports (admin uniquement).
    """
    rapport_service = service.RapportService(db)
    rapports = rapport_service.get_all_rapports_admin(skip, limit)
    
    return [schemas.RapportResume(**r) for r in rapports]


# ========== EXPORT DES RAPPORTS ==========

@router.get("/export/{rapport_id}/{format}")
def export_rapport(
    rapport_id: int,
    format: str,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Exporte un rapport en PDF ou Excel.
    """
    if format not in ["pdf", "excel"]:
        raise HTTPException(
            status_code=400,
            detail=f"Format '{format}' non supporté. Utilisez 'pdf' ou 'excel'"
        )
    
    rapport_service = service.RapportService(db)
    rapport = rapport_service.get_rapport(rapport_id, current_user)
    
    # Générer le fichier (à implémenter dans les générateurs)
    # from app.modules.rapports.generators import pdf, excel
    # 
    # if format == "pdf":
    #     file_buffer = pdf.generate_from_contenu(rapport.contenu)
    # else:
    #     file_buffer = excel.generate_from_contenu(rapport.contenu)
    
    # Temporairement, retourner un message
    return {
        "message": f"Export en {format} du rapport {rapport_id}",
        "rapport_id": rapport_id,
        "type": rapport.type_rapport,
        "format": format
    }