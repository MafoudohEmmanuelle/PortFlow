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
// frontend/js/modules/dashboard/dashboard-admin.js

// ========== CHARGEMENT DES ALERTES ==========

async function loadRecentAlerts() {
    const container = document.getElementById('recentAlertsBody');
    if (!container) return;
    
     // Vérifier que AlertesAPI est défini
    if (typeof AlertesAPI === 'undefined') {
        console.warn('AlertesAPI non chargé, réessai dans 500ms');
        setTimeout(() => loadRecentAlerts(), 500);
        return;
    }

    try {
        const result = await AlertesAPI.getAll(false, 0, 5); // 5 dernières alertes non lues
        
        if (result.ok && result.data) {
            const alertes = result.data.alertes || [];
            displayRecentAlerts(alertes, container);
        } else {
            container.innerHTML = '<tr><td colspan="5" class="empty">Aucune alerte critique</td></tr>';
        }
    } catch (error) {
        console.error('Erreur chargement alertes:', error);
        container.innerHTML = '<tr><td colspan="5" class="error">Erreur de chargement</td></tr>';
    }
}

function displayRecentAlerts(alertes, container) {
    if (!alertes || alertes.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="empty"><i class="fas fa-check-circle"></i> Aucune alerte critique</td></tr>';
        return;
    }
    
    container.innerHTML = alertes.map(alerte => {
        const niveau = alerte.niveau || 'info';
        const niveauBadge = niveau === 'critique' ? 'badge-critical' : 
                           niveau === 'warning' ? 'badge-warning' : 'badge-info';
        
        return `
            <tr>
                <td>
                    <a href="dossiers/detail.html?id=${alerte.dossier_id}" class="link">
                        Dossier #${alerte.dossier_id}
                    </a>
                </td>
                <td>${escapeHtml(alerte.message)}</td>
                <td><span class="badge ${niveauBadge}">${niveau.toUpperCase()}</span></td>
                <td>${formatDate(alerte.date_alerte)}</td>
                <td>
                    <a href="dossiers/detail.html?id=${alerte.dossier_id}" class="btn-sm">
                        <i class="fas fa-eye"></i>
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

// Mettre à jour les statistiques des alertes dans les KPIs
// async function updateAlertsStats() {
//     try {
//         const stats = await AlertesAPI.getStats();
//         if (stats.ok && stats.data) {
//             const count = stats.data.non_lues || 0;
//             const alertesCritiques = document.getElementById('alertesCritiques');
//             if (alertesCritiques) {
//                 alertesCritiques.textContent = count;
//                 if (count > 0) {
//                     alertesCritiques.classList.add('stat-critical');
//                 }
//             }
//         }
//     } catch (error) {
//         console.error('Erreur mise à jour stats alertes:', error);
//     }
// }

// Mettre à jour les statistiques des alertes dans les KPIs
async function updateAlertsStats() {
    try {
        // Utiliser getAll() pour compter les alertes réelles (comme dans alertes.html)
        const result = await AlertesAPI.getAll(false, 0, 100);
        console.log('Alertes non lues (admin):', result);
        
        if (result.ok && result.data) {
            // Récupérer le nombre d'alertes non lues
            const alertes = result.data.alertes || [];
            const count = alertes.length;
            
            // Ou utiliser le total retourné par l'API
            // const count = result.data.non_lues || 0;
            
            const alertesCritiques = document.getElementById('alertesCritiques');
            if (alertesCritiques) {
                alertesCritiques.textContent = count;
                if (count > 0) {
                    alertesCritiques.classList.add('stat-critical');
                } else {
                    alertesCritiques.classList.remove('stat-critical');
                }
            }
        }
    } catch (error) {
        console.error('Erreur mise à jour stats alertes:', error);
    }
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
// async function initDashboard() {
//     console.log('Initialisation du dashboard admin');
//     await loadAdminStats();
//     await loadRecentUsers();
    
//     const voirUtilisateursBtn = document.getElementById('voirTousUtilisateurs');
//     if (voirUtilisateursBtn) {
//         voirUtilisateursBtn.addEventListener('click', goToUsersList);
//     }
    
//     const voirAlertesBtn = document.getElementById('voirToutesAlertes');
//     if (voirAlertesBtn) {
//         voirAlertesBtn.addEventListener('click', goToAlertesList);
//     }
// }

// Initialisation
async function initDashboard() {
    console.log('Initialisation du dashboard admin');
    await loadAdminStats();
    await loadRecentUsers();
    await loadRecentAlerts();        // ← AJOUTER
    await updateAlertsStats();       // ← AJOUTER
    
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