from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "PortFlow"
    API_V1_PREFIX: str = "/api/v1"
    # Application URL (pour les liens dans les emails)
    APP_URL: str = "http://localhost:5500"  # En développement
    # APP_URL: str = "http://portflow.entreprise.com"  # En production
    
    # Base de données
    DATABASE_URL: str
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    APP_NAME: str = "PortFlow"
    API_V1_PREFIX: str = "/api/v1"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # ← Ignore les champs supplémentaires dans .env

settings = Settings()