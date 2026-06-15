from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from .models import Alerte
from .schemas import AlerteCreate
from .rules import ReglesAlerte
from app.modules.dossiers.models import DossierImportation
from app.modules.auth.models import Utilisateur

class AlerteService:
    
    def __init__(self, db: Session):
        self.db = db
    
    def _check_alerte_exists(self, alerte_id: int) -> Alerte:
        alerte = self.db.query(Alerte).filter(Alerte.id == alerte_id).first()
        if not alerte:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alerte {alerte_id} non trouvée"
            )
        return alerte
    
    def generer_alertes_pour_dossier(self, dossier_id: int) -> List[Alerte]:
        """Génère des alertes pour un dossier spécifique selon les règles métier"""
        dossier = self.db.query(DossierImportation).filter(
            DossierImportation.id == dossier_id
        ).first()
        
        if not dossier:
            return []
        
        regles = ReglesAlerte(self.db)
        nouvelles_alertes = regles.executer_toutes_regles(dossier)
        
        alertes_creees = []
        for alerte_data in nouvelles_alertes:
            # Vérifier si une alerte similaire existe déjà (non lue)
            # existante = self.db.query(Alerte).filter(
            #     Alerte.dossier_id == alerte_data["dossier_id"],
            #     Alerte.type_alerte == alerte_data["type_alerte"],
            #     Alerte.est_lue == False
            # ).first()
            
            # if not existante:
                nouvelle = Alerte(
                    dossier_id=alerte_data["dossier_id"],
                    type_alerte=alerte_data["type_alerte"],
                    niveau=alerte_data["niveau"],
                    message=alerte_data["message"]
                )
                self.db.add(nouvelle)
                alertes_creees.append(nouvelle)
        
        if alertes_creees:
            self.db.commit()
            for a in alertes_creees:
                self.db.refresh(a)
        
        return alertes_creees
    
    def generer_alertes_pour_tous_dossiers(self) -> int:
        """Génère des alertes pour tous les dossiers actifs"""
        dossiers = self.db.query(DossierImportation).filter(
            DossierImportation.statut.in_(["en_attente", "depart", "arrivee"])
        ).all()
        
        total_alertes = 0
        for dossier in dossiers:
            alertes = self.generer_alertes_pour_dossier(dossier.id)
            total_alertes += len(alertes)
        
        return total_alertes
    
    def get_alertes(self, est_lue: Optional[bool] = None, skip: int = 0, limit: int = 100) -> List[Alerte]:
        """Récupère les alertes avec filtrage"""
        query = self.db.query(Alerte)
        
        if est_lue is not None:
            query = query.filter(Alerte.est_lue == est_lue)
        
        return query.order_by(Alerte.date_alerte.desc()).offset(skip).limit(limit).all()
    
    def get_alertes_by_dossier(self, dossier_id: int) -> List[Alerte]:
        """Récupère les alertes d'un dossier spécifique"""
        return self.db.query(Alerte).filter(
            Alerte.dossier_id == dossier_id
        ).order_by(Alerte.date_alerte.desc()).all()
    
    def marquer_comme_lue(self, alerte_id: int, current_user: Utilisateur = None) -> Alerte:
        """Marque une alerte comme lue"""
        alerte = self._check_alerte_exists(alerte_id)
        
        if alerte.est_lue:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cette alerte est déjà marquée comme lue"
            )
        
        alerte.est_lue = True
        self.db.commit()
        self.db.refresh(alerte)
        
        return alerte
    
    def marquer_toutes_comme_lues(self, dossier_id: Optional[int] = None) -> int:
        """Marque toutes les alertes comme lues"""
        query = self.db.query(Alerte).filter(Alerte.est_lue == False)
        
        if dossier_id:
            query = query.filter(Alerte.dossier_id == dossier_id)
        
        count = query.update({"est_lue": True})
        self.db.commit()
        
        return count
    
    def supprimer_alertes_lues(self) -> int:
        """Supprime les alertes lues (optionnel - nettoyage)"""
        count = self.db.query(Alerte).filter(Alerte.est_lue == True).delete()
        self.db.commit()
        return count
    
    def get_stats(self) -> dict:
        """Statistiques des alertes pour le dashboard"""
        total_alertes = self.db.query(Alerte).count()
        non_lues = self.db.query(Alerte).filter(Alerte.est_lue == False).count()
        
        alertes_par_type = {}
        types = self.db.query(Alerte.type_alerte).distinct().all()
        for t in types:
            count = self.db.query(Alerte).filter(
                Alerte.type_alerte == t[0], 
                Alerte.est_lue == False
            ).count()
            alertes_par_type[t[0]] = count
        
        alertes_par_niveau = {}
        niveaux = self.db.query(Alerte.niveau).distinct().all()
        for n in niveaux:
            count = self.db.query(Alerte).filter(
                Alerte.niveau == n[0], 
                Alerte.est_lue == False
            ).count()
            alertes_par_niveau[n[0]] = count
        
        return {
            "total": total_alertes,
            "non_lues": non_lues,
            "par_type": alertes_par_type,
            "par_niveau": alertes_par_niveau
        }