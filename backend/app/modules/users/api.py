from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from ...database import get_db
from ...core.dependencies import get_current_admin
from ...modules.auth.models import Utilisateur
from .schemas import UserCreate, UserUpdate, UserResponse
from .service import UserService

router = APIRouter(prefix="/users", tags=["Utilisateurs"])

@router.get("/", response_model=List[UserResponse])
def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Utilisateur = Depends(get_current_admin)
):
    """Récupère tous les utilisateurs (admin uniquement)"""
    service = UserService(db)
    users = service.get_all_users(skip=skip, limit=limit)
    return users

@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Utilisateur = Depends(get_current_admin)
):
    """Récupère un utilisateur par son ID (admin uniquement)"""
    service = UserService(db)
    user = service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )
    
    return user

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_admin: Utilisateur = Depends(get_current_admin)
):
    """Crée un nouvel utilisateur (admin uniquement)"""
    service = UserService(db)
    
    try:
        new_user = service.create_user(user_data)
        return new_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: Utilisateur = Depends(get_current_admin)
):
    """Met à jour un utilisateur (admin uniquement)"""
    service = UserService(db)
    
    try:
        updated_user = service.update_user(user_id, user_data)
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: Utilisateur = Depends(get_current_admin)
):
    """Supprime un utilisateur (admin uniquement)"""
    service = UserService(db)
    
    # Empêcher la suppression de soi-même
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vous ne pouvez pas supprimer votre propre compte"
        )
    
    deleted = service.delete_user(user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )
    
    return None