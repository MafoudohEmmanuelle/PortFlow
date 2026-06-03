// frontend/js/modules/dashboard/dashboard-admin.js
// VERSION TEST - Données mockées en attendant le backend

// Données fictives pour les tests
const MOCK_STATS = {
    totalUsers: 8,
    totalDossiers: 24,
    alertesCritiques: 3,
    tauxSurestaries: 4.2
};

// Initialisation du dashboard
async function initDashboardAdmin() {
    // Afficher les stats mockées
    document.getElementById('totalUsers').innerText = MOCK_STATS.totalUsers;
    document.getElementById('totalDossiers').innerText = MOCK_STATS.totalDossiers;
    document.getElementById('alertesCritiques').innerText = MOCK_STATS.alertesCritiques;
    document.getElementById('tauxSurestaries').innerText = MOCK_STATS.tauxSurestaries + '%';
    
    // Redirections simples (quand on clique sur "Voir tout")
    const voirUsersBtn = document.getElementById('voirUtilisateurs');
    if (voirUsersBtn) {
        voirUsersBtn.onclick = () => alert('Page gestion utilisateurs (bientôt disponible)');
    }
    
    const voirDossiersBtn = document.getElementById('voirDossiers');
    if (voirDossiersBtn) {
        voirDossiersBtn.onclick = () => alert('Page liste dossiers (bientôt disponible)');
    }
    
    console.log('Dashboard Admin chargé (mode test)');
}

// Lancer au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboardAdmin);
} else {
    initDashboardAdmin();
}