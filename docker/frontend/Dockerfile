# docker/frontend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Copier les fichiers du frontend
COPY frontend/ .

# Démarrer un serveur HTTP simple
CMD ["python", "-m", "http.server", "5500", "--bind", "0.0.0.0"]

EXPOSE 8080