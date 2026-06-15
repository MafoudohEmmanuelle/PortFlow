from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ...database import get_db
from ...core.dependencies import get_current_admin, get_current_user
from ...modules.auth.models import Utilisateur, UserRole
from ...modules.users.service import UserService
from ...core.dependencies import get_current_user, get_current_admin
from ...modules.auth.models import Utilisateur
from ...modules.dossiers.models import DossierImportation
from ...modules.documents.models import DossierDocument
from ...modules.alertes.models import Alerte
from datetime import datetime, timedelta

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

# ========== NOUVEAUX ENDPOINTS POUR LE SPRINT 3 (J6) ==========

@router.get("/stats/surestaries")
def get_surestaries_stats(
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Statistiques des surestaries pour le dashboard.
    Accessible aux admins et aux acheteurs (données filtrées).
    """
    # Requête de base
    query = db.query(DossierImportation)
    
    # Filtrer par utilisateur si non admin
    if current_user.role != "admin":
        query = query.filter(DossierImportation.utilisateur_id == current_user.id)
    
    dossiers = query.all()
    
    # Calculer les surestaries
    total_dossiers = len(dossiers)
    dossiers_avec_surestaries = 0
    montant_total_surestaries = 0
    jours_surestaries_total = 0
    
    for dossier in dossiers:
        if dossier.date_arrivee and dossier.date_sortie_port:
            delai = dossier.delai_franchise_jours
            date_fin_franchise = dossier.date_arrivee + timedelta(days=delai)
            
            if dossier.date_sortie_port > date_fin_franchise:
                dossiers_avec_surestaries += 1
                jours_retard = (dossier.date_sortie_port - date_fin_franchise).days
                jours_surestaries_total += jours_retard
                # Montant estimé (exemple: 50€ par jour)
                montant_total_surestaries += jours_retard * 50
    
    taux_surestaries = (dossiers_avec_surestaries / total_dossiers * 100) if total_dossiers > 0 else 0
    
    return {
        "total_dossiers": total_dossiers,
        "dossiers_avec_surestaries": dossiers_avec_surestaries,
        "taux_surestaries": round(taux_surestaries, 2),
        "jours_surestaries_total": jours_surestaries_total,
        "montant_total_surestaries": montant_total_surestaries
    }


@router.get("/stats/dossiers")
def get_dossiers_stats(
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Statistiques des dossiers par statut.
    Accessible aux admins et aux acheteurs (données filtrées).
    """
    query = db.query(DossierImportation)
    
    if current_user.role != "admin":
        query = query.filter(DossierImportation.utilisateur_id == current_user.id)
    
    dossiers = query.all()
    
    stats_par_statut = {}
    for dossier in dossiers:
        statut = dossier.statut
        if statut not in stats_par_statut:
            stats_par_statut[statut] = 0
        stats_par_statut[statut] += 1
    
    # Ordre des statuts pour l'affichage
    ordre_statuts = ["en_attente", "depart", "arrivee", "arrivee_surestaries", "sortie", "sortie_surestaries", "cloture"]
    
    resultat = []
    for statut in ordre_statuts:
        if statut in stats_par_statut:
            resultat.append({
                "statut": statut,
                "libelle": get_libelle_statut(statut),
                "nombre": stats_par_statut[statut]
            })
    
    return resultat


@router.get("/stats/documents")
def get_documents_stats(
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Statistiques des documents (taux de complétion moyen).
    Accessible aux admins et aux acheteurs (données filtrées).
    """
    # Récupérer les dossiers de l'utilisateur
    query = db.query(DossierImportation)
    if current_user.role != "admin":
        query = query.filter(DossierImportation.utilisateur_id == current_user.id)
    
    dossiers = query.all()
    
    total_documents = 0
    total_obtenus = 0
    
    for dossier in dossiers:
        docs = db.query(DossierDocument).filter(
            DossierDocument.dossier_id == dossier.id
        ).all()
        total_documents += len(docs)
        total_obtenus += sum(1 for d in docs if d.obtenu)
    
    taux_completion = (total_obtenus / total_documents * 100) if total_documents > 0 else 0
    
    return {
        "total_documents": total_documents,
        "documents_obtenus": total_obtenus,
        "documents_manquants": total_documents - total_obtenus,
        "taux_completion": round(taux_completion, 2)
    }


@router.get("/stats/alertes")
def get_alertes_stats_dashboard(
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """
    Statistiques des alertes pour le dashboard.
    Accessible aux admins et aux acheteurs (données filtrées).
    """
    from ..alertes.service import AlerteService
    service = AlerteService(db)
    stats = service.get_stats()
    
    # Si non admin, filtrer les alertes de l'utilisateur
    if current_user.role != "admin":
        from ..alertes.models import Alerte
        from ..dossiers.models import DossierImportation
        
        # Récupérer les IDs des dossiers de l'utilisateur
        user_dossier_ids = db.query(DossierImportation.id).filter(
            DossierImportation.utilisateur_id == current_user.id
        ).all()
        user_dossier_ids = [d[0] for d in user_dossier_ids]
        
        alertes_user = db.query(Alerte).filter(
            Alerte.dossier_id.in_(user_dossier_ids),
            Alerte.est_lue == False
        ).all()
        
        non_lues = len(alertes_user)
        total = db.query(Alerte).filter(
            Alerte.dossier_id.in_(user_dossier_ids)
        ).count()
        
        return {
            "total": total,
            "non_lues": non_lues,
            "par_type": {},
            "par_niveau": {}
        }
    
    return stats


@router.get("/stats/evolution")
def get_evolution_stats(
    mois: int = 6,
    db: Session = Depends(get_db),
    current_admin: Utilisateur = Depends(get_current_admin)
):
    """
    Statistiques d'évolution sur les X derniers mois (admin uniquement).
    """
    
    resultat = []
    
    for i in range(mois):
        date_fin = datetime.now() - timedelta(days=30 * i)
        date_debut = date_fin - timedelta(days=30)
        
        dossiers_mois = db.query(DossierImportation).filter(
            DossierImportation.date_creation.between(date_debut, date_fin)
        ).count()
        
        surestaries_mois = db.query(DossierImportation).filter(
            DossierImportation.date_creation.between(date_debut, date_fin),
            DossierImportation.statut.in_(["arrivee_surestaries", "sortie_surestaries"])
        ).count()
        
        resultat.append({
            "mois": date_debut.strftime("%B %Y"),
            "total_dossiers": dossiers_mois,
            "surestaries": surestaries_mois,
            "taux_surestaries": round((surestaries_mois / dossiers_mois * 100), 2) if dossiers_mois > 0 else 0
        })
    
    return resultat


# ========== FONCTIONS UTILITAIRES ==========

def get_libelle_statut(statut: str) -> str:
    """Retourne le libellé français d'un statut"""
    libelles = {
        "en_attente": "En attente de départ",
        "depart": "En mer",
        "arrivee": "Arrivé au port",
        "arrivee_surestaries": "Arrivé - Surestaries",
        "sortie": "Sorti du port",
        "sortie_surestaries": "Sorti - Surestaries",
        "cloture": "Clôturé"
    }
    return libelles.get(statut, statut)