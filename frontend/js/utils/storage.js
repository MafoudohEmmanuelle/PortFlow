const Storage = {
    set(key, value) {
        try{
            const jsonValue = JSON.stringify(value);
            localStorage.setItem(key, jsonValue);
            return true;
        }catch (error) {
            console.error('Erreur lors de la sauvegarde de "${key}" :', error);
            return false;
        }
    },
    get (key, defaultValue = null) {
        try {
            const jsonValue = localStorage.getItem(key);
            if (jsonValue === null) {
                return defaultValue;
            }
            return JSON.parse(jsonValue);
        } catch (error) {
            console.error('Erreur lors de la récupération de "${key}" :', error);
            return defaultValue;
        }
    },
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Erreur lors de la suppression de "${key}" :', error);
            return false;
        }
    },
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Erreur lors du nettoyage du stockage :', error);
            return false;
        }
    },

    hasToken(key) {
        try {
            return localStorage.getItem(key) !== null;
        } catch (error) {
            console.error('Erreur lors de la vérification de "${key}" :', error);
            return false;
        }
    },
    setToken(token) {
        return this.set('APP_CONFIG.TOKEN_KEY', token);
    },
    getToken() {
        return this.get('APP_CONFIG.TOKEN_KEY', null);
    },
    removeToken() {
        return this.remove('APP_CONFIG.TOKEN_KEY');
    },
    setUser(user) {
        return this.set(APP_CONFIG.USER_KEY, user);
    },
    getUser() {
        return this.get(APP_CONFIG.USER_KEY, null);
    },
    removeUser() {
        return this.remove(APP_CONFIG.USER_KEY);
    }
}