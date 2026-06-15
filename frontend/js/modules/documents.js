// frontend/js/modules/documents.js
// Gestion des documents (liste + formulaire)

let allItems = [];
let isEditMode = false;
let currentItemId = null;
let currentFilters = { search: '', status: '' };
let searchTimeout = null;

// ========== LISTE ==========

async function loadItems() {
    const tbody = document.getElementById('itemsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement...<\/td></tr>';
    
    try {
        const result = await ReferentielsAPI.getDocuments();
        
        if (result.ok && result.data) {
            allItems = result.data;
            applyFiltersAndDisplay();
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="error">Erreur de chargement<\/td></tr>';
        }
    } catch (error) {
        console.error('Erreur loadItems:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="error">Erreur de connexion<\/td></tr>';
    }
}

function applyFiltersAndDisplay() {
    let filtered = [...allItems];
    
    if (currentFilters.search) {
        const searchLower = currentFilters.search.toLowerCase();
        filtered = filtered.filter(item => 
            (item.nom && item.nom.toLowerCase().includes(searchLower)) ||
            (item.code && item.code.toLowerCase().includes(searchLower))
        );
    }
    
    if (currentFilters.status) {
        const isActive = currentFilters.status === 'actif';
        filtered = filtered.filter(item => item.actif === isActive);
    }
    
    displayItems(filtered);
}

function displayItems(items) {
    const tbody = document.getElementById('itemsTableBody');
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty">Aucun document trouvé<\/td></tr>';
        return;
    }
    
    tbody.innerHTML = items.map(item => `
        <tr>
            <td>${item.id}</td>
            <td><strong>${escapeHtml(item.nom)}</strong></td>
            <td>${item.code ? escapeHtml(item.code) : '-'}</td>
            <td>${item.responsable ? escapeHtml(item.responsable) : '-'}</td>
            <td><span class="badge-${item.actif ? 'actif' : 'inactif'}">${item.actif ? 'Actif' : 'Inactif'}</span></td>
            <td>${formatDate(item.date_creation)}</td>
            <td class="actions">
                <a href="#" onclick="editItem(${item.id})" class="action-link" title="Modifier">
                    <i class="fas fa-edit"></i>
                </a>
                <a href="#" onclick="toggleItemStatus(${item.id}, ${!item.actif})" class="action-link" title="${item.actif ? 'Désactiver' : 'Activer'}">
                    <i class="fas ${item.actif ? 'fa-ban' : 'fa-check-circle'}"></i>
                </a>
                <a href="#" onclick="deleteItem(${item.id})" class="action-link action-delete" title="Supprimer">
                    <i class="fas fa-trash-alt"></i>
                </a>
            </td>
        </tr>
    `).join('');
}

function onSearchInput() {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentFilters.search = document.getElementById('searchInput')?.value.trim() || '';
        applyFiltersAndDisplay();
    }, 300);
}

function onStatusChange() {
    currentFilters.status = document.getElementById('statusFilter')?.value || '';
    applyFiltersAndDisplay();
}

function resetFilters() {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    
    currentFilters = { search: '', status: '' };
    applyFiltersAndDisplay();
}

async function toggleItemStatus(id, newStatus) {
    const action = newStatus ? 'activer' : 'désactiver';
    if (!confirm(`Êtes-vous sûr de vouloir ${action} ce document ?`)) return;
    
    const result = await ReferentielsAPI.updateDocument(id, { actif: newStatus });
    
    if (result.ok) {
        showNotification(`Document ${action} avec succès`, 'success');
        loadItems();
    } else {
        showNotification(`Erreur lors de la ${action}`, 'error');
    }
}

async function deleteItem(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce document ? Cette action est irréversible.')) return;
    
    const result = await ReferentielsAPI.deleteDocument(id);
    
    if (result.ok) {
        showNotification('Document supprimé avec succès', 'success');
        loadItems();
    } else {
        const errorMsg = result.data?.detail || 'Erreur lors de la suppression';
        showNotification(errorMsg, 'error');
    }
}

function editItem(id) {
    window.location.href = `form.html?id=${id}`;
}

function newItem() {
    window.location.href = 'form.html';
}

// ========== FORMULAIRE ==========

function getItemIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

async function loadItemForEdit(id) {
    try {
        const result = await ReferentielsAPI.getDocumentById(id);
        
        if (result.ok && result.data) {
            const item = result.data;
            document.getElementById('nom').value = item.nom || '';
            document.getElementById('code').value = item.code || '';
            document.getElementById('responsable').value = item.responsable || '';
            document.getElementById('actif').checked = item.actif === true;
        } else {
            showError('Impossible de charger le document');
        }
    } catch (error) {
        console.error('Erreur loadItemForEdit:', error);
        showError('Erreur de connexion');
    }
}

function checkEditMode() {
    const id = getItemIdFromUrl();
    
    if (id && !isNaN(parseInt(id))) {
        isEditMode = true;
        currentItemId = parseInt(id);
        
        const submitBtn = document.getElementById('submitBtn');
        
        if (typeof ComponentsLoader !== 'undefined') {
            ComponentsLoader.setPageTitle('Modifier un document');
        }
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
        
        loadItemForEdit(currentItemId);
    }
}

function validateForm() {
    const nom = document.getElementById('nom')?.value.trim();
    
    if (!nom) {
        showError('Le nom est obligatoire');
        return false;
    }
    return true;
}

function getFormData() {
    return {
        nom: document.getElementById('nom').value.trim(),
        code: document.getElementById('code')?.value.trim() || null,
        responsable: document.getElementById('responsable')?.value.trim() || null,
        actif: document.getElementById('actif')?.checked || false
    };
}

async function submitForm(event) {
    event.preventDefault();
    
    if (!validateForm()) return;
    
    const formData = getFormData();
    console.log('Données à envoyer:', formData);
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    
    let result;
    if (isEditMode) {
        result = await ReferentielsAPI.updateDocument(currentItemId, formData);
    } else {
        result = await ReferentielsAPI.createDocument(formData);
    }
    
    if (result.ok) {
        showSuccess(
            isEditMode ? 'Document modifié avec succès !' : 'Document créé avec succès !',
            'list.html'
        );
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = isEditMode ? '<i class="fas fa-save"></i> Mettre à jour' : '<i class="fas fa-save"></i> Créer';
        
        let errorMessage = 'Erreur lors de l\'enregistrement';
        if (result.data?.detail) {
            errorMessage = result.data.detail;
        }
        showError(errorMessage);
    }
}

// ========== UTILITAIRES ==========

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const errorDiv = document.getElementById('formError');
    if (errorDiv) {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${escapeHtml(message)}`;
        errorDiv.style.display = 'block';
        setTimeout(() => { errorDiv.style.display = 'none'; }, 5000);
    } else {
        alert(message);
    }
}

function showSuccess(message, redirectUrl) {
    const successDiv = document.getElementById('formSuccess');
    if (successDiv) {
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${escapeHtml(message)}`;
        successDiv.style.display = 'block';
        setTimeout(() => { window.location.href = redirectUrl; }, 1500);
    } else {
        setTimeout(() => { window.location.href = redirectUrl; }, 1500);
    }
}

function showNotification(message, type) {
    const notif = document.createElement('div');
    notif.style.cssText = `
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
    notif.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${escapeHtml(message)}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// ========== INITIALISATION ==========

function initPage() {
    const isListPage = document.getElementById('itemsTableBody') !== null;
    const isFormPage = document.getElementById('itemForm') !== null;
    
    if (isListPage) {
        loadItems();
        
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');
        const resetBtn = document.getElementById('resetFiltersBtn');
        const newBtn = document.getElementById('newItemBtn');
        
        if (searchInput) searchInput.addEventListener('input', onSearchInput);
        if (statusFilter) statusFilter.addEventListener('change', onStatusChange);
        if (resetBtn) resetBtn.addEventListener('click', resetFilters);
        if (newBtn) newBtn.addEventListener('click', newItem);
    }
    
    if (isFormPage) {
        checkEditMode();
        const form = document.getElementById('itemForm');
        if (form) form.addEventListener('submit', submitForm);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const checkLoader = setInterval(() => {
        if (document.getElementById('sidebar-container') && document.getElementById('top-header-container')) {
            clearInterval(checkLoader);
            setTimeout(initPage, 200);
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkLoader);
        initPage();
    }, 3000);
});

window.editItem = editItem;
window.deleteItem = deleteItem;
window.toggleItemStatus = toggleItemStatus;