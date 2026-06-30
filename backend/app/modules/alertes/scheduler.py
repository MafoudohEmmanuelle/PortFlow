# backend/app/modules/alertes/scheduler.py
import threading
import time
from datetime import datetime, time as dt_time, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from .service import AlerteService
from .notifiers import email_notifier
from app.modules.auth.models import Utilisateur
from app.modules.dossiers.models import DossierImportation
from sqlalchemy import func
from datetime import date
from .models import Alerte  # ← IMPORTANT

class AlertScheduler:
    """Planificateur de tâches pour les alertes"""
    
    def __init__(self):
        self.running = False
        self.thread = None

    def _generer_et_notifier(self):
        """Génère les alertes et envoie les notifications"""
        
        print(f"[{datetime.now()}] 🔔 Génération automatique des alertes...")
        
        db = SessionLocal()
        try:
            service = AlerteService(db)
            
            # 1. Générer les alertes pour tous les dossiers actifs
            count = service.generer_alertes_pour_tous_dossiers()
            print(f"[{datetime.now()}] 📋 {count} nouvelle(s) alerte(s) générée(s)")
            
            # 2. Récupérer UNIQUEMENT les alertes créées AUJOURD'HUI
            from datetime import date
            from sqlalchemy import func
            
            aujourdhui = date.today()
            
            alertes_aujourdhui = db.query(Alerte).filter(
                func.date(Alerte.date_alerte) == aujourdhui,
                Alerte.est_lue == False
            ).all()
            
            if not alertes_aujourdhui:
                print(f"[{datetime.now()}] ✅ Aucune nouvelle alerte aujourd'hui")
                return
            
            # 3. Grouper les alertes par utilisateur
            alertes_par_utilisateur = {}
            
            for alerte in alertes_aujourdhui:
                dossier = db.query(DossierImportation).filter(
                    DossierImportation.id == alerte.dossier_id
                ).first()
                
                if dossier:
                    user_id = dossier.utilisateur_id
                    
                    alerte_dict = {
                        "id": alerte.id,
                        "dossier_id": alerte.dossier_id,
                        "type_alerte": alerte.type_alerte,
                        "niveau": alerte.niveau,
                        "message": alerte.message
                    }
                    
                    if user_id not in alertes_par_utilisateur:
                        alertes_par_utilisateur[user_id] = []
                    alertes_par_utilisateur[user_id].append(alerte_dict)
            
            # 4. Envoyer les notifications par email
            for user_id, alertes in alertes_par_utilisateur.items():
                user = db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
                if user and user.email:
                    email_notifier.notifier_utilisateur(user, alertes)
                    print(f"[{datetime.now()}] 📧 Email envoyé à {user.email} ({len(alertes)} alerte(s))")
            
            print(f"[{datetime.now()}] 📧 Notifications envoyées à {len(alertes_par_utilisateur)} utilisateur(s)")
            
        except Exception as e:
            print(f"[{datetime.now()}] ❌ Erreur dans le scheduler: {e}")
            import traceback
            traceback.print_exc()
        finally:
            db.close()
            
    def _run_scheduler(self):
        """Boucle principale du scheduler"""
        while self.running:
            maintenant = datetime.now()
            heure_cible = dt_time(9, 0)  # 9h00 du matin
            
            # Prochain déclenchement à 9h00
            prochain = datetime.combine(maintenant.date(), heure_cible)
            if maintenant >= prochain:
                prochain = datetime.combine(maintenant.date() + timedelta(days=1), heure_cible)
            
            # Attendre jusqu'à 9h00
            temps_attente = (prochain - maintenant).total_seconds()
            if temps_attente > 0:
                time.sleep(temps_attente)
            
            # Exécuter la tâche
            if self.running:
                self._generer_et_notifier()
    
    def start(self):
        """Démarre le scheduler (à appeler au démarrage de l'application)"""
        if self.running:
            print("⚠️ Scheduler déjà en cours d'exécution")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        print(f"✅ Scheduler démarré - Génération des alertes à 9h00 chaque jour")
    
    def stop(self):
        """Arrête le scheduler"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("🛑 Scheduler arrêté")


# Instance globale
scheduler = AlertScheduler()