// frontend/js/modules/users/users-form.js

let isEditMode = false;
let currentUserId = null;

// Récupérer l'ID depuis l'URL
function getUserIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Charger un utilisateur pour modification
async function loadUserForEdit(id) {
    console.log('Chargement utilisateur ID:', id);
    
    try {
        const result = await UsersAPI.getById(id);
        
        if (result.ok && result.data) {
            const user = result.data;
            
            document.getElementById('nom').value = user.nom || '';
            document.getElementById('email').value = user.email || '';
            document.getElementById('role').value = user.role || 'acheteur';
            document.getElementById('actif').checked = user.actif === true;
            
            // Mode modification : mot de passe optionnel
            const passwordField = document.getElementById('mot_de_passe');
            const passwordRequired = document.getElementById('passwordRequired');
            const passwordHelp = document.getElementById('passwordHelp');
            
            if (passwordField) passwordField.placeholder = 'Laisser vide pour conserver';
            if (passwordRequired) passwordRequired.textContent = ' (optionnel)';
            if (passwordHelp) passwordHelp.textContent = 'Laisser vide pour conserver le mot de passe actuel';
        } else {
            showError('Impossible de charger l\'utilisateur');
        }
    } catch (error) {
        console.error('Erreur loadUserForEdit:', error);
        showError('Erreur de connexion');
    }
}

// Vérifier le mode (création ou modification)
function checkEditMode() {
    const id = getUserIdFromUrl();
    
    if (id && !isNaN(parseInt(id))) {
        isEditMode = true;
        currentUserId = parseInt(id);
        
        const titleEl = document.getElementById('page-title');
        const submitBtn = document.getElementById('submitBtn');
        
        if (titleEl) {
            if (typeof ComponentsLoader !== 'undefined') {
                ComponentsLoader.setPageTitle('Modifier un utilisateur');
            } else {
                titleEl.textContent = 'Modifier un utilisateur';
            }
        }
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Mettre à jour';
        
        loadUserForEdit(currentUserId);
    } else {
        // Mode création
        const passwordField = document.getElementById('mot_de_passe');
        if (passwordField) passwordField.required = true;
    }
}

// Valider le formulaire
function validateForm() {
    const nom = document.getElementById('nom')?.value.trim();
    const email = document.getElementById('email')?.value.trim();
    const role = document.getElementById('role')?.value;
    const motDePasse = document.getElementById('mot_de_passe')?.value;
    
    if (!nom) {
        showError('Le nom est obligatoire');
        return false;
    }
    if (!email) {
        showError('L\'email est obligatoire');
        return false;
    }
    if (!role) {
        showError('Le rôle est obligatoire');
        return false;
    }
    
    // En création, le mot de passe est obligatoire
    if (!isEditMode && !motDePasse) {
        showError('Le mot de passe est obligatoire pour un nouvel utilisateur');
        return false;
    }
    
    return true;
}

// Récupérer les données du formulaire
function getFormData() {
    const data = {
        nom: document.getElementById('nom').value.trim(),
        email: document.getElementById('email').value.trim(),
        role: document.getElementById('role').value,
        actif: document.getElementById('actif').checked
    };
    
    const motDePasse = document.getElementById('mot_de_passe')?.value;
    if (motDePasse) {
        data.mot_de_passe = motDePasse;
    }
    
    return data;
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

// Soumettre le formulaire
async function submitForm(event) {
    event.preventDefault();
    
    if (!validateForm()) return;
    
    const formData = getFormData();
    console.log('Données à envoyer:', formData);
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi en cours...';
    
    let result;
    if (isEditMode) {
        result = await UsersAPI.update(currentUserId, formData);
    } else {
        result = await UsersAPI.create(formData);
    }
    
    if (result.ok) {
        showSuccess(
            isEditMode ? 'Utilisateur modifié avec succès !' : 'Utilisateur créé avec succès !',
            'list.html'
        );
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = isEditMode ? '<i class="fas fa-save"></i> Mettre à jour' : '<i class="fas fa-save"></i> Créer';
        
        let errorMessage = 'Erreur lors de l\'enregistrement';
        if (result.data?.detail) {
            errorMessage = result.data.detail;
        }
        showError(errorMessage);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialisation
function initForm() {
    console.log('Initialisation du formulaire utilisateur');
    checkEditMode();
    
    const form = document.getElementById('userForm');
    if (form) {
        form.addEventListener('submit', submitForm);
    }
}

// Attendre les composants
document.addEventListener('DOMContentLoaded', () => {
    const checkLoader = setInterval(() => {
        if (document.getElementById('sidebar-container') && document.getElementById('top-header-container')) {
            clearInterval(checkLoader);
            setTimeout(initForm, 200);
        }
    }, 100);
    
    setTimeout(() => {
        clearInterval(checkLoader);
        initForm();
    }, 3000);
});