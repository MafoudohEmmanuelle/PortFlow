from sqlalchemy.orm import Session
from .models import Armateur, Document
from .schemas import ArmateurCreate, DocumentCreate, ArmateurUpdate, DocumentUpdate
from app.modules.auth.models import Utilisateur
from fastapi import HTTPException, status

class ArmateurService:
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_armateurs(self):
        """Récupère la liste des armateurs"""
        return self.db.query(Armateur).filter(Armateur.actif == True).all()

    def get_armateur_by_id(self, armateur_id: int):
        """Récupère un armateur par ID"""
        return self.db.query(Armateur).filter(Armateur.id == armateur_id, Armateur.actif == True).first()
    
    def create_armateur(self, armateur: ArmateurCreate, current_user: Utilisateur):
        """Crée un nouvel armateur(seulement un admin)"""
        if current_user.role != "admin":
            raise HTTPException(status_code= status.HTTP_403_FORBIDDEN, detail="Seuls les administrateurs peuvent créer des armateurs")
        existing_armateur= self.db.query(Armateur).filter(Armateur.nom==armateur.nom).first()
        if existing_armateur:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Armateur déjà existant")
        new_armateur=Armateur(
            nom = armateur.nom,
            lien_tracking = armateur.lien_tracking
        )
        self.db.add(new_armateur)
        self.db.commit()
        self.db.refresh(new_armateur)
        return new_armateur

    def update_armateur(self, armateur_id: int, armateur: ArmateurUpdate,current_user: Utilisateur):
        """Met à jour un armateur existant"""
        if current_user.role != "admin":
            raise HTTPException(status_code= status.HTTP_403_FORBIDDEN, detail="Seuls les administrateurs peuvent mettre à jour des armateurs")
        existing_armateur = self.db.query(Armateur).filter(Armateur.id == armateur_id, Armateur.actif == True).first()
        if not existing_armateur:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Armateur non trouvé")
        existing_armateur.nom = armateur.nom
        existing_armateur.lien_tracking = armateur.lien_tracking
        
        self.db.commit()
        self.db.refresh(existing_armateur)
        return existing_armateur
    
    def delete_armateur(self, armateur_id: int, current_user: Utilisateur):
        """Supprime un armateur (soft delete)"""
        if current_user.role != "admin":
            raise HTTPException(status_code= status.HTTP_403_FORBIDDEN, detail="Seuls les administrateurs peuvent supprimer des armateurs")
        existing_armateur = self.db.query(Armateur).filter(Armateur.id == armateur_id, Armateur.actif == True).first()
        if not existing_armateur:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Armateur non trouvé")
        
        existing_armateur.actif = False
        self.db.commit()
        return {"detail": "Armateur supprimé avec succès"}
    
class DocumentService:
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_documents(self):
        """Récupère la liste des documents"""
        return self.db.query(Document).filter(Document.actif == True).all()
    
    def get_document_by_id(self, document_id: int):
        """Récupère un document par ID"""
        return self.db.query(Document).filter(Document.id == document_id, Document.actif == True).first()
    
    def create_document(self, document: DocumentCreate, current_user: Utilisateur):
        """Crée un nouveau document"""
        if current_user.role != "admin":
            raise HTTPException(status_code= status.HTTP_403_FORBIDDEN, detail="Seuls les administrateurs peuvent créer des documents")
        existing_document = self.db.query(Document).filter(Document.nom == document.nom).first()
        if existing_document:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document déjà existant")
        new_document = Document(
            nom=document.nom,
            responsable=document.responsable,
            code=document.code
        )
        self.db.add(new_document)
        self.db.commit()
        self.db.refresh(new_document)
        return new_document
    
    def update_document(self, document_id: int, document: DocumentCreate, current_user: Utilisateur):
        """Met à jour un document existant"""
        if current_user.role != "admin":
            raise HTTPException(status_code= status.HTTP_403_FORBIDDEN, detail="Seuls les administrateurs peuvent mettre à jour des documents")
        existing_document = self.db.query(Document).filter(Document.id == document_id, Document.actif == True).first()
        if not existing_document:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document non trouvé")
        
        if document.nom is not None:
            existing_document.nom = document.nom

        if document.responsable is not None:
            existing_document.responsable = document.responsable

        if document.code is not None:
            existing_document.code = document.code  
        self.db.commit()
        self.db.refresh(existing_document)
        return existing_document
    
    def delete_document(self, document_id: int, current_user: Utilisateur):
        """Supprime un document (soft delete)"""
        if current_user.role != "admin":
            raise HTTPException(status_code= status.HTTP_403_FORBIDDEN, detail="Seuls les administrateurs peuvent supprimer des documents")
        existing_document = self.db.query(Document).filter(Document.id == document_id, Document.actif == True).first()
        if not existing_document:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document non trouvé")
        
        existing_document.actif = False
        self.db.commit()
        return {"detail": "Document supprimé avec succès"}