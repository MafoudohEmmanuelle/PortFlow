# backend/app/modules/dossiers/scheduler.py
import threading
import time
from datetime import datetime, time as dt_time, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from .service import DossierImportationService

class DossierScheduler:
    """Planificateur pour la mise à jour automatique des statuts"""
    
    def __init__(self):
        self.running = False
        self.thread = None
    
    def _mettre_a_jour_statuts(self):
        """Met à jour les statuts des dossiers"""
        print(f"[{datetime.now()}] 🔄 Mise à jour automatique des statuts...")
        
        db = SessionLocal()
        try:
            service = DossierImportationService(db)
            count = service.mettre_a_jour_statuts_automatique()
            
            if count > 0:
                print(f"[{datetime.now()}] ✅ {count} dossier(s) mis à jour")
            else:
                print(f"[{datetime.now()}] ✅ Aucun changement de statut")
                
        except Exception as e:
            print(f"[{datetime.now()}] ❌ Erreur: {e}")
        finally:
            db.close()
    
    # def _run_scheduler(self):
    #     """Boucle principale - vérifie toutes les heures"""
    #     while self.running:
    #         self._mettre_a_jour_statuts()
    #         time.sleep(3600)  # 1 heure = 3600 secondes
   
    def _run_scheduler(self):
        """Boucle principale - vérifie une fois par jour à 9h00"""
        while self.running:
            maintenant = datetime.now()
            heure_cible = dt_time(9, 0)  # 9h00
            
            # Calculer le prochain déclenchement à 9h00
            prochain = datetime.combine(maintenant.date(), heure_cible)
            if maintenant >= prochain:
                prochain = datetime.combine(maintenant.date() + timedelta(days=1), heure_cible)
            
            # Attendre jusqu'à 9h00
            temps_attente = (prochain - maintenant).total_seconds()
            if temps_attente > 0:
                time.sleep(temps_attente)
            
            # Exécuter la tâche
            if self.running:
                self._mettre_a_jour_statuts()    
    
    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        print("✅ Scheduler des statuts démarré (vérification quotidienne à 9h00)")
    
    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        print("🛑 Scheduler des statuts arrêté")


dossier_scheduler = DossierScheduler()