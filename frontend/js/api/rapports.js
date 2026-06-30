// frontend/js/api/rapports.js
// API pour la gestion des rapports

const RapportsAPI = {
    // ========== GÉNÉRATION ==========
    
    /**
     * Génère un rapport (clôture ou tracking) pour un dossier
     * @param {number} dossierId - ID du dossier
     * @param {string} type - 'cloture' ou 'tracking'
     * @returns {Promise} - Réponse de l'API
     */
    async generer(dossierId, type) {
        return apiClient.post('/rapports/generer', {
            dossier_id: dossierId,
            type_rapport: type
        });
    },
    
    /**
     * Génère un rapport de clôture pour un dossier
     * @param {number} dossierId - ID du dossier
     * @returns {Promise} - Réponse de l'API
     */
    async genererCloture(dossierId) {
        return apiClient.post(`/rapports/cloture/${dossierId}`);
    },
    
    /**
     * Génère un rapport de tracking pour un dossier
     * @param {number} dossierId - ID du dossier
     * @returns {Promise} - Réponse de l'API
     */
    async genererTracking(dossierId) {
        return apiClient.post(`/rapports/tracking/${dossierId}`);
    },
    
    // ========== CONSULTATION ==========
    
    /**
     * Récupère un rapport par son ID
     * @param {number} rapportId - ID du rapport
     * @returns {Promise} - Réponse de l'API
     */
    async getById(rapportId) {
        return apiClient.get(`/rapports/${rapportId}`);
    },
    
    /**
     * Récupère tous les rapports d'un dossier
     * @param {number} dossierId - ID du dossier
     * @param {number} skip - Nombre d'éléments à sauter (pagination)
     * @param {number} limit - Nombre d'éléments à récupérer
     * @returns {Promise} - Réponse de l'API
     */
    async getByDossier(dossierId, skip = 0, limit = 50) {
        return apiClient.get(`/rapports/dossier/${dossierId}?skip=${skip}&limit=${limit}`);
    },
    
    /**
     * Récupère tous les rapports accessibles à l'utilisateur connecté (acheteur)
     * @param {number} skip - Nombre d'éléments à sauter (pagination)
     * @param {number} limit - Nombre d'éléments à récupérer
     * @returns {Promise} - Réponse de l'API
     */
    async getAllUser(skip = 0, limit = 50) {
        return apiClient.get(`/rapports/user/all?skip=${skip}&limit=${limit}`);
    },
    
    /**
     * Récupère tous les rapports (admin uniquement)
     * @param {number} skip - Nombre d'éléments à sauter (pagination)
     * @param {number} limit - Nombre d'éléments à récupérer
     * @returns {Promise} - Réponse de l'API
     */
    async getAllAdmin(skip = 0, limit = 100) {
        return apiClient.get(`/rapports/admin/all?skip=${skip}&limit=${limit}`);
    },
    
    // ========== EXPORT ==========
    /**
     * Exporte un rapport en PDF
     * @param {number} rapportId - ID du rapport
     * @returns {string} - URL de téléchargement du PDF
     */
    getExportPdfUrl(rapportId) {
        // Le baseUrl est déjà dans apiClient, donc on utilise le chemin relatif
        return `/api/v1/rapports/export/${rapportId}/pdf`;
    },
    
    /**
     * Exporte un rapport en Excel
     * @param {number} rapportId - ID du rapport
     * @returns {string} - URL de téléchargement du Excel
     */
    getExportExcelUrl(rapportId) {
        return `/api/v1/rapports/export/${rapportId}/excel`;
    },
    
    /**
     * Télécharge un rapport au format spécifié
     * @param {number} rapportId - ID du rapport
     * @param {string} format - 'pdf' ou 'excel'
     * @returns {Promise} - Réponse de l'API
     */
    async download(rapportId, format) {
        const endpoint = format === 'pdf' 
            ? `/rapports/export/${rapportId}/pdf`
            : `/rapports/export/${rapportId}/excel`;
        
        // Utiliser une requête fetch directe pour le téléchargement de fichier
        const url = apiClient.baseUrl + endpoint;
        const headers = apiClient.getHeaders();
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error('Erreur lors du téléchargement');
            }
            
            // Récupérer le nom du fichier depuis le header Content-Disposition
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `rapport_${rapportId}.${format}`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+)"?/);
                if (match) filename = match[1];
            }
            
            // Télécharger le fichier
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            
            return { ok: true };
        } catch (error) {
            console.error('Erreur téléchargement:', error);
            return { ok: false, error: error.message };
        }
    }, 
    /**
     * Exporte un rapport en PDF avec template structuré
     * @param {number} rapportId - ID du rapport
     * @param {Object} options - Options d'export
     * @returns {Promise} - Réponse de l'API
     */
    async exportTemplate(rapportId, options = {}) {
        return apiClient.post(`/rapports/export/${rapportId}/template`, {
            options: options
        });
    },
    
    /**
     * Récupère le template HTML du rapport pour export
     * @param {number} rapportId - ID du rapport
     * @returns {Promise} - Réponse de l'API
     */
    async getTemplate(rapportId) {
        return apiClient.get(`/rapports/export/${rapportId}/template`);
    }
};

// Exporter pour utilisation globale
window.RapportsAPI = RapportsAPI;