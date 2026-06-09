// frontend/js/utils/sidebar.js
function loadUserInfo() {
    const user = Auth.getUser();
    if (!user) return;
    
    const avatarElement = document.getElementById('userAvatar');
    if (avatarElement) {
        const initial = user.nom ? user.nom.charAt(0).toUpperCase() : 'U';
        avatarElement.textContent = initial;
    }
    
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = user.nom || user.email;
    }
    
    const userRoleElement = document.getElementById('userRole');
    if (userRoleElement) {
        const roleText = user.role === 'admin' ? 'Administrateur' : 'Acheteur';
        userRoleElement.innerHTML = `<span class="badge">${roleText}</span>`;
    }
}

// Charger les infos au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Auth !== 'undefined' && Auth.getUser()) {
        loadUserInfo();
    }
});