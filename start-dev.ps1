# Script de démarrage rapide pour WiFiZone (Windows PowerShell)
# Usage: .\start-dev.ps1

Write-Host "🚀 Démarrage de WiFiZone en mode développement..." -ForegroundColor Cyan

# Fonction pour afficher les messages
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Vérifier si Node.js est installé
try {
    $nodeVersion = node --version
    Write-Status "Node.js détecté: $nodeVersion"
} catch {
    Write-Error "Node.js n'est pas installé. Veuillez l'installer d'abord."
    exit 1
}

# Vérifier si PostgreSQL est en cours d'exécution
Write-Status "Vérification de PostgreSQL..."
try {
    $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
    if ($pgService -and $pgService.Status -eq "Running") {
        Write-Success "PostgreSQL est en cours d'exécution."
    } else {
        Write-Warning "PostgreSQL n'est pas en cours d'exécution. Veuillez le démarrer."
        Write-Status "Vous pouvez le démarrer via les services Windows ou pgAdmin."
    }
} catch {
    Write-Warning "Impossible de vérifier le statut de PostgreSQL."
}

# Vérifier si les fichiers .env existent
if (-not (Test-Path "backend\.env")) {
    Write-Warning "Fichier backend\.env manquant. Copie depuis env.example..."
    Copy-Item "env.example" "backend\.env"
    Write-Status "Veuillez configurer backend\.env avec vos paramètres de base de données."
}

if (-not (Test-Path "frontend\.env.local")) {
    Write-Warning "Fichier frontend\.env.local manquant. Copie depuis frontend\env.example..."
    Copy-Item "frontend\env.example" "frontend\.env.local"
}

# Installation des dépendances si nécessaire
Write-Status "Vérification des dépendances..."

if (-not (Test-Path "backend\node_modules")) {
    Write-Status "Installation des dépendances backend..."
    Set-Location backend
    npm install
    Set-Location ..
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Status "Installation des dépendances frontend..."
    Set-Location frontend
    npm install
    Set-Location ..
}

# Configuration de la base de données
Write-Status "Configuration de la base de données..."
Set-Location backend

# Générer le client Prisma
Write-Status "Génération du client Prisma..."
npx prisma generate

# Vérifier si les migrations ont été appliquées
if (-not (Test-Path "prisma\migrations") -or (Get-ChildItem "prisma\migrations" -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) {
    Write-Status "Application des migrations initiales..."
    npx prisma migrate dev --name init
} else {
    Write-Status "Migrations déjà appliquées."
}

Set-Location ..

# Démarrer les services
Write-Status "Démarrage des services..."

# Démarrer le backend
Write-Status "Démarrage du backend sur http://localhost:5000..."
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\backend
    npm run dev
}

# Attendre un peu que le backend démarre
Start-Sleep -Seconds 3

# Démarrer le frontend
Write-Status "Démarrage du frontend sur http://localhost:3000..."
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\frontend
    npm run dev
}

Write-Success "WiFiZone est en cours de démarrage..."
Write-Status "Backend: http://localhost:5000"
Write-Status "Frontend: http://localhost:3000"
Write-Status "Prisma Studio: http://localhost:5555 (lancez 'npx prisma studio' dans backend/)"
Write-Host ""
Write-Status "Appuyez sur Ctrl+C pour arrêter tous les services."

# Fonction de nettoyage
function Stop-Services {
    Write-Status "Arrêt des services..."
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    Write-Success "Services arrêtés."
}

# Capturer les signaux d'arrêt
try {
    # Afficher les logs en temps réel
    while ($true) {
        $backendOutput = Receive-Job $backendJob -ErrorAction SilentlyContinue
        $frontendOutput = Receive-Job $frontendJob -ErrorAction SilentlyContinue
        
        if ($backendOutput) {
            Write-Host "[BACKEND] $backendOutput" -ForegroundColor Magenta
        }
        if ($frontendOutput) {
            Write-Host "[FRONTEND] $frontendOutput" -ForegroundColor Cyan
        }
        
        Start-Sleep -Milliseconds 500
    }
} catch {
    Write-Status "Arrêt demandé par l'utilisateur."
} finally {
    Stop-Services
} 