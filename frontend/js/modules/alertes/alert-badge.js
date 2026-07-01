// frontend/js/modules/alertes/alert-badge.js
// Badge de notification pour les alertes

function initAlertBadge() {
    // Vérifier si le badge existe déjà
    let badge = document.querySelector('.alert-badge');
    if (!badge) {
        // Trouver le lien "Alertes" dans la sidebar
        const alertesLink = document.getElementById('navAlertes');
        if (alertesLink) {
            // Créer le conteneur du badge
            badge = document.createElement('span');
            badge.className = 'alert-badge';
            badge.innerHTML = `<span class="badge-count empty">0</span>`;
            alertesLink.appendChild(badge);
        }
    }
    
    // Mettre à jour le badge
    updateAlertBadge();
}

async function updateAlertBadge() {
    const badge = document.querySelector('.alert-badge .badge-count');
    if (!badge) return;
    
    try {
        const stats = await AlertesAPI.getStats();
        if (stats.ok && stats.data) {
            const count = stats.data.non_lues || 0;
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('empty');
            } else {
                badge.textContent = '0';
                badge.classList.add('empty');
            }
        }
    } catch (error) {
        console.error('Erreur mise à jour badge:', error);
    }
}

// Mettre à jour le badge périodiquement (toutes les 5 minutes)
setInterval(() => {
    if (Auth.isAuthenticated()) {
        updateAlertBadge();
    }
}, 300000); // 5 minutes

// Exporter les fonctions
window.initAlertBadge = initAlertBadge;
window.updateAlertBadge = updateAlertBadge;