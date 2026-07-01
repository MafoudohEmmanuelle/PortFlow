// frontend/js/modules/rapports.js
// Logique pour la gestion des rapports

// ========== VARIABLES GLOBALES ==========

let allDossiers = [];
let currentFilters = {
    search: '',
    statut: ''
};
let searchTimeout = null;
let currentRapportId = null;
let currentDossierId = null;
let currentType = null;

// ========== INDEX - LISTE DES DOSSIERS CLÔTURÉS ==========

/**
 * Charge la liste des dossiers clôturés
 */
async function loadDossiersClotures() {
    const tbody = document.getElementById('dossiersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="7" class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement...<\/td></tr>';
    
    try {
        // Récupérer tous les dossiers
        const result = await apiClient.get('/dossiers?limit=1000');
        console.log('Dossiers chargés:', result);
        
        if (result.ok && result.data) {
            // Filtrer les dossiers clôturés (sortie ou sortie_surestaries)
            allDossiers = result.data.filter(d => 
                d.statut === 'sortie' || d.statut === 'sortie_surestaries'
            );
            applyFiltersAndDisplay();
            
            // Mettre à jour le compteur
            const countEl = document.getElementById('dossiersCount');
            if (countEl) countEl.textContent = `${allDossiers.length} dossier(s)`;
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="error">Erreur de chargement<\/td></tr>`;
        }
    } catch (error) {
        console.error('Erreur loadDossiersClotures:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="error">Erreur de connexion<\/td></tr>';
    }
}

/**
 * Applique les filtres et affiche les dossiers
 */
function applyFiltersAndDisplay() {
    let filtered = [...allDossiers];
    
    // Filtre par recherche (N° BL ou fournisseur)
    if (currentFilters.search) {
        const searchLower = currentFilters.search.toLowerCase();
        filtered = filtered.filter(d => 
            (d.numero_bl && d.numero_bl.toLowerCase().includes(searchLower)) ||
            (d.fournisseur && d.fournisseur.toLowerCase().includes(searchLower))
        );
    }
    
    // Filtre par statut
    if (currentFilters.statut) {
        filtered = filtered.filter(d => d.statut === currentFilters.statut);
    }
    
    displayDossiers(filtered);
}

/**
 * Affiche les dossiers dans le tableau
 */
function displayDossiers(dossiers) {
    const tbody = document.getElementById('dossiersTableBody');
    
    if (!dossiers || dossiers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty">Aucun dossier clôturé<\/td></tr>';
        return;
    }
    
    tbody.innerHTML = dossiers.map(dossier => {
        // Badge de statut
        const statutBadge = dossier.statut === 'sortie_surestaries' 
            ? '<span class="badge-surestaries">Sorti - Surestaries</span>'
            : '<span class="badge-sortie">Sorti</span>';
        
        // Vérifier si un rapport de clôture existe déjà
        const hasCloture = dossier.rapports && dossier.rapports.some(r => r.type_rapport === 'cloture');
        const hasTracking = dossier.rapports && dossier.rapports.some(r => r.type_rapport === 'tracking');
        
        return `
            <tr>
                <td><strong>${escapeHtml(dossier.numero_bl)}</strong></td>
                <td>${escapeHtml(dossier.fournisseur)}</td>
                <td>${escapeHtml(dossier.armateur_nom) || '-'}</td>
                <td>${escapeHtml(dossier.utilisateur_nom) || '-'}</td>
                <td>${formatDate(dossier.date_sortie_port)}</td>
                <td>${statutBadge}</td>
                <td class="actions">
                    <button class="btn-rapport" onclick="voirRapport(${dossier.id}, 'cloture')">
                        <i class="fas fa-file-alt"></i> Rapport
                    </button>
                    <button class="btn-rapport btn-rapport-tracking" onclick="voirRapport(${dossier.id}, 'tracking')">
                        <i class="fas fa-ship"></i> Tracking
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// ========== FILTRES ==========

/**
 * Gère la recherche avec debounce
 */
function onSearchInput() {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentFilters.search = document.getElementById('searchInput')?.value.trim() || '';
        applyFiltersAndDisplay();
    }, 300);
}

/**
 * Gère le changement de filtre statut
 */
function onStatutChange() {
    currentFilters.statut = document.getElementById('filterStatut')?.value || '';
    applyFiltersAndDisplay();
}

/**
 * Réinitialise tous les filtres
 */
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterStatut').value = '';
    currentFilters = { search: '', statut: '' };
    applyFiltersAndDisplay();
}

// ========== NAVIGATION ==========

/**
 * Redirige vers la page de détail du rapport
 */
function voirRapport(dossierId, type) {
    window.location.href = `detail.html?id=${dossierId}&type=${type}`;
}

// ========== DETAIL - AFFICHAGE DU RAPPORT ==========

/**
 * Récupère les paramètres de l'URL
 */
function getParamsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        id: urlParams.get('id'),
        type: urlParams.get('type') || 'cloture'
    };
}

/**
 * Charge et affiche le rapport
 */
async function loadRapport() {
    const params = getParamsFromUrl();
    currentDossierId = params.id;
    currentType = params.type;
    
    if (!currentDossierId) {
        window.location.href = 'index.html';
        return;
    }
    
    const spinner = document.getElementById('loadingSpinner');
    const content = document.getElementById('rapportContent');
    
    spinner.style.display = 'block';
    content.style.display = 'none';
    
    try {
        // Générer le rapport (ou récupérer l'existant)
        const result = await RapportsAPI.generer(parseInt(currentDossierId), currentType);
        console.log('Rapport généré:', result);
        
        if (result.ok && result.data) {
            currentRapportId = result.data.rapport_id;
            displayRapport(result.data.contenu);
            spinner.style.display = 'none';
            content.style.display = 'block';
            
            // Initialiser les boutons d'export
            initExportButtons();
        } else {
            showError('Erreur lors de la génération du rapport: ' + (result.data?.detail || ''));
        }
    } catch (error) {
        console.error('Erreur loadRapport:', error);
        showError('Erreur de connexion au serveur');
    }
}

/**
 * Affiche le rapport dans la page
 */
function displayRapport(contenu) {
    if (!contenu) return;
    
    const dossier = contenu.dossier || {};
    const stats = contenu.statistiques || {};
    const documents = contenu.documents || [];
    const analyse = contenu.analyse || {};
    const evenements = contenu.evenements || [];
    
    // ===== EN-TÊTE =====
    document.getElementById('rapportNumero').textContent = `RPT-${String(currentDossierId).padStart(4, '0')}`;
    document.getElementById('rapportDate').textContent = formatDateTime(stats.date_generation || new Date().toISOString());
    
    const statutBadge = dossier.statut === 'sortie_surestaries' 
        ? '<span class="badge-surestaries">Sorti - Surestaries</span>'
        : '<span class="badge-sortie">Sorti</span>';
    document.getElementById('rapportStatut').innerHTML = statutBadge;
    
    // ===== INFORMATIONS GÉNÉRALES =====
    document.getElementById('rapportNumBl').textContent = dossier.numero_bl || '-';
    document.getElementById('rapportFournisseur').textContent = dossier.fournisseur || '-';
    const armateurNom = dossier.armateur_nom || dossier.armateur || 'Non renseigné';
    document.getElementById('rapportArmateur').textContent = armateurNom;
    
    const acheteurNom = dossier.utilisateur_nom || dossier.acheteur || 'Non renseigné';
    document.getElementById('rapportAcheteur').textContent = acheteurNom;
    document.getElementById('rapportEta').textContent = formatDate(dossier.eta_initial);
    document.getElementById('rapportArrivee').textContent = formatDate(dossier.date_arrivee);
    document.getElementById('rapportSortie').textContent = formatDate(dossier.date_sortie_port);
    document.getElementById('rapportDelai').textContent = `${dossier.delai_franchise_jours || 0} jours`;
    document.getElementById('rapportJoursPort').textContent = stats.jours_au_port !== undefined ? `${stats.jours_au_port} jours` : '-';
    
    // ===== DOCUMENTS =====
    document.getElementById('docTotal').textContent = stats.total_documents || 0;
    document.getElementById('docObtenus').textContent = stats.documents_obtenus || 0;
    document.getElementById('docManquants').textContent = stats.documents_manquants || 0;
    
    const docContainer = document.getElementById('rapportDocuments');
    if (documents.length > 0) {
        docContainer.innerHTML = documents.map(doc => `
            <div class="doc-item ${doc.obtenu ? 'received' : ''}">
                <span class="doc-name">${escapeHtml(doc.document_nom || doc.nom || 'Document')}</span>
                <span class="doc-status ${doc.obtenu ? 'received' : 'missing'}">
                    ${doc.obtenu ? 'Reçu' : 'En attente'}
                </span>
                <span class="doc-date">${doc.date_reception ? formatDate(doc.date_reception) : '-'}</span>
            </div>
        `).join('');
    } else {
        docContainer.innerHTML = '<div class="empty">Aucun document associé</div>';
    }
    
    // ===== ANALYSE SURESTARIE =====
    const analyseSection = document.getElementById('analyseSection');
    if (analyse && Object.keys(analyse).length > 0) {
        analyseSection.style.display = 'block';
        document.getElementById('analyseCause').textContent = analyse.cause || 'Non spécifiée';
        document.getElementById('analyseJours').textContent = analyse.jours_surestarie !== undefined ? `${analyse.jours_surestarie} jours` : '-';
        document.getElementById('analyseDetail').textContent = analyse.detail || '-';
    } else {
        analyseSection.style.display = 'none';
    }
    
    // ===== TRACKING =====
    const trackingSection = document.getElementById('trackingSection');
    if (currentType === 'tracking' || evenements.length > 0) {
        trackingSection.style.display = 'block';
        const trackingContainer = document.getElementById('rapportTracking');
        
        if (evenements.length > 0) {
            trackingContainer.innerHTML = evenements.map(evt => `
                <div class="tracking-item">
                    <span class="tracking-date">${formatDateTime(evt.date)}</span>
                    <span class="tracking-position">
                        <i class="fas fa-map-pin"></i> ${escapeHtml(evt.message)}
                    </span>
                </div>
            `).join('');
        } else {
            trackingContainer.innerHTML = '<div class="empty">Aucun événement de tracking</div>';
        }
    } else {
        trackingSection.style.display = 'none';
    }
    
    // ===== INITIALISER LES BOUTONS D'EXPORT =====
    initExportButtons();
}

// ========== EXPORT ==========

/**
 * Initialise les boutons d'export
 */
function initExportButtons() {
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    
    if (exportPdfBtn) {
        exportPdfBtn.onclick = () => exportRapport('pdf');
    }
    if (exportExcelBtn) {
        exportExcelBtn.onclick = () => exportRapport('excel');
    }
}

/**
 * Exporte le rapport au format spécifié
 */
async function exportRapport(format) {
    if (!currentRapportId) {
        showNotification('Aucun rapport à exporter', 'error');
        return;
    }
    
    try {
        // Utiliser la méthode download de RapportsAPI
        const result = await RapportsAPI.download(currentRapportId, format);
        
        if (result.ok) {
            showNotification(`Export ${format.toUpperCase()} en cours...`, 'success');
        } else {
            showNotification('Erreur lors de l\'export: ' + (result.error || ''), 'error');
        }
    } catch (error) {
        console.error('Erreur exportRapport:', error);
        showNotification('Erreur de connexion', 'error');
    }
}

// ========== UTILITAIRES ==========

/**
 * Formate une date
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

/**
 * Formate une date et heure
 */
function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
}

/**
 * Échappe les caractères HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Affiche une notification
 */
function showNotification(message, type) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#2E7D32' : '#D32F2F'};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        z-index: 10000;
        font-size: 0.85rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        max-width: 400px;
    `;
    notif.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${escapeHtml(message)}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
}

/**
 * Affiche une erreur dans la zone de chargement
 */
function showError(message) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                ${escapeHtml(message)}
            </div>
        `;
    }
}

// ========== INITIALISATION ==========

/**
 * Initialise la page en fonction de son contenu
 */
function initRapports() {
    console.log('Initialisation des rapports');
    
    // === Page index (liste des dossiers clôturés) ===
    if (document.getElementById('dossiersTableBody')) {
        loadDossiersClotures();
        
        // Événements des filtres
        const searchInput = document.getElementById('searchInput');
        const statutFilter = document.getElementById('filterStatut');
        const resetBtn = document.getElementById('btnReset');
        
        if (searchInput) searchInput.addEventListener('input', onSearchInput);
        if (statutFilter) statutFilter.addEventListener('change', onStatutChange);
        if (resetBtn) resetBtn.addEventListener('click', resetFilters);
    }
    
    // === Page detail (affichage du rapport) ===
    if (document.getElementById('rapportContent')) {
        loadRapport();
    }
}

// ========== EXPORT DES FONCTIONS GLOBALES ==========

// Rendre les fonctions disponibles globalement
window.voirRapport = voirRapport;
window.exportRapport = exportRapport;
window.loadRapport = loadRapport;

// ========== ATTENTE DES COMPOSANTS ==========

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - rapports.js');
    
    const checkLoader = setInterval(() => {
        if (document.getElementById('sidebar-container') && document.getElementById('top-header-container')) {
            clearInterval(checkLoader);
            console.log('Composants chargés, initialisation des rapports');
            setTimeout(initRapports, 200);
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkLoader);
        initRapports();
    }, 3000);
});

console.log('rapports.js chargé');