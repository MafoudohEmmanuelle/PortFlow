// frontend/js/api/alertes.js
// API de gestion des alertes

const AlertesAPI = {
    // Récupérer toutes les alertes (avec filtres)
    async getAll(estLue = null, skip = 0, limit = 100) {
        let url = '/alertes';
        const params = new URLSearchParams();
        
        if (estLue !== null) params.append('est_lue', estLue);
        if (skip) params.append('skip', skip);
        if (limit) params.append('limit', limit);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        return apiClient.get(url);
    },
    
    // Récupérer les alertes d'un dossier
    async getByDossier(dossierId) {
        return apiClient.get(`/alertes/dossier/${dossierId}`);
    },
    
    // Marquer une alerte comme lue
    async marquerLue(alerteId) {
        return apiClient.put(`/alertes/${alerteId}/lue`);
    },
    
    // Marquer toutes les alertes comme lues
    async marquerToutesLues(dossierId = null) {
        let url = '/alertes/marquer-toutes-lues';
        if (dossierId) {
            url += `?dossier_id=${dossierId}`;
        }
        return apiClient.put(url);
    },
    
    // Statistiques des alertes
    async getStats() {
        return apiClient.get('/alertes/stats');
    },
    
    // Générer les alertes (admin uniquement)
    async generer(dossierId = null) {
        let url = '/alertes/generer';
        if (dossierId) {
            url += `?dossier_id=${dossierId}`;
        }
        return apiClient.post(url);
    }
};