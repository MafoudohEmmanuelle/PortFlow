// frontend/js/modules/dashboard/dashboard-admin.js

let evolutionChart = null;
let statutChart = null;

// ========== REDIRECTIONS ==========
function goToUsersList() {
    window.location.href = 'users/list.html';
}

function goToAlertesList() {
    window.location.href = 'alertes/list.html';
}

function goToUserDetail(userId) {
    window.location.href = `users/detail.html?id=${userId}`;
}

// ========== CHARGEMENT DES DONNÉES ==========
async function loadAdminStats() {
    console.log('loadAdminStats - Début');
    
    try {
        const result = await apiClient.get('/dashboard/admin/stats');
        console.log('Stats result:', result);
        
        if (result.ok && result.data) {
            const data = result.data;
            const kpis = data.kpis;
            
            // KPIs
            document.getElementById('dossiersActifs').textContent = kpis?.dossiers_actifs || 0;
            document.getElementById('tauxSurestaries').textContent = `${kpis?.taux_surestaries || 0}%`;
            document.getElementById('totalUtilisateurs').textContent = kpis?.total_users || 0;
            
            // Alertes critiques
            const alertesCritiques = data.dernieres_alertes?.filter(a => a.critique).length || 0;
            const alertesCritiquesEl = document.getElementById('alertesCritiques');
            if (alertesCritiquesEl) {
                alertesCritiquesEl.textContent = alertesCritiques;
                if (alertesCritiques > 0) alertesCritiquesEl.classList.add('stat-critical');
            }
            
            // Graphiques
            if (data.evolution_surestaries?.length > 0) {
                displayEvolutionChart(data.evolution_surestaries);
            }
            
            if (data.repartition_statuts?.length > 0) {
                displayStatutChart(data.repartition_statuts);
            }
            
            // Alertes
            if (data.dernieres_alertes?.length > 0) {
                displayRecentAlerts(data.dernieres_alertes);
            }
        }
    } catch (error) {
        console.error('Erreur loadAdminStats:', error);
    }
}

// Graphique d'évolution
function displayEvolutionChart(evolutionData) {
    const canvas = document.getElementById('evolutionChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const labels = evolutionData.map(item => item.mois);
    const values = evolutionData.map(item => item.nombre);
    
    if (evolutionChart) evolutionChart.destroy();
    
    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nombre de surestaries',
                data: values,
                borderColor: '#D32F2F',
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                tension: 0.3,
                fill: true,
                pointBackgroundColor: '#D32F2F',
                pointBorderColor: '#fff',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }
            }
        }
    });
}

// Graphique de répartition
function displayStatutChart(statutsData) {
    const canvas = document.getElementById('statutChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const labels = statutsData.map(item => formatStatutLabel(item.statut));
    const values = statutsData.map(item => item.count);
    const colors = ['#E65100', '#1565C0', '#2E7D32', '#D32F2F', '#3949AB'];
    
    if (statutChart) statutChart.destroy();
    
    statutChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'right' },
                tooltip: { 
                    callbacks: { 
                        label: (ctx) => {
                            const total = values.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                            return `${ctx.label}: ${ctx.raw} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Charger les derniers utilisateurs (endpoint correct: /users)
async function loadRecentUsers() {
    const tbody = document.getElementById('recentUsersBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement...<\/td></tr>';
    
    try {
        // Utiliser l'endpoint /users (qui existe)
        const result = await apiClient.get('/users?limit=5');
        console.log('Utilisateurs récents:', result);
        
        if (result.ok && result.data && result.data.length > 0) {
            tbody.innerHTML = result.data.map(user => `
                <tr>
                    <td><strong>${escapeHtml(user.nom || user.username || '-')}</strong></td>
                    <td>${escapeHtml(user.email)}</td>
                    <td><span class="badge-role ${user.role === 'admin' ? 'badge-admin' : 'badge-user'}">${user.role === 'admin' ? 'Admin' : 'Acheteur'}</span></td>
                    <td>${formatDate(user.date_creation)}</td>
                    <td>${user.actif ? '<span class="badge-success">Actif</span>' : '<span class="badge-warning">Inactif</span>'}</td>
                    <td><a href="#" onclick="goToUserDetail(${user.id})" class="action-link"><i class="fas fa-eye"></i> Voir</a></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="empty">Aucun utilisateur trouvé</td></tr>';
        }
    } catch (error) {
        console.error('Erreur loadRecentUsers:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="error">Erreur de chargement</td></tr>';
    }
}

// Afficher les alertes
function displayRecentAlerts(alertes) {
    const tbody = document.getElementById('recentAlertsBody');
    if (!tbody) return;
    
    const alertesList = alertes.slice(0, 5);
    
    if (alertesList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty">Aucune alerte</td></tr>';
        return;
    }
    
    tbody.innerHTML = alertesList.map(alert => `
        <tr class="${alert.critique ? 'critical-alert' : ''}">
            <td><strong>${escapeHtml(alert.dossier_numero_bl)}</strong></td>
            <td>${escapeHtml(alert.message)}</td>
            <td>${alert.critique ? '<span class="badge-critical">⚠️ Critique</span>' : '<span class="badge-neutral">Info</span>'}</td>
            <td class="alert-date">${formatDate(alert.date)}</td>
            <td><a href="dossiers/detail.html?id=${alert.dossier_id}" class="action-link">Voir</a></td>
        </tr>
    `).join('');
}

function formatStatutLabel(statut) {
    const labels = {
        'en_attente': 'En attente',
        'depart': 'Départ',
        'arrivee': 'Arrivée',
        'arrivee_surestaries': 'Arrivée S',
        'sortie': 'Sortie',
        'sortie_surestaries': 'Sortie S'
    };
    return labels[statut] || statut;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialisation
async function initDashboard() {
    console.log('Initialisation du dashboard admin');
    await loadAdminStats();
    await loadRecentUsers();
    
    const voirUtilisateursBtn = document.getElementById('voirTousUtilisateurs');
    if (voirUtilisateursBtn) {
        voirUtilisateursBtn.addEventListener('click', goToUsersList);
    }
    
    const voirAlertesBtn = document.getElementById('voirToutesAlertes');
    if (voirAlertesBtn) {
        voirAlertesBtn.addEventListener('click', goToAlertesList);
    }
}

window.goToUserDetail = goToUserDetail;

// Attendre les composants
document.addEventListener('DOMContentLoaded', () => {
    const checkLoader = setInterval(() => {
        if (document.getElementById('sidebar-container') && document.getElementById('top-header-container')) {
            clearInterval(checkLoader);
            setTimeout(initDashboard, 300);
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkLoader);
        initDashboard();
    }, 3000);
});