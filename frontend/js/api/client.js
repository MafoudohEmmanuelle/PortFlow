// Client API avec fetch
class ApiClient {
    constructor() {
        this.baseUrl = APP_CONFIG.API_URL;
    }
    
    getToken() {
        return Storage.getToken();
    }
    
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: this.getHeaders()
        };
        
        try {
            const response = await fetch(url, config);
            let data;
            
            try {
                data = await response.json();
            } catch(e) {
                data = null;
            }
            
            if (response.status === 401) {
                Storage.clearAll();
                window.location.href = '/pages/login.html';
                return { ok: false, error: 'Session expirée' };
            }
            
            return { ok: response.ok, data, status: response.status };
        } catch (error) {
            console.error('API Error:', error);
            return { ok: false, error: error.message };
        }
    }
    
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
    
    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }
    
    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

const apiClient = new ApiClient();