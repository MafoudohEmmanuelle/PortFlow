// Logique du dashboard acheteur
async function loadAcheteurStats() {
    const welcomeContainer = document.getElementById('welcomeMessage');
    if (!welcomeContainer) return;
    
    welcomeContainer.innerHTML = '<div class="loading">Chargement...</div>';
    
    const result = await DashboardAPI.getAcheteurStats();
    
    if (result.ok && result.data) {
        welcomeContainer.innerHTML = `
            <div class="welcome-card">
                <h2>${result.data.bienvenue}</h2>
                <p><strong>Email:</strong> ${result.data.email}</p>
                <p><strong>Rôle:</strong> ${result.data.role}</p>
            </div>
        `;
    } else {
        welcomeContainer.innerHTML = '<div class="error">Erreur de chargement</div>';
    }
}

// Charger les infos au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    loadAcheteurStats();
});