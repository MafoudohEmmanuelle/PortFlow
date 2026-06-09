from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Schémas pour la création
class UserCreate(BaseModel):
    nom: str
    email: EmailStr
    mot_de_passe: str
    role: str = "acheteur"  # "admin" ou "acheteur"
    actif: bool = True

# Schémas pour la modification
class UserUpdate(BaseModel):
    nom: Optional[str] = None
    email: Optional[EmailStr] = None
    mot_de_passe: Optional[str] = None
    role: Optional[str] = None
    actif: Optional[bool] = None

# Schémas pour la réponse
class UserResponse(BaseModel):
    id: int
    nom: str
    email: EmailStr
    role: str
    actif: bool
    date_creation: datetime

    class Config:
        from_attributes = True