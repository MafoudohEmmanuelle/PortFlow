/**
 * Sidebar Component
 * Version prototype - Uniquement logo + navigation
 * Pas d'informations utilisateur dans la sidebar
 */

const Sidebar = {
    // Configuration par défaut
    config: {
        logoTitle: 'PORTFLOW',
        logoSubtitle: 'Monitor • Prévention surestaries',
        bottomText: '© 2026 - Tous droits réservés',
        navItems: []
    },

    // Initialiser la sidebar
    init(config = {}) {
        this.config = { ...this.config, ...config };
        this.render();
        this.attachEvents();
        // Ne pas appeler setActiveItem ici car les événements ne sont pas encore attachés
        // Le active sera géré via la détection d'URL ou via setActiveByView
    },

    // Définir les items de navigation
    setNavItems(items) {
        this.config.navItems = items;
        if (document.getElementById('sidebar-nav-menu')) {
            this.renderNavItems();
            this.attachEvents();
        }
    },

    // Rendre la sidebar complète
    render() {
        const container = document.getElementById('sidebar-container');
        if (!container) {
            console.error('Sidebar container not found');
            return;
        }

        container.innerHTML = `
            <div class="sidebar">
                <div class="logo-area">
                    <h2>${this.config.logoTitle}</h2>
                    <p>${this.config.logoSubtitle}</p>
                </div>
                
                <div class="nav-menu" id="sidebar-nav-menu">
                    ${this.renderNavItems()}
                </div>
                
                <div class="bottom-info">
                    <i class="fas fa-ship"></i> ${this.config.bottomText}
                </div>
            </div>
        `;
    },

    // Rendre les items de navigation
    renderNavItems() {
        if (!this.config.navItems.length) {
            return '<div class="loading-nav" style="color: #757575; padding: 20px; text-align: center;">Configuration des menus...</div>';
        }
        
        return this.config.navItems.map(item => `
            <div class="nav-item" data-view="${item.view}" data-url="${item.url || '#'}">
                <i class="fas ${item.icon}"></i>
                <span>${item.label}</span>
            </div>
        `).join('');
    },

    // Attacher les événements
    attachEvents() {
        const navItems = document.querySelectorAll('#sidebar-nav-menu .nav-item');
        navItems.forEach(item => {
            // Supprimer l'ancien listener pour éviter les doublons
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', (e) => {
                e.preventDefault();
                const view = newItem.getAttribute('data-view');
                const url = newItem.getAttribute('data-url');
                
                // Mettre à jour l'état actif
                this.setActiveItem(newItem);
                
                // Déclencher l'événement personnalisé
                const event = new CustomEvent('sidebar-navigate', {
                    detail: { view, url }
                });
                document.dispatchEvent(event);
                
                // Si une URL est fournie et différente de #, naviguer
                if (url && url !== '#') {
                    window.location.href = url;
                }
            });
        });
    },

    // Définir l'item actif (un seul à la fois)
    setActiveItem(activeElement = null) {
        const navItems = document.querySelectorAll('#sidebar-nav-menu .nav-item');
        // Retirer la classe active de tous les éléments
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Ajouter la classe active à l'élément sélectionné
        if (activeElement) {
            activeElement.classList.add('active');
        }
    },

    // Mettre à jour l'item actif par vue (utilisé après navigation)
    setActiveByView(view) {
        const navItems = document.querySelectorAll('#sidebar-nav-menu .nav-item');
        let activeFound = false;
        
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-view') === view) {
                item.classList.add('active');
                activeFound = true;
            }
        });
        
        // Si aucun item trouvé par view, essayer par URL
        if (!activeFound) {
            this.setActiveByUrl();
        }
    },
    
    // Définir l'item actif en fonction de l'URL actuelle
    setActiveByUrl() {
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        const navItems = document.querySelectorAll('#sidebar-nav-menu .nav-item');
        
        navItems.forEach(item => {
            item.classList.remove('active');
            const url = item.getAttribute('data-url');
            if (url && url !== '#') {
                // Extraire le chemin de base de l'URL (sans les paramètres)
                const urlBase = url.split('?')[0];
                const currentBase = currentPath;
                
                // Vérifier si l'URL correspond à la page actuelle
                if (urlBase === currentBase) {
                    // Vérifier aussi les paramètres si présents
                    if (url.includes('?') && currentSearch) {
                        const urlParams = url.split('?')[1];
                        if (currentSearch.includes(urlParams.split('=')[1])) {
                            item.classList.add('active');
                        } else if (!url.includes('?') && !currentSearch) {
                            item.classList.add('active');
                        }
                    } else if (!url.includes('?') && !currentSearch) {
                        item.classList.add('active');
                    } else if (!url.includes('?') && currentSearch) {
                        // Page sans paramètres mais URL avec paramètres - ne pas activer
                        // Ne rien faire
                    } else {
                        item.classList.add('active');
                    }
                }
            }
        });
    }
};

// Export pour utilisation globale
window.Sidebar = Sidebar;