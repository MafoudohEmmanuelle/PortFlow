const AuthAPI= {
    async login(email, mot_de_passe) {
        alert('1. Appel API login pour: ' + email);
        
        const result = await apiClient.post('/auth/login', {
            email: email,
            mot_de_passe: mot_de_passe
        });
        
        alert('2. Réponse reçue - ok: ' + result.ok);
        
        if (result.ok && result.data) {
            alert('3. Token reçu: ' + (result.data.access_token ? 'OUI' : 'NON'));
            
            if (result.data.access_token) {
                Storage.setToken(result.data.access_token);
                alert('4. Token stocké avec succès');
            }
            
            const user = {
                id: result.data.utilisateur_id,
                username: result.data.nom,
                email: result.data.email,
                role: result.data.role
            };
            Storage.setUser(user);
            alert('5. Utilisateur stocké: ' + user.username + ' (' + user.role + ')');
        } else {
            alert('ERREUR: ' + (result.error || 'Pas de données'));
        }
        
        return result;
    },
    /*
    async login(email, mot_de_passe){
        const result= await apiClient.post('/auth/login', {
            email: email,
            mot_de_passe: mot_de_passe
        });
        console.log('Réponse brute:', result);
        if (result.ok && result.data){
            console.log('access_token:', result.data.access_token);
            console.log('utilisateur:', result.data);
            if (result.data.access_token){
                Storage.setToken(result.data.access_token);
                console.log('Token stocké');
            }else{
                console.warn('Aucun token reçu');
            }
            if (result.data.user){
                const user={
                id: result.data.id,
                username: result.data.nom,
                email: result.data.email,
                role: result.data.role
                };
                Storage.setUser(user);
                console.log('Utilisateur stocké:', user);
                //Storage.setUser(result.data.user);
            }else{
                console.warn('Aucun utilisateur reçu');
            }
        }else{
            console.warn('Login échoué:', result.error);
        }
        return result;
    },
    */
    async getCurrentUser(){
        const result= await apiClient.get('/auth/me');
        if (result.ok && result.data){
            Storage.setUser(result.data);
        }        return result;
        return null;
    },
    async logout(){
        Storage.removeToken();
        Storage.removeUser();
        window.location.href = '/pages/login.html';

    },
    async checkToken() {
        const token = Storage.getToken();
        if (!token) return false;
        
        const result = await apiClient.get('/auth/me');
        return result.ok;
    },
}