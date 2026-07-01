# SCRIPT DE DÉPLOIEMENT - PRODUCTION (SANS CRÉATION ADMIN)

set -e

echo "Déploiement de PortFlow en production"

PROJECT_DIR="/data/portflow"
BACKUP_DIR="/data/backups/portflow"

mkdir -p $PROJECT_DIR
mkdir -p $BACKUP_DIR

cd $PROJECT_DIR

# 1. Récupérer le code
echo "Récupération du code..."
git pull origin main

# 2. Vérifier que le .env existe
if [ ! -f "backend/.env" ]; then
    echo "Fichier backend/.env manquant !"
    echo "Créez-le avec : cp backend/.env.example backend/.env"
    exit 1
fi

echo "Fichier backend/.env trouvé"

# 3. Sauvegarder la base de données
echo "Sauvegarde de la base de données..."
docker exec portflow_db_prod pg_dump -U postgres portflow > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null || echo "⚠️ Aucune base à sauvegarder"

# 4. Arrêter les conteneurs
echo "Arrêt des conteneurs..."
cd docker
docker-compose -f docker-compose.prod.yml down

# 5. Reconstruire et démarrer
echo "Reconstruire et démarrer..."
docker-compose -f docker-compose.prod.yml up -d --build

# 6. Attendre que le backend soit prêt
echo "Attente du backend..."
sleep 10

# 7. Nettoyer les images inutilisées
echo "Nettoyage..."
docker image prune -f

# 8. Vérifier le statut
echo "Vérification du statut..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "Déploiement terminé !"
echo "Application disponible sur http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Pour créer un compte administrateur, exécutez :"
echo "   ./docker/scripts/create_admin.sh"