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
    
    const result = await ReferentielsAPI.getArmateurs();
    
    if (result.ok && result.data) {
        select.innerHTML = '<option value="">Sélectionner un armateur</option>';
        result.data.forEach(armateur => {
            select.innerHTML += `<option value="${armateur.id}">${armateur.nom}</option>`;
        });
    } else {
        select.innerHTML = '<option value="">Erreur de chargement</option>';
        showError('Impossible de charger la liste des armateurs');
    }
}

// Charger les documents disponibles pour les checkboxes
async function loadDocuments() {
    const container = document.getElementById('documentsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Chargement des documents...</div>';
    
    const result = await ReferentielsAPI.getDocuments();
    
    if (result.ok && result.data) {
        allDocuments = result.data;
        container.innerHTML = `
            <div class="documents-checkboxes">
                ${allDocuments.map(doc => `
                    <label class="checkbox-label">
                        <input type="checkbox" name="documents" value="${doc.id}" class="doc-checkbox">
                        <span><strong>${doc.nom}</strong> ${doc.code ? `(${doc.code})` : ''}</span>
                        ${doc.responsable ? `<small>- ${doc.responsable}</small>` : ''}
                    </label>
                `).join('')}
            </div>
        `;
    } else {
        container.innerHTML = '<div class="error">Erreur de chargement des documents</div>';
        showError('Impossible de charger la liste des documents');
    }
}

// Charger un dossier existant pour modification
async function loadDossierForEdit(id) {
    const result = await DossiersAPI.getById(id);
    
    if (result.ok && result.data) {
        const dossier = result.data;
        
        // Remplir les champs texte
        document.getElementById('numero_bl').value = dossier.numero_bl || '';
        document.getElementById('fournisseur').value = dossier.fournisseur || '';
        document.getElementById('armateur_id').value = dossier.armateur_id || '';
        document.getElementById('delai_franchise_jours').value = dossier.delai_franchise_jours || 11;
        document.getElementById('eta_initiale').value = dossier.eta_initial ? dossier.eta_initial.split('T')[0] : '';
        
        // Cocher les documents déjà associés
        if (dossier.documents && dossier.documents.length > 0) {
            const associatedDocIds = dossier.documents.map(d => d.document_id);
            document.querySelectorAll('.doc-checkbox').forEach(checkbox => {
                checkbox.checked = associatedDocIds.includes(parseInt(checkbox.value));
            });
        }
    } else {
        showError('Impossible de charger le dossier');
    }
}

// Vérifier s'il y a un ID dans l'URL (mode édition)
function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    console.log('ID dans l\'URL:', id);  // Pour déboguer
    
    if (id && !isNaN(parseInt(id))) {
        isEditMode = true;
        currentDossierId = parseInt(id);
        document.getElementById('pageTitle').textContent = 'Modifier le dossier';
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
        loadDossierForEdit(currentDossierId);
    }
}

// Afficher une erreur
function showError(message) {
    const form = document.getElementById('dossierForm');
    let errorDiv = document.getElementById('formError');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'formError';
        errorDiv.className = 'error-message';
        form.insertBefore(errorDiv, form.firstChild);
    }
    
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Afficher un succès
function showSuccess(message, redirectUrl = 'list.html') {
    const form = document.getElementById('dossierForm');
    let successDiv = document.getElementById('formSuccess');
    
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'formSuccess';
        successDiv.className = 'success-message';
        form.insertBefore(successDiv, form.firstChild);
    }
    
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    successDiv.style.display = 'block';
    
    setTimeout(() => {
        window.location.href = redirectUrl;
    }, 1500);
}

// Valider le formulaire
function validateForm() {
    const numero_bl = document.getElementById('numero_bl').value.trim();
    const fournisseur = document.getElementById('fournisseur').value.trim();
    const armateur_id = document.getElementById('armateur_id').value;
    const eta_initiale = document.getElementById('eta_initiale').value;
    
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
    
    // Vérifier qu'au moins un document est sélectionné
    const selectedDocs = getSelectedDocuments();
    if (selectedDocs.length === 0 && !isEditMode) {
        showError('Veuillez sélectionner au moins un document requis');
        return false;
    }
    
    return true;
}

// Récupérer les IDs des documents sélectionnés
function getSelectedDocuments() {
    const checkboxes = document.querySelectorAll('.doc-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

// // Envoyer le formulaire
// async function submitForm(event) {
//     event.preventDefault();
    
//     if (!validateForm()) return;
    
//     // Récupérer les données du formulaire
//     const formData = {
//         numero_bl: document.getElementById('numero_bl').value.trim(),
//         fournisseur: document.getElementById('fournisseur').value.trim(),
//         armateur_id: parseInt(document.getElementById('armateur_id').value),
//         delai_franchise_jours: parseInt(document.getElementById('delai_franchise_jours').value),
//         eta_initiale: document.getElementById('eta_initiale').value,
//         documents: getSelectedDocuments()
//     };
    
//     // Désactiver le bouton pendant l'envoi
//     const submitBtn = document.getElementById('submitBtn');
//     submitBtn.disabled = true;
//     submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    
//     let result;
//     if (isEditMode) {
//         // En mode modification, n'envoyer que les champs modifiables
//         const updateData = {
//             numero_bl: formData.numero_bl,
//             fournisseur: formData.fournisseur,
//             armateur_id: formData.armateur_id,
//             delai_franchise_jours: formData.delai_franchise_jours,
//             documents: formData.documents
//         };
//         result = await DossiersAPI.update(currentDossierId, updateData);
//     } else {
//         result = await DossiersAPI.create(formData);
//     }
    
//     if (result.ok) {
//         showSuccess(
//             isEditMode ? 'Dossier modifié avec succès !' : 'Dossier créé avec succès !',
//             'list.html'
//         );
//     } else {
//         submitBtn.disabled = false;
//         submitBtn.innerHTML = isEditMode ? '<i class="fas fa-save"></i> Mettre à jour' : '<i class="fas fa-save"></i> Créer le dossier';
//         showError(result.data?.detail || 'Erreur lors de l\'enregistrement');
//     }
// }

// Modifier la fonction submitForm pour l'édition
async function submitForm(event) {
    event.preventDefault();
    
    if (!validateForm()) return;
    
    // Récupérer les données du formulaire
    const formData = {
        numero_bl: document.getElementById('numero_bl').value.trim(),
        fournisseur: document.getElementById('fournisseur').value.trim(),
        armateur_id: parseInt(document.getElementById('armateur_id').value),
        delai_franchise_jours: parseInt(document.getElementById('delai_franchise_jours').value),
        eta_initiale: document.getElementById('eta_initiale').value,
        documents: getSelectedDocuments()
    };
    
    console.log('Données envoyées:', formData);  // Pour déboguer
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    
    let result;
    if (isEditMode) {
        // En mode modification, utiliser l'API update
        const updateData = {
            numero_bl: formData.numero_bl,
            fournisseur: formData.fournisseur,
            armateur_id: formData.armateur_id,
            delai_franchise_jours: formData.delai_franchise_jours,
            documents: formData.documents
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
        showError(result.data?.detail || 'Erreur lors de l\'enregistrement');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.isAuthenticated()) {
        window.location.href = '../login.html';
        return;
    }
    
    // Charger les données nécessaires
    await loadArmateurs();
    await loadDocuments();
    checkEditMode();
    
    const form = document.getElementById('dossierForm');
    if (form) {
        form.addEventListener('submit', submitForm);
    }
});