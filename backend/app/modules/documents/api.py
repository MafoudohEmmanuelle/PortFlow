from fastapi import APIRouter,Depends,HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from .schemas import DossierDocumentUpdate,DossierDocumentCreate,DossierDocumentResponse
from .service import DossierDocumentService
from app.core.dependencies import get_current_user
from app.modules.auth.models import Utilisateur
from typing import List
from datetime import date

router = APIRouter(prefix="/documents-dossier", tags=["Documents"])

@router.get("/", response_model=list[DossierDocumentResponse])
def get_dossier_documents(dossier_id:int, db:Session=Depends(get_db), current_user: Utilisateur=Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur non authentifié")
    doc_service=DossierDocumentService(db)
    result= doc_service.get_dossier_documents(dossier_id)
    return result

@router.get("/missing", response_model=List[str])
def get_missing_document(dossier_id:int, db:Session=Depends(get_db),current_user:Utilisateur=Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, details="Utilisateur non authentifié")
    doc_service= DossierDocumentService(db)
    result= doc_service.get_missing_documents(dossier_id)
    return result

@router.get("completion/{dossier_id}")
def get_completion_rate(
    dossier_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, details="Utilisateur non authentifié")
    doc_service = DossierDocumentService(db)
    return doc_service.get_completion_rate(dossier_id)

@router.post("/", response_model=DossierDocumentResponse, status_code=status.HTTP_201_CREATED)
def add_dossier_document(
    association: DossierDocumentCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, details="Utilisateur non authentifié")
    doc_service = DossierDocumentService(db)
    result = doc_service.add_dossier_document(
        association.dossier_id,
        association.document_id
    )
    return result

@router.put("/{association_id}", response_model= DossierDocumentResponse)
def update_dossier_document(
    association_id: int,
    update_data: DossierDocumentUpdate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, details="Utilisateur non authentifié")
    doc_service = DossierDocumentService(db)
    result = doc_service.update_dossier_document(
        association_id,
        update_data.obtenu,
        update_data.date_reception
    )
    return result

@router.delete("/{association_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_dossier_document(
    association_id: int,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, details="Utilisateur non authentifié")
    doc_service = DossierDocumentService(db)
    doc_service.remove_dossier_document(association_id,current_user)
    return None

# ========== ENDPOINTS DE MASSE (OPTIONNEL) ==========

"""@router.post("/batch")
def save_dossier_documents_batch(
    dossier_id: int,
    document_ids: List[int],
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, details="Utilisateur non authentifié")
    doc_service = DossierDocumentService(db)
    result = doc_service.save_dossier_documents(dossier_id, document_ids)
    return {"message": f"{len(result)} documents associés", "count": len(result)}
"""

