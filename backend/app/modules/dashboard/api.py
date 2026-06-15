# backend/app/modules/dashboard/api.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.modules.auth.models import Utilisateur
from app.modules.dossiers.models import DossierImportation
from app.modules.dossiers.enum import StatutDossier
from app.modules.documents.models import DossierDocument

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# ========== DASHBOARD ADMINISTRATEUR ==========


@router.get("/admin/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_admin: Utilisateur = Depends(get_current_admin)
):
    """Statistiques pour l'administrateur"""
    
    now = datetime.now(timezone.utc)
    
    # ========== 1. KPIS ==========
    total_users = db.query(Utilisateur).filter(Utilisateur.actif == True).count()
    
    dossiers_actifs = db.query(DossierImportation).filter(
        DossierImportation.date_sortie_port.is_(None)
    ).count()
    
    dossiers_clotures = db.query(DossierImportation).filter(
        DossierImportation.date_sortie_port.isnot(None)
    ).count()
    
    taux_surestaries = 0
    if dossiers_clotures > 0:
        surestaries_cloture = db.query(DossierImportation).filter(
            DossierImportation.statut == StatutDossier.SORTIE_SURESTARIES.value
        ).count()
        taux_surestaries = round((surestaries_cloture / dossiers_clotures) * 100, 1)
    
    documents_manquants = db.query(DossierDocument).filter(
        DossierDocument.obtenu == False
    ).count()
    
    # ========== 2. ÉVOLUTION DES SURESTARIES ==========
    evolution = []
    for i in range(5, -1, -1):
        mois = now - timedelta(days=30 * i)
        debut_mois = mois.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        fin_mois = (debut_mois + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
        
        count = db.query(DossierImportation).filter(
            DossierImportation.statut == StatutDossier.SORTIE_SURESTARIES.value,
            DossierImportation.date_sortie_port >= debut_mois,
            DossierImportation.date_sortie_port <= fin_mois
        ).count()
        
        evolution.append({
            "mois": debut_mois.strftime("%b"),
            "nombre": count
        })
    
    # ========== 3. RÉPARTITION PAR STATUT ==========
    statuts = db.query(
        DossierImportation.statut,
        func.count(DossierImportation.id).label("count")
    ).group_by(DossierImportation.statut).all()
    
    repartition_statuts = [
        {"statut": s.statut, "count": s.count}
        for s in statuts
    ]
    
    # ========== 4. DERNIÈRES ALERTES ==========
    # Version simplifiée sans calcul de dates problématique
    dernieres_alertes = []
    
    # Récupérer les dossiers avec documents manquants
    dossiers_manquants = db.query(
        DossierImportation.id,
        DossierImportation.numero_bl,
        DossierImportation.fournisseur,
        DossierImportation.date_creation
    ).join(
        DossierDocument, DossierImportation.id == DossierDocument.dossier_id
    ).filter(
        DossierDocument.obtenu == False
    ).distinct().order_by(
        DossierImportation.date_creation.desc()
    ).limit(5).all()
    
    for d in dossiers_manquants:
        missing_count = db.query(DossierDocument).filter(
            DossierDocument.dossier_id == d.id,
            DossierDocument.obtenu == False
        ).count()
        
        dernieres_alertes.append({
            "dossier_id": d.id,
            "dossier_numero_bl": d.numero_bl,
            "message": f"{missing_count} document(s) manquant(s)",
            "critique": False,
            "date": d.date_creation.isoformat() if d.date_creation else now.isoformat()
        })
    
    return {
        "kpis": {
            "total_users": total_users,
            "dossiers_actifs": dossiers_actifs,
            "taux_surestaries": taux_surestaries,
            "documents_manquants": documents_manquants
        },
        "evolution_surestaries": evolution,
        "repartition_statuts": repartition_statuts,
        "dernieres_alertes": dernieres_alertes
    }

    # ========== 5. DERNIÈRES ALERTES ==========
    # ═══════════════════════════════════════════════════════════════════════════
    # TODO: À remplacer par le module alerte quand il sera prêt
    # Actuellement: basé sur les documents manquants (solution temporaire)
    # À remplacer par: db.query(Alerte).filter(...).order_by(...).limit(5).all()
    # ═══════════════════════════════════════════════════════════════════════════
    
    # TEMPORAIRE - À SUPPRIMER QUAND LE MODULE ALERTE SERA PRÊT
    dossiers_avec_manquants = db.query(
        DossierImportation.id,
        DossierImportation.numero_bl,
        DossierImportation.fournisseur,
        DossierImportation.date_arrivee,
        DossierImportation.delai_franchise_jours,
        DossierImportation.date_creation
    ).join(
        DossierDocument, DossierImportation.id == DossierDocument.dossier_id
    ).filter(
        DossierDocument.obtenu == False
    ).distinct().order_by(
        DossierImportation.date_creation.desc()
    ).limit(5).all()
    
    dernieres_alertes = []
    for d in dossiers_avec_manquants:
        missing_count = db.query(DossierDocument).filter(
            DossierDocument.dossier_id == d.id,
            DossierDocument.obtenu == False
        ).count()
        
        est_critique = False
        if d.date_arrivee:
            fin_delai = d.date_arrivee + timedelta(days=d.delai_franchise_jours)
            if (fin_delai - now).days <= 2:
                est_critique = True
        
        dernieres_alertes.append({
            "dossier_id": d.id,
            "dossier_numero_bl": d.numero_bl,
            "fournisseur": d.fournisseur,
            "message": f"{missing_count} document(s) manquant(s)",
            "critique": est_critique,
            "date": d.date_creation.isoformat() if d.date_creation else now.isoformat()
        })
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FIN DE LA SECTION TEMPORAIRE
    # ═══════════════════════════════════════════════════════════════════════════
    
    return {
        "kpis": {
            "total_users": total_users,
            "dossiers_actifs": dossiers_actifs,
            "dossiers_surestarie": dossiers_surestarie,
            "taux_surestaries": taux_surestaries,
            "documents_manquants": documents_manquants
        },
        "evolution_surestaries": evolution,
        "repartition_statuts": repartition_statuts,
        "top_armateurs_retards": top_armateurs_list,
        "dernieres_alertes": dernieres_alertes  # À remplacer par vraies alertes
    }


# ========== DASHBOARD ACHETEUR ==========

@router.get("/acheteur/stats")
def get_acheteur_stats(
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """Statistiques pour l'acheteur connecté"""
    
    now = datetime.now(timezone.utc)
    user_id = current_user.id
    
    # ========== 1. KPIS ==========
    
    # Mes dossiers actifs (non sortis)
    dossiers_actifs = db.query(DossierImportation).filter(
        DossierImportation.utilisateur_id == user_id,
        DossierImportation.date_sortie_port.is_(None)
    ).count()
    
    # Mes documents manquants
    mes_documents_manquants = db.query(DossierDocument).join(
        DossierImportation, DossierDocument.dossier_id == DossierImportation.id
    ).filter(
        DossierImportation.utilisateur_id == user_id,
        DossierDocument.obtenu == False
    ).count()
    
    # Prochaine échéance (franchise la plus proche)
    dossiers_avec_date = db.query(
        DossierImportation.id,
        DossierImportation.date_arrivee,
        DossierImportation.delai_franchise_jours
    ).filter(
        DossierImportation.utilisateur_id == user_id,
        DossierImportation.date_arrivee.isnot(None),
        DossierImportation.date_sortie_port.is_(None)
    ).all()
    
    prochaine_echeance = None
    for d in dossiers_avec_date:
        if d.date_arrivee:
            fin_delai = d.date_arrivee + timedelta(days=d.delai_franchise_jours)
            jours_restants = (fin_delai - now).days
            if jours_restants >= 0:
                if prochaine_echeance is None or jours_restants < prochaine_echeance:
                    prochaine_echeance = jours_restants
    
    # ========== 2. TAUX DE COMPLÉTION ==========
    total_documents = db.query(DossierDocument).join(
        DossierImportation, DossierDocument.dossier_id == DossierImportation.id
    ).filter(
        DossierImportation.utilisateur_id == user_id
    ).count()
    
    documents_obtenus = db.query(DossierDocument).join(
        DossierImportation, DossierDocument.dossier_id == DossierImportation.id
    ).filter(
        DossierImportation.utilisateur_id == user_id,
        DossierDocument.obtenu == True
    ).count()
    
    completion_pourcentage = 0
    if total_documents > 0:
        completion_pourcentage = round((documents_obtenus / total_documents) * 100)
    
    # ========== 3. MES DOSSIERS PAR STATUT ==========
    mes_statuts = db.query(
        DossierImportation.statut,
        func.count(DossierImportation.id).label("count")
    ).filter(
        DossierImportation.utilisateur_id == user_id
    ).group_by(DossierImportation.statut).all()
    
    # ========== 4. MES ALERTES ==========
    # ═══════════════════════════════════════════════════════════════════════════
    # TODO: À remplacer par le module alerte quand il sera prêt
    # Actuellement: pas d'alertes (solution temporaire)
    # À remplacer par: db.query(Alerte).filter(utilisateur_id == user_id).all()
    # ═══════════════════════════════════════════════════════════════════════════
    
    # TEMPORAIRE - À SUPPRIMER QUAND LE MODULE ALERTE SERA PRÊT
    # Pour l'instant, on ne retourne pas d'alertes dans le dashboard acheteur
    mes_alertes = []  # Liste vide en attendant le module alerte
    
    # ═══════════════════════════════════════════════════════════════════════════
    # FIN DE LA SECTION TEMPORAIRE
    # ═══════════════════════════════════════════════════════════════════════════
    
    return {
        "kpis": {
            "dossiers_actifs": dossiers_actifs,
            "documents_manquants": mes_documents_manquants,
            "prochaine_echeance_jours": prochaine_echeance
        },
        "completion": {
            "total": total_documents,
            "obtenus": documents_obtenus,
            "pourcentage": completion_pourcentage
        },
        "mes_statuts": [
            {"statut": s.statut, "count": s.count} for s in mes_statuts
        ],
        "mes_alertes": mes_alertes  # À remplacer par vraies alertes
    }


# =============================================================================
# ENDPOINTS À AJOUTER QUAND LE MODULE ALERTE SERA PRÊT
# =============================================================================
# 
# @router.get("/admin/alertes")
# def get_admin_alertes(
#     db: Session = Depends(get_db),
#     current_admin: Utilisateur = Depends(get_current_admin)
# ):
#     """Récupère toutes les alertes système (admin)"""
#     from app.modules.alertes.models import Alerte
#     alertes = db.query(Alerte).filter(
#         Alerte.est_lue == False
#     ).order_by(Alerte.date_creation.desc()).limit(20).all()
#     return alertes
#
# @router.get("/acheteur/alertes")
# def get_acheteur_alertes(
#     db: Session = Depends(get_db),
#     current_user: Utilisateur = Depends(get_current_user)
# ):
#     """Récupère les alertes de l'acheteur connecté"""
#     from app.modules.alertes.models import Alerte
#     alertes = db.query(Alerte).filter(
#         Alerte.utilisateur_id == current_user.id,
#         Alerte.est_lue == False
#     ).order_by(Alerte.date_creation.desc()).limit(10).all()
#     return alertes
#
# =============================================================================