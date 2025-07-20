#!/bin/bash

# Script de démarrage WiFiZone pour Replit
# Ce script configure et démarre l'application sur Replit

echo "🚀 Démarrage de WiFiZone sur Replit..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction pour afficher les messages
print_status() {
    echo -e "${BLUE}[REPLIT]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si nous sommes sur Replit
if [ -z "$REPL_ID" ]; then
    print_warning "Ce script est conçu pour Replit. Certaines fonctionnalités peuvent ne pas fonctionner."
fi

# Configuration de l'environnement Replit
print_status "Configuration de l'environnement Replit..."

# Créer les dossiers nécessaires
mkdir -p backend/logs
mkdir -p frontend/.next
mkdir -p /tmp/postgres_data

# Configuration de PostgreSQL pour Replit
print_status "Configuration de PostgreSQL..."

# Initialiser la base de données PostgreSQL si elle n'existe pas
if [ ! -d "/tmp/postgres_data/base" ]; then
    print_status "Initialisation de PostgreSQL..."
    initdb -D /tmp/postgres_data -E utf8 --locale=C
fi

# Démarrer PostgreSQL
print_status "Démarrage de PostgreSQL..."
pg_ctl -D /tmp/postgres_data -l /tmp/postgres.log start

# Attendre que PostgreSQL soit prêt
sleep 3

# Créer la base de données si elle n'existe pas
if ! psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw wifizone; then
    print_status "Création de la base de données wifizone..."
    createdb -h localhost -U postgres wifizone
fi

# Configuration de Redis
print_status "Configuration de Redis..."
redis-server --daemonize yes --port 6379

# Vérifier les variables d'environnement
print_status "Vérification des variables d'environnement..."

if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="postgresql://postgres:password@localhost:5432/wifizone"
    print_warning "DATABASE_URL non définie, utilisation de la valeur par défaut"
fi

if [ -z "$JWT_SECRET" ]; then
    export JWT_SECRET="replit_jwt_secret_$(date +%s)"
    print_warning "JWT_SECRET non définie, génération automatique"
fi

# Installation des dépendances si nécessaire
print_status "Vérification des dépendances..."

if [ ! -d "backend/node_modules" ]; then
    print_status "Installation des dépendances backend..."
    cd backend
    npm install
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    print_status "Installation des dépendances frontend..."
    cd frontend
    npm install
    cd ..
fi

# Configuration de Prisma
print_status "Configuration de Prisma..."
cd backend

# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
if [ ! -d "prisma/migrations" ] || [ -z "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    print_status "Application des migrations initiales..."
    npx prisma migrate dev --name init
else
    print_status "Migrations déjà appliquées."
fi

cd ..

# Démarrer les services
print_status "Démarrage des services..."

# Fonction pour démarrer le backend
start_backend() {
    print_status "Démarrage du backend sur le port $PORT..."
    cd backend
    npm start
}

# Fonction pour démarrer le frontend
start_frontend() {
    print_status "Démarrage du frontend..."
    cd frontend
    npm start
}

# Démarrer le backend en arrière-plan
start_backend &
BACKEND_PID=$!

# Attendre que le backend démarre
sleep 5

# Démarrer le frontend en arrière-plan
start_frontend &
FRONTEND_PID=$!

# Fonction de nettoyage
cleanup() {
    print_status "Arrêt des services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    pg_ctl -D /tmp/postgres_data stop
    redis-cli shutdown
    print_success "Services arrêtés."
    exit 0
}

# Capturer les signaux d'arrêt
trap cleanup SIGINT SIGTERM

# Afficher les informations de connexion
print_success "WiFiZone est en cours de démarrage sur Replit..."
echo ""
print_status "📊 URLs d'accès:"
print_status "   Frontend: https://$REPL_SLUG.$REPL_OWNER.repl.co"
print_status "   Backend API: https://$REPL_SLUG.$REPL_OWNER.repl.co/api"
print_status "   Prisma Studio: https://$REPL_SLUG.$REPL_OWNER.repl.co:5555"
echo ""
print_status "🔧 Services démarrés:"
print_status "   ✅ PostgreSQL sur localhost:5432"
print_status "   ✅ Redis sur localhost:6379"
print_status "   ✅ Backend API sur le port $PORT"
print_status "   ✅ Frontend Next.js"
echo ""
print_status "📝 Logs disponibles:"
print_status "   Backend: backend/logs/app.log"
print_status "   PostgreSQL: /tmp/postgres.log"
echo ""
print_status "Appuyez sur Ctrl+C pour arrêter tous les services."

# Attendre que les processus se terminent
wait 