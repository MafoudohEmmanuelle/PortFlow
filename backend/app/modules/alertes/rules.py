from datetime import date, timedelta
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from app.modules.dossiers.models import DossierImportation
from app.modules.documents.service import DossierDocumentService
from app.modules.tracking.models import TrackingHistory

class ReglesAlerte:
    """Moteur de règles pour générer des alertes"""
    
    def __init__(self, db: Session):
        self.db = db
        self.doc_service = DossierDocumentService(db)
    
    def _get_dernier_tracking(self, dossier_id: int) -> Optional[TrackingHistory]:
        """Récupère le dernier tracking du dossier"""
        return self.db.query(TrackingHistory).filter(
            TrackingHistory.dossier_id == dossier_id
        ).order_by(TrackingHistory.date_creation.desc()).first()
    
    def _get_documents_manquants_liste(self, dossier_id: int) -> List[str]:
        """Récupère la liste des noms de documents manquants"""
        docs_manquants = self.doc_service.get_missing_documents(dossier_id)
        return docs_manquants
    
    def _construire_message_avec_docs(self, base_message: str, docs_manquants: List[str]) -> str:
        """Construit un message incluant la liste des documents manquants"""
        if docs_manquants:
            docs_texte = ", ".join(docs_manquants)
            return f"{base_message}\n📄 Documents manquants : {docs_texte}"
        return base_message
    
    # ========== CAS 1 : TRACKING INACTIF ==========
    def verifier_tracking_inactif(self, dossier: DossierImportation) -> List[Dict[str, Any]]:
        """
        Cas 1 : Alerte si aucun tracking depuis plus de 3 jours
        """
        alertes = []
        
        dernier_tracking = self._get_dernier_tracking(dossier.id)
        
        if dernier_tracking:
            jours_sans_maj = (date.today() - dernier_tracking.date_creation.date()).days
            
            if jours_sans_maj >= 3:
                docs_manquants = self._get_documents_manquants_liste(dossier.id)
                message = f"Aucune mise à jour de tracking depuis {jours_sans_maj} jours.Veuillez renseigner un nouveau tracking. Dernière position : {dernier_tracking.position}"
                message_complet = self._construire_message_avec_docs(message, docs_manquants)
                
                alertes.append({
                    "type_alerte": "tracking_inactif",
                    "niveau": "warning",
                    "message": message_complet,
                    "dossier_id": dossier.id
                })
        
        return alertes
    
    # ========== CAS 2 : APPROCHE ARRIVÉE ==========
    def verifier_approche_arrivee(self, dossier: DossierImportation) -> List[Dict[str, Any]]:
        """
        Cas 2 : Alerte quotidienne à partir de J-30 avant arrivée
        S'arrête quand l'utilisateur a renseigné date_arrivee
        """
        alertes = []
        
        # Si l'utilisateur a déjà renseigné la date d'arrivée, on arrête
        if dossier.date_arrivee:
            return alertes
        
        # Récupérer le dernier ETA (priorité au tracking)
        dernier_tracking = self._get_dernier_tracking(dossier.id)
        eta = None
        
        if dernier_tracking and dernier_tracking.eta:
            eta = dernier_tracking.eta
        elif dossier.eta_initial:
            eta = dossier.eta_initial
        
        if not eta:
            return alertes
        
        jours_restants = (eta - date.today()).days
        
        # Alerte à partir de J-5 jusqu'à J-0
        if 0 <= jours_restants <= 30:
            docs_manquants = self._get_documents_manquants_liste(dossier.id)
            
            if jours_restants == 0:
                message = f"🚨 LA MARCHANDISE ARRIVE AUJOURD'HUI ! (ETA: {eta})"
                niveau = "critique"
            elif jours_restants == 1:
                message = f"🚨 DERNIER JOUR ! La marchandise arrive DEMAIN ! (selon le dernier ATE enregistré: {eta})"
                niveau = "critique"
            elif 2 <= jours_restants <= 7:
                message = f"⚠️ ATTENTION : La marchandise arrive dans {jours_restants} jours (ETA: {eta})"
                niveau = "warning"
            else:
                message = f"📅 Information : La marchandise arrivera dans {jours_restants} jours (ETA: {eta})"
                niveau = "info"
            
            message_complet = self._construire_message_avec_docs(message, docs_manquants)
            
            alertes.append({
                "type_alerte": "approche_arrivee",
                "niveau": niveau,
                "message": message_complet,
                "dossier_id": dossier.id
            })
        
        return alertes
    
    # ========== CAS 3 : EXPIRATION FRANCHISE ==========
    def verifier_franchise_expiration(self, dossier: DossierImportation) -> List[Dict[str, Any]]:
        """
        Cas 3 : Alerte quotidienne à partir de J-5 avant expiration du délai de franchise
        S'arrête quand l'utilisateur a renseigné date_sortie_port
        """
        alertes = []
        
        # Si l'utilisateur a déjà renseigné la date de sortie, on arrête
        if dossier.date_sortie_port:
            return alertes
        
        # La date de référence pour le délai de franchise est la date d'arrivée
        if not dossier.date_arrivee:
            return alertes
        
        date_fin_franchise = dossier.date_arrivee + timedelta(days=dossier.delai_franchise_jours)
        jours_restants = (date_fin_franchise - date.today()).days
        
        # Alerte à partir de J-5 jusqu'au dépassement
        if -5 <= jours_restants <= 5:
            docs_manquants = self._get_documents_manquants_liste(dossier.id)
            
            if jours_restants < 0:
                message = f"🚨 SURESTARIES ! Délai de franchise dépassé depuis {abs(jours_restants)} jour(s) (fin: {date_fin_franchise}). La marchandise a-t-elle été retirée du port?"
                niveau = "critique"
            elif jours_restants == 0:
                message = f"🚨 DERNIER JOUR ! Le délai de franchise expire AUJOURD'HUI ! (fin: {date_fin_franchise}). La marchandise a-t-elle été retirée du port?"
                niveau = "critique"
            elif jours_restants == 1:
                message = f"🔔 URGENT : Le délai de franchise expire DEMAIN ! (fin: {date_fin_franchise})"
                niveau = "critique"
            else:
                message = f"⚠️ ATTENTION : Le délai de franchise expire dans {jours_restants} jours (fin: {date_fin_franchise}). Veuillez actualiser votre suivi sur la plateforme"
                niveau = "warning"
            
            message_complet = self._construire_message_avec_docs(message, docs_manquants)
            
            alertes.append({
                "type_alerte": "franchise_expiration",
                "niveau": niveau,
                "message": message_complet,
                "dossier_id": dossier.id
            })
        
        return alertes
    
    # ========== CAS 4 : DOSSIER INCOMPLET (documents manquants sans condition) ==========
    def verifier_dossier_incomplet(self, dossier: DossierImportation) -> List[Dict[str, Any]]:
        """
        Cas 4 : Alerte quand un dossier a des documents manquants
        sans condition d'arrivée ou de franchise.
        S'active si le dossier existe depuis plus de 3 jours.
        """
        alertes = []
        
        # Ne pas alerter si le dossier est déjà clôturé
        if dossier.statut == "cloture":
            return alertes
        
        # Ne pas alerter si la date de sortie est déjà renseignée
        if dossier.date_sortie_port:
            return alertes
        
        # Récupérer les documents manquants
        docs_manquants = self._get_documents_manquants_liste(dossier.id)
        
        if not docs_manquants:
            return alertes
        
        # Vérifier depuis combien de temps le dossier existe
        jours_existence = (date.today() - dossier.date_creation.date()).days
        
        # Alerter si le dossier existe depuis plus de 3 jours
        if jours_existence >= 3:
            docs_texte = ", ".join(docs_manquants)
            message = f"📄 Dossier incomplet : {len(docs_manquants)} document(s) manquant(s) depuis {jours_existence} jours."
            message_complet = self._construire_message_avec_docs(message, docs_manquants)
            
            alertes.append({
                "type_alerte": "dossier_incomplet",
                "niveau": "warning",
                "message": message_complet,
                "dossier_id": dossier.id
            })
        
        return alertes
    
    # ========== EXÉCUTION DE TOUTES LES RÈGLES ==========
    def executer_toutes_regles(self, dossier: DossierImportation) -> List[Dict[str, Any]]:
        """Exécute toutes les règles pour un dossier"""
        toutes_alertes = []
        
        toutes_alertes.extend(self.verifier_tracking_inactif(dossier))
        toutes_alertes.extend(self.verifier_approche_arrivee(dossier))
        toutes_alertes.extend(self.verifier_franchise_expiration(dossier))
        toutes_alertes.extend(self.verifier_dossier_incomplet(dossier))  # ← NOUVEAU
        
        return toutes_alertes