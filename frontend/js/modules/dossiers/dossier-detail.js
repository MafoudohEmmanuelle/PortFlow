// frontend/js/modules/dossiers/dossier-detail.js
// Logique de la page détail du dossier

let currentDossierId = null;
let currentDossier = null;
let pendingAction = null;

// Récupérer l'ID du dossier depuis l'URL
function getDossierIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Charger les informations du dossier
async function loadDossier() {
    console.log('=== loadDossier ===');
    const spinner = document.getElementById('loadingSpinner');
    const content = document.getElementById('dossierContent');
    
    if (!currentDossierId) {
        showNotification('Aucun dossier spécifié', 'error');
        return;
    }

    const result = await DossiersAPI.getById(currentDossierId);
    console.log('Dossier chargé:', result);
    
    if (result.ok && result.data) {
        currentDossier = result.data;
        displayDossierInfo(currentDossier);
        await loadDocuments();
        await loadCompletionRate();
        
        // Charger l'historique de tracking - IMPORTANT: utiliser la fonction globale
        if (typeof window.loadTrackingHistory === 'function') {
            console.log('Appel de window.loadTrackingHistory');
            await window.loadTrackingHistory(currentDossierId);
        } else {
            console.error('window.loadTrackingHistory n\'est pas définie!');
            const trackingContainer = document.getElementById('trackingHistory');
            if (trackingContainer) {
                trackingContainer.innerHTML = '<div class="tracking-error"><i class="fas fa-exclamation-circle"></i> Module tracking non chargé</div>';
            }
        }
        if (spinner) spinner.style.display = 'none';
        if (content) content.style.display = 'block';
    } else {
        console.error('Erreur chargement dossier:', result.data);
        if (spinner) spinner.innerHTML = `<div class="error">Erreur: ${result.data?.detail || 'Dossier non trouvé'}</div>`;
    }
}

// Afficher les informations générales
function displayDossierInfo(dossier) {
    // Mettre à jour les champs
    const fields = {
        'dossierNumBl': dossier.numero_bl,
        'dossierFournisseur': dossier.fournisseur,
        'dossierArmateur': dossier.armateur_nom,
        'dossierAcheteur': dossier.utilisateur_nom,
        'dossierDelai': `${dossier.delai_franchise_jours} jours`,
        'dossierEtaInitiale': formatDate(dossier.eta_initial),
        'dossierDateCreation': formatDateTime(dossier.date_creation)
    };
    
    for (const [id, value] of Object.entries(fields)) {
        const element = document.getElementById(id);
        if (element) element.textContent = value || '-';
    }

    // Ajouter le lien de tracking de l'armateur
    const armateurLien = document.getElementById('armateurTrackingLink');
    if (armateurLien && dossier.armateur_lien_tracking) {
        armateurLien.href = dossier.armateur_lien_tracking;
        armateurLien.target = '_blank';
        armateurLien.style.display = 'inline-flex';
        armateurLien.innerHTML = `
            <i class="fas fa-external-link-alt"></i> 
            Suivre sur le site de l'armateur
        `;
    } else if (armateurLien) {
        armateurLien.style.display = 'none';
    }
    
    // Statut avec badge
    const statutElement = document.getElementById('dossierStatut');
    if (statutElement) statutElement.innerHTML = getStatutBadge(dossier.statut);
    
    updateTransportTimeline(dossier);
}

// Mettre à jour la timeline horizontale
function updateTransportTimeline(dossier) {
    // Départ
    const departStep = document.getElementById('stepDepart');
    const departDate = document.getElementById('departDate');
    const departBtn = document.getElementById('btnDepart');
    
    if (dossier.date_depart) {
        if (departDate) departDate.textContent = formatDate(dossier.date_depart);
        if (departBtn) {
            departBtn.disabled = true;
            departBtn.innerHTML = '<i class="fas fa-check"></i> Enregistré';
        }
        if (departStep) departStep.classList.add('completed');
    } else {
        if (departBtn) {
            departBtn.disabled = false;
            departBtn.innerHTML = '<i class="fas fa-pen"></i> Marquer';
        }
        if (departStep) departStep.classList.remove('completed');
    }
    
    // Arrivée
    const arriveeStep = document.getElementById('stepArrivee');
    const arriveeDate = document.getElementById('arriveeDate');
    const arriveeBtn = document.getElementById('btnArrivee');
    const arriveeWarning = document.getElementById('arriveeWarning');
    
    if (dossier.date_arrivee) {
        if (arriveeDate) arriveeDate.textContent = formatDate(dossier.date_arrivee);
        if (arriveeBtn) {
            arriveeBtn.disabled = true;
            arriveeBtn.innerHTML = '<i class="fas fa-check"></i> Enregistré';
        }
        if (arriveeStep) arriveeStep.classList.add('completed');
        if (arriveeWarning) arriveeWarning.innerHTML = '';
    } else {
        if (arriveeBtn) {
            arriveeBtn.disabled = false;
            arriveeBtn.innerHTML = '<i class="fas fa-pen"></i> Marquer';
        }
        if (arriveeStep) arriveeStep.classList.remove('completed');
        if (arriveeWarning && dossier.statut === 'arrivee_surestaries') {
            arriveeWarning.innerHTML = 'Délai dépassé !';
            arriveeStep.classList.add('surestaries');
        }
    }
    
    // Sortie
    const sortieStep = document.getElementById('stepSortie');
    const sortieDate = document.getElementById('sortieDate');
    const sortieBtn = document.getElementById('btnSortie');
    const sortieWarning = document.getElementById('sortieWarning');
    
    if (dossier.date_sortie_port) {
        if (sortieDate) sortieDate.textContent = formatDate(dossier.date_sortie_port);
        if (sortieBtn) {
            sortieBtn.disabled = true;
            sortieBtn.innerHTML = '<i class="fas fa-check"></i> Enregistré';
        }
        if (sortieStep) sortieStep.classList.add('completed');
        if (sortieWarning) sortieWarning.innerHTML = '';
    } else {
        if (sortieBtn) {
            sortieBtn.disabled = false;
            sortieBtn.innerHTML = '<i class="fas fa-pen"></i> Marquer';
        }
        if (sortieStep) sortieStep.classList.remove('completed');
        if (sortieWarning && dossier.statut === 'sortie_surestaries') {
            sortieWarning.innerHTML = 'Surestaries !';
            sortieStep.classList.add('surestaries');
        }
    }
}

// Charger les documents du dossier
async function loadDocuments() {
    const container = document.getElementById('documentsList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement des documents...</div>';
    
    const result = await SuiviDocumentsAPI.getDocuments(currentDossierId);
    
    if (result.ok && result.data && result.data.length > 0) {
        displayDocuments(result.data);
    } else {
        container.innerHTML = '<div class="empty"><i class="fas fa-folder-open"></i> Aucun document associé</div>';
    }
}

// Afficher les documents
function displayDocuments(documents) {
    const container = document.getElementById('documentsList');
    
    container.innerHTML = documents.map(doc => `
        <div class="document-item ${doc.obtenu ? 'received' : ''}">
            <div class="document-info">
                <span class="document-name">${escapeHtml(doc.document_nom || 'Document')}</span>
                ${doc.document_code ? `<span class="document-code">${escapeHtml(doc.document_code)}</span>` : ''}
            </div>
            <div class="document-status">
                <span class="status-badge ${doc.obtenu ? 'status-received' : 'status-missing'}">
                    ${doc.obtenu ? 'Reçu' : 'En attente'}
                </span>
                ${!doc.obtenu ? `
                    <input type="checkbox" class="document-checkbox" data-id="${doc.id}">
                ` : `
                    <span class="document-date">${doc.date_reception ? formatDate(doc.date_reception) : ''}</span>
                `}
            </div>
        </div>
    `).join('');
    
    // Attacher les événements
    document.querySelectorAll('.document-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', async (e) => {
            const associationId = parseInt(checkbox.getAttribute('data-id'));
            await markDocumentReceived(associationId, checkbox);
        });
    });
}

// Marquer un document comme reçu
async function markDocumentReceived(associationId, checkbox) {
    const result = await SuiviDocumentsAPI.markAsReceived(associationId);
    
    if (result.ok) {
        await loadDocuments();
        await loadCompletionRate();
        showNotification('Document marqué comme reçu', 'success');
    } else {
        checkbox.checked = false;
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

// Charger le taux de complétion
async function loadCompletionRate() {
    const result = await SuiviDocumentsAPI.getCompletionRate(currentDossierId);
    
    if (result.ok && result.data) {
        const rate = result.data.pourcentage || 0;
        const rateSpan = document.getElementById('completionRateValue');
        const fillBar = document.getElementById('completionFill');
        
        if (rateSpan) rateSpan.textContent = `${rate}%`;
        if (fillBar) fillBar.style.width = `${rate}%`;
    }
}

// ========== FONCTIONS DE GESTION DU MODAL ==========

// Ouvrir le modal de date
function openDateModal(title, action) {
    console.log('openDateModal appelé - action:', action);
    pendingAction = action;
    const modal = document.getElementById('dateModal');
    const modalTitle = document.getElementById('modalTitle');
    const dateInput = document.getElementById('modalDate');
    
    if (!modal) {
        console.error('Modal dateModal non trouvé dans le HTML');
        showNotification('Erreur: modal non trouvé', 'error');
        return;
    }
    
    if (modalTitle) modalTitle.textContent = title;
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    modal.classList.add('active');
    modal.style.display = 'flex';
}

// Fermer le modal
function closeDateModal() {
    const modal = document.getElementById('dateModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    pendingAction = null;
}

// Confirmer la date
async function confirmDate() {
    const dateInput = document.getElementById('modalDate');
    const dateValue = dateInput.value;
    
    if (!dateValue) {
        showNotification('Veuillez sélectionner une date', 'error');
        return;
    }
    
    let result;
    switch (pendingAction) {
        case 'depart':
            result = await DossiersAPI.updateDepart(currentDossierId, dateValue);
            break;
        case 'arrivee':
            result = await DossiersAPI.updateArrivee(currentDossierId, dateValue);
            break;
        case 'sortie':
            result = await DossiersAPI.updateSortie(currentDossierId, dateValue);
            break;
        default:
            showNotification('Action inconnue', 'error');
            return;
    }
    
    closeDateModal();
    
    if (result && result.ok) {
        showNotification('Mise à jour effectuée', 'success');
        await loadDossier();
    } else {
        showNotification('Erreur: ' + (result?.data?.detail || 'Mise à jour impossible'), 'error');
    }
    pendingAction = null;
}

// ========== FONCTIONS GLOBALES POUR LES BOUTONS HTML ==========

// Ces fonctions sont exposées globalement pour être appelées depuis les attributs onclick

window.updateDepart = function() {
    console.log('updateDepart appelé');
    openDateModal('Saisir la date de départ', 'depart');
};

window.updateArrivee = function() {
    console.log('updateArrivee appelé');
    openDateModal('Saisir la date d\'arrivée', 'arrivee');
};

window.updateSortie = function() {
    console.log('updateSortie appelé');
    openDateModal('Saisir la date de sortie', 'sortie');
};

window.closeDateModal = closeDateModal;
window.confirmDate = confirmDate;

window.editDossier = function() {
    if (currentDossierId) {
        window.location.href = `form.html?id=${currentDossierId}`;
    } else {
        showNotification('Impossible de modifier : dossier non chargé', 'error');
    }
};

// ========== FONCTIONS UTILITAIRES ==========

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
}

function getStatutBadge(statut) {
    const badges = {
        'en_attente': '<span class="badge-neutral">En attente de départ</span>',
        'depart': '<span class="badge-info">En mer</span>',
        'arrivee': '<span class="badge-success">Arrivé au port</span>',
        'arrivee_surestaries': '<span class="badge-critical">Arrivé - SURESTARIES</span>',
        'sortie': '<span class="badge-success">Sorti du port</span>',
        'sortie_surestaries': '<span class="badge-critical">Sorti - SURESTARIES</span>'
    };
    return badges[statut] || `<span class="badge-neutral">${statut || 'Inconnu'}</span>`;
}

function showNotification(message, type) {
    const notif = document.createElement('div');
    notif.style.cssText = `position:fixed;bottom:20px;right:20px;background:${type === 'success' ? '#2E7D32' : '#D32F2F'};color:white;padding:12px 20px;border-radius:12px;z-index:10000;font-size:0.85rem;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;align-items:center;gap:8px;`;
    notif.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${escapeHtml(message)}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== INITIALISATION ==========

// document.addEventListener('DOMContentLoaded', () => {
//     console.log('DOMContentLoaded - dossier-detail.js');
    
//     if (!Auth.isAuthenticated()) {
//         window.location.href = '../login.html';
//         return;
//     }
    
//     currentDossierId = getDossierIdFromUrl();
//     if (!currentDossierId) {
//         window.location.href = 'list.html';
//         return;
//     }
    
//     console.log('Dossier ID:', currentDossierId);
//     loadDossier();
    
//     // Bouton Modifier
//     const editBtn = document.getElementById('editDossierBtn');
//     if (editBtn) {
//         editBtn.onclick = function() {
//             if (currentDossierId) {
//                 window.location.href = `form.html?id=${currentDossierId}`;
//             } else {
//                 showNotification('Impossible de modifier : dossier non chargé', 'error');
//             }
//         };
//     }
    
//     // Navigation sidebar
//     document.getElementById('navDashboard')?.addEventListener('click', () => {
//         const isAdmin = Auth.isAdmin();
//         window.location.href = isAdmin ? '../dashboard-admin.html' : '../dashboard-acheteur.html';
//     });
//     document.getElementById('navDossiers')?.addEventListener('click', () => {
//         window.location.href = 'list.html';
//     });
    
//     // Confirmation modal
//     document.getElementById('modalConfirmBtn')?.addEventListener('click', confirmDate);
//     document.getElementById('closeModalBtn')?.addEventListener('click', closeDateModal);
//     document.getElementById('cancelModalBtn')?.addEventListener('click', closeDateModal);
// });


// ========== INITIALISATION ==========

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - dossier-detail.js');
    
    if (!Auth.isAuthenticated()) {
        window.location.href = '../login.html';
        return;
    }
    
    currentDossierId = getDossierIdFromUrl();
    if (!currentDossierId) {
        window.location.href = 'list.html';
        return;
    }
    
    console.log('Dossier ID:', currentDossierId);
    
    // Attendre que le sidebar soit chargé avant de charger le dossier
    const waitForSidebar = setInterval(() => {
        // Vérifier si le sidebar est présent
        const sidebar = document.querySelector('.sidebar') || document.getElementById('sidebar-container');
        if (sidebar) {
            clearInterval(waitForSidebar);
            console.log('Sidebar trouvé, chargement du dossier');
            
            // Charger le dossier
            loadDossier();
            
            // Attacher les événements
            setTimeout(() => {
                const editBtn = document.getElementById('editDossierBtn');
                if (editBtn) editBtn.onclick = window.editDossier;
                
                document.getElementById('modalConfirmBtn')?.addEventListener('click', confirmDate);
                document.getElementById('closeModalBtn')?.addEventListener('click', closeDateModal);
                document.getElementById('cancelModalBtn')?.addEventListener('click', closeDateModal);
            }, 300);
        }
    }, 100);
    
    // Timeout de sécurité : charger quand même après 5 secondes
    setTimeout(() => {
        clearInterval(waitForSidebar);
        if (!currentDossier) {
            console.log('Timeout: chargement forcé du dossier');
            loadDossier();
        }
    }, 5000);
});