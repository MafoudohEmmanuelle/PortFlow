// frontend/js/modules/dossiers/dossiers-list.js
// Version unifiée pour acheteur et admin (affichage dynamique selon le rôle)

let allDossiers = [];
let allUsers = [];
let currentFilters = {
    statut: '',
    recherche: '',
    armateur_id: '',
    acheteur_id: ''
};
let searchTimeout = null;
let isAdmin = false;

// ========== CHARGEMENT DES DONNÉES ==========

async function loadAllDossiers() {
    const tbody = document.getElementById('dossiersTableBody');
    if (!tbody) return;
    
    // Déterminer le nombre de colonnes en fonction du rôle
    const colspan = isAdmin ? 9 : 8;
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="loading"><i class="fas fa-spinner fa-spin"></i> Chargement...<\/td></tr>`;
    
    try {
        const result = await DossiersAPI.getAll({ skip: 0, limit: 1000 });
        console.log('Dossiers chargés:', result);
        
        if (result.ok && result.data) {
            allDossiers = result.data;
            
            // Charger les utilisateurs si l'admin est connecté
            if (isAdmin) {
                await loadUsers();
            }
            
            applyFiltersAndDisplay();
        } else {
            tbody.innerHTML = `</td><td colspan="${colspan}" class="empty-message">
                <i class="fas fa-exclamation-circle"></i>
                Erreur: ${result.data?.detail || 'Problème de connexion'}
            <\/td></table>`;
        }
    } catch (error) {
        console.error('Erreur loadAllDossiers:', error);
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-message"><i class="fas fa-exclamation-circle"></i> Erreur de connexion au serveur<\/td></tr>`;
    }
}

async function loadUsers() {
    try {
        const result = await apiClient.get('/users?limit=100');
        
        if (result.ok && result.data) {
            allUsers = result.data;
            populateAcheteurFilter();
        }
    } catch (error) {
        console.error('Erreur loadUsers:', error);
    }
}

function populateAcheteurFilter() {
    const select = document.getElementById('filterAcheteur');
    if (!select) return;
    
    select.innerHTML = '<option value="">Tous les acheteurs</option>';
    const acheteurs = allUsers.filter(user => user.role === 'acheteur');
    acheteurs.forEach(user => {
        select.innerHTML += `<option value="${user.id}">${escapeHtml(user.nom)}</option>`;
    });
}

// ========== FILTRAGE ==========

function applyFiltersAndDisplay() {
    let filteredDossiers = [...allDossiers];
    
    // Filtre par statut
    if (currentFilters.statut) {
        filteredDossiers = filteredDossiers.filter(d => d.statut === currentFilters.statut);
    }
    
    // Filtre par armateur
    if (currentFilters.armateur_id) {
        filteredDossiers = filteredDossiers.filter(d => d.armateur_id === parseInt(currentFilters.armateur_id));
    }
    
    // Filtre par acheteur (admin uniquement)
    if (isAdmin && currentFilters.acheteur_id) {
        filteredDossiers = filteredDossiers.filter(d => d.utilisateur_id === parseInt(currentFilters.acheteur_id));
    }
    
    // Filtre par recherche
    if (currentFilters.recherche) {
        const searchLower = currentFilters.recherche.toLowerCase();
        filteredDossiers = filteredDossiers.filter(d => 
            (d.numero_bl && d.numero_bl.toLowerCase().includes(searchLower)) ||
            (d.fournisseur && d.fournisseur.toLowerCase().includes(searchLower)) ||
            (isAdmin && getAcheteurNom(d.utilisateur_id).toLowerCase().includes(searchLower))
        );
    }
    
    displayDossiers(filteredDossiers);
}

function getAcheteurNom(utilisateurId) {
    const user = allUsers.find(u => u.id === utilisateurId);
    return user ? user.nom : 'Inconnu';
}

// ========== AFFICHAGE ==========

function displayDossiers(dossiers) {
    const tbody = document.getElementById('dossiersTableBody');
    if (!dossiers || dossiers.length === 0) {
        const colspan = isAdmin ? 9 : 8;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-message"><i class="fas fa-folder-open"></i> Aucun dossier trouvé<\/td></tr>`;
        return;
    }
    if (isAdmin) {
        // Affichage pour l'admin - utiliser directement dossier.utilisateur_nom
        tbody.innerHTML = dossiers.map(dossier => `
            <tr>
                <td><strong>${dossier.id || '-'}</strong></td>
                <td>${dossier.numero_bl || '-'}</td>
                <td>${escapeHtml(dossier.fournisseur) || '-'}</td>
                <td>${dossier.armateur_nom || '-'}</td>
                <td class="acheteur-cell">
                    <span class="badge-acheteur">${escapeHtml(dossier.utilisateur_nom) || 'Inconnu'}</span>
                <\/td>
                <td>${formatDate(dossier.eta_initial)}</td>
                <td>${getStatutBadge(dossier.statut)}</td>
                <td>${getDocumentsBadge(dossier)}</td>
                <td class="actions">
                    <a class="action-link" href="#" onclick="viewDossier(${dossier.id})" title="Voir">
                        <i class="fas fa-eye"></i>
                    </a>
                    <a class="action-link" href="#" onclick="editDossier(${dossier.id})" title="Modifier">
                        <i class="fas fa-edit"></i>
                    </a>
                    <a class="action-link action-delete" href="#" onclick="deleteDossier(${dossier.id})" title="Supprimer">
                        <i class="fas fa-trash-alt"></i>
                    </a>
                <\/td>
            </tr>
        `).join('');
    } else {
        // Affichage pour l'acheteur (8 colonnes sans acheteur)
        tbody.innerHTML = dossiers.map(dossier => `
            <tr>
                <td><strong>${dossier.id || '-'}</strong></td>
                <td>${dossier.numero_bl || '-'}</td>
                <td>${escapeHtml(dossier.fournisseur) || '-'}</td>
                <td>${dossier.armateur_nom || '-'}</td>
                <td>${formatDate(dossier.eta_initial)}</td>
                <td>${getStatutBadge(dossier.statut)}</td>
                <td>${getDocumentsBadge(dossier)}</td>
                <td class="actions">
                    <a class="action-link" href="#" onclick="viewDossier(${dossier.id})" title="Voir les détails">
                        <i class="fas fa-eye"></i> Détails
                    </a>
                </td>
            </tr>
        `).join('');
    }
}
function getAcheteurBadge(utilisateurId) {
    const user = allUsers.find(u => u.id === utilisateurId);
    if (!user) return '<span class="badge-neutral">Inconnu</span>';
    return `<span class="badge-acheteur">${escapeHtml(user.nom)}</span>`;
}

// Badge pour le statut des documents
function getDocumentsBadge(dossier) {
    const totalDocs = dossier.documents?.length || 0;
    const manquants = dossier.documents_manquants_count || 0;
    const obtenus = totalDocs - manquants;
    
    if (totalDocs === 0) {
        return '<span class="doc-badge doc-partiel"><i class="fas fa-question-circle"></i> Aucun document</span>';
    }
    
    if (manquants === 0) {
        return `<span class="doc-badge doc-complet"><i class="fas fa-check-circle"></i> Complet (${obtenus}/${totalDocs})</span>`;
    }
    
    if (obtenus === 0) {
        return `<span class="doc-badge doc-manquant"><i class="fas fa-times-circle"></i> ${manquants} manquant(s)</span>`;
    }
    
    return `<span class="doc-badge doc-partiel"><i class="fas fa-exclamation-triangle"></i> ${obtenus}/${totalDocs} reçus</span>`;
}

// Formatage des dates
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

// Badge de statut du dossier
function getStatutBadge(statut) {
    const badges = {
        'en_attente': '<span class="statut-badge statut-en_attente"><i class="fas fa-clock"></i> En attente de départ</span>',
        'depart': '<span class="statut-badge statut-depart"><i class="fas fa-ship"></i> En mer</span>',
        'arrivee': '<span class="statut-badge statut-arrivee"><i class="fas fa-check-circle"></i> Arrivé au port</span>',
        'arrivee_surestaries': '<span class="statut-badge statut-surestaries"><i class="fas fa-exclamation-triangle"></i> Arrivé - SURESTARIES</span>',
        'sortie': '<span class="statut-badge statut-sortie"><i class="fas fa-truck"></i> Sorti du port</span>',
        'sortie_surestaries': '<span class="statut-badge statut-surestaries"><i class="fas fa-exclamation-triangle"></i> Sorti - SURESTARIES</span>'
    };
    return badges[statut] || `<span class="statut-badge">${statut || 'Inconnu'}</span>`;
}

// ========== GESTION DES FILTRES ==========

function updateFiltersAndDisplay() {
    const recherche = document.getElementById('searchInput')?.value.trim() || '';
    const statut = document.getElementById('filterStatut')?.value || '';
    const armateurId = document.getElementById('filterArmateur')?.value || '';
    
    currentFilters = {
        statut: statut,
        recherche: recherche,
        armateur_id: armateurId,
        acheteur_id: document.getElementById('filterAcheteur')?.value || ''
    };
    
    applyFiltersAndDisplay();
}

function onSearchInput() {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => updateFiltersAndDisplay(), 300);
}

function onFilterChange() {
    updateFiltersAndDisplay();
}

function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterStatut').value = '';
    document.getElementById('filterArmateur').value = '';
    if (document.getElementById('filterAcheteur')) {
        document.getElementById('filterAcheteur').value = '';
    }
    
    currentFilters = {
        statut: '',
        recherche: '',
        armateur_id: '',
        acheteur_id: ''
    };
    
    applyFiltersAndDisplay();
}

// ========== ACTIONS ==========

function viewDossier(id) {
    window.location.href = `detail.html?id=${id}`;
}

function editDossier(id) {
    window.location.href = `form.html?id=${id}`;
}

function newDossier() {
    window.location.href = 'form.html';
}

async function deleteDossier(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce dossier ? Cette action est irréversible.')) return;
    
    const result = await DossiersAPI.delete(id);
    
    if (result.ok) {
        showNotification('Dossier supprimé avec succès', 'success');
        await loadAllDossiers();
    } else {
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// ========== CHARGEMENT DES FILTRES ==========

async function loadArmateursForFilter() {
    const select = document.getElementById('filterArmateur');
    if (!select) return;
    
    select.innerHTML = '<option value="">Chargement...</option>';
    
    try {
        const result = await ReferentielsAPI.getArmateurs();
        
        if (result.ok && result.data && result.data.length > 0) {
            select.innerHTML = '<option value="">Tous les armateurs</option>';
            result.data.forEach(armateur => {
                select.innerHTML += `<option value="${armateur.id}">${escapeHtml(armateur.nom)}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Aucun armateur</option>';
        }
    } catch (error) {
        console.error('Erreur chargement armateurs:', error);
        select.innerHTML = '<option value="">Erreur de chargement</option>';
    }
}

// ========== NOTIFICATION ==========

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
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
    `;
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${escapeHtml(message)}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== INITIALISATION ==========

function initDossiersList() {
    console.log('Initialisation de la page des dossiers');
    isAdmin = Auth.isAdmin();
    
    loadArmateursForFilter();
    loadAllDossiers();
    
    const searchInput = document.getElementById('searchInput');
    const statutSelect = document.getElementById('filterStatut');
    const armateurSelect = document.getElementById('filterArmateur');
    const acheteurSelect = document.getElementById('filterAcheteur');
    const btnReset = document.getElementById('btnReset');
    const btnNew = document.getElementById('btnNew');
    
    if (searchInput) searchInput.addEventListener('input', onSearchInput);
    if (statutSelect) statutSelect.addEventListener('change', onFilterChange);
    if (armateurSelect) armateurSelect.addEventListener('change', onFilterChange);
    if (acheteurSelect) acheteurSelect.addEventListener('change', onFilterChange);
    if (btnReset) btnReset.addEventListener('click', resetFilters);
    if (btnNew) btnNew.addEventListener('click', newDossier);
}

// Attendre que les composants soient chargés
document.addEventListener('DOMContentLoaded', () => {
    const checkLoader = setInterval(() => {
        if (document.getElementById('sidebar-container') && document.getElementById('top-header-container')) {
            clearInterval(checkLoader);
            setTimeout(initDossiersList, 100);
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkLoader);
        initDossiersList();
    }, 3000);
});

// Exporter les fonctions globales
window.viewDossier = viewDossier;
window.editDossier = editDossier;
window.deleteDossier = deleteDossier;