#!/bin/bash

# Script de démarrage rapide pour WiFiZone
# Usage: ./start-dev.sh

echo "🚀 Démarrage de WiFiZone en mode développement..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    print_error "Node.js n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si PostgreSQL est en cours d'exécution
print_status "Vérification de PostgreSQL..."
if ! pg_isready -q; then
    print_warning "PostgreSQL n'est pas en cours d'exécution. Veuillez le démarrer."
    print_status "Sur Windows, vérifiez les services ou lancez PostgreSQL manuellement."
fi

# Vérifier si les fichiers .env existent
if [ ! -f "backend/.env" ]; then
    print_warning "Fichier backend/.env manquant. Copie depuis env.example..."
    cp env.example backend/.env
    print_status "Veuillez configurer backend/.env avec vos paramètres de base de données."
fi

if [ ! -f "frontend/.env.local" ]; then
    print_warning "Fichier frontend/.env.local manquant. Copie depuis frontend/env.example..."
    cp frontend/env.example frontend/.env.local
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

# Configuration de la base de données
print_status "Configuration de la base de données..."
cd backend

# Générer le client Prisma
print_status "Génération du client Prisma..."
npx prisma generate

# Vérifier si les migrations ont été appliquées
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
    print_status "Démarrage du backend sur http://localhost:5000..."
    cd backend
    npm run dev
}

# Fonction pour démarrer le frontend
start_frontend() {
    print_status "Démarrage du frontend sur http://localhost:3000..."
    cd frontend
    npm run dev
}

# Démarrer les services en arrière-plan
start_backend &
BACKEND_PID=$!

# Attendre un peu que le backend démarre
sleep 3

start_frontend &
FRONTEND_PID=$!

# Fonction de nettoyage
cleanup() {
    print_status "Arrêt des services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    print_success "Services arrêtés."
    exit 0
}

# Capturer les signaux d'arrêt
trap cleanup SIGINT SIGTERM

print_success "WiFiZone est en cours de démarrage..."
print_status "Backend: http://localhost:5000"
print_status "Frontend: http://localhost:3000"
print_status "Prisma Studio: http://localhost:5555 (lancez 'npx prisma studio' dans backend/)"
print_status ""
print_status "Appuyez sur Ctrl+C pour arrêter tous les services."

# Attendre que les processus se terminent
wait 