from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from ...modules.auth.models import Utilisateur, UserRole
from ...core.security import get_password_hash, verify_password
from .schemas import UserCreate, UserUpdate

class UserService:
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_all_users(self, skip: int = 0, limit: int = 100) -> List[Utilisateur]:
        """Récupère tous les utilisateurs"""
        return self.db.query(Utilisateur).offset(skip).limit(limit).all()
    
    def get_user_by_id(self, user_id: int) -> Optional[Utilisateur]:
        """Récupère un utilisateur par son ID"""
        return self.db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    
    def get_user_by_email(self, email: str) -> Optional[Utilisateur]:
        """Récupère un utilisateur par son email"""
        return self.db.query(Utilisateur).filter(Utilisateur.email == email).first()
    
    def create_user(self, user_data: UserCreate) -> Utilisateur:
        """Crée un nouvel utilisateur"""
        # Vérifier si l'email existe déjà
        existing = self.get_user_by_email(user_data.email)
        if existing:
            raise ValueError("Cet email est déjà utilisé")
        
        # Déterminer le rôle
        role = UserRole.admin if user_data.role == "admin" else UserRole.acheteur
        
        # Créer l'utilisateur
        new_user = Utilisateur(
            nom=user_data.nom,
            email=user_data.email,
            mot_de_passe=get_password_hash(user_data.mot_de_passe),
            role=role,
            actif=user_data.actif
        )
        
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        
        return new_user
    
    def update_user(self, user_id: int, user_data: UserUpdate) -> Optional[Utilisateur]:
        """Met à jour un utilisateur"""
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        
        # Mettre à jour les champs
        if user_data.nom is not None:
            user.nom = user_data.nom
        if user_data.email is not None:
            # Vérifier que le nouvel email n'est pas déjà utilisé
            existing = self.get_user_by_email(user_data.email)
            if existing and existing.id != user_id:
                raise ValueError("Cet email est déjà utilisé")
            user.email = user_data.email
        if user_data.mot_de_passe is not None:
            user.mot_de_passe = get_password_hash(user_data.mot_de_passe)
        if user_data.role is not None:
            user.role = UserRole.admin if user_data.role == "admin" else UserRole.acheteur
        if user_data.actif is not None:
            user.actif = user_data.actif
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def delete_user(self, user_id: int) -> bool:
        """Supprime un utilisateur"""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        self.db.delete(user)
        self.db.commit()
        
        return True