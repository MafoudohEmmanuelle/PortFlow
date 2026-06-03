// frontend/js/modules/dashboard/dashboard-acheteur.js
// VERSION TEST - Données mockées en attendant le backend

// Données fictives pour les tests
const MOCK_DOSSIERS = [
    { id: 1, num_commande: 'PO12456', fournisseur: 'Sinoma Logistics', eta: '2024-12-10', docs_manquants: 3 },
    { id: 2, num_commande: 'PO12489', fournisseur: 'DongFang Ltd', eta: '2024-12-15', docs_manquants: 0 },
    { id: 3, num_commande: 'PO12501', fournisseur: 'MSC Cargo', eta: '2024-12-18', docs_manquants: 1 }
];

const MOCK_ALERTES = [
    { id: 1, dossier_ref: 'PO12456', message: 'BESC manquant - délai dans 2 jours' },
    { id: 2, dossier_ref: 'PO12456', message: 'Ordre de transit non émis' },
    { id: 3, dossier_ref: 'PO12501', message: 'B/L reçu en retard' }
];

const MOCK_STATS = {
    totalDossiers: 8,
    totalAlertes: 3,
    totalDocsManquants: 4,
    prochainDelai: '5 jours'
};

// Initialisation du dashboard
async function initDashboardAcheteur() {
    // Afficher les stats
    document.getElementById('myDossiersCount').innerText = MOCK_STATS.totalDossiers;
    document.getElementById('myAlertsCount').innerText = MOCK_STATS.totalAlertes;
    document.getElementById('missingDocsCount').innerText = MOCK_STATS.totalDocsManquants;
    document.getElementById('nextDeadline').innerText = MOCK_STATS.prochainDelai;
    
    // Afficher les dossiers récents
    renderDossiersRecents(MOCK_DOSSIERS);
    
    // Afficher les alertes récentes
    renderAlertesRecentes(MOCK_ALERTES);
    
    // Configuration des boutons
    const newBtn = document.getElementById('newDossierBtn');
    if (newBtn) {
        newBtn.onclick = () => alert('Créer un nouveau dossier (bientôt disponible)');
    }
    
    const searchInput = document.getElementById('searchDossier');
    if (searchInput) {
        searchInput.oninput = (e) => filterDossiers(e.target.value);
    }
    
    console.log('Dashboard Acheteur chargé (mode test)');
}

// Affiche les 3 derniers dossiers dans le tableau
function renderDossiersRecents(dossiers) {
    const tbody = document.getElementById('dossiersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = dossiers.map(d => `
        <tr>
            <td>${d.num_commande}</td>
            <td>${d.fournisseur}</td>
            <td>${d.num_bl || 'BL' + d.id}</td>
            <td>${formatDate(d.eta)}</td>
            <td>
                <span class="${d.docs_manquants > 0 ? 'badge-warning' : 'badge-success'}">
                    ${d.docs_manquants > 0 ? `⚠️ ${d.docs_manquants} manquant(s)` : '✅ Complet'}
                </span>
            </td>
            <td>
                <button class="action-link" onclick="alert('Détail du dossier ${d.num_commande} (bientôt)')">
                    Voir détails
                </button>
            </td>
        </tr>
    `).join('');
}

// Affiche les alertes
function renderAlertesRecentes(alertes) {
    const container = document.getElementById('alertsList');
    if (!container) return;
    
    container.innerHTML = alertes.map(a => `
        <div class="alert-item">
            <i class="fas fa-exclamation-triangle" style="color:#D32F2F;"></i>
            <strong>${a.dossier_ref}</strong> – ${a.message}
        </div>
    `).join('');
}

// Filtrer les dossiers (recherche)
function filterDossiers(searchTerm) {
    if (!searchTerm) {
        renderDossiersRecents(MOCK_DOSSIERS);
        return;
    }
    
    const filtered = MOCK_DOSSIERS.filter(d => 
        d.num_commande.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.fournisseur.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderDossiersRecents(filtered);
}

// Formate une date
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
}

// Lancer au chargement
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboardAcheteur);
} else {
    initDashboardAcheteur();
}