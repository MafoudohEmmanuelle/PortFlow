from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    ACHETEUR = "acheteur"

# Schémas pour l'authentification
class LoginRequest(BaseModel):
    email: str  # On utilise email pour se connecter
    mot_de_passe: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    utilisateur_id: int
    nom: str
    email: str
    role: UserRole

class UtilisateurInfo(BaseModel):
    id: int
    nom: str
    email: EmailStr
    role: UserRole
    actif: bool
    date_creation: datetime

    class Config:
        from_attributes = True

# Pour la création d'utilisateur (Sprint 1 jour 3)
class UtilisateurCreate(BaseModel):
    nom: str
    email: EmailStr
    mot_de_passe: str
    role: UserRole = UserRole.ACHETEUR

class UtilisateurUpdate(BaseModel):
    nom: Optional[str] = None
    email: Optional[EmailStr] = None
    mot_de_passe: Optional[str] = None
    role: Optional[UserRole] = None
    actif: Optional[bool] = None