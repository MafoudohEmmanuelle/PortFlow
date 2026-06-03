// frontend/js/api/client.js

console.log('Chargement de client.js...');

// Vérifier que APP_CONFIG est chargé
if (typeof APP_CONFIG === 'undefined') {
    console.error('APP_CONFIG non chargé ! Vérifiez que config.js est chargé avant client.js');
}

const apiClient = {
    baseUrl: (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.API_BASE_URL) 
        ? APP_
        : 'http://localhost:8000/api/v1',
    
    getToken() {
        if (typeof Storage !== 'undefined' && Storage.getToken) {
            return Storage.getToken();
        }
        return localStorage.getItem('portflow_token');
    },
    
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    },
    
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        console.log(`Requête ${options.method || 'GET'} ${url}`);
        
        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...(options.headers || {})
            }
        };
        
        try {
            const response = await fetch(url, config);
            let data = null;
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            }
            
            if (response.status === 401) {
                localStorage.removeItem('portflow_token');
                localStorage.removeItem('portflow_user');
                window.location.href = '/pages/login.html';
                return { ok: false, error: 'Session expirée' };
            }
            
            if (!response.ok) {
                const errorMsg = data?.detail || `Erreur ${response.status}`;
                return { ok: false, error: errorMsg };
            }
            
            return { ok: true, data, status: response.status };
            
        } catch (error) {
            console.error('API Error:', error);
            return { ok: false, error: error.message };
        }
    },
    
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },
    
    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

console.log('API Client chargé, baseUrl:', apiClient.baseUrl);
/*class APIClient{
    constructor(){
        this.baseURL= API_URL;
    }
    
    //recuperer le token de l'utilisateur
    getToken(){
        return Storage.getToken();
    }

    //construire les headers de la requete
    getHeaders(){
        const headers={
            'Content-Type': 'application/json',
        };
        const token= this.getToken();
        if(token){
            headers['Authorization']= `Bearer ${token}`;
        }
        return headers;
    }

    //methode generique pour faire une requete API
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const config = {
            ...options,
            headers: {
                ...this.getHeaders(),
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);

            let data = null;
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                data = await response.json();
            }

            if (response.status === 401) {
                Auth.destroySession();
                Auth.redirectToDashboard();
                throw new Error('Session expirée. Veuillez vous reconnecter.');
            }

            if (!response.ok) {
                const errorMsg = data?.detail || `Erreur ${response.status}`;
                throw new Error(errorMsg);
            }

            return { ok: true, data, status: response.status };
        } catch (error) {
            console.error('API Error:', error);
            return { ok: false, error: error.message };
        }
    }

    get(endpoint){
        return this.request(endpoint, {method:'GET'});
    }

    post(endpoint, body){
        return this.request(endpoint, {
            method:'POST',
            body: JSON.stringify(body),
        });
    }

    put(endpoint, body){
        return this.request(endpoint, {
            method:'PUT',
            body: JSON.stringify(body),
        });
    }

    delete(endpoint){
        return this.request(endpoint, {method:'DELETE'});
    }
}

const apiClient = new APIClient();*/