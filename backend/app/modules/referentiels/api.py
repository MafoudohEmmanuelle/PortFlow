from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...database import get_db
from .schemas import ArmateurCreate, ArmateurUpdate,ArmateurInfo,DocumentCreate, DocumentInfo, DocumentUpdate
from .service import ArmateurService, DocumentService
from ...core.dependencies import get_current_user
from app.modules.auth.models import Utilisateur 

router = APIRouter(prefix="/referentiels", tags=["Référentiels"])

@router.post("/armateurs", response_model=ArmateurCreate, status_code=status.HTTP_201_CREATED)
def create_armateur(armateur: ArmateurCreate, db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
    armateur_service=ArmateurService(db)
    result= armateur_service.create_armateur(armateur, current_user)
    return result

@router.put("/armateurs/{armateur_id}", response_model=ArmateurUpdate)
def update_armateur(armateur_id: int, armateur: ArmateurUpdate, db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
    armateur_service=ArmateurService(db)
    result= armateur_service.update_armateur(armateur_id, armateur, current_user)
    return result

@router.delete("/armateurs/{armateur_id}")
def delete_armateur(armateur_id: int, db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
    armateur_service=ArmateurService(db)
    armateur_service.delete_armateur(armateur_id, current_user)
    return None

@router.get("/armateurs/{armateur_id}", response_model=ArmateurInfo)
def info_armateur(armateur_id: int, db:Session= Depends(get_db),current_user: Utilisateur = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur non authentifé")
    armateur_service=ArmateurService(db)
    result= armateur_service.get_armateur_by_id(armateur_id)
    return result

@router.get("/armateurs", response_model=list[ArmateurInfo])
def list_armateurs(db:Session= Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur non authentifé")
    armateur_service=ArmateurService(db)
    result= armateur_service.get_armateurs()
    return result

@router.post("/documents", response_model=DocumentCreate, status_code=status.HTTP_201_CREATED)
def create_document(document: DocumentCreate, db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
    document_service=DocumentService(db)
    result= document_service.create_document(document, current_user)
    return result

@router.put("/documents/{document_id}", response_model=DocumentUpdate)
def update_document(document_id: int, document: DocumentUpdate, db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
    document_service=DocumentService(db)
    result= document_service.update_document(document_id, document, current_user)
    return result

@router.delete("/documents/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
    document_service=DocumentService(db)
    document_service.delete_document(document_id, current_user)
    return None

@router.get("/documents/{document_id}", response_model=DocumentInfo)
def info_document(document_id: int, db:Session= Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur non authentifé")
    document_service=DocumentService(db)
    result= document_service.get_document_by_id(document_id)
    return result  

@router.get("/documents", response_model=list[DocumentInfo])
def list_documents(db:Session= Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur non authentifé")
    document_service=DocumentService(db)
    result= document_service.get_documents()
    return result