from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .modules.alertes.scheduler import scheduler
import threading

app = FastAPI(
    title=settings.APP_NAME,
    description="APP pour la gestion prédictive des surestaries",
    version="1.0.0",
    swagger_ui_parameters={
        "persistAuthorization": True,  # Garde le token après rafraîchissement
    }
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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # ← AJOUTER PUT et DELETE allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusion des routers
from .modules.auth.api import router as auth_router
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)

# Puis après app.include_router(auth_router...) pour les users
from .modules.users.api import router as users_router
app.include_router(users_router, prefix=settings.API_V1_PREFIX)

# Ajouter cette ligne après les autres include_router pour le dashboard
from .modules.dashboard.api import router as dashboard_router
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX)

from .modules.referentiels.api import router as referentiels_router
app.include_router(referentiels_router, prefix=settings.API_V1_PREFIX)

from .modules.documents.api import router as dossier_document_router
app.include_router(dossier_document_router, prefix=settings.API_V1_PREFIX)

from .modules.dossiers.api import router as dossier_importation_router
app.include_router(dossier_importation_router, prefix=settings.API_V1_PREFIX) 

@app.get("/")
async def root():
    return {"message": "Bienvenue sur l'API PortFlow", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.on_event("startup")
async def startup_event():
    """Démarre le scheduler au lancement de l'application"""
    # Démarrer le scheduler dans un thread séparé (pas bloquant pour l'API)
    import threading
    threading.Thread(target=scheduler.start, daemon=True).start()
    print("✅ Scheduler des alertes démarré")

@app.on_event("shutdown")
async def shutdown_event():
    """Arrête le scheduler à l'arrêt de l'application"""
    scheduler.stop()
    print("🛑 Scheduler des alertes arrêté")

# backend/app/main.py
from app.modules.dossiers.scheduler import dossier_scheduler

@app.on_event("startup")
async def startup_event():
    # Scheduler des alertes (déjà existant)
    threading.Thread(target=scheduler.start, daemon=True).start()
    
    # Scheduler des statuts (NOUVEAU)
    threading.Thread(target=dossier_scheduler.start, daemon=True).start()