// frontend/js/modules/dossiers/dossier-detail.js
// Logique de la page détail du dossier - Version corrigée

let currentDossierId = null;
let currentDossier = null;
let pendingAction = null;

// ========== FONCTIONS GLOBALES (exposées à window) ==========

// Récupérer l'ID du dossier depuis l'URL
window.getDossierIdFromUrl = function() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
};

// Ouvrir le modal de date
window.openDateModal = function(title, action) {
    console.log('openDateModal appelé:', title, action);
    pendingAction = action;
    const modal = document.getElementById('dateModal');
    const modalTitle = document.getElementById('modalTitle');
    const dateInput = document.getElementById('modalDate');
    
    if (modalTitle) modalTitle.textContent = title;
    if (dateInput) {
        // Date par défaut = aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    if (modal) modal.classList.add('active');
};

// Fermer le modal
window.closeDateModal = function() {
    const modal = document.getElementById('dateModal');
    if (modal) modal.classList.remove('active');
    pendingAction = null;
};

// Confirmer la date
window.confirmDate = async function() {
    console.log('confirmDate appelé, pendingAction:', pendingAction);
    const dateInput = document.getElementById('modalDate');
    const dateValue = dateInput.value;
    
    if (!dateValue) {
        showNotification('Veuillez sélectionner une date', 'error');
        return;
    }
    
    let result;
    try {
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
                console.error('Action inconnue:', pendingAction);
                return;
        }
        
        window.closeDateModal();
        
        if (result && result.ok) {
            showNotification('Mise à jour effectuée avec succès', 'success');
            await loadDossier();
        } else {
            showNotification('Erreur: ' + (result?.data?.detail || 'Mise à jour impossible'), 'error');
        }
    } catch (error) {
        console.error('Erreur confirmDate:', error);
        showNotification('Erreur lors de la mise à jour', 'error');
    }
    pendingAction = null;
};

// Modifier le dossier
window.editDossier = function() {
    if (currentDossierId) {
        window.location.href = `form.html?id=${currentDossierId}`;
    }
};

// ========== CHARGEMENT DU DOSSIER ==========

async function loadDossier() {
    console.log('=== loadDossier ===');
    const spinner = document.getElementById('loadingSpinner');
    const content = document.getElementById('dossierContent');
    
    if (!currentDossierId) {
        showNotification('Aucun dossier spécifié', 'error');
        return;
    }

    try {
        const result = await DossiersAPI.getById(currentDossierId);
        console.log('Dossier chargé:', result);
        
        if (result && result.ok && result.data) {
            currentDossier = result.data;
            displayDossierInfo(currentDossier);
            await loadDocuments();
            await loadCompletionRate();
            
            // Charger l'historique de tracking
            if (typeof window.loadTrackingHistory === 'function') {
                console.log('Appel de window.loadTrackingHistory');
                await window.loadTrackingHistory(currentDossierId);
            } else {
                console.warn('window.loadTrackingHistory non définie');
                const trackingContainer = document.getElementById('trackingTableBody');
                if (trackingContainer) {
                    trackingContainer.innerHTML = '<tr><td colspan="6" class="tracking-error"><i class="fas fa-exclamation-circle"></i> Module tracking non chargé</td></tr>';
                }
            }
            
            if (spinner) spinner.style.display = 'none';
            if (content) content.style.display = 'block';
        } else {
            console.error('Erreur chargement dossier:', result?.data);
            if (spinner) spinner.innerHTML = `<div class="error">Erreur: ${result?.data?.detail || 'Dossier non trouvé'}</div>`;
        }
    } catch (error) {
        console.error('Erreur loadDossier:', error);
        if (spinner) spinner.innerHTML = `<div class="error">Erreur de connexion au serveur</div>`;
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
    const departBtn = document.querySelector('.step-btn[data-action="depart"]');
    
    if (dossier.date_depart) {
        if (departDate) departDate.textContent = formatDate(dossier.date_depart);
        if (departBtn) {
            departBtn.disabled = true;
            departBtn.innerHTML = '<i class="fas fa-check"></i> Enregistré';
            departBtn.classList.add('completed');
        }
        if (departStep) departStep.classList.add('completed');
    } else {
        if (departBtn) {
            departBtn.disabled = false;
            departBtn.innerHTML = '<i class="fas fa-pen"></i> Marquer';
            departBtn.classList.remove('completed');
        }
        if (departStep) departStep.classList.remove('completed');
    }
    
    // Arrivée
    const arriveeStep = document.getElementById('stepArrivee');
    const arriveeDate = document.getElementById('arriveeDate');
    const arriveeBtn = document.querySelector('.step-btn[data-action="arrivee"]');
    const arriveeWarning = document.getElementById('arriveeWarning');
    
    if (dossier.date_arrivee) {
        if (arriveeDate) arriveeDate.textContent = formatDate(dossier.date_arrivee);
        if (arriveeBtn) {
            arriveeBtn.disabled = true;
            arriveeBtn.innerHTML = '<i class="fas fa-check"></i> Enregistré';
            arriveeBtn.classList.add('completed');
        }
        if (arriveeStep) arriveeStep.classList.add('completed');
        if (arriveeWarning) arriveeWarning.innerHTML = '';
    } else {
        if (arriveeBtn) {
            arriveeBtn.disabled = false;
            arriveeBtn.innerHTML = '<i class="fas fa-pen"></i> Marquer';
            arriveeBtn.classList.remove('completed');
        }
        if (arriveeStep) arriveeStep.classList.remove('completed');
        if (arriveeWarning && dossier.statut === 'arrivee_surestaries') {
            arriveeWarning.innerHTML = '⚠️ Délai dépassé !';
            arriveeStep.classList.add('surestaries');
        }
    }
    
    // Sortie
    const sortieStep = document.getElementById('stepSortie');
    const sortieDate = document.getElementById('sortieDate');
    const sortieBtn = document.querySelector('.step-btn[data-action="sortie"]');
    const sortieWarning = document.getElementById('sortieWarning');
    
    if (dossier.date_sortie_port) {
        if (sortieDate) sortieDate.textContent = formatDate(dossier.date_sortie_port);
        if (sortieBtn) {
            sortieBtn.disabled = true;
            sortieBtn.innerHTML = '<i class="fas fa-check"></i> Enregistré';
            sortieBtn.classList.add('completed');
        }
        if (sortieStep) sortieStep.classList.add('completed');
        if (sortieWarning) sortieWarning.innerHTML = '';
    } else {
        if (sortieBtn) {
            sortieBtn.disabled = false;
            sortieBtn.innerHTML = '<i class="fas fa-pen"></i> Marquer';
            sortieBtn.classList.remove('completed');
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
    
    try {
        const result = await SuiviDocumentsAPI.getDocuments(currentDossierId);
        
        if (result && result.ok && result.data && result.data.length > 0) {
            displayDocuments(result.data);
        } else {
            container.innerHTML = '<div class="empty"><i class="fas fa-folder-open"></i> Aucun document associé</div>';
        }
    } catch (error) {
        console.error('Erreur loadDocuments:', error);
        container.innerHTML = '<div class="error">Erreur de chargement des documents</div>';
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
    try {
        const result = await SuiviDocumentsAPI.markAsReceived(associationId);
        
        if (result && result.ok) {
            await loadDocuments();
            await loadCompletionRate();
            showNotification('Document marqué comme reçu', 'success');
        } else {
            checkbox.checked = false;
            showNotification('Erreur lors de la mise à jour', 'error');
        }
    } catch (error) {
        console.error('Erreur markDocumentReceived:', error);
        checkbox.checked = false;
        showNotification('Erreur de connexion', 'error');
    }
}

// Charger le taux de complétion
async function loadCompletionRate() {
    try {
        const result = await SuiviDocumentsAPI.getCompletionRate(currentDossierId);
        
        if (result && result.ok && result.data) {
            const rate = result.data.pourcentage || 0;
            const rateSpan = document.getElementById('completionRateValue');
            const fillBar = document.getElementById('completionFill');
            
            if (rateSpan) rateSpan.textContent = `${rate}%`;
            if (fillBar) fillBar.style.width = `${rate}%`;
        }
    } catch (error) {
        console.error('Erreur loadCompletionRate:', error);
    }
}

// ========== ATTACHEMENT DES ÉVÉNEMENTS ==========

function attachEvents() {
    console.log('Attachement des événements');
    
    // 1. Boutons de la timeline
    const buttons = document.querySelectorAll('.step-btn[data-action]');
    console.log('Boutons trouvés:', buttons.length);
    
    buttons.forEach(btn => {
        // Supprimer les anciens événements
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        const action = newBtn.getAttribute('data-action');
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const title = action === 'depart' ? 'Saisir la date de départ' :
                          action === 'arrivee' ? 'Saisir la date d\'arrivée' :
                          'Saisir la date de sortie';
            console.log('Clic sur bouton:', action);
            window.openDateModal(title, action);
        });
    });
    
    // 2. Bouton "Ajouter un relevé"
    const addTrackingBtn = document.getElementById('addTrackingBtn');
    if (addTrackingBtn) {
        const newBtn = addTrackingBtn.cloneNode(true);
        addTrackingBtn.parentNode.replaceChild(newBtn, addTrackingBtn);
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Clic sur Ajouter un relevé');
            if (typeof window.openTrackingForm === 'function') {
                window.openTrackingForm();
            } else {
                console.error('window.openTrackingForm non défini');
                showNotification('Module tracking non chargé', 'error');
            }
        });
    }
    
    // 3. Bouton "Modifier le dossier"
    const editBtn = document.getElementById('editDossierBtn');
    if (editBtn) {
        const newBtn = editBtn.cloneNode(true);
        editBtn.parentNode.replaceChild(newBtn, editBtn);
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.editDossier();
        });
    }
    
    // 4. Modal date - boutons
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    
    if (modalConfirmBtn) {
        const newBtn = modalConfirmBtn.cloneNode(true);
        modalConfirmBtn.parentNode.replaceChild(newBtn, modalConfirmBtn);
        newBtn.addEventListener('click', window.confirmDate);
    }
    
    if (closeModalBtn) {
        const newBtn = closeModalBtn.cloneNode(true);
        closeModalBtn.parentNode.replaceChild(newBtn, closeModalBtn);
        newBtn.addEventListener('click', window.closeDateModal);
    }
    
    if (cancelModalBtn) {
        const newBtn = cancelModalBtn.cloneNode(true);
        cancelModalBtn.parentNode.replaceChild(newBtn, cancelModalBtn);
        newBtn.addEventListener('click', window.closeDateModal);
    }
    
    // 5. Fermeture du modal en cliquant à l'extérieur
    const dateModal = document.getElementById('dateModal');
    if (dateModal) {
        dateModal.addEventListener('click', function(e) {
            if (e.target === this) {
                window.closeDateModal();
            }
        });
    }
    
    // 6. Modal tracking - boutons
    const closeTrackingModalBtn = document.getElementById('closeTrackingModalBtn');
    const cancelTrackingBtn = document.getElementById('cancelTrackingBtn');
    
    if (closeTrackingModalBtn) {
        const newBtn = closeTrackingModalBtn.cloneNode(true);
        closeTrackingModalBtn.parentNode.replaceChild(newBtn, closeTrackingModalBtn);
        newBtn.addEventListener('click', function() {
            if (typeof window.closeTrackingModal === 'function') {
                window.closeTrackingModal();
            }
        });
    }
    
    if (cancelTrackingBtn) {
        const newBtn = cancelTrackingBtn.cloneNode(true);
        cancelTrackingBtn.parentNode.replaceChild(newBtn, cancelTrackingBtn);
        newBtn.addEventListener('click', function() {
            if (typeof window.closeTrackingModal === 'function') {
                window.closeTrackingModal();
            }
        });
    }
    
    console.log('Événements attachés');
}

// ========== UTILITAIRES ==========

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

function showNotification(message, type = 'info') {
    const colors = {
        success: '#2E7D32',
        error: '#D32F2F',
        info: '#1565C0'
    };
    
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${colors[type] || '#333'};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        z-index: 10000;
        font-size: 0.85rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    notif.innerHTML = `<i class="fas ${icon}"></i> ${escapeHtml(message)}`;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.3s';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== INITIALISATION ==========

async function init() {
    console.log('Initialisation du dossier-detail');
    
    currentDossierId = window.getDossierIdFromUrl();
    if (!currentDossierId) {
        window.location.href = 'list.html';
        return;
    }
    
    await loadDossier();
    
    // Attacher les événements après un court délai pour que le DOM soit prêt
    setTimeout(attachEvents, 300);
}

// Exposer les fonctions nécessaires à window
window.loadDossier = loadDossier;
window.attachEvents = attachEvents;

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - dossier-detail.js');
    
    if (typeof Auth !== 'undefined' && Auth.isAuthenticated && !Auth.isAuthenticated()) {
        window.location.href = '../login.html';
        return;
    }
    
    // Attendre que les composants soient chargés
    const checkLoader = setInterval(() => {
        if (document.getElementById('sidebar-container') && document.getElementById('top-header-container')) {
            clearInterval(checkLoader);
            console.log('Composants chargés, initialisation');
            
            // Attendre que tout soit bien en place
            setTimeout(init, 500);
        }
    }, 100);
    
    // Fallback si les composants ne chargent pas
    setTimeout(() => {
        clearInterval(checkLoader);
        init();
    }, 5000);
});