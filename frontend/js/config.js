const APP_CONFIG={
    //configuration od app's network
    API_URL:'http://localhost:8000/api/v1',

    //Application name
    APP_NAME:'PortFlow',

    //Token storage key
    TOKEN_KEY:'portflow_token',
    USER_KEY:'portflow_user',

    //Application settings
    ALERTE_JOUR_AVANT_ARRIVEE: 5,
    DELAI_FRANCHISE_DEFAUT: 11,
}

console.log('App configuration loaded:', APP_CONFIG);