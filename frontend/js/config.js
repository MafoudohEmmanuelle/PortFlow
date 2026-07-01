const APP_CONFIG = {
    // NB: En production, utiliser une URL relative
    // Le proxy Nginx redirige /api/ vers le backend
    API_URL: '',  // ← Vide = utilise le même serveur
    API_PREFIX: '/api/v1',
    APP_NAME: 'PortFlow',
    VERSION: '1.0.0',
    TOKEN_KEY: 'portflow_token',
    USER_KEY: 'portflow_user'
};

// URL complète (calculée automatiquement)
APP_CONFIG.API_BASE_URL = APP_CONFIG.API_URL + APP_CONFIG.API_PREFIX;

console.log('Configuration chargée:', {
    API_BASE_URL: APP_CONFIG.API_BASE_URL || '/api/v1',
    APP_NAME: APP_CONFIG.APP_NAME
});