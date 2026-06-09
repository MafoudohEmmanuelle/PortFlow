// API du dashboard
const DashboardAPI = {
    async getAdminStats() {
        return apiClient.get('/dashboard/admin/stats');
    },
    
    async getAcheteurStats() {
        return apiClient.get('/dashboard/acheteur/stats');
    }
};