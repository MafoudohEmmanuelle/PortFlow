// frontend/js/modules/users/users-list.js

let allUsers = [];
let currentFilters = {
    search: '',
    role: '',
    status: ''
};
let searchTimeout = null;

// Charger tous les utilisateurs
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement...<\/td></tr>';
    
    try {
        const result = await UsersAPI.getAll();
        
        if (result.ok && result.data) {
            allUsers = result.data;
            applyFiltersAndDisplay();
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="error">Erreur de chargement<\/td></tr>';
        }
    } catch (error) {
        console.error('Erreur loadUsers:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="error">Erreur de connexion<\/td></tr>';
    }
}

// Appliquer les filtres et afficher
function applyFiltersAndDisplay() {
    let filtered = [...allUsers];
    
    // Filtre recherche (nom ou email)
    if (currentFilters.search) {
        const searchLower = currentFilters.search.toLowerCase();
        filtered = filtered.filter(user => 
            (user.nom && user.nom.toLowerCase().includes(searchLower)) ||
            (user.email && user.email.toLowerCase().includes(searchLower))
        );
    }
    
    // Filtre rôle
    if (currentFilters.role) {
        filtered = filtered.filter(user => user.role === currentFilters.role);
    }
    
    // Filtre statut
    if (currentFilters.status) {
        const isActive = currentFilters.status === 'actif';
        filtered = filtered.filter(user => user.actif === isActive);
    }
    
    displayUsers(filtered);
}

// Afficher les utilisateurs
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty">Aucun utilisateur trouvé<\/td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td><strong>${escapeHtml(user.nom)}</strong></td>
            <td>${escapeHtml(user.email)}</td>
            <td><span class="badge-${user.role === 'admin' ? 'admin' : 'acheteur'}">${user.role === 'admin' ? 'Admin' : 'Acheteur'}</span></td>
            <td><span class="badge-${user.actif ? 'actif' : 'inactif'}">${user.actif ? 'Actif' : 'Inactif'}</span></td>
            <td>${formatDate(user.date_creation)}</td>
            <td class="actions">
                <a href="#" onclick="viewUser(${user.id})" class="action-link" title="Voir">
                    <i class="fas fa-eye"></i>
                </a>
                <a href="#" onclick="editUser(${user.id})" class="action-link" title="Modifier">
                    <i class="fas fa-edit"></i>
                </a>
                <a href="#" onclick="toggleUserStatus(${user.id}, ${!user.actif})" class="action-link" title="${user.actif ? 'Désactiver' : 'Activer'}">
                    <i class="fas ${user.actif ? 'fa-ban' : 'fa-check-circle'}"></i>
                </a>
                <a href="#" onclick="deleteUser(${user.id})" class="action-link action-delete" title="Supprimer">
                    <i class="fas fa-trash-alt"></i>
                </a>
            </td>
        </table>
    `).join('');
}

// Filtrer par recherche (avec debounce)
function onSearchInput() {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentFilters.search = document.getElementById('searchInput')?.value.trim() || '';
        applyFiltersAndDisplay();
    }, 300);
}

// Filtrer par rôle (instantané)
function onRoleChange() {
    currentFilters.role = document.getElementById('roleFilter')?.value || '';
    applyFiltersAndDisplay();
}

// Filtrer par statut (instantané)
function onStatusChange() {
    currentFilters.status = document.getElementById('statusFilter')?.value || '';
    applyFiltersAndDisplay();
}

// Réinitialiser tous les filtres
function resetFilters() {
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    if (searchInput) searchInput.value = '';
    if (roleFilter) roleFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    
    currentFilters = { search: '', role: '', status: '' };
    applyFiltersAndDisplay();
}

// Navigation
function viewUser(id) {
    window.location.href = `detail.html?id=${id}`;
}

function editUser(id) {
    window.location.href = `form.html?id=${id}`;
}

function newUser() {
    window.location.href = 'form.html';
}

// Activer/Désactiver un utilisateur
async function toggleUserStatus(id, newStatus) {
    const action = newStatus ? 'activer' : 'désactiver';
    if (!confirm(`Êtes-vous sûr de vouloir ${action} cet utilisateur ?`)) return;
    
    const result = await UsersAPI.update(id, { actif: newStatus });
    
    if (result.ok) {
        showNotification(`Utilisateur ${action} avec succès`, 'success');
        loadUsers();
    } else {
        showNotification(`Erreur lors de la ${action}`, 'error');
    }
}

// Supprimer un utilisateur
async function deleteUser(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ? Cette action est irréversible.')) return;
    
    const result = await UsersAPI.delete(id);
    
    if (result.ok) {
        showNotification('Utilisateur supprimé avec succès', 'success');
        loadUsers();
    } else {
        const errorMsg = result.data?.detail || 'Erreur lors de la suppression';
        showNotification(errorMsg, 'error');
    }
}

// Notification
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

// Utilitaires
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

// Initialisation
function initUsersList() {
    console.log('Initialisation de la liste des utilisateurs');
    loadUsers();
    
    const searchInput = document.getElementById('searchInput');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');
    const resetBtn = document.getElementById('resetFiltersBtn');
    const newUserBtn = document.getElementById('newUserBtn');
    
    if (searchInput) searchInput.addEventListener('input', onSearchInput);
    if (roleFilter) roleFilter.addEventListener('change', onRoleChange);
    if (statusFilter) statusFilter.addEventListener('change', onStatusChange);
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    if (newUserBtn) newUserBtn.addEventListener('click', newUser);
}

// Attendre les composants
document.addEventListener('DOMContentLoaded', () => {
    const checkLoader = setInterval(() => {
        if (document.getElementById('sidebar-container') && document.getElementById('top-header-container')) {
            clearInterval(checkLoader);
            setTimeout(initUsersList, 200);
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkLoader);
        initUsersList();
    }, 3000);
});

// Exporter les fonctions globales
window.viewUser = viewUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.toggleUserStatus = toggleUserStatus;