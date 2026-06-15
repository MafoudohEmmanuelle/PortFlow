// frontend/js/modules/users/users-detail.js

let currentUserId = null;
let currentUser = null;

// Récupérer l'ID depuis l'URL
function getUserIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Charger les détails de l'utilisateur
async function loadUserDetail() {
    console.log('loadUserDetail - Début');
    
    const spinner = document.getElementById('loadingSpinner');
    const content = document.getElementById('userContent');
    
    if (!currentUserId) {
        showError('Aucun utilisateur spécifié');
        return;
    }
    
    try {
        const result = await UsersAPI.getById(currentUserId);
        console.log('User detail:', result);
        
        if (result.ok && result.data) {
            currentUser = result.data;
            displayUserInfo(currentUser);
            await loadUserStats();
            
            if (spinner) spinner.style.display = 'none';
            if (content) content.style.display = 'block';
        } else {
            if (spinner) spinner.innerHTML = `<div class="error">Erreur: Utilisateur non trouvé</div>`;
        }
    } catch (error) {
        console.error('Erreur loadUserDetail:', error);
        if (spinner) spinner.innerHTML = '<div class="error">Erreur de connexion</div>';
    }
}

// Afficher les informations
function displayUserInfo(user) {
    document.getElementById('userId').textContent = user.id;
    document.getElementById('userNom').textContent = user.nom || '-';
    document.getElementById('userEmail').textContent = user.email || '-';
    
    const roleSpan = document.getElementById('userRole');
    roleSpan.innerHTML = `<span class="badge-${user.role === 'admin' ? 'admin' : 'acheteur'}">${user.role === 'admin' ? 'Administrateur' : 'Acheteur'}</span>`;
    
    const statutSpan = document.getElementById('userStatut');
    statutSpan.innerHTML = `<span class="badge-${user.actif ? 'actif' : 'inactif'}">${user.actif ? 'Actif' : 'Inactif'}</span>`;
    
    document.getElementById('userDateCreation').textContent = formatDate(user.date_creation);
}

// Charger les statistiques de l'utilisateur depuis la BD
async function loadUserStats() {
    console.log('loadUserStats - Début pour utilisateur:', currentUserId);
    
    try {
        // Récupérer tous les dossiers de l'utilisateur
        const result = await apiClient.get(`/dossiers?utilisateur_id=${currentUserId}`);
        console.log('Dossiers de l\'utilisateur:', result);
        
        if (result.ok && result.data) {
            const dossiers = result.data;
            const totalDossiers = dossiers.length;
            
            let totalDocuments = 0;
            let documentsObtenus = 0;
            let documentsManquants = 0;
            
            // Parcourir chaque dossier pour compter les documents
            for (const dossier of dossiers) {
                // Récupérer les documents du dossier
                const docsResult = await apiClient.get(`/documents-dossier/?dossier_id=${dossier.id}`);
                
                if (docsResult.ok && docsResult.data) {
                    const docs = docsResult.data;
                    totalDocuments += docs.length;
                    
                    const obtenus = docs.filter(doc => doc.obtenu === true).length;
                    const manquants = docs.filter(doc => doc.obtenu === false).length;
                    
                    documentsObtenus += obtenus;
                    documentsManquants += manquants;
                }
            }
            
            // Calculer le taux de complétion
            const tauxCompletion = totalDocuments > 0 
                ? Math.round((documentsObtenus / totalDocuments) * 100) 
                : 0;
            
            // Mettre à jour l'affichage
            document.getElementById('userDossiersCount').textContent = totalDossiers;
            document.getElementById('userDocumentsObtenus').textContent = documentsObtenus;
            document.getElementById('userDocumentsManquants').textContent = documentsManquants;
            document.getElementById('userTauxCompletion').textContent = `${tauxCompletion}%`;
            
            console.log(`Statistiques: ${totalDossiers} dossiers, ${documentsObtenus}/${totalDocuments} documents (${tauxCompletion}%)`);
        } else {
            console.log('Aucun dossier trouvé pour cet utilisateur');
            document.getElementById('userDossiersCount').textContent = '0';
            document.getElementById('userDocumentsObtenus').textContent = '0';
            document.getElementById('userDocumentsManquants').textContent = '0';
            document.getElementById('userTauxCompletion').textContent = '0%';
        }
    } catch (error) {
        console.error('Erreur loadUserStats:', error);
        document.getElementById('userDossiersCount').textContent = '?';
        document.getElementById('userDocumentsObtenus').textContent = '?';
        document.getElementById('userDocumentsManquants').textContent = '?';
        document.getElementById('userTauxCompletion').textContent = '?%';
    }
}

// Modifier l'utilisateur
function editUser() {
    window.location.href = `form.html?id=${currentUserId}`;
}

// Supprimer l'utilisateur
async function deleteUser() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ? Cette action est irréversible.')) return;
    
    const result = await UsersAPI.delete(currentUserId);
    
    if (result.ok) {
        showNotification('Utilisateur supprimé avec succès', 'success');
        setTimeout(() => {
            window.location.href = 'list.html';
        }, 1500);
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

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
}

// Initialisation
function initUserDetail() {
    currentUserId = getUserIdFromUrl();
    if (!currentUserId) {
        window.location.href = 'list.html';
        return;
    }
    loadUserDetail();
    
    const editBtn = document.getElementById('editUserBtn');
    const deleteBtn = document.getElementById('deleteUserBtn');
    
    if (editBtn) editBtn.addEventListener('click', editUser);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteUser);
}

// Attendre les composants
document.addEventListener('DOMContentLoaded', () => {
    const checkLoader = setInterval(() => {
        if (document.getElementById('sidebar-container') && document.getElementById('top-header-container')) {
            clearInterval(checkLoader);
            setTimeout(initUserDetail, 200);
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkLoader);
        initUserDetail();
    }, 3000);
});

// Export global
window.editUser = editUser;
window.deleteUser = deleteUser;