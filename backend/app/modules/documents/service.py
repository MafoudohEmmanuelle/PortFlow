from sqlalchemy.orm import Session
from sqlalchemy import and_
from fastapi import HTTPException, status
from datetime import date
from typing import List, Dict, Any, Optional
from .models import DossierDocument
from app.modules.dossiers.models import DossierImportation
from app.modules.referentiels.models import Document
from app.modules.auth.models import Utilisateur

class DossierDocumentService:
    """Service de gestion des associations dossier-document"""
    def __init__(self, db: Session):
        self.db = db

    # ========== MÉTHODES PRIVÉES (VÉRIFICATIONS) ==========

    def _check_dossier_exists(self, dossier_id: int) -> bool:
        """Vérifie qu'un dossier existe"""
        dossier = self.db.query(DossierImportation).filter(
            DossierImportation.id == dossier_id
        ).first()
        if not dossier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dossier {dossier_id} non trouvé"
            )
        return True

    def _check_document_exists(self, document_id: int) -> bool:
        """Vérifie qu'un type de document existe et est actif"""
        document = self.db.query(Document).filter(
            Document.id == document_id,
            Document.actif == True
        ).first()
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Type de document {document_id} non trouvé"
            )
        return True

    def _check_association_exists(
        self, 
        dossier_id: int, 
        document_id: int,
        must_exist: bool = True
    ) -> Optional[DossierDocument]:
        """Vérifie l'existence d'une association"""
        association = self.db.query(DossierDocument).filter(
            DossierDocument.dossier_id == dossier_id,
            DossierDocument.document_id == document_id
        ).first()
        
        if must_exist and not association:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Le document {document_id} n'est pas associé au dossier {dossier_id}"
            )
        
        if not must_exist and association:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Le document {document_id} est déjà associé au dossier {dossier_id}"
            )
        
        return association
    
    def _check_dossier_modifiable(self, dossier_id: int) -> None:
        """Vérifie que le dossier n'est pas clôturé"""
        from app.modules.dossiers.models import DossierImportation
        
        dossier = self.db.query(DossierImportation).filter(
            DossierImportation.id == dossier_id
        ).first()
        
        if dossier and dossier.date_sortie_port is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce dossier est clôturé. Impossible de modifier ses documents."
            )

    # ========== MÉTHODES PRINCIPALES ==========

    def save_dossier_documents(
        self, 
        dossier_id: int, 
        document_ids: List[int]
    ) -> List[DossierDocument]:
        """
        Crée les associations dossier-document lors de la création d'un dossier.
        Utilisé une seule fois à la création du dossier.
        Args:
            dossier_id: ID du dossier
            document_ids: Liste des IDs des types de documents nécessaires
        Returns:
            Liste des associations créées
        """
        # Vérifier que le dossier existe
        self._check_dossier_exists(dossier_id)
        # Vérifier que tous les documents existent
        for doc_id in document_ids:
            self._check_document_exists(doc_id)
        # Vérifier les doublons
        existing_associations = self.db.query(DossierDocument).filter(
           DossierDocument.dossier_id == dossier_id,
           DossierDocument.document_id.in_(document_ids)
        ).all()
        if existing_associations:
            existing_ids = [a.document_id for a in existing_associations]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Documents déjà associés: {existing_ids}"
            )
        # Créer les associations
        new_associations = []
        for doc_id in document_ids:
            association = DossierDocument(
                dossier_id=dossier_id,
                document_id=doc_id,
                obtenu=False,
                date_reception=None
            )
            self.db.add(association)
            new_associations.append(association)
        
        self.db.commit()
        # Rafraîchir les objets
        for assoc in new_associations:
            self.db.refresh(assoc)
        
        return new_associations

    def add_dossier_document(
        self, 
        dossier_id: int, 
        document_id: int
    ) -> DossierDocument:
        """
        Ajoute un nouveau document à un dossier existant.
        Args:
            dossier_id: ID du dossier
            document_type_id: ID du type de document à ajouter
        Returns:
            L'association créée
        """
        # Vérifications
        self._check_dossier_exists(dossier_id)
        self._check_document_exists(document_id)
        
        # Vérifier que l'association n'existe pas déjà
        self._check_association_exists(dossier_id, document_id, must_exist=False)
        
        # Créer l'association
        association = DossierDocument(
            dossier_id=dossier_id,
            document_id=document_id,
            obtenu=False,
            date_reception=None
        )
        self.db.add(association)
        self.db.commit()
        self.db.refresh(association)
        
        return association

    def remove_dossier_document(self, association_id: int, current_user: Utilisateur = None) -> Dict[str, str]:
        """
        Retire un document du suivi en utilisant l'ID de l'association.
        Règles métier:
        - Un document déjà obtenu ne peut pas être retiré (sauf admin)
        - Seul l'admin peut forcer la suppression d'un document obtenu
        Args:
            association_id: ID de l'association dans la table dossier_document
            current_user: Utilisateur connecté (optionnel, pour vérifier les droits)
        Returns:
            Message de confirmation
        """
        association = self.db.query(DossierDocument).filter(
            DossierDocument.id == association_id
        ).first()
        if not association:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Association {association_id} non trouvée"
            )
        # Vérifier si le document a déjà été obtenu
        if association.obtenu:
            # Si admin, on autorise avec un warning
            if current_user and current_user.role == "admin":
                # Optionnel: logger l'action admin
                print(f"Admin {current_user.email} force la suppression du document {association.document_id} déjà obtenu")
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Impossible de retirer le document car il a déjà été marqué comme obtenu. "
                        f"Contactez un administrateur si nécessaire."
                )
        self.db.delete(association)
        self.db.commit()
        return {"message": f"Document {association.document_id} retiré du dossier {association.dossier_id}"}
    def update_dossier_document(
            self,
            dossier_document_id: int,
            obtenu: bool,
            date_reception: Optional[date] = None,
        ) -> DossierDocument:
            """Met à jour le statut d'un document"""
            association = self.db.query(DossierDocument).filter(
                DossierDocument.id == dossier_document_id
            ).first()
            if not association:
                raise HTTPException(404, "Association non trouvée")
            self._check_dossier_modifiable(association.dossier_id)
            if association.obtenu == True and obtenu == False:
                raise HTTPException(
                    status_code=400,
                    detail="Impossible de marquer un document comme non reçu."
                )
            association.obtenu = obtenu
            if obtenu:
                association.date_reception = date_reception or date.today()
            self.db.commit()
            return association
    # ========== MÉTHODES DE CONSULTATION ==========

    def get_dossier_documents(
        self, 
        dossier_id: int
    ) -> List[Dict[str, Any]]:
        """
        Retourne tous les documents d'un dossier avec leur statut.
        Args:
            dossier_id: ID du dossier
        Returns:
            Liste des documents avec leurs informations
        """
        self._check_dossier_exists(dossier_id)
        
        results = self.db.query(
            DossierDocument,
            Document.nom.label("document_nom"),
            Document.code.label("document_code")
        ).join(
            Document, 
            DossierDocument.document_id == Document.id
        ).filter(
            DossierDocument.dossier_id == dossier_id
        ).all()
        
        return [
            {
                "id": r.DossierDocument.id,
                "dossier_id": r.DossierDocument.dossier_id,
                "document_id": r.DossierDocument.document_id,
                "document_nom": r.document_nom,
                "document_code": r.document_code,
                "obtenu": r.DossierDocument.obtenu,
                "date_reception": r.DossierDocument.date_reception,
                "date_modification": r.DossierDocument.date_modification
            }
            for r in results
        ]

    def get_missing_documents(
        self, 
        dossier_id: int
    ) -> List[str]:
        """
        Retourne la liste des noms de documents manquants pour un dossier.
        Très utile pour le moteur d'alertes.
        Args:
            dossier_id: ID du dossier
        Returns:
            Liste des noms de documents non obtenus
        """
        self._check_dossier_exists(dossier_id)
        
        results = self.db.query(
            Document.nom
        ).join(
            DossierDocument,
            DossierDocument.document_id == Document.id
        ).filter(
            DossierDocument.dossier_id == dossier_id,
            DossierDocument.obtenu == False
        ).all()
        
        return [r.nom for r in results]

    def get_completion_rate(
        self, 
        dossier_id: int
    ) -> Dict[str, Any]:
        """
        Calcule le taux de complétion des documents pour un dossier.
        Très utile pour le dashboard.
        
        Args:
            dossier_id: ID du dossier
        
        Returns:
            Dictionnaire avec statistiques
        """
        self._check_dossier_exists(dossier_id)
        
        # Compter les documents requis
        total = self.db.query(DossierDocument).filter(
            DossierDocument.dossier_id == dossier_id
        ).count()
        
        if total == 0:
            return {
                "dossier_id": dossier_id,
                "total": 0,
                "obtenus": 0,
                "manquants": 0,
                "percentage": 0
            }
        
        obtenus = self.db.query(DossierDocument).filter(
            DossierDocument.dossier_id == dossier_id,
            DossierDocument.obtenu == True
        ).count()
        
        manquants = total - obtenus
        percentage = round((obtenus / total) * 100)
        
        return {
            "dossier_id": dossier_id,
            "total": total,
            "obtenus": obtenus,
            "manquants": manquants,
            "pourcentage": percentage
        }

    def get_all_dossiers_completion(
        self, 
        dossier_ids: Optional[List[int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Retourne le taux de complétion pour plusieurs dossiers.
        
        Args:
            dossier_ids: Liste des IDs (optionnel, tous si None)
        
        Returns:
            Liste des statistiques par dossier
        """
        if dossier_ids:
            return [self.get_completion_rate(did) for did in dossier_ids]
        
        # Récupérer tous les dossiers
        dossiers = self.db.query(DossierImportation).all()
        return [self.get_completion_rate(d.id) for d in dossiers]