import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.modules.auth.models import Base, Utilisateur, UserRole
from app.core.security import get_password_hash

def seed_database():
    """Crée les utilisateurs par défaut"""
    
    # Créer les tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Vérifier si l'admin existe déjà
        admin = db.query(Utilisateur).filter(Utilisateur.email == "admin1@portflow.com").first()
        if not admin:

            password = "admin123"
            print(f"Longueur du mot de passe: {len(password)} bytes")
            password_hash = get_password_hash(password)
            print(f"Hash généré: {password_hash[:50]}...")

            admin = Utilisateur(
                nom="admin",
                email="admin1@portflow.com",
                mot_de_passe=password_hash,
                role="admin",
                actif=True
            )
            db.add(admin)
            print("✅ Utilisateur admin créé")
        
        # Créer un acheteur de test
        acheteur = db.query(Utilisateur).filter(Utilisateur.email == "acheteur1@portflow.com").first()
        if not acheteur:

            password = "acheteur123"
            print(f"Longueur du mot de passe: {len(password)} bytes")
            password_hash = get_password_hash(password)
            print(f"Hash généré: {password_hash[:50]}...")
        
            acheteur = Utilisateur(
                nom="acheteur1",
                email="acheteur1@portflow.com",
                mot_de_passe=password_hash,
                role="acheteur",
                actif=True
            )
            db.add(acheteur)
            print("✅ Utilisateur acheteur1 créé")
        
        db.commit()
        print("✅ Base de données initialisée avec succès!")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()


