// frontend/js/modules/alertes/alertes-list.js

let currentFilters = {
    est_lue: null
};

let currentAlertes = [];
let statsGlobales = { total: 0, non_lues: 0, lues: 0 };  // Ajout de "lues"
let statsInitialisees = false;

// Charger les statistiques globales (une seule fois)
async function loadGlobalStats() {
    if (statsInitialisees) return;
    
    try {
        const result = await AlertesAPI.getAll(null);
        console.log('Stats globales:', result);
        
        if (result.ok && result.data) {
            const alertes = result.data.alertes || result.data || [];
            statsGlobales.total = alertes.length;
            statsGlobales.non_lues = alertes.filter(a => !a.est_lue).length;
            statsGlobales.lues = statsGlobales.total - statsGlobales.non_lues;
            statsInitialisees = true;
            console.log('Stats globales chargées:', statsGlobales);
        }
    } catch (error) {
        console.error('Erreur chargement stats globales:', error);
    }
}

// Mettre à jour les statistiques en fonction du filtre
function updateStatsForFilter(estLue, alertesFiltrees) {
    const totalEl = document.getElementById('totalAlertes');
    const nonLuesEl = document.getElementById('nonLuesAlertes');
    
    // Non lues : toujours le total global des non lues (indépendant du filtre)
    const nonLuesAffiche = statsGlobales.non_lues;
    
    // Total affiché dépend du filtre :
    let totalAffiche = statsGlobales.total;  // Par défaut : total global
    
    if (estLue === true) {
        // Filtre "Lues" → total = nombre d'alertes lues
        totalAffiche = statsGlobales.lues;
    } else if (estLue === false) {
        // Filtre "Non lues" → total = nombre d'alertes non lues
        totalAffiche = statsGlobales.non_lues;
    }
    // Si estLue === null (Toutes) → total = total global
    
    if (totalEl) totalEl.textContent = totalAffiche;
    if (nonLuesEl) nonLuesEl.textContent = nonLuesAffiche;
    
    console.log('Stats affichées:', { totalAffiche, nonLuesAffiche, filtre: estLue });
}

// Recharger les stats globales après une modification
async function refreshGlobalStats() {
    statsInitialisees = false;
    statsGlobales = { total: 0, non_lues: 0, lues: 0 };
    await loadGlobalStats();
}

// Charger les alertes
async function loadAlertes() {
    const container = document.getElementById('alertesContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement des alertes...</div>';
    
    // 1. Charger les stats globales (si pas déjà fait)
    await loadGlobalStats();
    
    // 2. Récupérer la valeur du filtre
    const estLueSelect = document.getElementById('filterEstLue');
    const estLueValue = estLueSelect?.value;
    let estLue = null;
    
    if (estLueValue === 'true') estLue = true;
    else if (estLueValue === 'false') estLue = false;
    
    console.log('Filtre est_lue:', estLue);
    
    // 3. Charger les alertes avec le filtre
    const result = await AlertesAPI.getAll(estLue);
    console.log('Résultat alertes:', result);
    
    if (result.ok && result.data) {
        const alertes = result.data.alertes || result.data || [];
        currentAlertes = alertes;
        displayAlertes(alertes);
        
        // 4. Mettre à jour les stats en fonction du filtre
        updateStatsForFilter(estLue, alertes);
    } else {
        container.innerHTML = `
            <div class="empty-alertes">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Erreur de chargement</h3>
                <p>${result.data?.detail || 'Impossible de charger les alertes'}</p>
            </div>
        `;
    }
}

// Afficher les alertes
function displayAlertes(alertes) {
    const container = document.getElementById('alertesContainer');
    
    if (!alertes || alertes.length === 0) {
        container.innerHTML = `
            <div class="empty-alertes">
                <i class="fas fa-check-circle"></i>
                <h3>Aucune alerte</h3>
                <p>Toutes vos alertes sont traitées ou vous n'avez pas d'alerte</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = alertes.map(alerte => {
        const niveau = alerte.niveau || 'info';
        const estLue = alerte.est_lue || false;
        
        return `
            <div class="alerte-card ${niveau} ${estLue ? 'lue' : ''}" data-id="${alerte.id}">
                <div class="alerte-content">
                    <span class="alerte-badge ${niveau}">${getNiveauLabel(niveau)}</span>
                    <div class="alerte-message">
                        <div class="type">${getTypeLabel(alerte.type_alerte)}</div>
                        <div class="detail">${escapeHtml(alerte.message)}</div>
                        ${alerte.dossier_id ? `
                            <a href="dossiers/detail.html?id=${alerte.dossier_id}" 
                               class="dossier-link" 
                               onclick="marquerLueAuClic(${alerte.id}, event)">
                                <i class="fas fa-folder-open"></i> Voir le dossier
                            </a>
                        ` : ''}
                    </div>
                    <div class="alerte-date">${formatDate(alerte.date_alerte)}</div>
                </div>
                <div class="alerte-actions">
                    ${!estLue ? `
                        <span class="status-badge status-missing">🔴 Non lue</span>
                    ` : `
                        <span class="status-badge status-received">✅ Lue</span>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

async function marquerLueAuClic(alerteId, event) {
    // Empêcher la navigation immédiate
    event.preventDefault();
    
    // Récupérer l'URL avant de faire quoi que ce soit
    const link = event.currentTarget;
    const url = link.getAttribute('href');
    
    try {
        // Marquer l'alerte comme lue
        const result = await AlertesAPI.marquerLue(alerteId);
        
        if (result.ok) {
            console.log(`✅ Alerte ${alerteId} marquée comme lue`);
            // Rafraîchir les stats globales
            await refreshGlobalStats();
            // Mettre à jour le badge de notification
            await updateBadge();
        } else {
            console.warn(`⚠️ Erreur lors du marquage:`, result.data);
        }
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
    
    // Rediriger vers le dossier (même si le marquage a échoué)
    window.location.href = url;
}

// Marquer toutes les alertes comme lues
async function marquerToutesLues() {
    if (!confirm('Marquer toutes les alertes comme lues ?')) return;
    
    const result = await AlertesAPI.marquerToutesLues();
    
    if (result.ok) {
        showNotification('Toutes les alertes ont été marquées comme lues', 'success');
        // Rafraîchir les stats globales
        await refreshGlobalStats();
        await loadAlertes();
        await updateBadge();
    } else {
        showNotification('Erreur: ' + (result.data?.detail || 'Opération impossible'), 'error');
    }
}

// Mettre à jour le badge de notification
async function updateBadge() {
    // Utiliser les stats globales plutôt qu'un appel API
    const count = statsGlobales.non_lues || 0;
    const badge = document.querySelector('.badge-count');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('empty');
        } else {
            badge.classList.add('empty');
        }
    }
}

// Appliquer les filtres
function applyFilters() {
    console.log('Application des filtres');
    loadAlertes();
}

// Réinitialiser les filtres
function resetFilters() {
    document.getElementById('filterEstLue').value = '';
    currentFilters = { est_lue: null };
    loadAlertes();
}

// Fonctions utilitaires
function getNiveauLabel(niveau) {
    const labels = {
        'critique': '🚨 Critique',
        'warning': '⚠️ Attention',
        'info': 'ℹ️ Information'
    };
    return labels[niveau] || niveau;
}

function getTypeLabel(type) {
    const labels = {
        'tracking_inactif': '📡 Tracking inactif',
        'approche_arrivee': '🚢 Approche arrivée',
        'franchise_expiration': '⏰ Franchise expiration',
        'dossier_incomplet': '📄 Dossier incomplet'
    };
    return labels[type] || type;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type) {
    const notif = document.createElement('div');
    notif.style.cssText = `position:fixed;bottom:20px;right:20px;background:${type === 'success' ? '#10b981' : '#ef4444'};color:white;padding:12px 20px;border-radius:10px;z-index:10000;`;
    notif.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.isAuthenticated()) {
        window.location.href = '../login.html';
        return;
    }
    
    loadAlertes();
    updateBadge();
    
    // Boutons
    document.getElementById('btnMarquerToutes')?.addEventListener('click', marquerToutesLues);
    document.getElementById('btnActualiser')?.addEventListener('click', loadAlertes);
    document.getElementById('btnFilter')?.addEventListener('click', applyFilters);
    document.getElementById('btnReset')?.addEventListener('click', resetFilters);
});

// Exporter les fonctions pour les autres modules
window.marquerLue = marquerLue;
window.updateBadge = updateBadge;