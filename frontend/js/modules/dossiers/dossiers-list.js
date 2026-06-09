// frontend/js/modules/dossiers/dossiers-list.js

let currentFilters = {
    skip: 0,
    limit: 100,
    statut: ''
};

async function loadDossiers() {
    const tbody = document.getElementById('dossiersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Chargement...</td></tr>';
    
    const result = await DossiersAPI.getAll(currentFilters);
    
    if (result.ok && result.data) {
        displayDossiers(result.data);
    } else {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-message">
            <i class="fas fa-exclamation-circle"></i>
            Erreur: ${result.data?.detail || 'Problème de connexion'}
        </td></tr>`;
    }
}

function displayDossiers(dossiers) {
    const tbody = document.getElementById('dossiersTableBody');
    const isAdmin = Auth.isAdmin();
    
    if (!dossiers || dossiers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-message"><i class="fas fa-folder-open"></i> Aucun dossier trouvé</td></tr>';
        return;
    }
    
    tbody.innerHTML = dossiers.map(dossier => `
        <tr>
            <td><strong>${dossier.id || '-'}</strong></td>
            <td>${dossier.numero_bl || '-'}</td>
            <td>${dossier.fournisseur || '-'}</td>
            <td>${dossier.armateur_nom || '-'}</td>
            <td>${formatDate(dossier.eta_initial)}</td>
            <td>${getStatutBadge(dossier.statut)}</td>
            <td>
                <a class="action-link" onclick="viewDossier(${dossier.id})">
                    <i class="fas fa-eye"></i> Voir
                </a>
                <a class="action-link" onclick="editDossier(${dossier.id})">
                    <i class="fas fa-edit"></i>
                </a>
                ${isAdmin ? `<a class="action-link" onclick="deleteDossier(${dossier.id})">
                    <i class="fas fa-trash"></i>
                </a>` : ''}
            </td>
        </tr>
    `).join('');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

function getStatutBadge(statut) {
    const badges = {
        'en_attente': '<span class="statut-badge statut-en_attente">⏳ En attente</span>',
        'depart': '<span class="statut-badge statut-depart">🚢 Départ</span>',
        'arrivee': '<span class="statut-badge statut-arrivee">✅ Arrivé</span>',
        'arrivee_surestaries': '<span class="statut-badge statut-surestaries">⚠️ Surestaries (arrivée)</span>',
        'sortie': '<span class="statut-badge statut-sortie">📦 Sorti</span>',
        'sortie_surestaries': '<span class="statut-badge statut-surestaries">⚠️ Surestaries (sortie)</span>'
    };
    return badges[statut] || `<span class="statut-badge">${statut}</span>`;
}

function applyFilters() {
    currentFilters = {
        skip: 0,
        limit: 100,
        statut: document.getElementById('filterStatut')?.value || ''
    };
    loadDossiers();
}

function resetFilters() {
    const statutSelect = document.getElementById('filterStatut');
    if (statutSelect) statutSelect.value = '';
    currentFilters = { skip: 0, limit: 100, statut: '' };
    loadDossiers();
}

function viewDossier(id) {
    window.location.href = `detail.html?id=${id}`;
}

function editDossier(id) {
    window.location.href = `form.html?id=${id}`;
}

async function deleteDossier(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce dossier ?')) return;
    
    const result = await DossiersAPI.delete(id);
    
    if (result.ok) {
        loadDossiers();
        showNotification('Dossier supprimé', 'success');
    } else {
        showNotification('Erreur lors de la suppression', 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;bottom:20px;right:20px;background:${type === 'success' ? '#10b981' : '#ef4444'};color:white;padding:12px 20px;border-radius:10px;z-index:2000;`;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function newDossier() {
    window.location.href = 'form.html';
}

async function loadArmateursForFilter() {
    const select = document.getElementById('filterArmateur');
    if (!select) return;
    
    const result = await ReferentielsAPI.getArmateurs();
    
    if (result.ok && result.data) {
        select.innerHTML = '<option value="">Tous les armateurs</option>';
        result.data.forEach(armateur => {
            select.innerHTML += `<option value="${armateur.id}">${armateur.nom}</option>`;
        });
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAuthenticated()) {
        window.location.href = '../login.html';
        return;
    }
    
    loadDossiers();
    loadArmateursForFilter();
    
    const btnFilter = document.getElementById('btnFilter');
    const btnReset = document.getElementById('btnReset');
    const btnNew = document.getElementById('btnNew');
    const searchInput = document.getElementById('searchInput');
    
    if (btnFilter) btnFilter.addEventListener('click', applyFilters);
    if (btnReset) btnReset.addEventListener('click', resetFilters);
    if (btnNew) btnNew.addEventListener('click', newDossier);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyFilters();
        });
    }
});