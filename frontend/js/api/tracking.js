const TrackingAPI = {
    // Récupérer tous les trackings d'un dossier
    async getByDossier(dossierId) {
        return apiClient.get(`/tracking/dossier/${dossierId}`);
    },
    
    // Récupérer le dernier tracking d'un dossier
    async getLast(dossierId) {
        return apiClient.get(`/tracking/dossier/${dossierId}/last`);
    },
    
    // Créer un nouveau relevé de tracking
    async create(data) {
        return apiClient.post('/tracking', data);
    },
    
    // Modifier un relevé de tracking
    async update(id, data) {
        return apiClient.put(`/tracking/${id}`, data);
    },
    
    // Supprimer un relevé de tracking
    async delete(id) {
        return apiClient.delete(`/tracking/${id}`);
    }
};