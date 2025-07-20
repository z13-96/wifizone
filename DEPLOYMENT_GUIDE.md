# Guide de Déploiement - WiFiZone

## 🚀 Simulation du Déploiement Local

### Prérequis

1. **Node.js** (version 18+)
2. **PostgreSQL** (version 14+)
3. **Git**
4. **npm** ou **yarn**

### 1. Configuration de la Base de Données

```bash
# Installer PostgreSQL (Windows)
# Télécharger depuis: https://www.postgresql.org/download/windows/

# Créer une base de données
psql -U postgres
CREATE DATABASE wifizone;
CREATE USER wifizone_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE wifizone TO wifizone_user;
\q
```

### 2. Configuration des Variables d'Environnement

#### Backend (.env)
```bash
# Copier le fichier d'exemple
cp env.example backend/.env

# Éditer backend/.env avec vos valeurs
DATABASE_URL="postgresql://wifizone_user:votre_mot_de_passe@localhost:5432/wifizone"
JWT_SECRET="votre_jwt_secret_tres_securise"
PORT=5000
NODE_ENV=development

# Configuration des paiements (simulation)
MTN_MOMO_API_KEY="simulation_key"
MOOV_MONEY_API_KEY="simulation_key"
ORANGE_MONEY_API_KEY="simulation_key"

# Configuration email (optionnel pour le développement)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="votre_email@gmail.com"
SMTP_PASS="votre_mot_de_passe_app"
```

#### Frontend (.env.local)
```bash
# Copier le fichier d'exemple
cp frontend/env.example frontend/.env.local

# Éditer frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### 3. Installation des Dépendances

```bash
# Installation des dépendances racine
npm install

# Installation des dépendances backend
cd backend
npm install

# Installation des dépendances frontend
cd ../frontend
npm install
```

### 4. Configuration de la Base de Données

```bash
# Retourner dans le dossier backend
cd ../backend

# Générer le client Prisma
npx prisma generate

# Exécuter les migrations
npx prisma migrate dev --name init

# (Optionnel) Seeder avec des données de test
npx prisma db seed
```

### 5. Démarrage des Services

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

#### Terminal 3 - Base de Données (si nécessaire)
```bash
# Vérifier que PostgreSQL est en cours d'exécution
# Sur Windows, vérifier dans les services
```

### 6. Vérification du Déploiement

1. **Backend API**: http://localhost:5000
   - Test: http://localhost:5000/api/health
   - Documentation: http://localhost:5000/api/docs

2. **Frontend**: http://localhost:3000
   - Page d'accueil
   - Interface d'authentification

3. **Base de Données**: 
   - Prisma Studio: `npx prisma studio` (http://localhost:5555)

### 7. Tests de Fonctionnalités

#### Créer un Compte Admin
```bash
# Via l'API ou directement en base
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wifizone.com",
    "password": "admin123",
    "firstName": "Admin",
    "lastName": "User",
    "phone": "+2250123456789",
    "role": "ADMIN"
  }'
```

#### Créer un Vendeur
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vendeur@wifizone.com",
    "password": "vendeur123",
    "firstName": "Vendeur",
    "lastName": "Test",
    "phone": "+2250123456790",
    "role": "SELLER",
    "businessName": "Cyber Café Central",
    "businessAddress": "123 Rue Principale, Abidjan"
  }'
```

### 8. Simulation des Paiements

Le système inclut une simulation des paiements mobile money :

```bash
# Simuler un paiement
curl -X POST http://localhost:5000/api/payments/simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{
    "purchaseId": "ID_ACHAT",
    "paymentMethod": "MTN_MOMO",
    "phoneNumber": "+2250123456789"
  }'
```

### 9. Monitoring et Logs

#### Logs Backend
```bash
# Voir les logs en temps réel
tail -f backend/logs/app.log

# Logs d'erreur
tail -f backend/logs/error.log
```

#### Monitoring Base de Données
```bash
# Ouvrir Prisma Studio
cd backend
npx prisma studio
```

### 10. Tests de Performance

```bash
# Test de charge simple avec Apache Bench
ab -n 100 -c 10 http://localhost:5000/api/health

# Test avec Artillery (si installé)
npm install -g artillery
artillery quick --count 50 --num 10 http://localhost:5000/api/health
```

### 11. Déploiement en Production (Simulation)

#### Avec Docker (Optionnel)
```bash
# Créer les images Docker
docker build -t wifizone-backend ./backend
docker build -t wifizone-frontend ./frontend

# Lancer avec Docker Compose
docker-compose up -d
```

#### Avec PM2 (Process Manager)
```bash
# Installer PM2
npm install -g pm2

# Démarrer le backend
cd backend
pm2 start src/server.js --name "wifizone-backend"

# Démarrer le frontend
cd ../frontend
pm2 start npm --name "wifizone-frontend" -- run start

# Monitoring
pm2 monit
```

### 12. Sécurité et SSL

Pour simuler HTTPS en local :

```bash
# Générer des certificats auto-signés
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configurer le serveur pour utiliser HTTPS
# Modifier backend/src/server.js pour inclure les certificats
```

### 13. Sauvegarde et Restauration

```bash
# Sauvegarde de la base de données
pg_dump -U wifizone_user wifizone > backup_$(date +%Y%m%d_%H%M%S).sql

# Restauration
psql -U wifizone_user wifizone < backup_20231201_120000.sql
```

### 14. Troubleshooting

#### Problèmes Courants

1. **Erreur de connexion à la base de données**
   ```bash
   # Vérifier que PostgreSQL est démarré
   # Vérifier les paramètres de connexion dans .env
   ```

2. **Erreur de port déjà utilisé**
   ```bash
   # Changer le port dans .env
   PORT=5001
   ```

3. **Erreur de migration Prisma**
   ```bash
   # Réinitialiser la base de données
   npx prisma migrate reset
   npx prisma migrate dev
   ```

4. **Erreur de dépendances**
   ```bash
   # Nettoyer et réinstaller
   rm -rf node_modules package-lock.json
   npm install
   ```

### 15. Métriques et Monitoring

#### Métriques à Surveiller
- Temps de réponse API
- Utilisation CPU/Mémoire
- Connexions base de données
- Erreurs 4xx/5xx
- Taux de conversion des paiements

#### Outils de Monitoring
- **Backend**: Winston logs + métriques personnalisées
- **Frontend**: Console browser + React DevTools
- **Base de données**: Prisma Studio + pgAdmin

### 16. Prochaines Étapes

1. **Tests Automatisés**
   ```bash
   npm run test
   npm run test:e2e
   ```

2. **CI/CD Pipeline**
   - GitHub Actions
   - Déploiement automatique
   - Tests automatisés

3. **Monitoring Production**
   - Sentry pour les erreurs
   - New Relic pour les performances
   - Logs centralisés

4. **Sécurité**
   - Audit de sécurité
   - Tests de pénétration
   - Mise à jour des dépendances

---

## 🎯 Résumé du Déploiement

Votre application WiFiZone est maintenant prête pour le déploiement avec :

✅ **Backend API** fonctionnel sur http://localhost:5000  
✅ **Frontend Next.js** sur http://localhost:3000  
✅ **Base de données PostgreSQL** configurée  
✅ **Authentification JWT** opérationnelle  
✅ **Paiements simulés** pour les tests  
✅ **Notifications temps réel** via Socket.IO  
✅ **Interface d'administration** complète  

Vous pouvez maintenant tester toutes les fonctionnalités et préparer le déploiement en production ! 