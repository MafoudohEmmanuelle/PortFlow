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
            console.log('KPIS reçus:', kpis);
            console.log('dossier_risque:', kpis.dossier_risque);
            
            // ========== 1. METTRE À JOUR LES CARTES KPIS ==========
            const dossiersActifs = document.getElementById('dossiersActifs');
            const alertesNonLues = document.getElementById('alertesNonLues');
            const documentsManquants = document.getElementById('documentsManquants');
            const prochaineEcheance = document.getElementById('prochaineEcheance');
            
            if (dossiersActifs) dossiersActifs.textContent = kpis.dossiers_actifs || 0;
            if (documentsManquants) documentsManquants.textContent = kpis.documents_manquants || 0;
            
            // ========== 2. PROCHAINE ÉCHÉANCE AVEC DOSSIER À RISQUE ==========
            if (prochaineEcheance) {
                const dossierRisque = kpis.dossier_risque;
                console.log('Affichage du dossier risque:', dossierRisque);
                
                if (dossierRisque) {
                    const jours = dossierRisque.jours_restants;
                    const numBl = dossierRisque.numero_bl || 'N° inconnu';
                    const fournisseur = dossierRisque.fournisseur || '';
                    
                    let text = '';
                    let className = 'stat-value';
                    
                    if (dossierRisque.est_depasse) {
                        text = `⚠️ DÉPASSÉ (${Math.abs(jours)}j) - ${numBl}`;
                        className += ' critique';
                        prochaineEcheance.title = `Dossier ${numBl} - ${fournisseur} - Délai dépassé !`;
                    } else if (dossierRisque.est_critique) {
                        text = `🔴 ${jours}j - ${numBl}`;
                        className += ' warning';
                        prochaineEcheance.title = `Dossier ${numBl} - ${fournisseur} - Attention : ${jours} jours restants`;
                    } else {
                        text = `${jours}j - ${numBl}`;
                        className += ' normal';
                        prochaineEcheance.title = `Dossier ${numBl} - ${fournisseur} - ${jours} jours restants`;
                    }
                    
                    prochaineEcheance.textContent = text;
                    prochaineEcheance.className = className;
                    prochaineEcheance.style.cursor = 'pointer';
                    
                    // Cliquer sur l'échéance redirige vers le dossier à risque
                    prochaineEcheance.onclick = function() {
                        window.location.href = `dossiers/detail.html?id=${dossierRisque.id}`;
                    };
                } else {
                    prochaineEcheance.textContent = '✅ Aucun risque';
                    prochaineEcheance.className = 'stat-value safe';
                    prochaineEcheance.style.cursor = 'default';
                    prochaineEcheance.onclick = null;
                    prochaineEcheance.title = '';
                }
            }
            
            // ========== 3. BARRE DE PROGRESSION ==========
            const completion = result.data.completion;
            if (completion) {
                updateCompletionBar(completion.pourcentage || 0);
                const completionText = document.getElementById('completionText');
                if (completionText) {
                    completionText.innerHTML = `${completion.obtenus}/${completion.total} documents obtenus (${completion.pourcentage}%)`;
                }
            }
            
            // ========== 4. AFFICHER LES ALERTES ==========
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
                    </td>
                </tr>
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
                    </td>
                    <td>${doc.date_reception ? formatDate(doc.date_reception) : '-'}</td>
                    <td class="action-cell">
                        ${!doc.obtenu ? 
                            `<a href="#" onclick="goToDossierDetail(${doc.dossier_id})" class="action-link">
                                <i class="fas fa-upload"></i> Compléter
                            </a>` : 
                            `<span class="text-muted">-</span>`
                        }
                    </td>
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

// ========== CHARGEMENT DES DONNÉES DU DASHBOARD ==========

async function loadDashboardData() {
    console.log('loadDashboardData - Début');
    
    // Charger les statistiques
    await loadAcheteurStats();
    
    // Charger les dossiers récents
    await loadRecentDossiers();
    
    // Charger les documents
    await loadDocumentsList();
    
    // Charger les alertes
    await loadAlertesDashboard();
    
    // Mettre à jour le badge d'alertes
    await updateAlertBadge();
}

// ========== ALERTES DASHBOARD ==========

// Mettre à jour le badge d'alertes (compteur non lues)
// async function updateAlertBadge() {
//     try {
//         // Récupérer UNIQUEMENT les alertes non lues
//         const result = await AlertesAPI.getAll(false, 0, 100);
//         console.log('Alertes non lues (dashboard):', result);
        
//         if (result.ok && result.data) {
//             const alertes = result.data.alertes || [];
//             const count = alertes.length;
            
//             const badge = document.getElementById('alertesNonLues');
//             if (badge) {
//                 badge.textContent = count;
//                 if (count > 0) {
//                     badge.classList.add('stat-critical');
//                 } else {
//                     badge.classList.remove('stat-critical');
//                 }
//             }
//         }
//     } catch (error) {
//         console.error('Erreur mise à jour badge:', error);
//     }
// }

// Mettre à jour le badge d'alertes (version simplifiée)
async function updateAlertBadge() {
    try {
        // Exactement le même appel que dans alertes.html
        const result = await AlertesAPI.getAll(false, 0, 100);
        console.log('Alertes non lues (dashboard):', result);
        
        if (result.ok && result.data) {
            // Compter les alertes de la même manière
            const alertes = result.data.alertes || [];
            const count = alertes.length;
            console.log('Nombre d\'alertes non lues:', count);
            
            const badge = document.getElementById('alertesNonLues');
            if (badge) {
                badge.textContent = count;
                if (count > 0) {
                    badge.classList.add('stat-critical');
                } else {
                    badge.classList.remove('stat-critical');
                }
            }
        }
    } catch (error) {
        console.error('Erreur mise à jour badge:', error);
    }
}

async function loadAlertesDashboard() {
    const container = document.getElementById('alertsList');
    if (!container) return;
    
    try {
        // Récupérer les 5 dernières alertes NON LUES
        const result = await AlertesAPI.getAll(false, 0, 5);
        console.log('Alertes dashboard:', result);
        
        if (result.ok && result.data) {
            const alertes = result.data.alertes || [];
            displayAlertesDashboard(alertes, container);
        } else {
            container.innerHTML = '<div class="empty-alerts"><i class="fas fa-check-circle"></i> Aucune alerte non lue</div>';
        }
    } catch (error) {
        console.error('Erreur chargement alertes:', error);
        container.innerHTML = '<div class="error-alerts">Erreur de chargement</div>';
    }
}

function displayAlertesDashboard(alertes, container) {
    if (!alertes || alertes.length === 0) {
        container.innerHTML = '<div class="empty-alerts"><i class="fas fa-check-circle"></i> Aucune alerte non lue</div>';
        return;
    }
    
    container.innerHTML = alertes.map(alerte => {
        const niveau = alerte.niveau || 'info';
        const niveauClass = niveau === 'critique' ? 'alert-critical' : 
                           niveau === 'warning' ? 'alert-warning' : 'alert-info';
        
        return `
            <div class="alert-item ${niveauClass}">
                <div class="alert-content">
                    <span class="alert-badge ${niveau}">${getNiveauLabel(niveau)}</span>
                    <span class="alert-message">${escapeHtml(alerte.message)}</span>
                    <span class="alert-date">${formatDate(alerte.date_alerte)}</span>
                    ${alerte.dossier_id ? `
                        <a href="dossiers/detail.html?id=${alerte.dossier_id}" class="alert-link">
                            <i class="fas fa-arrow-right"></i>
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Fonctions utilitaires pour le dashboard
function getNiveauLabel(niveau) {
    const labels = {
        'critique': '🚨 Critique',
        'warning': '⚠️ Attention',
        'info': 'ℹ️ Information'
    };
    return labels[niveau] || niveau;
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