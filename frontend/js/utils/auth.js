const Auth={
    isAuthenticated(){
        return Storage.getToken();
    },
    isAdmin(){
        const user= Storage.getUser();
        return user && user.role === 'admin';
     },
    getCurrentUser(){
        return Storage.getUser();
     },
    setSession(token,user){
        Storage.setToken(token);
        Storage.setUser(user);
    },
    destroySession(){
        Storage.removeToken();
        Storage.removeUser();
    },
    //debogage avec alertes
    redirectToDashboard(){ 
        alert('redirectToDashboard appelé - isAuthenticated: ' + this.isAuthenticated());
        
        if(this.isAuthenticated()){
            alert('Authentifié - isAdmin: ' + this.isAdmin());
            if (this.isAdmin()){
                alert('Redirection vers dashboard admin');
                window.location.href = '/pages/dashboard-admin.html';
            } else{
                alert('Redirection vers dashboard acheteur');
                window.location.href = '/pages/dashboard-acheteur.html';
            }
        }else{
            alert('NON authentifié - redirection vers login');
            window.location.href = '/pages/login.html';
        }
    },
    /*
    redirectToDashboard(){ 
        if(this.isAuthenticated()){
            if (this.isAdmin()){
                console.log('Redirection vers dashboard admin');
                window.location.href = '/pages/dashboard_admin.html';
            } else{
                console.log('Redirection vers dashboard acheteur');
                window.location.href = '/pages/dashboard_acheteur.html';
            }
        }else{
            console.log('Redirection vers dashboard non authentifié');
            window.location.href = '/pages/login.html';
        }
    },
    */
    redirectToLogin(){
        window.location.href = '/pages/login.html';
    },
    logout(){
        this.destroySession();
        this.redirectToLogin();
    },
};