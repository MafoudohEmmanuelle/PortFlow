# backend/app/modules/rapports/service.py
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from fastapi import HTTPException, status
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta,date
import json

from app.modules.reporting.models import Rapport
from app.modules.dossiers.models import DossierImportation
from app.modules.dossiers.enum import StatutDossier
from app.modules.dossiers.service import DossierImportationService
from app.modules.documents.service import DossierDocumentService
from app.modules.tracking.models import TrackingHistory
from app.modules.auth.models import Utilisateur

def datetime_converter(obj):
        """Convertit les datetime en chaînes ISO pour JSON"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")

class RapportService:
    """Service de gestion des rapports - Génération automatique"""

    def __init__(self, db: Session):
        self.db = db

    # ========== 1. GÉNÉRATION AUTOMATIQUE DES RAPPORTS ==========

    def generer_rapport_cloture(self, dossier_id: int) -> Dict[str, Any]:
        """
        Génère un rapport de clôture pour un dossier (automatique à la clôture).
        Peut être généré avec ou sans surestarie.
        """
        # Récupérer le dossier
        dossier = self.db.query(DossierImportation).filter(
            DossierImportation.id == dossier_id
        ).first()

        if not dossier:
            raise HTTPException(status_code=404, detail="Dossier non trouvé")

        # Vérifier que le dossier est clôturé (date de sortie renseignée)
        if dossier.date_sortie_port is None:
            raise HTTPException(
                status_code=400,
                detail="Le dossier n'est pas encore clôturé (date de sortie non renseignée)"
            )

        # Récupérer les documents
        doc_service = DossierDocumentService(self.db)
        documents = doc_service.get_dossier_documents(dossier_id)

        # Analyser les causes de surestarie (si applicable)
        dossier_service = DossierImportationService(self.db)
        analyse = dossier_service.analyser_cause_surestarie(dossier_id)
        # Calcul du nombre de jours de surestarie
        jours_surestarie = 0

        if (
            dossier.date_arrivee
            and dossier.date_sortie_port
            and dossier.delai_franchise_jours
        ):
            fin_franchise = (
                dossier.date_arrivee +
                timedelta(days=dossier.delai_franchise_jours)
            )

            if dossier.date_sortie_port > fin_franchise:
                jours_surestarie = (
                    dossier.date_sortie_port - fin_franchise
                ).days


        # Responsable probable

        responsable_principal = None

        if analyse.get("cause_principale"):
            responsable_principal = analyse["cause_principale"].get(
                "responsable_principal"
            )
        # Construire le contenu du rapport
        contenu = {
            "type_rapport": "cloture",
            "dossier": {
                "id": dossier.id,
                "numero_bl": dossier.numero_bl,
                "fournisseur": dossier.fournisseur,
                "armateur_id": dossier.armateur_id,
                "statut": dossier.statut,
                "delai_franchise_jours": dossier.delai_franchise_jours,
                "eta_initial": dossier.eta_initial.isoformat() if dossier.eta_initial else None,
                "date_depart": dossier.date_depart.isoformat() if dossier.date_depart else None,
                "date_arrivee": dossier.date_arrivee.isoformat() if dossier.date_arrivee else None,
                "date_sortie_port": dossier.date_sortie_port.isoformat() if dossier.date_sortie_port else None,
                "date_creation": dossier.date_creation.isoformat() if dossier.date_creation else None,
            },
            "documents": documents,
            "analyse": analyse,
            "statistiques": {
                "total_documents": len(documents),

                "documents_obtenus": len([
                    d for d in documents
                    if d.get("obtenu")
                ]),

                "documents_manquants": len([
                    d for d in documents
                    if not d.get("obtenu")
                ]),

                "est_en_surestarie": dossier.statut in [
                    StatutDossier.ARRIVEE_SURESTARIES.value,
                    StatutDossier.SORTIE_SURESTARIES.value
                ],

                "type_surestarie": dossier.statut,

                "jours_au_port": (
                    dossier.date_sortie_port - dossier.date_arrivee
                ).days
                if dossier.date_sortie_port and dossier.date_arrivee
                else 0,

                "jours_surestarie": jours_surestarie,

                "responsable_principal": responsable_principal,

                "date_generation": datetime.now().isoformat()
            }
        }
        
        return contenu

    def generer_rapport_tracking(self, dossier_id: int) -> Dict[str, Any]:
        """
        Génère un rapport de tracking pour un dossier.
        Inclut l'historique des positions et des statuts.
        """
        dossier = self.db.query(DossierImportation).filter(
            DossierImportation.id == dossier_id
        ).first()

        if not dossier:
            raise HTTPException(status_code=404, detail="Dossier non trouvé")

        # Récupérer l'historique de tracking
        tracking_history = self.db.query(
            TrackingHistory
        ).filter(
            TrackingHistory.dossier_id == dossier_id
        ).order_by(
            TrackingHistory.date_releve.desc()
        ).all()
        # Récupérer les événements clés du dossier
        evenements = []

        if dossier.date_depart:
            evenements.append({
                "date": dossier.date_depart.isoformat(),
                "type": "depart",
                "message": "Départ du navire"
            })

        if dossier.date_arrivee:
            evenements.append({
                "date": dossier.date_arrivee.isoformat(),
                "type": "arrivee",
                "message": "Arrivée au port"
            })

        if dossier.date_sortie_port:
            evenements.append({
                "date": dossier.date_sortie_port.isoformat(),
                "type": "sortie",
                "message": "Sortie du port"
            })

        # Construire le contenu
        contenu = {
            "type_rapport": "tracking",
            "dossier": {
                "id": dossier.id,
                "numero_bl": dossier.numero_bl,
                "fournisseur": dossier.fournisseur,
                "statut": dossier.statut,
                "eta_initial": dossier.eta_initial.isoformat() if dossier.eta_initial else None,
            },
            "evenements": evenements,
            "tracking_history": [
                {
                    "date": t.date_releve.isoformat() if hasattr(t, 'date_releve') else None,
                    "position": t.position if hasattr(t, 'position') else None,
                    "statut": t.statut if hasattr(t, 'statut') else None,
                    "observations": t.observations if hasattr(t, 'observations') else None
                }
                for t in tracking_history
            ] if tracking_history else [],
            "statistiques": {
                "total_evenements": len(evenements),
                "total_tracking": len(tracking_history),
                "date_generation": datetime.now().isoformat()
            }
        }

        return contenu

    # ========== 2. SAUVEGARDE DES RAPPORTS ==========

    def sauvegarder_rapport(self, dossier_id: int, type_rapport: str, contenu: Dict, current_user: Utilisateur) -> Rapport:
        """Sauvegarde ou met à jour un rapport (un seul par type et par dossier)"""
        
        # Sérialiser le contenu
        contenu_serialized = json.loads(json.dumps(contenu, default=datetime_converter))
        
        # Vérifier si un rapport de ce type existe déjà pour ce dossier
        rapport_existant = self.db.query(Rapport).filter(
            Rapport.dossier_id == dossier_id,
            Rapport.type_rapport == type_rapport
        ).first()
        
        if rapport_existant:
            # Mettre à jour l'existant (ne pas en créer un nouveau)
            rapport_existant.contenu = contenu_serialized
            rapport_existant.date_generation = datetime.now()
            self.db.commit()
            self.db.refresh(rapport_existant)
            return rapport_existant
        
        # Créer un nouveau rapport (première génération)
        rapport = Rapport(
            dossier_id=dossier_id,
            type_rapport=type_rapport,
            contenu=contenu_serialized,
            generateur_id=current_user.id
        )
        self.db.add(rapport)
        self.db.commit()
        self.db.refresh(rapport)
        return rapport
    # ========== 3. CONSULTATION DES RAPPORTS ==========
    def get_rapport(self, rapport_id: int, current_user: Utilisateur) -> Rapport:
        """Récupère un rapport par son ID avec vérification des droits"""
        
        rapport = self.db.query(Rapport).filter(
            Rapport.id == rapport_id
        ).first()
        
        if not rapport:
            raise HTTPException(status_code=404, detail="Rapport non trouvé")
        
        # Vérifier les droits d'accès
        if current_user.role != "admin":
            # Vérifier que l'utilisateur a accès au dossier
            dossier = self.db.query(DossierImportation).filter(
                DossierImportation.id == rapport.dossier_id
            ).first()
            if dossier and dossier.utilisateur_id != current_user.id:
                raise HTTPException(
                    status_code=403,
                    detail="Vous n'avez pas accès à ce rapport"
                )
        
        return rapport

    def get_rapports_by_dossier(
        self,
        dossier_id: int,
        current_user: Utilisateur,
        skip: int = 0,
        limit: int = 50
    ) -> List[Rapport]:
        """Récupère tous les rapports d'un dossier avec vérification des droits"""
        
        # Vérifier l'accès au dossier
        dossier = self.db.query(DossierImportation).filter(
            DossierImportation.id == dossier_id
        ).first()
        
        if not dossier:
            raise HTTPException(status_code=404, detail="Dossier non trouvé")
        
        if current_user.role != "admin" and dossier.utilisateur_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Vous n'avez pas accès à ce dossier"
            )
        
        return self.db.query(Rapport).filter(
            Rapport.dossier_id == dossier_id
        ).order_by(
            Rapport.date_generation.desc()
        ).offset(skip).limit(limit).all()

    def get_all_rapports_by_user(
        self,
        current_user: Utilisateur,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Récupère tous les rapports accessibles à un acheteur (ses dossiers)"""
        
        # Récupérer les IDs des dossiers de l'utilisateur
        dossier_ids = self.db.query(DossierImportation.id).filter(
            DossierImportation.utilisateur_id == current_user.id
        ).all()
        dossier_ids = [d[0] for d in dossier_ids]
        
        if not dossier_ids:
            return []
        
        rapports = self.db.query(
            Rapport,
            DossierImportation.numero_bl,
            DossierImportation.fournisseur
        ).join(
            DossierImportation, Rapport.dossier_id == DossierImportation.id
        ).filter(
            Rapport.dossier_id.in_(dossier_ids)
        ).order_by(
            Rapport.date_generation.desc()
        ).offset(skip).limit(limit).all()
        
        return [
            {
                "id": r.Rapport.id,
                "dossier_id": r.Rapport.dossier_id,
                "numero_bl": r.numero_bl,
                "fournisseur": r.fournisseur,
                "type_rapport": r.Rapport.type_rapport,
                "date_generation": r.Rapport.date_generation,
                "contenu_resume": self._get_rapport_resume(r.Rapport.contenu)
            }
            for r in rapports
        ]

    def get_all_rapports_admin(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Récupère tous les rapports (admin)"""
        
        rapports = self.db.query(
            Rapport,
            DossierImportation.numero_bl,
            DossierImportation.fournisseur,
            Utilisateur.nom.label("generateur_nom")
        ).join(
            DossierImportation, Rapport.dossier_id == DossierImportation.id
        ).join(
            Utilisateur,Rapport.generateur_id == Utilisateur.id
        ).order_by(
            Rapport.date_generation.desc()
        ).offset(skip).limit(limit).all()
        
        return [
            {
                "id": r.Rapport.id,
                "dossier_id": r.Rapport.dossier_id,
                "numero_bl": r.numero_bl,
                "fournisseur": r.fournisseur,
                "type_rapport": r.Rapport.type_rapport,
                "date_generation": r.Rapport.date_generation,
                "generateur_nom": r.generateur_nom,
                "contenu_resume": self._get_rapport_resume(r.Rapport.contenu)
            }
            for r in rapports
        ]

    # ========== 4. UTILITAIRES ==========

    def _get_rapport_resume(self,contenu: Dict[str, Any]) -> Dict[str, Any]:
        stats = contenu.get("statistiques", {})
        analyse = contenu.get("analyse", {})
        cause_principale = None
        if analyse.get("cause_principale"):
            cause_principale = analyse["cause_principale"].get(
                "type"
            )
        return {
            "total_documents": stats.get(
                "total_documents",
                0
            ),
            "documents_obtenus": stats.get(
                "documents_obtenus",
                0
            ),
            "est_en_surestarie": stats.get(
                "est_en_surestarie",
                False
            ),
            "jours_surestarie": stats.get(
                "jours_surestarie",
                0
            ),
            "responsable_principal": stats.get(
                "responsable_principal"
            ),
            "cause_principale": cause_principale,

            "type_rapport": contenu.get(
                "type_rapport",
                "inconnu"
            )
        }

    def get_dernier_rapport_cloture(self, dossier_id: int) -> Optional[Rapport]:
        """Récupère le dernier rapport de clôture d'un dossier"""
        
        rapport = self.db.query(Rapport).filter(
            Rapport.dossier_id == dossier_id,
            Rapport.type_rapport == "cloture"
        ).order_by(
            Rapport.date_generation.desc()
        ).first()
        
        return rapport

    def get_dernier_rapport_tracking(self, dossier_id: int) -> Optional[Rapport]:
        """Récupère le dernier rapport de tracking d'un dossier"""
        
        rapport = self.db.query(Rapport).filter(
            Rapport.dossier_id == dossier_id,
            Rapport.type_rapport == "tracking"
        ).order_by(
            Rapport.date_generation.desc()
        ).first()
        
        return rapport
    
    def get_rapport_existant(self, dossier_id: int, type_rapport: str) -> Optional[Rapport]:
        """Vérifie si un rapport de ce type existe déjà pour ce dossier"""
        return self.db.query(Rapport).filter(
            Rapport.dossier_id == dossier_id,
            Rapport.type_rapport == type_rapport
        ).first()