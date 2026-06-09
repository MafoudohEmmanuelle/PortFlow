// frontend/js/api/referentiels.js
// API pour les référentiels (armateurs, documents)

const ReferentielsAPI = {
    // === ARMATEURS ===
    async getArmateurs() {
        return apiClient.get('/referentiels/armateurs');
    },
    
    async getArmateurById(id) {
        return apiClient.get(`/referentiels/armateurs/${id}`);
    },
    
    async createArmateur(data) {
        return apiClient.post('/referentiels/armateurs', data);
    },
    
    async updateArmateur(id, data) {
        return apiClient.put(`/referentiels/armateurs/${id}`, data);
    },
    
    async deleteArmateur(id) {
        return apiClient.delete(`/referentiels/armateurs/${id}`);
    },
    
    // === DOCUMENTS ===
    async getDocuments() {
        return apiClient.get('/referentiels/documents');
    },
    
    async getDocumentById(id) {
        return apiClient.get(`/referentiels/documents/${id}`);
    },
    
    async createDocument(data) {
        return apiClient.post('/referentiels/documents', data);
    },
    
    async updateDocument(id, data) {
        return apiClient.put(`/referentiels/documents/${id}`, data);
    },
    
    async deleteDocument(id) {
        return apiClient.delete(`/referentiels/documents/${id}`);
    }
};