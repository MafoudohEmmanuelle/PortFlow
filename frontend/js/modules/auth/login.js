// frontend/js/modules/auth/login.js
console.log('login.js chargé');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM chargé');
    
    // Vérifier si déjà connecté
    if (Storage.getToken()) {
        console.log('Déjà connecté, redirection...');
        const user = Storage.getUser();
        if (user && user.role === 'admin') {
            window.location.href = '/pages/dashboard-admin.html';
        } else {
            window.location.href = '/pages/dashboard-acheteur.html';
        }
        return;
    }
    
    const form = document.getElementById('loginForm');
    const errorDiv = document.getElementById('errorMessage');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('mot_de_passe');
    
    if (!form) {
        console.error('Formulaire non trouvé !');
        return;
    }
    
    console.log('Formulaire trouvé, attachement de l\'événement...');
    
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log('Formulaire soumis');
        
        const email = emailInput.value;
        const password = passwordInput.value;
        
        console.log('Email:', email);
        
        // Afficher le message de chargement
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.textContent : 'Se connecter';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Connexion...';
        }
        
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
        }
        
        try {
            console.log('Appel API...');
            const response = await fetch('http://localhost:8000/api/v1/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    mot_de_passe: password
                })
            });
            
            console.log('Réponse reçue, status:', response.status);
            const data = await response.json();
            console.log('Données:', data);
            
            if (response.ok) {
                // Connexion réussie
                console.log('Connexion réussie !');
                
                // Stocker le token et l'utilisateur
                Storage.setToken(data.access_token);
                Storage.setUser({
                    id: data.utilisateur_id,
                    nom: data.nom,
                    email: data.email,
                    role: data.role
                });
                
                // Redirection selon le rôle
                if (data.role === 'admin') {
                    window.location.href = '/pages/dashboard-admin.html';
                } else {
                    window.location.href = '/pages/dashboard-acheteur.html';
                }
            } else {
                // Connexion échouée
                console.log('Connexion échouée');
                const errorMessage = data.detail || 'Email ou mot de passe incorrect';
                
                if (errorDiv) {
                    errorDiv.textContent = errorMessage;
                    errorDiv.style.display = 'block';
                }
                
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        } catch (error) {
            console.error('Erreur:', error);
            if (errorDiv) {
                errorDiv.textContent = 'Erreur de connexion au serveur. Vérifiez que le backend est démarré sur http://localhost:8000';
                errorDiv.style.display = 'block';
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    });
});