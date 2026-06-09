// API d'authentification
const AuthAPI = {
    async login(email, mot_de_passe) {
        const result = await apiClient.post('/auth/login', { email, mot_de_passe });
        
        if (result.ok && result.data) {
            Storage.setToken(result.data.access_token);
            Storage.setUser({
                id: result.data.utilisateur_id,
                nom: result.data.nom,
                email: result.data.email,
                role: result.data.role
            });
            return { success: true, data: result.data };
        }
        
        return { success: false, error: result.data?.detail || 'Erreur de connexion' };
    },
    
    async logout() {
        try {
            await apiClient.post('/auth/logout');
        } catch(e) {
            // Ignorer les erreurs
        }
        Storage.clearAll();
        window.location.href = '/pages/login.html';
    },
    
    async getCurrentUser() {
        const result = await apiClient.get('/auth/me');
        if (result.ok && result.data) {
            Storage.setUser(result.data);
            return result.data;
        }
        return null;
    }
};