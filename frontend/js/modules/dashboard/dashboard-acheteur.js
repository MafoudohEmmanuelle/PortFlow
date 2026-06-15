/**
 * Logique du dashboard acheteur - Version finale avec redirections standardisées
 */

let currentDossierId = null;
let allDocuments = [];

// ========== REDIRECTIONS VERS LES PAGES STANDARDISÉES ==========

// Redirection vers la liste des dossiers
function goToDossiersList() {
    window.location.href = 'dossiers/list.html';
}

// Redirection vers la liste des documents (admin uniquement)
function goToDocumentsList() {
    window.location.href = 'documents/list.html';
}

// Redirection vers la liste des alertes
function goToAlertesList() {
    window.location.href = 'alertes/list.html';
}

// Redirection vers le formulaire de création de dossier
function goToNewDossier() {
    window.location.href = 'dossiers/form.html';
}

// Redirection vers le détail d'un dossier
function goToDossierDetail(dossierId) {
    window.location.href = `dossiers/detail.html?id=${dossierId}`;
}

// ========== FIN DES REDIRECTIONS ==========

// Charger les statistiques
async function loadAcheteurStats() {
    console.log('loadAcheteurStats - Début');
    
    try {
        const result = await apiClient.get('/dashboard/acheteur/stats');
        console.log('Stats result:', result);
        
        if (result.ok && result.data) {
            const kpis = result.data.kpis;
            
            // Mettre à jour les cartes KPIs
            const dossiersActifs = document.getElementById('dossiersActifs');
            const alertesNonLues = document.getElementById('alertesNonLues');
            const documentsManquants = document.getElementById('documentsManquants');
            const prochaineEcheance = document.getElementById('prochaineEcheance');
            
            if (dossiersActifs) dossiersActifs.textContent = kpis.dossiers_actifs || 0;
            if (documentsManquants) documentsManquants.textContent = kpis.documents_manquants || 0;
            
            // Alertes
            const alertesCount = result.data.mes_alertes?.length || 0;
            if (alertesNonLues) {
                alertesNonLues.textContent = alertesCount;
                if (alertesCount > 0) alertesNonLues.classList.add('stat-critical');
            }
            
            // Prochaine échéance
            if (prochaineEcheance) {
                const jours = kpis.prochaine_echeance_jours;
                if (jours !== null && jours !== undefined) {
                    prochaineEcheance.textContent = `${jours}j`;
                    if (jours <= 2) prochaineEcheance.classList.add('urgent');
                } else {
                    prochaineEcheance.textContent = 'N/A';
                }
            }
            
            // Barre de progression
            const completion = result.data.completion;
            if (completion) {
                updateCompletionBar(completion.pourcentage || 0);
                const completionText = document.getElementById('completionText');
                if (completionText) {
                    completionText.innerHTML = `${completion.obtenus}/${completion.total} documents obtenus (${completion.pourcentage}%)`;
                }
            }
            
            // Afficher les alertes (quand le module sera prêt)
            if (result.data.mes_alertes && result.data.mes_alertes.length > 0) {
                displayAlertsList(result.data.mes_alertes);
            }
        } else {
            console.error('Erreur chargement stats:', result.data);
        }
    } catch (error) {
        console.error('Erreur loadAcheteurStats:', error);
    }
}

// Mettre à jour la barre de progression
function updateCompletionBar(percentage) {
    const progressBar = document.getElementById('completionProgressBar');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        
        if (percentage < 30) {
            progressBar.style.backgroundColor = '#dc3545';
        } else if (percentage < 70) {
            progressBar.style.backgroundColor = '#ffc107';
            progressBar.style.color = '#1E1E1E';
        } else {
            progressBar.style.backgroundColor = '#28a745';
        }
    }
}

// Afficher les alertes
function displayAlertsList(alertes) {
    const alertsContainer = document.getElementById('alertsList');
    if (!alertsContainer) return;
    
    if (!alertes || alertes.length === 0) {
        alertsContainer.innerHTML = '<div class="empty-alerts"><i class="fas fa-check-circle"></i> Aucune alerte pour le moment</div>';
        return;
    }
    
    alertsContainer.innerHTML = alertes.slice(0, 5).map(alert => `
        <div class="alert-item">
            <i class="fas ${alert.critique ? 'fa-exclamation-triangle' : 'fa-bell'}"></i>
            <strong>${escapeHtml(alert.dossier_numero_bl || 'Dossier')}</strong>
            <span>${escapeHtml(alert.message)}</span>
            <a href="dossiers/detail.html?id=${alert.dossier_id}" class="alert-link">Voir</a>
        </div>
    `).join('');
}

// Charger les 5 derniers dossiers
async function loadRecentDossiers() {
    const tbody = document.getElementById('dossiersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement...<\/td></tr>';
    
    try {
        const result = await apiClient.get('/dossiers?limit=5');
        console.log('Dossiers récents:', result);
        
        if (result.ok && result.data && result.data.length > 0) {
            tbody.innerHTML = result.data.map(dossier => `
                <tr>
                    <td><strong>${escapeHtml(dossier.numero_bl || 'N/A')}</strong></td>
                    <td>${escapeHtml(dossier.fournisseur || '-')}</td>
                    <td>${formatDate(dossier.eta_initial)}</td>
                    <td>${getStatusBadge(dossier.statut)}</td>
                    <td>${dossier.delai_franchise_jours || '-'}</td>
                    <td class="action-cell">
                        <a href="#" onclick="goToDossierDetail(${dossier.id})" class="action-link">
                            <i class="fas fa-eye"></i> Voir
                        </a>
                      ‰d
                 <tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="empty">Aucun dossier trouvé</td></tr>';
        }
    } catch (error) {
        console.error('Erreur loadRecentDossiers:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="error">Erreur de chargement</td></tr>';
    }
}

// Charger les documents (pour le tableau "Mes documents")
async function loadDocumentsList() {
    const tbody = document.getElementById('documentsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement...<\/td></tr>';
    
    try {
        const result = await apiClient.get('/documents-dossier?limit=10');
        console.log('Documents:', result);
        
        if (result.ok && result.data && result.data.length > 0) {
            tbody.innerHTML = result.data.map(doc => `
                <tr>
                    <td><strong>${escapeHtml(doc.document_nom)}</strong></td>
                    <td>${escapeHtml(doc.dossier_numero_bl) || '-'}</td>
                    <td class="document-status">
                        ${doc.obtenu ? 
                            '<span class="badge-success"><i class="fas fa-check"></i> Reçu</span>' : 
                            '<span class="badge-warning"><i class="fas fa-clock"></i> En attente</span>'
                        }
                      ‰d
                    <td>${doc.date_reception ? formatDate(doc.date_reception) : '-'}</td>
                    <td class="action-cell">
                        ${!doc.obtenu ? 
                            `<a href="#" onclick="goToDossierDetail(${doc.dossier_id})" class="action-link">
                                <i class="fas fa-upload"></i> Compléter
                            </a>` : 
                            `<span class="text-muted">-</span>`
                        }
                      ‰d
                 </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="empty">Aucun document trouvé</td></tr>';
        }
    } catch (error) {
        console.error('Erreur loadDocumentsList:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="error">Erreur de chargement</td></tr>';
    }
}

// Badges
function getStatusBadge(statut) {
    const badges = {
        'en_attente': '<span class="badge-neutral">En attente</span>',
        'depart': '<span class="badge-info">En mer</span>',
        'arrivee': '<span class="badge-success">Arrivé</span>',
        'arrivee_surestaries': '<span class="badge-critical">Surestaries</span>',
        'sortie': '<span class="badge-success">Sorti</span>',
        'sortie_surestaries': '<span class="badge-critical">Surestaries</span>'
    };
    return badges[statut] || '<span class="badge-neutral">-</span>';
}

// Formatage date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

// Échappement HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialisation
function loadDashboardData() {
    console.log('loadDashboardData - Début');
    loadAcheteurStats();
    loadRecentDossiers();
    loadDocumentsList();
}

// ========== NAVIGATION DEPUIS LE HTML ==========

// Événements au chargement
document.addEventListener('DOMContentLoaded', () => {
    // Charger les données
    setTimeout(() => loadDashboardData(), 500);
    
    // Bouton "Tous les dossiers" (rouge) -> redirection vers dossiers/list.html
    const voirTousDossiersBtn = document.getElementById('voirTousDossiersBtn');
    if (voirTousDossiersBtn) {
        voirTousDossiersBtn.addEventListener('click', goToDossiersList);
    }
    
    // Bouton "Voir tous" (documents) -> redirection vers documents/list.html
    const voirTousDocumentsBtn = document.getElementById('voirTousDocumentsBtn');
    if (voirTousDocumentsBtn) {
        voirTousDocumentsBtn.addEventListener('click', goToDocumentsList);
    }
    
    // Bouton "Voir toutes" (alertes) -> redirection vers alertes/list.html
    const voirToutesAlertesBtn = document.getElementById('voirToutesAlertesBtn');
    if (voirToutesAlertesBtn) {
        voirToutesAlertesBtn.addEventListener('click', goToAlertesList);
    }
    
    // Bouton "Nouveau dossier" -> redirection vers dossiers/form.html
    const nouveauDossierBtn = document.getElementById('nouveauDossierBtn');
    if (nouveauDossierBtn) {
        nouveauDossierBtn.addEventListener('click', goToNewDossier);
    }
    
    // Bouton "Annuler" dans le formulaire
    const cancelNewDossier = document.getElementById('cancelNewDossier');
    if (cancelNewDossier) {
        cancelNewDossier.addEventListener('click', () => {
            window.location.href = 'dashboard-acheteur.html';
        });
    }
    
    // Lien "Retour au tableau de bord"
    const retourDashboard = document.getElementById('retourDashboard');
    if (retourDashboard) {
        retourDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'dashboard-acheteur.html';
        });
    }
    
    // Bouton "Retour" dans la vue suivi
    const backToDossiers = document.getElementById('backToDossiers');
    if (backToDossiers) {
        backToDossiers.addEventListener('click', () => {
            window.location.href = 'dashboard-acheteur.html';
        });
    }
});

// ========== FONCTIONS GLOBALES POUR LE HTML ==========

// Redirection vers le détail d'un dossier
window.goToDossierDetail = function(dossierId) {
    window.location.href = `dossiers/detail.html?id=${dossierId}`;
};

// Visualiser un dossier (pour la vue suivi)
window.viewDossier = function(dossierId) {
    window.location.href = `dossiers/detail.html?id=${dossierId}`;
};

// Éditer un dossier
window.editDossier = function(dossierId) {
    window.location.href = `dossiers/form.html?id=${dossierId}`;
};

// Créer un nouveau dossier
window.createNewDossier = function(event) {
    if (event) event.preventDefault();
    window.location.href = 'dossiers/form.html';
};

// Redirection vers la liste des dossiers
window.goToDossiersList = goToDossiersList;