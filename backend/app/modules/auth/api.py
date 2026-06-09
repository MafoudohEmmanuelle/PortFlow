from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...database import get_db
from .schemas import LoginRequest, TokenResponse, UtilisateurInfo
from .service import AuthService
from ...core.security import decode_token
from ...core.dependencies import get_current_user
from .models import Utilisateur

router = APIRouter(prefix="/auth", tags=["Authentification"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Connexion utilisateur avec email et mot de passe"""
    auth_service = AuthService(db)
    result = auth_service.login(request.email, request.mot_de_passe)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
     
    return result

@router.post("/logout")
def logout():
    """Déconnexion (côté frontend, le token sera supprimé)"""
    return {"message": "Déconnexion réussie"}

@router.get("/me", response_model=UtilisateurInfo)
def get_current_user_info(current_user: Utilisateur = Depends(get_current_user)):
    """Récupère les informations de l'utilisateur connecté"""
    return current_user