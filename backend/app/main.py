# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from .config import settings
# from .modules.auth.api import router as auth_router
# from .database import engine
# from .modules.auth.models import Utilisateur  # Import pour créer les tables SQLAlchemy

# # Créer les tables SQLAlchemy (si elles n'existent pas déjà)
# # Note: Normalement les tables sont créées par init_db.py
# # Base.metadata.create_all(bind=engine)

# app = FastAPI(
#     title=settings.APP_NAME,
#     description="API pour la gestion prédictive des surestaries",
#     version="1.0.0"
# )

# # Configuration CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=settings.BACKEND_CORS_ORIGINS,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Inclusion des routers
# app.include_router(auth_router, prefix=settings.API_V1_PREFIX)

# @app.get("/")
# async def root():
#     return {"message": "Bienvenue sur l'API Surestaries", "status": "running"}

# @app.get("/health")
# async def health_check():
#     return {"status": "healthy"}


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings

app = FastAPI(
    title=settings.APP_NAME,
    description="API pour la gestion prédictive des surestaries",
    version="1.0.0"
)

# Parser les origines CORS depuis le .env
def parse_cors_origins(origins_str: str) -> list:
    """Convertit une chaîne 'http://a,http://b' en liste Python"""
    if isinstance(origins_str, list):
        return origins_str
    return [origin.strip() for origin in origins_str.split(",")]

# Configuration CORS

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routers
from .modules.auth.api import router as auth_router
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    return {"message": "Bienvenue sur l'API PortFlow", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}