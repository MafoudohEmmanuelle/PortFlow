// frontend/js/modules/dashboard/dashboard-admin.js
async function loadAdminStats() {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = '<div class="loading">Chargement des statistiques...</div>';
    
    const result = await DashboardAPI.getAdminStats();
    
    if (result.ok && result.data) {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>📊 Total utilisateurs</h3>
                <p class="stat-number">${result.data.total_users}</p>
            </div>
            <div class="stat-card">
                <h3>👑 Administrateurs</h3>
                <p class="stat-number">${result.data.admin_count}</p>
            </div>
            <div class="stat-card">
                <h3>👥 Acheteurs</h3>
                <p class="stat-number">${result.data.acheteur_count}</p>
            </div>
            <div class="stat-card">
                <h3>✅ Utilisateurs actifs</h3>
                <p class="stat-number">${result.data.active_users}</p>
            </div>
        `;
    } else {
        statsContainer.innerHTML = '<div class="error">Erreur de chargement des statistiques</div>';
    }
}

// Charger les stats au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    loadAdminStats();
});