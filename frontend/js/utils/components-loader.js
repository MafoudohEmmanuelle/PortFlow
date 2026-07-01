/**
 * Components Loader - Version avec chemins corrigés (pages/)
 */

const ComponentsLoader = {
    styles: [
        'css/main.css',
        'css/components/sidebar.css',
        'css/components/top-header.css'
    ],

    async init(role = 'acheteur') {
        console.log('ComponentsLoader.init() - Démarrage, rôle:', role);
        
        await this.loadStyles();
        this.setupContainers();
        this.initSidebar(role);
        this.initTopHeader();
        await this.loadUserInfo();
        this.setActiveSidebarFromUrl();
        
        console.log('ComponentsLoader.init() - Terminé');
    },

    getBasePath() {
        // Détermine le chemin de base en fonction de la profondeur
        const path = window.location.pathname;
        
        // Si on est dans pages/dossiers/ => ../../ pour remonter à la racine
        if (path.includes('/pages/dossiers/') || path.includes('/pages/armateurs/') || 
            path.includes('/pages/documents/') || path.includes('/pages/users/') || 
            path.includes('/pages/alertes/') || path.includes('/pages/rapports/')) {
            return '../../';
        }
        // Si on est dans pages/ => ../
        if (path.includes('/pages/')) {
            return '../';
        }
        // Si on est à la racine
        return '';
    },

    async loadStyles() {
        const basePath = this.getBasePath();
        
        for (const style of this.styles) {
            const href = basePath + style;
            const existing = document.querySelector(`link[href="${href}"]`);
            if (existing) continue;
            await this.loadCSS(href);
        }
    },
    
    loadCSS(href) {
        return new Promise((resolve) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => resolve();
            link.onerror = () => resolve();
            document.head.appendChild(link);
        });
    },

    setupContainers() {
        if (document.querySelector('.app-container')) return;
        
        const originalContent = document.body.innerHTML;
        document.body.innerHTML = `
            <div class="app-container">
                <div id="sidebar-container"></div>
                <div class="main-content">
                    <div id="top-header-container"></div>
                    <div id="page-content-container">
                        ${originalContent}
                    </div>
                </div>
            </div>
        `;
    },

    // Obtenir le préfixe de chemin pour les URLs (toujours commencer par pages/)
    getPathPrefix() {
        const path = window.location.pathname;
        
        // Si on est déjà dans un sous-dossier de pages
        if (path.includes('/pages/dossiers/')) {
            return '../../pages/';
        }
        if (path.includes('/pages/armateurs/')) {
            return '../../pages/';
        }
        if (path.includes('/pages/documents/')) {
            return '../../pages/';
        }
        if (path.includes('/pages/users/')) {
            return '../../pages/';
        }
        if (path.includes('/pages/alertes/')) {
            return '../../pages/';
        }
        if (path.includes('/pages/rapports/')) {
            return '../../pages/';
        }
        // Si on est dans pages/ mais pas dans un sous-dossier
        if (path.includes('/pages/')) {
            return '../pages/';
        }
        // Si on est à la racine
        return 'pages/';
    },

    initSidebar(role) {
        const container = document.getElementById('sidebar-container');
        if (!container) return;
        
        const prefix = this.getPathPrefix();
        const isAdmin = (role === 'admin');
        
        let navItems = [];
        
        if (!isAdmin) {
            // Menu Acheteur - URLs CORRIGÉES avec pages/
            navItems = [
                { view: 'dashboard', label: 'Tableau de bord', icon: 'fa-tachometer-alt', url: prefix + 'dashboard-acheteur.html' },
                { view: 'dossiers', label: 'Dossiers import', icon: 'fa-folder-open', url: prefix + 'dossiers/list.html' },
                { view: 'nouveau', label: 'Nouveau dossier', icon: 'fa-plus-circle', url: prefix + 'dossiers/form.html' },
                { view: 'alertes', label: 'Alertes', icon: 'fa-bell', url: prefix + 'alertes.html' },
                { view: 'rapports', label: 'Rapports', icon: 'fa-chart-line', url: prefix + 'rapports/index.html' }
            ];
        } else {
            // Menu Administrateur - URLs CORRIGÉES avec pages/
            navItems = [
                { view: 'dashboard', label: 'Tableau de bord', icon: 'fa-tachometer-alt', url: prefix + 'dashboard-admin.html' },
                { view: 'utilisateurs', label: 'Utilisateurs', icon: 'fa-users', url: prefix + 'users/list.html' },
                { view: 'dossiers', label: 'Dossiers', icon: 'fa-folder-open', url: prefix + 'dossiers/list.html' },
                { view: 'nouveau', label: 'Nouveau dossier', icon: 'fa-plus-circle', url: prefix + 'dossiers/form.html' },
                { view: 'armateurs', label: 'Armateurs', icon: 'fa-ship', url: prefix + 'armateurs/list.html' },
                { view: 'documents', label: 'Documents', icon: 'fa-file-alt', url: prefix + 'documents/list.html' },
                { view: 'alertes', label: 'Alertes', icon: 'fa-bell', url: prefix + 'alertes.html' },
                { view: 'rapports', label: 'Rapports', icon: 'fa-chart-line', url: prefix + 'rapports/index.html' }
            ];
        }
        
        console.log('Sidebar URLs avec préfixe:', prefix, navItems);
        
        container.innerHTML = `
            <div class="sidebar">
                <div class="logo-area">
                    <h2>PORTFLOW</h2>
                    <p>Monitor • Prévention surestaries</p>
                </div>
                <div class="nav-menu" id="sidebar-nav-menu">
                    ${navItems.map(item => `
                        <div class="nav-item" data-view="${item.view}" data-url="${item.url}">
                            <i class="fas ${item.icon}"></i>
                            <span>${item.label}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="bottom-info">
                    <i class="fas fa-ship"></i> © 2026 - Tous droits réservés
                </div>
            </div>
        `;
        
        this.attachSidebarEvents();
    },
    
    attachSidebarEvents() {
        const navItems = document.querySelectorAll('#sidebar-nav-menu .nav-item');
        navItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', (e) => {
                e.preventDefault();
                const url = newItem.getAttribute('data-url');
                console.log('Navigation vers:', url);
                if (url) {
                    window.location.href = url;
                }
            });
        });
    },

    initTopHeader() {
        const container = document.getElementById('top-header-container');
        if (!container) return;
        
        const pageTitle = this.getPageTitle();
        
        container.innerHTML = `
            <div class="top-header">
                <h1 class="page-title" id="page-title">${pageTitle}</h1>
                <div class="user-area">
                    <i class="fas fa-user-circle"></i>
                    <span class="user-name" id="header-user-name">Chargement...</span>
                    <button class="logout-btn" id="header-logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Déconnexion
                    </button>
                </div>
            </div>
        `;
        
        const logoutBtn = document.getElementById('header-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (typeof Auth !== 'undefined' && Auth.logout) {
                    Auth.logout();
                } else {
                    localStorage.clear();
                    window.location.href = this.getPathPrefix() + 'login.html';
                }
            });
        }
    },

    async loadUserInfo() {
        const user = this.getUser();
        const userNameSpan = document.getElementById('header-user-name');
        if (user && userNameSpan) {
            userNameSpan.textContent = user.nom || user.email || 'Utilisateur';
        } else if (userNameSpan) {
            userNameSpan.textContent = 'Utilisateur';
        }
    },

    getUser() {
        try {
            const userStr = localStorage.getItem('portflow_user');
            if (userStr) return JSON.parse(userStr);
        } catch(e) {}
        return null;
    },

    getPageTitle() {
        const path = window.location.pathname;
        
        // Dossiers
        if (path.includes('dossiers/form.html')) return 'Nouveau dossier';
        if (path.includes('dossiers/detail.html')) return 'Détail du dossier';
        if (path.includes('dossiers/list.html')) return 'Dossiers d\'importation';
        
        // Armateurs
        if (path.includes('armateurs/form.html')) return 'Armateur';
        if (path.includes('armateurs/detail.html')) return 'Détail armateur';
        if (path.includes('armateurs/list.html')) return 'Armateurs';
        
        // Documents
        if (path.includes('documents/form.html')) return 'Document';
        if (path.includes('documents/detail.html')) return 'Détail document';
        if (path.includes('documents/list.html')) return 'Documents';
        
        // Utilisateurs
        if (path.includes('users/form.html')) return 'Utilisateur';
        if (path.includes('users/detail.html')) return 'Détail utilisateur';
        if (path.includes('users/list.html')) return 'Utilisateurs';
        
        // Alertes
        if (path.includes('alertes.html')) return 'Alertes';
        
        // Rapports
        if (path.includes('rapports/index.html')) return 'Rapports & KPIs';
        
        // Dashboards
        if (path.includes('dashboard-admin.html')) return 'Tableau de bord administrateur';
        
        return 'Tableau de bord';
    },
    
    setActiveSidebarFromUrl() {
        const path = window.location.pathname;
        const navItems = document.querySelectorAll('#sidebar-nav-menu .nav-item');
        
        navItems.forEach(item => {
            item.classList.remove('active');
            const url = item.getAttribute('data-url');
            if (url) {
                // Extraire le nom de la page sans paramètres
                const urlPage = url.split('/').pop().split('?')[0];
                const currentPage = path.split('/').pop().split('?')[0];
                
                if (urlPage === currentPage) {
                    item.classList.add('active');
                }
                // Cas spécial pour list.html et detail.html (même menu)
                if ((currentPage === 'list.html' || currentPage === 'detail.html' || currentPage === 'form.html') && 
                    (urlPage === 'list.html')) {
                    item.classList.add('active');
                }
            }
        });
    },
    
    setPageTitle(title) {
        const titleEl = document.getElementById('page-title');
        if (titleEl) titleEl.textContent = title;
    },
    
    setActiveSidebarItem(view) {
        const navItems = document.querySelectorAll('#sidebar-nav-menu .nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === view) {
                item.classList.add('active');
            }
        });
    }
};

window.ComponentsLoader = ComponentsLoader;