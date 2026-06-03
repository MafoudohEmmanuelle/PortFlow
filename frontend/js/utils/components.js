// frontend/js/utils/components.js
// SIMPLE : Il charge juste le sidebar et le header

const Components = {
    // Cache pour stocker les composants déjà chargés (évite de recharger)
    cache: {},
    
    /**
     * Charge un composant HTML et le met dans la page
     * @param {string} url - Chemin du fichier (ex: '../components/sidebar.html')
     * @param {string} targetId - ID de l'élément où mettre le contenu
     */
    async load(url, targetId) {
        // 1. Trouver l'élément dans la page
        const target = document.getElementById(targetId);
        if (!target) return;
        
        // 2. Vérifier si déjà en cache
        if (this.cache[url]) {
            target.innerHTML = this.cache[url];
            return;
        }
        
        // 3. Charger le fichier depuis le serveur
        try {
            const response = await fetch(url);
            const html = await response.text();
            this.cache[url] = html;
            target.innerHTML = html;
        } catch (error) {
            console.error('Erreur chargement:', error);
        }
    },
    
    /**
     * Charge plusieurs composants d'un coup
     */
    async loadAll(components) {
        for (const [targetId, url] of Object.entries(components)) {
            await this.load(url, targetId);
        }
    },
    
    /**
     * Initialise les événements après chargement
     * (navigation sidebar, déconnexion)
     */
    initEvents() {
        // Navigation : quand on clique sur un élément du menu
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const view = item.getAttribute('data-view');
                if (view) {
                    // Changer de vue
                    this.navigate(view);
                    // Marquer l'élément comme actif
                    document.querySelectorAll('.nav-item').forEach(nav => {
                        nav.classList.remove('active');
                    });
                    item.classList.add('active');
                }
            });
        });
        
        // Déconnexion
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                Auth.logout();
            });
        }
    },
    
    /**
     * Affiche/masque les éléments selon le rôle
     * (les éléments avec class "admin-only" ne sont visibles que pour l'admin)
     */
    adaptSidebar() {
        const isAdmin = Auth.isAdmin();
        const adminItems = document.querySelectorAll('.admin-only');
        adminItems.forEach(item => {
            item.style.display = isAdmin ? 'flex' : 'none';
        });
    },
    
    /**
     * Change la vue affichée
     */
    navigate(view) {
        const mapping = {
            'dashboard': 'dashboardView',
            'dossiers': 'dossiersView',
            'nouveau': 'nouveauView',
            'alertes': 'alertesView',
            'rapports': 'rapportsView',
            'admin': 'adminView'
        };
        
        const targetId = mapping[view];
        if (targetId) {
            this.showView(targetId);
        }
    },
    
    /**
     * Affiche une vue et cache les autres
     */
    showView(viewId) {
        // Liste de toutes les vues possibles
        const allViews = ['dashboardView', 'dossiersView', 'nouveauView', 
                          'alertesView', 'rapportsView', 'adminView'];
        
        // Cacher toutes les vues
        allViews.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        // Afficher la vue demandée
        const activeView = document.getElementById(viewId);
        if (activeView) activeView.style.display = 'block';
        
        // Mettre à jour le titre
        const titles = {
            'dashboardView': 'Tableau de bord',
            'dossiersView': 'Mes dossiers',
            'nouveauView': 'Nouveau dossier',
            'alertesView': 'Alertes',
            'rapportsView': 'Rapports',
            'adminView': 'Administration'
        };
        const titleEl = document.getElementById('mainTitle');
        if (titleEl && titles[viewId]) {
            titleEl.innerText = titles[viewId];
        }
    },
    
    /**
     * INITIALISATION COMPLÈTE - La fonction principale à appeler
     * C'est celle-ci que vous utiliserez dans vos pages
     */
    async init() {
        // 1. Charger la sidebar et le header
        await this.loadAll({
            'sidebar-container': '../components/sidebar.html',
            'header-container': '../components/header.html',
            'footer-container': '../components/footer.html'
        });
        
        // 2. Adapter la sidebar selon le rôle (admin ou pas)
        this.adaptSidebar();
        
        // 3. Initialiser les événements (clics, déconnexion)
        this.initEvents();
        
        // 4. Afficher le nom de l'utilisateur
        const user = Auth.getCurrentUser();
        const userNameSpan = document.getElementById('userName');
        if (userNameSpan && user) {
            userNameSpan.innerText = user.username || user.email;
        }
        
        // 5. Afficher la vue par défaut (dashboard)
        this.showView('dashboardView');
    }
};