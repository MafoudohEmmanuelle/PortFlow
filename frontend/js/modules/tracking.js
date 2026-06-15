// frontend/js/modules/tracking.js
console.log('=== tracking.js CHARGÉ ===');

let allTrackingEntries = [];
let currentPage = 1;
const itemsPerPage = 5;

// ========== CHARGEMENT DES TRACKINGS ==========

async function loadTrackingHistory(dossierId) {
    console.log('loadTrackingHistory - Début pour dossier:', dossierId);
    
    window.currentDossierId = dossierId;
    currentPage = 1;
    
    const tableBody = document.getElementById('trackingTableBody');
    if (!tableBody) return;
    
    // Afficher/masquer les colonnes selon le rôle
    const isAdmin = Auth.isAdmin();
    const authorHeader = document.getElementById('trackingAuthorHeader');
    const actionsHeader = document.getElementById('trackingActionsHeader');
    
    if (authorHeader) authorHeader.style.display = isAdmin ? 'table-cell' : 'none';
    if (actionsHeader) actionsHeader.style.display = isAdmin ? 'table-cell' : 'none';
    
    tableBody.innerHTML = '<tr><td colspan="6" class="tracking-loading"><i class="fas fa-spinner fa-spin"></i> Chargement...<\/td></td>';
    
    if (typeof TrackingAPI === 'undefined') {
        console.error('TrackingAPI non défini!');
        tableBody.innerHTML = '<tr><td colspan="6" class="tracking-error"><i class="fas fa-exclamation-circle"></i> API non disponible<\/td></tr>';
        return;
    }
    
    try {
        const result = await TrackingAPI.getByDossier(dossierId);
        console.log('Tracking history result:', result);
        
        if (result.ok && result.data && result.data.length > 0) {
            // Trier par date décroissante (plus récent en premier)
            allTrackingEntries = [...result.data].sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation));
            displayTrackingTable();
            
            // Afficher la pagination si nécessaire
            const paginationContainer = document.getElementById('trackingPagination');
            if (paginationContainer) {
                paginationContainer.style.display = allTrackingEntries.length > itemsPerPage ? 'flex' : 'none';
            }
        } else {
            tableBody.innerHTML = `
                <tr><td colspan="6" class="tracking-empty">
                    <i class="fas fa-map-marker-alt"></i> Aucun relevé de tracking
                    <button class="btn-outline-grey" style="margin-left: 10px;" onclick="openTrackingForm()">
                        <i class="fas fa-plus"></i> Ajouter un relevé
                    </button>
                <\/td></tr>
            `;
            const paginationContainer = document.getElementById('trackingPagination');
            if (paginationContainer) paginationContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Erreur loadTrackingHistory:', error);
        tableBody.innerHTML = '<tr><td colspan="6" class="tracking-error"><i class="fas fa-exclamation-circle"></i> Erreur de chargement<\/td></td>';
    }
}

function displayTrackingTable() {
    const tableBody = document.getElementById('trackingTableBody');
    if (!tableBody) return;
    
    const isAdmin = Auth.isAdmin();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageEntries = allTrackingEntries.slice(startIndex, endIndex);
    
    if (pageEntries.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="tracking-empty">Aucun relevé à afficher<\/td></tr>';
        return;
    }
    
    tableBody.innerHTML = pageEntries.map(entry => {
        const cols = `
            <td class="tracking-date">${formatTrackingDate(entry.date_creation)}<\/td>
            <td class="tracking-position"><strong>${escapeHtml(entry.position)}</strong><\/td>
            <td class="tracking-etd">${entry.etd ? formatDate(entry.etd) : '-'}<\/td>
            <td class="tracking-eta">${entry.eta ? formatDate(entry.eta) : '-'}<\/td>
            ${isAdmin ? `<td class="tracking-author"><i class="fas fa-user-circle"></i> ${escapeHtml(entry.utilisateur_nom || 'Inconnu')}<\/td>` : ''}
            ${isAdmin ? `
                <td class="tracking-actions">
                    <button class="tracking-delete-btn" onclick="confirmDeleteTracking(${entry.id})" title="Supprimer">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                <\/td>
            ` : ''}
        `;
        return `<tr>${cols}<\/tr>`;
    }).join('');
    
    // Mettre à jour les infos de pagination
    const totalPages = Math.ceil(allTrackingEntries.length / itemsPerPage);
    const pageInfo = document.getElementById('trackingPageInfo');
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
    
    const prevBtn = document.getElementById('trackingPrevBtn');
    const nextBtn = document.getElementById('trackingNextBtn');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

// Navigation pagination
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayTrackingTable();
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(allTrackingEntries.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayTrackingTable();
    }
}

// ========== FORMULAIRE ==========

function openTrackingForm(trackingId = null) {
    console.log('openTrackingForm - Ouverture du modal');
    
    const modal = document.getElementById('trackingModal');
    if (!modal) {
        console.error('Modal tracking non trouvé');
        return;
    }
    
    const modalTitle = document.getElementById('trackingModalTitle');
    const positionInput = document.getElementById('trackingPosition');
    const etdInput = document.getElementById('trackingEtd');
    const etaInput = document.getElementById('trackingEta');
    const submitBtn = document.getElementById('trackingSubmitBtn');
    
    // Réinitialiser
    if (positionInput) positionInput.value = '';
    if (etdInput) etdInput.value = '';
    if (etaInput) etaInput.value = '';
    
    // Mode création uniquement (pas de modification)
    if (modalTitle) modalTitle.textContent = 'Nouveau relevé de tracking';
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Créer le relevé';
        submitBtn.onclick = () => createTracking();
    }
    
    modal.classList.add('active');
}

function closeTrackingModal() {
    const modal = document.getElementById('trackingModal');
    if (modal) modal.classList.remove('active');
}

async function createTracking() {
    const position = document.getElementById('trackingPosition')?.value.trim();
    const etd = document.getElementById('trackingEtd')?.value || null;
    const eta = document.getElementById('trackingEta')?.value || null;
    
    if (!position) {
        showNotification('La position est obligatoire', 'error');
        return;
    }
    
    const formData = { 
        dossier_id: window.currentDossierId, 
        position: position, 
        etd: etd, 
        eta: eta 
    };
    console.log('Création tracking:', formData);
    
    const submitBtn = document.getElementById('trackingSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
    }
    
    try {
        const result = await TrackingAPI.create(formData);
        if (result.ok) {
            showNotification('Relevé ajouté avec succès', 'success');
            closeTrackingModal();
            await loadTrackingHistory(formData.dossier_id);
        } else {
            showNotification('Erreur: ' + (result.data?.detail || 'Erreur inconnue'), 'error');
        }
    } catch (error) {
        console.error('Erreur createTracking:', error);
        showNotification('Erreur de connexion', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Créer le relevé';
        }
    }
}

async function confirmDeleteTracking(trackingId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce relevé de tracking ? Cette action est irréversible.')) return;
    
    try {
        const result = await TrackingAPI.delete(trackingId);
        if (result.ok) {
            showNotification('Relevé supprimé avec succès', 'success');
            await loadTrackingHistory(window.currentDossierId);
        } else {
            showNotification('Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('Erreur deleteTracking:', error);
        showNotification('Erreur de connexion', 'error');
    }
}

// ========== UTILITAIRES ==========

function formatTrackingDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2E7D32' : '#D32F2F'};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        z-index: 10000;
        font-size: 0.85rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${escapeHtml(message)}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Exporter les fonctions globales
window.loadTrackingHistory = loadTrackingHistory;
window.openTrackingForm = openTrackingForm;
window.closeTrackingModal = closeTrackingModal;
window.confirmDeleteTracking = confirmDeleteTracking;
window.goToPrevPage = goToPrevPage;
window.goToNextPage = goToNextPage;