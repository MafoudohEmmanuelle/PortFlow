// frontend/js/api/suivi-documents.js
// API pour le suivi documentaire des dossiers

const SuiviDocumentsAPI = {
    // Récupérer tous les documents d'un dossier
    async getDocuments(dossierId) {
        return apiClient.get(`/documents-dossier/?dossier_id=${dossierId}`);
    },
    
    // Récupérer les documents manquants d'un dossier
    async getMissingDocuments(dossierId) {
        return apiClient.get(`/documents-dossier/missing?dossier_id=${dossierId}`);
    },
    
    // Récupérer le taux de complétion d'un dossier
    async getCompletionRate(dossierId) {
        return apiClient.get(`/documents-dossiercompletion/${dossierId}`);
    },
    
    // Marquer un document comme reçu
    async markAsReceived(associationId, dateReception = null) {
        return apiClient.put(`/documents-dossier/${associationId}`, {
            obtenu: true,
            date_reception: dateReception || new Date().toISOString().split('T')[0]
        });
    },
    
    // Ajouter un document au dossier
    async addDocument(dossierId, documentId) {
        return apiClient.post('/documents-dossier/', {
            dossier_id: dossierId,
            document_id: documentId,
            obtenu: false
        });
    },
    
    // Retirer un document du dossier
    async removeDocument(associationId) {
        return apiClient.delete(`/documents-dossier/${associationId}`);
    }
};