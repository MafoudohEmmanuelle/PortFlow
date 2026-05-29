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



#     """
# create_admin.py - Crée un utilisateur admin et un acheteur de test
# Exécutez ce script pour initialiser les utilisateurs dans la base de données
# """

# import sys
# import os

# # Ajouter le dossier parent au chemin Python
# sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# from app.database import SessionLocal
# from app.modules.auth.models import Utilisateur, UserRole
# from app.core.security import get_password_hash

# def create_users():
#     """Crée les utilisateurs par défaut dans la base de données"""
    
#     db = SessionLocal()
    
#     try:
#         # Supprimer les anciens utilisateurs s'ils existent
#         deleted_admin = db.query(Utilisateur).filter(Utilisateur.email == "admin@portflow.com").delete()
#         deleted_acheteur = db.query(Utilisateur).filter(Utilisateur.email == "acheteur@portflow.com").delete()
        
#         if deleted_admin:
#             print("⚠️ Ancien administrateur supprimé")
#         if deleted_acheteur:
#             print("⚠️ Ancien acheteur supprimé")
        
#         # Créer l'administrateur
#         admin = Utilisateur(
#             nom="Administrateur",
#             email="admin@portflow.com",
#             mot_de_passe=get_password_hash("admin123"),
#             role=UserRole.ADMIN,
#             actif=True
#         )
#         db.add(admin)
#         print("✅ Administrateur créé : admin@portflow.com / admin123")
        
#         # Créer un acheteur de test
#         acheteur = Utilisateur(
#             nom="Jean Dupont",
#             email="acheteur@portflow.com",
#             mot_de_passe=get_password_hash("acheteur123"),
#             role=UserRole.ACHETEUR,
#             actif=True
#         )
#         db.add(acheteur)
#         print("✅ Acheteur créé : acheteur@portflow.com / acheteur123")
        
#         # Valider les changements
#         db.commit()
        
#         print("\n🎉 Utilisateurs créés avec succès !")
#         print("\n--- Identifiants pour tester ---")
#         print("Admin    : admin@portflow.com / admin123")
#         print("Acheteur : acheteur@portflow.com / acheteur123")
#         print("--------------------------------")
        
#     except Exception as e:
#         print(f"❌ Erreur: {e}")
#         db.rollback()
#     finally:
#         db.close()

# def list_users():
#     """Affiche tous les utilisateurs existants"""
#     db = SessionLocal()
#     try:
#         users = db.query(Utilisateur).all()
#         print("\n--- Utilisateurs dans la base de données ---")
#         if not users:
#             print("Aucun utilisateur trouvé")
#         else:
#             for u in users:
#                 print(f"ID: {u.id} | {u.nom} | {u.email} | Rôle: {u.role.value} | Actif: {u.actif}")
#         print("-------------------------------------------")
#     finally:
#         db.close()

# if __name__ == "__main__":
#     print("=" * 50)
#     print("Création des utilisateurs par défaut")
#     print("=" * 50)
    
#     # Afficher les utilisateurs avant création
#     list_users()
    
#     print("\nCréation des nouveaux utilisateurs...")
#     create_users()
    
#     # Afficher les utilisateurs après création
#     list_users()