from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "PortFlow"
    API_V1_PREFIX: str = "/api/v1"
    # Application URL (pour les liens dans les emails)
    APP_URL: str = "http://localhost:8000"  # En développement
    # APP_URL: str = "http://portflow.entreprise.com"  # En production
    
    # Base de données
    DATABASE_URL: str
    DB_USER: str       
    DB_PASSWORD: str    
    DB_NAME: str       
    DB_PORT: str        
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 59
    APP_NAME: str = "PortFlow"
    API_V1_PREFIX: str = "/api/v1"

    # SMTP (Notifications email)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "PortFlow <noreply@portflow.com>"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # ← Ignore les champs supplémentaires dans .env

settings = Settings()