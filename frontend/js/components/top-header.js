/**
 * Top Header Component
 * Version prototype - Contient titre + user-area (icone, nom, déconnexion)
 */

const TopHeader = {
    // Configuration
    config: {
        title: 'Tableau de bord',
        userName: '',
        userRole: ''
    },

    // Initialiser
    init(config = {}) {
        this.config = { ...this.config, ...config };
        this.render();
        this.attachEvents();
    },

    // Rendre l'en-tête (exactement comme le prototype)
    render() {
        const container = document.getElementById('top-header-container');
        if (!container) {
            console.error('Top header container not found');
            return;
        }

        container.innerHTML = `
            <div class="top-header">
                <h1 class="page-title" id="page-title">${this.config.title}</h1>
                <div class="user-area">
                    <i class="fas fa-user-circle"></i>
                    <span class="user-name">${this.config.userName || 'Utilisateur'}</span>
                    ${this.config.userRole ? `<span class="user-role">(${this.config.userRole})</span>` : ''}
                    <button class="logout-btn" id="header-logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Déconnexion
                    </button>
                </div>
            </div>
        `;
    },

    // Attacher les événements
    attachEvents() {
        const logoutBtn = document.getElementById('header-logout-btn');
        if (logoutBtn) {
            // Supprimer l'ancien listener
            const newBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
            
            newBtn.addEventListener('click', () => {
                if (typeof Auth !== 'undefined' && Auth.logout) {
                    Auth.logout();
                } else {
                    // Nettoyage du storage
                    localStorage.removeItem('portflow_token');
                    localStorage.removeItem('portflow_user');
                    window.location.href = '/pages/login.html';
                }
            });
        }
    },

    // Mettre à jour le titre
    setTitle(title) {
        this.config.title = title;
        const titleEl = document.getElementById('page-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
    },

    // Mettre à jour les infos utilisateur
    updateUserInfo(user) {
        this.config.userName = user.nom || user.email || 'Utilisateur';
        this.config.userRole = user.role === 'admin' ? 'Administrateur' : 'Acheteur';
        
        const userNameEl = document.querySelector('#top-header-container .user-name');
        const userRoleEl = document.querySelector('#top-header-container .user-role');
        
        if (userNameEl) {
            userNameEl.textContent = this.config.userName;
        }
        if (userRoleEl) {
            userRoleEl.textContent = `(${this.config.userRole})`;
        } else if (this.config.userRole) {
            // Si l'élément n'existe pas, le créer
            const userArea = document.querySelector('#top-header-container .user-area');
            if (userArea && !userRoleEl) {
                const roleSpan = document.createElement('span');
                roleSpan.className = 'user-role';
                roleSpan.textContent = `(${this.config.userRole})`;
                const logoutBtn = userArea.querySelector('.logout-btn');
                userArea.insertBefore(roleSpan, logoutBtn);
            }
        }
    },

    // Récupérer le nom d'affichage formaté
    getDisplayName() {
        return `${this.config.userName}${this.config.userRole ? ` (${this.config.userRole})` : ''}`;
    }
};

// Export
window.TopHeader = TopHeader;