from fastapi import FastAPI
from pydantic_settings import BaseSettings, Fields

class Settings(BaseSettings):
    app_name: str = "PortFlow"
    debug: bool = False
    database_url: str = Fields(..., env="DATABASE_URL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
settings = Settings()