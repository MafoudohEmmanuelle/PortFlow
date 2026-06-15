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
        console.log(' POST /dossiers - Données envoyées:', data);
        return apiClient.post('/dossiers', data);
    },
    
    // Modifier un dossier
    async update(id, data) {
        console.log(`PUT /dossiers/${id} - Données envoyées:`, data);
        return apiClient.put(`/dossiers/${id}`, data);
    },
    
    // Supprimer un dossier
    async delete(id) {
        return apiClient.delete(`/dossiers/${id}`);
    },
    
    // Enregistrer la date de départ
    async updateDepart(id, dateDepart) {
        return apiClient.put(`/dossiers/${id}/depart?date_depart=${dateDepart}`, {});
    },
    
    // Enregistrer la date d'arrivée
    async updateArrivee(id, dateArrivee) {
        console.log(` PUT /dossiers/${id}/arrivee - Date:`, dateArrivee);
        return apiClient.put(`/dossiers/${id}/arrivee`, { date_arrivee: dateArrivee });
    },
    
    // Enregistrer la date de sortie
    async updateSortie(id, dateSortie) {
        console.log(`PUT /dossiers/${id}/sortie - Date:`, dateSortie);
        return apiClient.put(`/dossiers/${id}/sortie`, { date_sortie_port: dateSortie });
    }
};