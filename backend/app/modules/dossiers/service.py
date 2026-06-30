from datetime import timedelta, datetime, date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from .models import DossierImportation, StatutDossier
from app.modules.referentiels.models import Armateur,Document
from app.modules.documents.models import DossierDocument
from app.modules.auth.models import Utilisateur
from app.modules.alertes.models import Alerte
from app.modules.documents.service import DossierDocumentService
from .schemas import DossierCreate, DossierUpdate, DossierSortiePortUpdate, DossierArriveeUpdate
from typing import List, Optional,Dict,Any

import logging

logger = logging.getLogger(__name__)

class DossierImportationService():
    def __init__(self, db: Session):
        self.db = db

    def _check_armateur_exist(self, armateur_id: int) -> bool:
        armateur = self.db.query(Armateur).filter(
            Armateur.id == armateur_id, 
            Armateur.actif == True
        ).first()
        if not armateur:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"L'armateur {armateur_id} n'existe pas"
            )
        return True

    def _check_dossier_exists(self, dossier_id: int) -> DossierImportation:
        """Vérifie qu'un dossier existe et retourne le dossier"""
        dossier = self.db.query(DossierImportation).filter(
            DossierImportation.id == dossier_id
        ).first()
        if not dossier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dossier {dossier_id} non trouvé"
            )
        return dossier

    def _check_dossier_cloture(self, dossier: DossierImportation) -> None:
        """Vérifie que le dossier n'est pas clôturé (date de sortie non renseignée)"""
        if dossier.date_sortie_port is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce dossier est clôturé. Impossible de le modifier."
            )

    def _update_statut(self, dossier: DossierImportation) -> str:
        """Calcule le statut du dossier en fonction des dates"""
        # Conversion pour la comparaison
        date_arrivee = dossier.date_arrivee
        date_sortie = dossier.date_sortie_port
        
        if isinstance(date_arrivee, datetime):
            date_arrivee = date_arrivee.date()
        if isinstance(date_sortie, datetime):
            date_sortie = date_sortie.date()
        # 1. Pas encore parti
        if not dossier.date_depart:
            return StatutDossier.EN_ATTENTE.value
        # 2. Parti mais pas encore arrivé
        if dossier.date_depart and not dossier.date_arrivee:
            return StatutDossier.DEPART.value
        # 3. Arrivé mais pas sorti
        if dossier.date_arrivee and not dossier.date_sortie_port:
            fin_delai = date_arrivee + timedelta(days=dossier.delai_franchise_jours)
            if date.today() > fin_delai:
                return StatutDossier.ARRIVEE_SURESTARIES.value
            return StatutDossier.ARRIVEE.value
        # 4. Sorti
        if dossier.date_sortie_port:
            fin_delai = date_arrivee + timedelta(days=dossier.delai_franchise_jours)
            if date_sortie > fin_delai:
                return StatutDossier.SORTIE_SURESTARIES.value
            return StatutDossier.SORTIE.value
        return dossier.statut

    def _check_bl_unique(self, numero_bl: str, exclude_dossier_id: Optional[int] = None) -> bool:
        """Vérifie que le numéro BL est unique"""
        query = self.db.query(DossierImportation).filter(
            DossierImportation.numero_bl == numero_bl
        )
        if exclude_dossier_id:
            query = query.filter(DossierImportation.id != exclude_dossier_id)
        existing = query.first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Un dossier avec le numéro BL '{numero_bl}' existe déjà"
            )
        return True
    
    def _check_dossier_modifiable(self, dossier: DossierImportation) -> None:
        """Vérifie que le dossier peut être modifié (non clôturé)"""
        if dossier.date_sortie_port is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ce dossier est clôturé (sortie du port enregistrée). Impossible de le modifier."
            )

    def create_dossier(self, dossier: DossierCreate, current_user: Utilisateur) -> DossierImportation:
        self._check_bl_unique(dossier.numero_bl)
        if dossier.armateur_id:
            self._check_armateur_exist(dossier.armateur_id)
            
        new_dossier = DossierImportation(
            numero_bl=dossier.numero_bl,
            fournisseur=dossier.fournisseur,
            armateur_id=dossier.armateur_id,
            utilisateur_id=current_user.id,
            delai_franchise_jours=dossier.delai_franchise_jours,
            eta_initial=dossier.eta_initiale,
            statut=StatutDossier.EN_ATTENTE.value
        )
        self.db.add(new_dossier)
        self.db.flush()

        doc_service = DossierDocumentService(self.db)
        doc_service.save_dossier_documents(new_dossier.id, dossier.documents)

        self.db.commit()
        self.db.refresh(new_dossier)
        return new_dossier

    def get_dossier(self, dossier_id: int, current_user: Utilisateur) -> DossierImportation:
        dossier = self._check_dossier_exists(dossier_id)
        if current_user.role != "admin" and dossier.utilisateur_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à ce dossier"
            )
        return dossier

    def get_dossiers(self, current_user: Utilisateur, skip: int = 0, limit: int = 100, statut: Optional[str] = None) -> List[DossierImportation]:
        query = self.db.query(DossierImportation)
        if current_user.role != "admin":
            query = query.filter(DossierImportation.utilisateur_id == current_user.id)

        if statut:
            query = query.filter(DossierImportation.statut == statut)

        return query.order_by(DossierImportation.date_creation.desc()).offset(skip).limit(limit).all()

    def update_dossier(self, dossier_id: int, update_data: DossierUpdate, current_user: Utilisateur) -> DossierImportation:
        """Met à jour un dossier existant (sans réinitialiser les documents)"""
        dossier = self._check_dossier_exists(dossier_id)
        self._check_dossier_modifiable(dossier)
        # Vérifier si le dossier est clôturé
        self._check_dossier_cloture(dossier)
        # Vérifier les droits
        if current_user.role != "admin" and dossier.utilisateur_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à ce dossier"
            )
        
        # Mettre à jour les champs simples
        if update_data.numero_bl is not None:
            if update_data.numero_bl != dossier.numero_bl:
                self._check_bl_unique(update_data.numero_bl, exclude_dossier_id=dossier_id)
                dossier.numero_bl = update_data.numero_bl
        if update_data.fournisseur is not None:
            dossier.fournisseur = update_data.fournisseur 
        if update_data.armateur_id is not None:
            self._check_armateur_exist(update_data.armateur_id)
            dossier.armateur_id = update_data.armateur_id  
        if update_data.delai_franchise_jours is not None:
            dossier.delai_franchise_jours = update_data.delai_franchise_jours
        
        # ========== GESTION DES DOCUMENTS (SANS PERTE DE L'ÉTAT) ==========
        if update_data.documents is not None:
            # Récupérer les associations existantes
            existing_docs = {
                doc.document_id: doc 
                for doc in self.db.query(DossierDocument).filter(
                    DossierDocument.dossier_id == dossier_id
                ).all()
            }
            new_doc_ids = set(update_data.documents)
            old_doc_ids = set(existing_docs.keys())
            # Ajouter les nouveaux documents
            for doc_id in new_doc_ids - old_doc_ids:
                new_assoc = DossierDocument(
                    dossier_id=dossier_id,
                    document_id=doc_id,
                    obtenu=False
                )
                self.db.add(new_assoc)
            # Supprimer les documents retirés (seulement si non obtenus)
            for doc_id in old_doc_ids - new_doc_ids:
                doc = existing_docs[doc_id]
                if doc.obtenu:
                    # Ne pas supprimer un document déjà obtenu
                    continue
                self.db.delete(doc)
        
        # Mettre à jour le statut
        dossier.statut = self._update_statut(dossier)
        self.db.commit()
        self.db.refresh(dossier)
        return dossier

    def update_arrivee(self, dossier_id: int, arrivee_data: DossierArriveeUpdate, current_user: Utilisateur) -> DossierImportation:
        """Marque l'arrivée de la marchandise"""
        dossier = self._check_dossier_exists(dossier_id)
        self._check_dossier_modifiable(dossier)
        # Vérifier les droits
        if current_user.role != "admin" and dossier.utilisateur_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à ce dossier"
            )
        # Vérifier que le départ a été enregistré
        if not dossier.date_depart:
            raise HTTPException(
                status_code=400,
                detail="Impossible d'enregistrer l'arrivée : le départ n'a pas encore été enregistré"
            )
        # Conversion sécurisée pour la comparaison
        date_arrivee = arrivee_data.date_arrivee
        if isinstance(date_arrivee, datetime):
            date_arrivee = date_arrivee.date()
        
        date_depart = dossier.date_depart
        if isinstance(date_depart, datetime):
            date_depart = date_depart.date()
        
        # Vérifier que la date d'arrivée n'est pas antérieure à la date de départ
        if date_arrivee < date_depart:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La date d'arrivée ({date_arrivee}) ne peut pas être antérieure à la date de départ ({date_depart})"
            )
        dossier.date_arrivee = arrivee_data.date_arrivee
        dossier.statut = self._update_statut(dossier)
        self.db.commit()
        self.db.refresh(dossier)
        
        return dossier
    
    def update_sortie(self, dossier_id: int, sortie_data: DossierSortiePortUpdate, current_user: Utilisateur) -> DossierImportation:
        """Marque la sortie du port"""
        dossier = self._check_dossier_exists(dossier_id)
        # Vérifier les droits
        if current_user.role != "admin" and dossier.utilisateur_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à ce dossier"
            )
        # Vérifier que l'arrivée a été enregistrée
        if not dossier.date_arrivee:
            raise HTTPException(
                status_code=400,
                detail="Impossible d'enregistrer la sortie : l'arrivée n'a pas encore été enregistrée"
            )
        # Vérifier que la sortie n'a pas déjà été enregistrée
        if dossier.date_sortie_port is not None:
            raise HTTPException(
                status_code=400,
                detail="La sortie a déjà été enregistrée pour ce dossier"
            )
        # Conversion sécurisée pour la comparaison
        date_sortie = sortie_data.date_sortie_port
        if isinstance(date_sortie, datetime):
            date_sortie = date_sortie.date()
        date_arrivee = dossier.date_arrivee
        if isinstance(date_arrivee, datetime):
            date_arrivee = date_arrivee.date()
        # Vérifier que la date de sortie n'est pas antérieure à la date d'arrivée
        if date_sortie < date_arrivee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La date de sortie ({date_sortie}) ne peut pas être antérieure à la date d'arrivée ({date_arrivee})"
            )
        
        dossier.date_sortie_port = sortie_data.date_sortie_port
        dossier.statut = self._update_statut(dossier)
        
        self.db.commit()
        self.db.refresh(dossier)
        
        return dossier
    
    def update_depart(self, dossier_id: int, date_depart: datetime, current_user: Utilisateur) -> DossierImportation:
        """Enregistre la date de départ"""
        dossier = self._check_dossier_exists(dossier_id)
        self._check_dossier_modifiable(dossier)
        # Vérifier les droits
        if current_user.role != "admin" and dossier.utilisateur_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas accès à ce dossier"
            )
        # Conversion sécurisée pour la comparaison
        date_depart_val = date_depart
        if isinstance(date_depart_val, datetime):
            date_depart_val = date_depart_val.date()
        
        eta_initial = dossier.eta_initial
        if isinstance(eta_initial, datetime):
            eta_initial = eta_initial.date()
        # Vérifier que la date de départ n'est pas postérieure à l'ETA initial
        if dossier.eta_initial and date_depart_val > eta_initial:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La date de départ ({date_depart_val}) ne peut pas être postérieure à l'ETA initial ({eta_initial})"
            )
        dossier.date_depart = date_depart
        dossier.statut = self._update_statut(dossier)
        
        self.db.commit()
        self.db.refresh(dossier)
        
        return dossier

    def delete_dossier(
        self,
        dossier_id: int,
        current_user: Utilisateur
    ) -> dict:
        """Supprime un dossier et toutes ses associations (admin uniquement)"""
        
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seuls les administrateurs peuvent supprimer des dossiers"
            )
        
        dossier = self._check_dossier_exists(dossier_id)
        # Supprimer les associations dossier-document
        deleted_associations = self.db.query(DossierDocument).filter(
            DossierDocument.dossier_id == dossier_id
        ).delete()
        # Supprimer le dossier
        self.db.delete(dossier)
        self.db.commit()
        return {
            "message": f"Dossier {dossier_id} supprimé avec succès",
            "associations_supprimees": deleted_associations
        }
    

    def analyser_cause_surestarie(self, dossier_id: int):
        """
        Analyse automatique des causes probables de surestarie
        basée sur :
        - Documents manquants
        - Documents reçus après la fin de la franchise
        - Alertes ignorées
        """

        dossier = self._check_dossier_exists(dossier_id)

        if dossier.statut not in [
            StatutDossier.ARRIVEE_SURESTARIES.value,
            StatutDossier.SORTIE_SURESTARIES.value
        ]:
            return {
                "cause_principale": None,
                "message": "Ce dossier n'est pas en surestarie"
            }

        if not dossier.date_arrivee or not dossier.delai_franchise_jours:
            return {
                "cause_principale": None,
                "message": "Impossible d'analyser : date d'arrivée ou délai de franchise manquant"
            }

        date_limite = (
            dossier.date_arrivee +
            timedelta(days=dossier.delai_franchise_jours)
        ).date()

        causes = []
        preuves = []

        responsabilites = {}

        # =====================================================
        # 1. DOCUMENTS NON OBTENUS
        # =====================================================

        docs_manquants = self.db.query(
            DossierDocument,
            Document
        ).join(
            Document,
            DossierDocument.document_id == Document.id
        ).filter(
            DossierDocument.dossier_id == dossier_id,
            DossierDocument.obtenu == False
        ).all()

        for dossier_doc, document in docs_manquants:

            responsable = document.responsable or "NON_DEFINI"

            responsabilites[responsable] = (
                responsabilites.get(responsable, 0) + 3
            )

            preuves.append(
                f"{document.nom} non obtenu "
                f"(responsable : {responsable})"
            )

        if docs_manquants:
            causes.append({
                "type": "documents_manquants",
                "description": f"{len(docs_manquants)} document(s) non obtenu(s)",
                "gravite": "critique"
            })

        # =====================================================
        # 2. DOCUMENTS REÇUS APRÈS LA FIN DE LA FRANCHISE
        # =====================================================

        docs_retard = self.db.query(
            DossierDocument,
            Document
        ).join(
            Document,
            DossierDocument.document_id == Document.id
        ).filter(
            DossierDocument.dossier_id == dossier_id,
            DossierDocument.obtenu == True,
            DossierDocument.date_reception.isnot(None)
        ).all()

        documents_retardataires = []

        for dossier_doc, document in docs_retard:

            date_reception = dossier_doc.date_reception

            if date_reception > date_limite:

                retard = (date_reception - date_limite).days

                responsable = document.responsable or "NON_DEFINI"

                responsabilites[responsable] = (
                    responsabilites.get(responsable, 0)
                    + max(1, retard)
                )

                documents_retardataires.append({
                    "document": document.nom,
                    "responsable": responsable,
                    "retard_jours": retard
                })

                preuves.append(
                    f"{document.nom} reçu avec "
                    f"{retard} jour(s) de retard "
                    f"(responsable : {responsable})"
                )

        if documents_retardataires:
            causes.append({
                "type": "documents_en_retard",
                "description": (
                    f"{len(documents_retardataires)} document(s) "
                    f"reçu(s) après la fin de la franchise"
                ),
                "gravite": "moyenne",
                "documents": documents_retardataires
            })

        # =====================================================
        # 3. ALERTES NON LUES
        # =====================================================

        facteur_aggravant = None

        try:
            alertes_non_lues = self.db.query(Alerte).filter(
                Alerte.dossier_id == dossier_id,
                Alerte.est_lue == False
            ).count()

            if alertes_non_lues > 0:

                responsabilites["ACHETEUR"] = (
                    responsabilites.get("ACHETEUR", 0)
                    + alertes_non_lues
                )

                facteur_aggravant = (
                    f"{alertes_non_lues} alerte(s) non lue(s)"
                )

                preuves.append(
                    f"{alertes_non_lues} alerte(s) ignorée(s)"
                )

        except Exception:
            alertes_non_lues = 0

        # =====================================================
        # 4. RESPONSABLE PRINCIPAL
        # =====================================================

        if not responsabilites:
            return {
                "cause_principale": None,
                "toutes_les_causes": [],
                "preuves": [],
                "message": "Aucune cause identifiée"
            }

        responsable_principal = max(
            responsabilites,
            key=responsabilites.get
        )

        score_principal = responsabilites[responsable_principal]

        # =====================================================
        # 5. CONCLUSION
        # =====================================================

        cause_principale = {
            "responsable": responsable_principal,
            "score": score_principal,
            "description": (
                f"La surestarie semble principalement liée à "
                f"des retards documentaires imputables à "
                f"{responsable_principal}"
            )
        }

        return {
            "cause_principale": cause_principale,
            "toutes_les_causes": causes,
            "preuves": preuves,
            "facteur_aggravant": facteur_aggravant,
            "repartition_responsabilites": responsabilites,
            "recommandation": self._get_recommandation(cause_principale)
        }
    
    def _get_recommandation(self, cause: dict) -> str:
        """
        Retourne une recommandation selon le responsable principal
        identifié dans l'analyse de surestarie.
        """

        responsable = cause.get("responsable") or cause.get("type")

        recommandations = {
            "FOURNISSEUR":
                "Renforcer le suivi documentaire auprès du fournisseur et exiger la transmission des documents avant l'arrivée de la marchandise.",

            "ACHETEUR":
                "Améliorer le suivi des alertes et anticiper les démarches administratives avant l'expiration de la franchise.",

            "ARMATEUR":
                "Renforcer la communication avec l'armateur et suivre régulièrement les mises à jour relatives au navire et aux documents de transport.",

            "TRANSITAIRE":
                "Mettre en place un suivi plus rigoureux des opérations de dédouanement et des formalités portuaires.",

            "NON_DEFINI":
                "Aucune responsabilité clairement identifiable. Une analyse manuelle complémentaire est recommandée."
        }

        return recommandations.get(
            responsable,
            "Renforcer le suivi global du dossier d'importation afin d'anticiper les risques de surestarie."
        )
    
    def auto_reception_document(
        self,
        nom_document: str,
        numero_bl: Optional[str],
        adresse_destinataire: Optional[str],
        mail_expediteur: str,
        mail_date_reception: str,
        numero_conteneur: Optional[str] = None
        ) -> Dict[str, Any]:
        """
        Traite un document reçu automatiquement depuis n8n.
        Identifie l'utilisateur, le dossier et marque le document comme reçu.
        """
        
        # 1. Convertir la date de réception
        try:
            date_reception = datetime.fromisoformat(
                mail_date_reception.replace('Z', '+00:00')
            )
        except (ValueError, TypeError):
            date_reception = datetime.now()
            logger.warning(f"Date invalide, utilisation de la date actuelle")
        
        # 2. Trouver l'utilisateur par email
        user = None
        if adresse_destinataire:
            user = self.db.query(Utilisateur).filter(
                Utilisateur.email == adresse_destinataire
            ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Utilisateur non trouvé avec l'email: {adresse_destinataire}"
            )
        
        logger.info(f"Utilisateur trouvé: {user.email} (ID: {user.id})")
        
        # 3. Trouver le dossier par BL ou conteneur
        dossier = None
        
        if numero_bl:
            dossier = self.db.query(DossierImportation).filter(
                DossierImportation.numero_bl == numero_bl,
                DossierImportation.utilisateur_id == user.id
            ).first()
        
        if not dossier and numero_conteneur:
            dossier = self.db.query(DossierImportation).filter(
                DossierImportation.numero_conteneur == numero_conteneur,
                DossierImportation.utilisateur_id == user.id
            ).first()
        
        if not dossier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Aucun dossier trouvé pour BL={numero_bl} ou conteneur={numero_conteneur}"
            )
        
        logger.info(f"Dossier trouvé: {dossier.numero_bl} (ID: {dossier.id})")
        
        # 4. Trouver le type de document
        doc_type = self.db.query(Document).filter(
            Document.code == nom_document
        ).first()
        
        if not doc_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Type de document '{nom_document}' non reconnu"
            )
        
        # 5. Marquer le document comme reçu
        doc_assoc = self.db.query(DossierDocument).filter(
            DossierDocument.dossier_id == dossier.id,
            DossierDocument.document_type_id == doc_type.id
        ).first()
        
        if not doc_assoc:
            # Créer l'association si elle n'existe pas
            doc_assoc = DossierDocument(
                dossier_id=dossier.id,
                document_type_id=doc_type.id,
                obtenu=True,
                date_reception=date_reception.date()
            )
            self.db.add(doc_assoc)
            logger.info(f"📄 Nouvelle association créée pour doc: {nom_document}")
        else:
            doc_assoc.obtenu = True
            doc_assoc.date_reception = date_reception.date()
            logger.info(f"📄 Association mise à jour pour doc: {nom_document}")
        
        self.db.commit()
        self.db.refresh(doc_assoc) if doc_assoc else None
        
        return {
            "success": True,
            "message": f"Document {nom_document} marqué comme reçu",
            "document": {
                "type": nom_document,
                "date_reception": date_reception.isoformat()
            },
            "dossier": {
                "id": dossier.id,
                "numero_bl": dossier.numero_bl,
                "utilisateur": {
                    "id": user.id,
                    "email": user.email,
                    "nom": user.nom
                }
            }
        }