from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...database import get_db
from ...core.dependencies import get_current_admin, get_current_user
from ...modules.auth.models import Utilisateur, UserRole
from ...modules.users.service import UserService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/admin/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_admin: Utilisateur = Depends(get_current_admin)
):
    """Statistiques pour l'administrateur"""
    user_service = UserService(db)
    
    total_users = len(user_service.get_all_users())
    admin_count = db.query(Utilisateur).filter(Utilisateur.role == UserRole.admin).count()
    acheteur_count = db.query(Utilisateur).filter(Utilisateur.role == UserRole.acheteur).count()
    
    return {
        "total_users": total_users,
        "admin_count": admin_count,
        "acheteur_count": acheteur_count,
        "active_users": db.query(Utilisateur).filter(Utilisateur.actif == True).count()
    }

@router.get("/acheteur/stats")
def get_acheteur_stats(
    current_user: Utilisateur = Depends(get_current_user)
):
    """Statistiques pour l'acheteur"""
    return {
        "bienvenue": f"Bonjour {current_user.nom}",
        "role": current_user.role.value,
        "email": current_user.email
    }