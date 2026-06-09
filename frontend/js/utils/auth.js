// frontend/js/utils/auth.js
const Auth = {
    isAuthenticated() {
        return !!Storage.getToken();
    },
    
    getUser() {
        return Storage.getUser();
    },
    
    getRole() {
        const user = this.getUser();
        return user ? user.role : null;
    },
    
    isAdmin() {
        return this.getRole() === 'admin';
    },
    
    isAcheteur() {
        return this.getRole() === 'acheteur';
    },
    
    redirectBasedOnRole() {
        const role = this.getRole();
        if (role === 'admin') {
            window.location.href = '/pages/dashboard-admin.html';
        } else if (role === 'acheteur') {
            window.location.href = '/pages/dashboard-acheteur.html';
        } else {
            window.location.href = '/pages/login.html';
        }
    },
    
    logout() {
        Storage.clearAll();
        window.location.href = '/pages/login.html';
    },
    
    checkAuth() {
        if (!this.isAuthenticated()) {
            const currentPage = window.location.pathname;
            if (!currentPage.includes('login.html')) {
                window.location.href = '/pages/login.html';
            }
        }
    }
};