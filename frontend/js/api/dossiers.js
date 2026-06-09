// frontend/js/api/dossiers.js
const DossiersAPI = {
    // Récupérer la liste des dossiers (avec filtres)
    async getAll(filters = {}) {
        let url = '/dossiers';
        const params = new URLSearchParams();
        
        if (filters.skip) params.append('skip', filters.skip);
        if (filters.limit) params.append('limit', filters.limit);
        if (filters.statut) params.append('statut', filters.statut);
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        return apiClient.get(url);
    },
    
    // Récupérer un dossier par son ID
    async getById(id) {
        return apiClient.get(`/dossiers/${id}`);
    },
    
    // Créer un dossier
    async create(data) {
        return apiClient.post('/dossiers', data);
    },
    
    // Modifier un dossier
    async update(id, data) {
        console.log('Update dossier ID:', id, 'Data:', data);  // Pour déboguer
        return apiClient.put(`/dossiers/${id}`, data);
    },
    
    // Supprimer un dossier
    async delete(id) {
        return apiClient.delete(`/dossiers/${id}`);
    },
    
    // Enregistrer la date de départ
    async updateDepart(id, dateDepart) {
        return apiClient.put(`/dossiers/${id}/depart?date_depart=${dateDepart}`);
    },
    
    // Enregistrer la date d'arrivée
    async updateArrivee(id, dateArrivee) {
        return apiClient.put(`/dossiers/${id}/arrivee`, { date_arrivee: dateArrivee });
    },
    
    // Enregistrer la date de sortie
    async updateSortie(id, dateSortie) {
        return apiClient.put(`/dossiers/${id}/sortie`, { date_sortie_port: dateSortie });
    }
};