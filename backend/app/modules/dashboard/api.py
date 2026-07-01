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
from ...modules.alertes.models import Alerte


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
    
    dernieres_alertes = []
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


# ========== DASHBOARD ACHETEUR ==========

@router.get("/acheteur/stats")
def get_acheteur_stats(
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user)
):
    """Statistiques pour l'acheteur connecté"""
    
    # Convertir en date pour les calculs (et non datetime)
    aujourdhui = datetime.now(timezone.utc).date()
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

    # ========== PROCHAINE ÉCHÉANCE AVEC DOSSIER À RISQUE ==========
    dossiers_avec_date = db.query(
        DossierImportation.id,
        DossierImportation.numero_bl,
        DossierImportation.fournisseur,
        DossierImportation.date_arrivee,
        DossierImportation.delai_franchise_jours,
        DossierImportation.statut
    ).filter(
        DossierImportation.utilisateur_id == user_id,
        DossierImportation.date_arrivee.isnot(None),
        DossierImportation.date_sortie_port.is_(None)
    ).all()
    
    prochaine_echeance = None
    dossier_risque = None
    
    print(f"Dossiers trouvés pour l'utilisateur {user_id}: {len(dossiers_avec_date)}")
    
    for d in dossiers_avec_date:
        if d.date_arrivee:
            fin_delai = d.date_arrivee + timedelta(days=d.delai_franchise_jours)
            jours_restants = (fin_delai - aujourdhui).days
            
            print(f"   Dossier {d.numero_bl}: fin_delai={fin_delai}, jours_restants={jours_restants}")
            
            # Sélectionner le dossier avec le moins de jours restants
            if prochaine_echeance is None or jours_restants < prochaine_echeance:
                prochaine_echeance = jours_restants
                dossier_risque = {
                    "id": d.id,
                    "numero_bl": d.numero_bl,
                    "fournisseur": d.fournisseur,
                    "jours_restants": jours_restants,
                    "statut": d.statut,
                    "est_critique": jours_restants <= 3,
                    "est_depasse": jours_restants < 0
                }
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

     # Afficher le résultat dans les logs
    print(f" dossier_risque: {dossier_risque}")
    
    return {
        "kpis": {
            "dossiers_actifs": dossiers_actifs,
            "documents_manquants": mes_documents_manquants,
            "prochaine_echeance_jours": prochaine_echeance,
            "dossier_risque": dossier_risque  # ← Cette ligne DOIT être présente
        },
        "completion": {
            "total": total_documents,
            "obtenus": documents_obtenus,
            "pourcentage": completion_pourcentage
        },
        "mes_statuts": [
            {"statut": s.statut, "count": s.count} for s in mes_statuts
        ]
    }