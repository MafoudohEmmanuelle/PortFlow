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
    console.log('=== loadDossier DEBUT ===');
    console.log('currentDossierId:', currentDossierId);
    const spinner = document.getElementById('loadingSpinner');
    const content = document.getElementById('dossierContent');
    
    if (!currentDossierId) {
        console.log('ERREUR: Pas d\'ID');
        showError('Aucun dossier spécifié');
        return;
    }

    console.log('Appel API DossiersAPI.getById...');
    const result = await DossiersAPI.getById(currentDossierId);
    console.log('Résultat API:', result);
    
    if (result.ok && result.data) {
        console.log('Dossier reçu:', result.data);
        currentDossier = result.data;
        console.log('Appel displayDossierInfo...');
        displayDossierInfo(currentDossier);
        console.log('Appel loadDocuments...');
        await loadDocuments();
        console.log('Appel loadCompletionRate...');
        await loadCompletionRate();
        if (spinner) spinner.style.display = 'none';
        if (content) content.style.display = 'block';
    } else {
         console.log('ERREUR API:', result.data?.detail);
         if (spinner) spinner.innerHTML = `<div class="error">Erreur: ${result.data?.detail || 'Dossier non trouvé'}</div>`;
    }
}

// Afficher les informations générales
function displayDossierInfo(dossier) {
    console.log('=== displayDossierInfo DEBUT ===');
    console.log('Dossier reçu dans displayDossierInfo:', dossier);
    
    // Vérifier chaque élément avant de le modifier
    const elements = {
        'dossierNumBl': dossier.numero_bl,
        'dossierFournisseur': dossier.fournisseur,
        'dossierArmateur': dossier.armateur_nom,
        'dossierDelai': `${dossier.delai_franchise_jours} jours`,
        'dossierEtaInitiale': formatDate(dossier.eta_initial),
        'dossierStatut': getStatutBadge(dossier.statut),
        'dossierDateCreation': formatDateTime(dossier.date_creation)
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            if (id === 'dossierStatut') {
                element.innerHTML = value;
            } else {
                element.textContent = value;
            }
            console.log(`✅ ${id} mis à jour:`, value);
        } else {
            console.log(`❌ Élément non trouvé: ${id}`);
        }
    }
    
    // Dates optionnelles
    const dateElements = ['dossierDateDepart', 'dossierDateArrivee', 'dossierDateSortie'];
    dateElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            let value = 'Non renseigné';
            if (id === 'dossierDateDepart' && dossier.date_depart) value = formatDate(dossier.date_depart);
            if (id === 'dossierDateArrivee' && dossier.date_arrivee) value = formatDate(dossier.date_arrivee);
            if (id === 'dossierDateSortie' && dossier.date_sortie_port) value = formatDate(dossier.date_sortie_port);
            element.textContent = value;
            console.log(`✅ ${id} mis à jour:`, value);
        } else {
            console.log(`❌ Élément non trouvé: ${id}`);
        }
    });
    
    const idElement = document.getElementById('dossierId');
    if (idElement) {
        idElement.textContent = dossier.id;
        console.log(`✅ dossierId mis à jour: ${dossier.id}`);
    } else {
        console.log(`❌ Élément dossierId non trouvé`);
    }
    
    console.log('Appel updateTimeline...');
    updateTimeline(dossier);
    
    const editBtn = document.getElementById('editDossierBtn');
    if (editBtn) {
        const isAdmin = Auth.isAdmin();
        editBtn.style.display = isAdmin ? 'flex' : 'none';
        console.log(`Bouton edit affiché: ${isAdmin}`);
    }
    
    console.log('=== displayDossierInfo FIN ===');
}

// Mettre à jour la timeline
// Mettre à jour la timeline
function updateTimeline(dossier) {
    // Départ
    const departItem = document.getElementById('timelineDepart');
    const departDate = document.getElementById('departDate');
    const departBtn = document.getElementById('btnDepart');
    
    if (departItem && departDate && departBtn) {
        if (dossier.date_depart) {
            departItem.classList.add('completed');
            departDate.textContent = formatDate(dossier.date_depart);
            departBtn.disabled = true;
            departBtn.innerHTML = '<i class="fas fa-check"></i> Départ enregistré';
        } else {
            departItem.classList.remove('completed');
            departDate.textContent = 'Non renseigné';
            departBtn.disabled = false;
        }
    }
    
    // Arrivée
    const arriveeItem = document.getElementById('timelineArrivee');
    const arriveeDate = document.getElementById('arriveeDate');
    const arriveeWarning = document.getElementById('arriveeWarning');
    const arriveeBtn = document.getElementById('btnArrivee');
    
    if (arriveeItem && arriveeDate && arriveeBtn) {
        if (dossier.date_arrivee) {
            arriveeItem.classList.add('completed');
            arriveeDate.textContent = formatDate(dossier.date_arrivee);
            arriveeBtn.disabled = true;
            arriveeBtn.innerHTML = '<i class="fas fa-check"></i> Arrivée enregistrée';
            if (arriveeWarning) arriveeWarning.textContent = '';
        } else {
            arriveeItem.classList.remove('completed');
            arriveeDate.textContent = 'Non renseigné';
            arriveeBtn.disabled = false;
            if (arriveeWarning && dossier.statut === 'arrivee_surestaries') {
                arriveeWarning.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ⚠️ ATTENTION : Délai de franchise dépassé !';
            }
        }
    }
    
    // Sortie
    const sortieItem = document.getElementById('timelineSortie');
    const sortieDate = document.getElementById('sortieDate');
    const sortieWarning = document.getElementById('sortieWarning');
    const sortieBtn = document.getElementById('btnSortie');
    
    if (sortieItem && sortieDate && sortieBtn) {
        if (dossier.date_sortie_port) {
            sortieItem.classList.add('completed');
            sortieDate.textContent = formatDate(dossier.date_sortie_port);
            sortieBtn.disabled = true;
            sortieBtn.innerHTML = '<i class="fas fa-check"></i> Sortie enregistrée';
            if (sortieWarning) sortieWarning.textContent = '';
        } else {
            sortieItem.classList.remove('completed');
            sortieDate.textContent = 'Non renseigné';
            sortieBtn.disabled = false;
            if (sortieWarning && dossier.statut === 'sortie_surestaries') {
                sortieWarning.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ⚠️ ATTENTION : Surestaries appliquées !';
            }
        }
    }
}

// Charger les documents du dossier
async function loadDocuments() {
    console.log('=== loadDocuments DEBUT ===');
    const container = document.getElementById('documentsList');
    if (!container) {
        console.log('❌ documentsList non trouvé');
        return;
    }
    
    container.innerHTML = '<div class="loading">Chargement des documents...</div>';
    
    const result = await SuiviDocumentsAPI.getDocuments(currentDossierId);
    console.log('Documents API result:', result);
    
    if (result.ok && result.data) {
        displayDocuments(result.data);
    } else {
        container.innerHTML = '<div class="error">Erreur de chargement des documents</div>';
    }
    console.log('=== loadDocuments FIN ===');
}

// Afficher les documents
function displayDocuments(documents) {
    const container = document.getElementById('documentsList');
    
    if (!documents || documents.length === 0) {
        container.innerHTML = '<div class="empty">Aucun document associé à ce dossier</div>';
        return;
    }
    
    container.innerHTML = documents.map(doc => `
        <div class="document-item ${doc.obtenu ? 'received' : ''}" data-id="${doc.id}">
            <div class="document-info">
                <span class="document-name">${doc.document_nom || 'Document'}</span>
                ${doc.document_code ? `<span class="document-code">${doc.document_code}</span>` : ''}
            </div>
            <div class="document-status">
                <span class="status-badge ${doc.obtenu ? 'status-received' : 'status-missing'}">
                    ${doc.obtenu ? '✅ Reçu' : '⏳ En attente'}
                </span>
                ${!doc.obtenu ? `
                    <input type="checkbox" class="document-checkbox" onchange="markDocumentReceived(${doc.id}, this)">
                ` : `
                    <span class="document-date">${doc.date_reception ? formatDate(doc.date_reception) : ''}</span>
                `}
            </div>
        </div>
    `).join('');
}

// Marquer un document comme reçu
async function markDocumentReceived(associationId, checkbox) {
    const result = await SuiviDocumentsAPI.markAsReceived(associationId);
    
    if (result.ok) {
        // Recharger les documents et le taux de complétion
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
    console.log('=== loadCompletionRate DEBUT ===');
    const result = await SuiviDocumentsAPI.getCompletionRate(currentDossierId);
    console.log('Completion rate result:', result);
    
    if (result.ok && result.data) {
        const rate = result.data.pourcentage || 0;
        console.log('Taux de complétion:', rate);
        const container = document.getElementById('completionRate');
        if (container) {
            container.innerHTML = `
                <span>${rate}%</span>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${rate}%"></div>
                </div>
            `;
            console.log('✅ Completion rate affiché');
        } else {
            console.log('❌ completionRate non trouvé');
        }
    } else {
        console.log('Erreur ou pas de données:', result.data?.detail);
    }
    console.log('=== loadCompletionRate FIN ===');
}

// Mettre à jour la date de départ
async function updateDepart() {
    pendingAction = 'depart';
    openDateModal('Saisir la date de départ');
}

// Mettre à jour la date d'arrivée
async function updateArrivee() {
    pendingAction = 'arrivee';
    openDateModal('Saisir la date d\'arrivée');
}

// Mettre à jour la date de sortie
async function updateSortie() {
    pendingAction = 'sortie';
    openDateModal('Saisir la date de sortie');
}

// Ouvrir le modal de date
function openDateModal(title) {
    const modal = document.getElementById('dateModal');
    const modalTitle = document.getElementById('modalTitle');
    const dateInput = document.getElementById('modalDate');
    
    modalTitle.textContent = title;
    dateInput.value = new Date().toISOString().split('T')[0];
    modal.classList.add('active');
}

// Fermer le modal
function closeDateModal() {
    document.getElementById('dateModal').classList.remove('active');
    pendingAction = null;
}

// Confirmer la date et envoyer
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
            return;
    }
    
    closeDateModal();
    
    if (result.ok) {
        showNotification('Mise à jour effectuée', 'success');
        await loadDossier();
    } else {
        showNotification('Erreur: ' + (result.data?.detail || 'Mise à jour impossible'), 'error');
    }
    
    pendingAction = null;
}

// Rediriger vers le formulaire de modification
function editDossier() {
    window.location.href = `form.html?id=${currentDossierId}`;
}

// Fonctions utilitaires
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
        'en_attente': '<span class="statut-badge statut-en_attente">⏳ En attente de départ</span>',
        'depart': '<span class="statut-badge statut-depart">🚢 En mer</span>',
        'arrivee': '<span class="statut-badge statut-arrivee">✅ Arrivé au port</span>',
        'arrivee_surestaries': '<span class="statut-badge statut-surestaries">⚠️ Arrivé - SURESTARIES</span>',
        'sortie': '<span class="statut-badge statut-sortie">📦 Sorti du port</span>',
        'sortie_surestaries': '<span class="statut-badge statut-surestaries">⚠️ Sorti - SURESTARIES</span>'
    };
    return badges[statut] || `<span class="statut-badge">${statut}</span>`;
}

function showNotification(message, type) {
    const notif = document.createElement('div');
    notif.style.cssText = `position:fixed;bottom:20px;right:20px;background:${type === 'success' ? '#10b981' : '#ef4444'};color:white;padding:12px 20px;border-radius:10px;z-index:3000;`;
    notif.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAuthenticated()) {
        window.location.href = '../login.html';
        return;
    }
    
    currentDossierId = getDossierIdFromUrl();
    if (!currentDossierId) {
        window.location.href = 'list.html';
        return;
    }
    
    loadDossier();
    
    // Navigation
    document.getElementById('navDashboard')?.addEventListener('click', () => {
        const isAdmin = Auth.isAdmin();
        window.location.href = isAdmin ? '../dashboard-admin.html' : '../dashboard-acheteur.html';
    });
    document.getElementById('navDossiers')?.addEventListener('click', () => {
        window.location.href = 'list.html';
    });
    document.getElementById('editDossierBtn')?.addEventListener('click', editDossier);
    
    // Confirmation modal
    document.getElementById('modalConfirmBtn')?.addEventListener('click', confirmDate);
});