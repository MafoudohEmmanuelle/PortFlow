// frontend/js/modules/dossiers/dossier-form.js
// Logique du formulaire de création/modification de dossier

let isEditMode = false;
let currentDossierId = null;
let allDocuments = [];

// Charger les armateurs pour le select
async function loadArmateurs() {
    const select = document.getElementById('armateur_id');
    if (!select) return;
    
    select.innerHTML = '<option value="">Chargement...</option>';
    
    try {
        const result = await ReferentielsAPI.getArmateurs();
        
        if (result.ok && result.data && result.data.length > 0) {
            select.innerHTML = '<option value="">Sélectionner un armateur</option>';
            result.data.forEach(armateur => {
                select.innerHTML += `<option value="${armateur.id}">${escapeHtml(armateur.nom)}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">Aucun armateur disponible</option>';
        }
    } catch (error) {
        console.error('Erreur chargement armateurs:', error);
        select.innerHTML = '<option value="">Erreur de chargement</option>';
        showError('Impossible de charger la liste des armateurs');
    }
}

// Charger les documents disponibles pour les checkboxes
async function loadDocuments() {
    const container = document.getElementById('documentsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="form-loading"><i class="fas fa-spinner fa-spin"></i> Chargement des documents...</div>';
    
    try {
        const result = await ReferentielsAPI.getDocuments();
        
        if (result.ok && result.data && result.data.length > 0) {
            allDocuments = result.data;
            container.innerHTML = `
                <div class="documents-checkboxes">
                    ${allDocuments.map(doc => `
                        <label class="checkbox-label">
                            <input type="checkbox" name="documents" value="${doc.id}" class="doc-checkbox">
                            <span><strong>${escapeHtml(doc.nom)}</strong> ${doc.code ? `(${escapeHtml(doc.code)})` : ''}</span>
                            ${doc.responsable ? `<small>- ${escapeHtml(doc.responsable)}</small>` : ''}
                        </label>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = '<div class="error-message" style="display:block;">Aucun document disponible. Veuillez d\'abord créer des documents dans le menu Documents (admin).</div>';
        }
    } catch (error) {
        console.error('Erreur chargement documents:', error);
        container.innerHTML = '<div class="error-message" style="display:block;">Erreur de chargement des documents</div>';
        showError('Impossible de charger la liste des documents');
    }
}

// Charger un dossier existant pour modification
async function loadDossierForEdit(id) {
    console.log('Chargement dossier ID:', id);
    const result = await DossiersAPI.getById(id);
    
    if (result.ok && result.data) {
        const dossier = result.data;
        console.log('Dossier chargé:', dossier);
        
        // Remplir les champs texte
        const numeroBlInput = document.getElementById('numero_bl');
        const fournisseurInput = document.getElementById('fournisseur');
        const armateurSelect = document.getElementById('armateur_id');
        const delaiInput = document.getElementById('delai_franchise_jours');
        const etaInput = document.getElementById('eta_initiale');
        
        if (numeroBlInput) numeroBlInput.value = dossier.numero_bl || '';
        if (fournisseurInput) fournisseurInput.value = dossier.fournisseur || '';
        if (armateurSelect) armateurSelect.value = dossier.armateur_id || '';
        if (delaiInput) delaiInput.value = dossier.delai_franchise_jours || 11;
        if (etaInput && dossier.eta_initial) {
            etaInput.value = dossier.eta_initial.split('T')[0];
        }
        
        // Cocher les documents déjà associés
        if (dossier.documents && dossier.documents.length > 0) {
            const associatedDocIds = dossier.documents.map(d => d.document_id);
            const checkboxes = document.querySelectorAll('.doc-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = associatedDocIds.includes(parseInt(checkbox.value));
            });
        }
    } else {
        showError('Impossible de charger le dossier: ' + (result.data?.detail || 'Erreur inconnue'));
    }
}

// Vérifier s'il y a un ID dans l'URL (mode édition)
function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    console.log('ID dans l\'URL:', id);
    
    if (id && !isNaN(parseInt(id))) {
        isEditMode = true;
        currentDossierId = parseInt(id);
        const submitBtn = document.getElementById('submitBtn');
        
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
        
        // Attendre que les documents soient chargés avant de charger le dossier
        const checkDocumentsLoaded = setInterval(() => {
            const container = document.getElementById('documentsContainer');
            if (container && !container.innerHTML.includes('Chargement') && !container.innerHTML.includes('fa-spinner')) {
                clearInterval(checkDocumentsLoaded);
                loadDossierForEdit(currentDossierId);
            }
        }, 500);
        
        // Timeout de sécurité
        setTimeout(() => {
            clearInterval(checkDocumentsLoaded);
        }, 10000);
    }
}

// Échapper les caractères HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Afficher une erreur
function showError(message) {
    const errorDiv = document.getElementById('formError');
    if (errorDiv) {
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${escapeHtml(message)}`;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

// Afficher un succès
function showSuccess(message, redirectUrl = 'list.html') {
    const successDiv = document.getElementById('formSuccess');
    if (successDiv) {
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${escapeHtml(message)}`;
        successDiv.style.display = 'block';
        
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1500);
    } else {
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 1500);
    }
}

// Valider le formulaire
function validateForm() {
    const numero_bl = document.getElementById('numero_bl')?.value.trim();
    const fournisseur = document.getElementById('fournisseur')?.value.trim();
    const armateur_id = document.getElementById('armateur_id')?.value;
    const eta_initiale = document.getElementById('eta_initiale')?.value;
    
    if (!numero_bl) {
        showError('Le numéro de BL est obligatoire');
        return false;
    }
    if (!fournisseur) {
        showError('Le nom du fournisseur est obligatoire');
        return false;
    }
    if (!armateur_id) {
        showError('Veuillez sélectionner un armateur');
        return false;
    }
    if (!eta_initiale) {
        showError('La date ETA initiale est obligatoire');
        return false;
    }
    
    return true;
}

// Récupérer les IDs des documents sélectionnés
function getSelectedDocuments() {
    const checkboxes = document.querySelectorAll('.doc-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

// Envoyer le formulaire
async function submitForm(event) {
    event.preventDefault();
    
    if (!validateForm()) return;
    
    // Récupérer les données du formulaire
    const selectedDocuments = getSelectedDocuments();
    
    // En mode création, les documents sont obligatoires
    if (!isEditMode && selectedDocuments.length === 0) {
        showError('Veuillez sélectionner au moins un document requis');
        return;
    }
    
    const formData = {
        numero_bl: document.getElementById('numero_bl').value.trim(),
        fournisseur: document.getElementById('fournisseur').value.trim(),
        armateur_id: parseInt(document.getElementById('armateur_id').value),
        delai_franchise_jours: parseInt(document.getElementById('delai_franchise_jours').value) || 11,
        eta_initiale: document.getElementById('eta_initiale').value,
        documents: selectedDocuments
    };
    
    console.log(' Données à envoyer:', formData);
    
    // Désactiver le bouton pendant l'envoi
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    
    let result;
    if (isEditMode) {
        const updateData = {
            numero_bl: formData.numero_bl,
            fournisseur: formData.fournisseur,
            armateur_id: formData.armateur_id,
            delai_franchise_jours: formData.delai_franchise_jours,
            documents: formData.documents.length > 0 ? formData.documents : null
        };
        result = await DossiersAPI.update(currentDossierId, updateData);
    } else {
        result = await DossiersAPI.create(formData);
    }
    
    if (result.ok) {
        showSuccess(
            isEditMode ? 'Dossier modifié avec succès !' : 'Dossier créé avec succès !',
            'list.html'
        );
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = isEditMode ? '<i class="fas fa-save"></i> Mettre à jour' : '<i class="fas fa-save"></i> Créer le dossier';
        
        let errorMessage = 'Erreur lors de l\'enregistrement';
        if (result.data?.detail) {
            if (typeof result.data.detail === 'object') {
                errorMessage = JSON.stringify(result.data.detail);
            } else {
                errorMessage = result.data.detail;
            }
        }
        showError(errorMessage);
    }
}

// Initialisation après le chargement des composants
function initForm() {
    console.log('Initialisation du formulaire');
    loadArmateurs();
    loadDocuments();
    checkEditMode();
    
    const form = document.getElementById('dossierForm');
    if (form) {
        form.addEventListener('submit', submitForm);
    }
}

// Exposer l'initialisation pour être appelée après ComponentsLoader
window.initDossierForm = initForm;

// Écouter l'événement de fin de chargement des composants
document.addEventListener('DOMContentLoaded', () => {
    // Attendre que ComponentsLoader ait fini
    const checkLoader = setInterval(() => {
        if (document.getElementById('sidebar-container') && document.getElementById('top-header-container')) {
            clearInterval(checkLoader);
            initForm();
        }
    }, 100);
    
    // Timeout de sécurité
    setTimeout(() => {
        clearInterval(checkLoader);
        initForm();
    }, 3000);
});