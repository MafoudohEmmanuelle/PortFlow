# backend/app/modules/dossiers/api.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.core.dependencies import get_current_user
from app.modules.auth.models import Utilisateur
from app.modules.dossiers import service, schemas
from app.modules.documents.service import DossierDocumentService
from app.modules.referentiels.models import Armateur


router = APIRouter(prefix="/dossiers", tags=["Dossiers d'importation"])

@router.post("/", response_model=schemas.DossierResponse, status_code=status.HTTP_201_CREATED)
def create_dossier(
    dossier_data: schemas.DossierCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Crée un nouveau dossier d'importation.
    - L'armateur est optionnel (peut être sélectionné dans une liste)
    - Les documents nécessaires sont spécifiés par leurs IDs
    - L'ETA initiale est obligatoire
    """
    dossier_service = service.DossierImportationService(db)
    result = dossier_service.create_dossier(dossier_data, current_user)
    
    # Récupérer les documents associés pour la réponse
    doc_service = DossierDocumentService(db)
    documents = doc_service.get_dossier_documents(result.id)
    
    # Formater la réponse
    return {
        "id": result.id,
        "numero_bl": result.numero_bl,
        "fournisseur": result.fournisseur,
        "armateur_id": result.armateur_id,
        "delai_franchise_jours": result.delai_franchise_jours,
        "statut": result.statut,
        "date_creation": result.date_creation,
        "eta_initial": result.eta_initial,
        "date_depart": result.date_depart,
        "date_arrivee": result.date_arrivee,
        "date_sortie_port": result.date_sortie_port,
        "documents": documents,
        "documents_manquants_count": len([d for d in documents if not d["obtenu"]]),
        "tous_documents_obtenus": all(d["obtenu"] for d in documents)
    }

@router.get("/", response_model=List[schemas.DossierResponse])
def get_dossiers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    statut: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Récupère la liste des dossiers.
    - Les acheteurs ne voient que leurs dossiers
    - Les administrateurs voient tous les dossiers
    - Filtrage possible par statut
    """
    dossier_service = service.DossierImportationService(db)
    dossiers = dossier_service.get_dossiers(current_user, skip, limit, statut)
    
    # Récupérer les documents pour chaque dossier
    doc_service = DossierDocumentService(db)
    result = []
    
    for dossier in dossiers:

        #lignes ajoutées pour le nom de l'armateur
        # Récupérer le nom de l'armateur CORRECTEMENT
        armateur_nom = None
        if dossier.armateur_id:
            # Méthode 1 : requête directe
            armateur = db.query(Armateur).filter(Armateur.id == dossier.armateur_id).first()
            if armateur:
                armateur_nom = armateur.nom
                print(f"Armateur trouvé: ID={dossier.armateur_id}, Nom={armateur_nom}")  # Debug
            else:
                print(f"Armateur NON trouvé: ID={dossier.armateur_id}")  # Debug
        
        utilisateur_nom = None
        if dossier.utilisateur_id:
            utilisateur = db.query(Utilisateur).filter(Utilisateur.id == dossier.utilisateur_id).first()
            utilisateur_nom = utilisateur.nom if utilisateur else None

        documents = doc_service.get_dossier_documents(dossier.id)
        result.append({
            "id": dossier.id,
            "numero_bl": dossier.numero_bl,
            "fournisseur": dossier.fournisseur,
            "armateur_id": dossier.armateur_id,
            "armateur_nom": armateur_nom, 
            "utilisateur_id": dossier.utilisateur_id,  
            "utilisateur_nom": utilisateur_nom,       
            "delai_franchise_jours": dossier.delai_franchise_jours,
            "statut": dossier.statut,
            "date_creation": dossier.date_creation,
            "eta_initial": dossier.eta_initial,
            "date_depart": dossier.date_depart,
            "date_arrivee": dossier.date_arrivee,
            "date_sortie_port": dossier.date_sortie_port,
            "documents": documents,
            "documents_manquants_count": len([d for d in documents if not d["obtenu"]]),
            "tous_documents_obtenus": all(d["obtenu"] for d in documents)
        })
    
    return result

@router.get("/{dossier_id}", response_model=schemas.DossierResponse)
def get_dossier(
    dossier_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Récupère les détails d'un dossier spécifique.
    """
    dossier_service = service.DossierImportationService(db)
    dossier = dossier_service.get_dossier(dossier_id, current_user)
    
    # Récupérer les documents associés
    doc_service = DossierDocumentService(db)
    documents = doc_service.get_dossier_documents(dossier.id)
    
    # Récupérer le nom de l'armateur
    armateur_nom = None
    if dossier.armateur_id:
        from app.modules.referentiels.models import Armateur
        armateur = db.query(Armateur).filter(Armateur.id == dossier.armateur_id).first()
        armateur_nom = armateur.nom if armateur else None
    
    return {
        "id": dossier.id,
        "numero_bl": dossier.numero_bl,
        "fournisseur": dossier.fournisseur,
        "armateur_id": dossier.armateur_id,
        "armateur_nom": armateur_nom,
        "delai_franchise_jours": dossier.delai_franchise_jours,
        "statut": dossier.statut,
        "date_creation": dossier.date_creation,
        "eta_initial": dossier.eta_initial,
        "date_depart": dossier.date_depart,
        "date_arrivee": dossier.date_arrivee,
        "date_sortie_port": dossier.date_sortie_port,
        "documents": documents,
        "documents_manquants_count": len([d for d in documents if not d["obtenu"]]),
        "tous_documents_obtenus": all(d["obtenu"] for d in documents)
    }

@router.put("/{dossier_id}", response_model=schemas.DossierResponse)
def update_dossier(
    dossier_id: int,
    update_data: schemas.DossierUpdate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Met à jour les informations générales d'un dossier.
    """
    dossier_service = service.DossierImportationService(db)
    result = dossier_service.update_dossier(dossier_id, update_data, current_user)
    
    # Récupérer les documents associés
    doc_service = DossierDocumentService(db)
    documents = doc_service.get_dossier_documents(result.id)
    
    return {
        "id": result.id,
        "numero_bl": result.numero_bl,
        "fournisseur": result.fournisseur,
        "armateur_id": result.armateur_id,
        "delai_franchise_jours": result.delai_franchise_jours,
        "statut": result.statut,
        "date_creation": result.date_creation,
        "eta_initial": result.eta_initial,
        "date_depart": result.date_depart,
        "date_arrivee": result.date_arrivee,
        "date_sortie_port": result.date_sortie_port,
        "documents": documents,
        "documents_manquants_count": len([d for d in documents if not d["obtenu"]]),
        "tous_documents_obtenus": all(d["obtenu"] for d in documents)
    }

@router.put("/{dossier_id}/depart")
def update_depart(
    dossier_id: int,
    date_depart: datetime,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Enregistre la date de départ du navire.
    Cette information vient généralement du tracking de l'armateur.
    """
    dossier_service = service.DossierImportationService(db)
    result = dossier_service.update_depart(dossier_id, date_depart, current_user)
    return {
        "id": result.id,
        "numero_bl": result.numero_bl,
        "date_depart": result.date_depart,
        "statut": result.statut
    }

@router.put("/{dossier_id}/arrivee")
def update_arrivee(
    dossier_id: int,
    arrivee_data: schemas.DossierArriveeUpdate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Marque l'arrivée de la marchandise au port.
    L'acheteur coche une case dans l'interface.
    """
    dossier_service = service.DossierImportationService(db)
    result = dossier_service.update_arrivee(dossier_id, arrivee_data, current_user)
    return {
        "id": result.id,
        "numero_bl": result.numero_bl,
        "date_arrivee": result.date_arrivee,
        "statut": result.statut
    }

@router.put("/{dossier_id}/sortie")
def update_sortie(
    dossier_id: int,
    sortie_data: schemas.DossierSortiePortUpdate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Marque la sortie du conteneur du port.
    L'acheteur coche une case dans l'interface.
    """
    dossier_service = service.DossierImportationService(db)
    result = dossier_service.update_sortie(dossier_id, sortie_data, current_user)
    return {
        "id": result.id,
        "numero_bl": result.numero_bl,
        "date_sortie_port": result.date_sortie_port,
        "statut": result.statut
    }

@router.delete("/{dossier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dossier(
    dossier_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Supprime un dossier (administrateur uniquement).
    Les associations dossier-document sont automatiquement supprimées.
    """
    dossier_service = service.DossierImportationService(db)
    dossier_service.delete_dossier(dossier_id, current_user)
    return None

@router.post("/auto-reception", status_code=status.HTTP_201_CREATED)
def auto_reception_document(
    payload: schemas.AutoReceptionPayload,
    db: Session = Depends(get_db)
    # Pas de get_current_user ici car n8n n'a pas de token
):
    """
    Endpoint pour la réception automatique des documents depuis n8n.
    N'utilise pas l'authentification standard car n8n ne gère pas les tokens JWT.
    """
    doc_service = service.DossierDocumentService(db)
    
    try:
        result = doc_service.auto_reception_document(
            nom_document=payload.nom_document,
            numero_bl=payload.numero_bl,
            adresse_destinataire=payload.adresse_destinataire,
            mail_expediteur=payload.mail_expediteur,
            mail_date_reception=payload.mail_date_reception,
            numero_conteneur=payload.numero_conteneur
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du traitement: {str(e)}"
        )