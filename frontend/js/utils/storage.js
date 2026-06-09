// frontend/js/utils/storage.js
const Storage = {
    setToken(token) {
        localStorage.setItem(APP_CONFIG.TOKEN_KEY, token);
    },
    
    getToken() {
        return localStorage.getItem(APP_CONFIG.TOKEN_KEY);
    },
    
    removeToken() {
        localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
    },
    
    setUser(user) {
        localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(user));
    },
    
    getUser() {
        const userStr = localStorage.getItem(APP_CONFIG.USER_KEY);
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch(e) {
                return null;
            }
        }
        return null;
    },
    
    removeUser() {
        localStorage.removeItem(APP_CONFIG.USER_KEY);
    },
    
    clearAll() {
        this.removeToken();
        this.removeUser();
    }
};