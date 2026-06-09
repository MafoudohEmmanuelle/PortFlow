from sqlalchemy.orm import Session
from sqlalchemy import and_
from .models import Utilisateur, UserRole
from .schemas import LoginRequest
from ...core.security import verify_password, create_access_token
from typing import Optional, Dict, Any

class AuthService:
    
    def __init__(self, db: Session):
        self.db = db
    
    def authenticate_user(self, email: str, password: str) -> Optional[Utilisateur]:
        """Authentifie un utilisateur par email"""
        user = self.db.query(Utilisateur).filter(
            and_(Utilisateur.email == email, Utilisateur.actif == True)
        ).first()
        
        if not user:
            return None
        
        if not verify_password(password, user.mot_de_passe):
            return None
        
        return user
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Génère le token après login"""
        user = self.authenticate_user(email, password)
        
        if not user:
            return None
        
        # Créer le token
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "nom": user.nom,
            "role": user.role.value
        }
        access_token = create_access_token(token_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "utilisateur_id": user.id,
            "nom": user.nom,
            "email": user.email,
            "role": user.role
        }
    
    def get_user_by_id(self, user_id: int) -> Optional[Utilisateur]:
        return self.db.query(Utilisateur).filter(Utilisateur.id == user_id).first()
    
    def get_user_by_email(self, email: str) -> Optional[Utilisateur]:
        return self.db.query(Utilisateur).filter(Utilisateur.email == email).first()