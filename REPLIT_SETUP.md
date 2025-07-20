# 🚀 Configuration WiFiZone sur Replit

## 📋 Prérequis

1. **Compte Replit** (gratuit sur [replit.com](https://replit.com))
2. **Git** pour cloner le projet
3. **Base de données externe** (optionnel, Replit fournit PostgreSQL)

## 🔧 Étapes de Configuration

### 1. Créer un nouveau Repl

1. Connectez-vous à [replit.com](https://replit.com)
2. Cliquez sur **"Create Repl"**
3. Choisissez **"Import from GitHub"**
4. Collez l'URL de votre repository WiFiZone
5. Sélectionnez **"Node.js"** comme langage
6. Cliquez sur **"Import from GitHub"**

### 2. Configuration de l'Environnement

Replit va automatiquement détecter les fichiers `.replit` et `replit.nix` et configurer l'environnement.

### 3. Variables d'Environnement

Dans Replit, allez dans **"Tools" > "Secrets"** et ajoutez :

```bash
# Base de données (utilisez la base de données Replit ou externe)
DATABASE_URL=postgresql://postgres:password@localhost:5432/wifizone

# JWT Secret
JWT_SECRET=votre_jwt_secret_tres_securise_pour_replit

# Configuration des paiements (simulation)
MTN_MOMO_API_KEY=simulation_key
MOOV_MONEY_API_KEY=simulation_key
ORANGE_MONEY_API_KEY=simulation_key

# URLs publiques (Replit génère automatiquement)
NEXT_PUBLIC_API_URL=https://votre-repl.replit.co/api
NEXT_PUBLIC_SOCKET_URL=https://votre-repl.replit.co

# Configuration email (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_app
```

### 4. Installation et Configuration

Dans la console Replit, exécutez :

```bash
# Installation de toutes les dépendances
npm run install:all

# Configuration de la base de données
npm run setup:db

# Démarrer l'application
npm run replit:start
```

### 5. Configuration de la Base de Données

#### Option A: Base de données Replit (Recommandée)

Replit fournit PostgreSQL gratuitement. Utilisez ces paramètres :

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/wifizone
```

#### Option B: Base de données externe

Vous pouvez utiliser :
- **Supabase** (gratuit)
- **Neon** (gratuit)
- **Railway** (gratuit)
- **Heroku Postgres** (payant)

### 6. Démarrer l'Application

```bash
# Méthode 1: Script automatique
npm run replit:setup

# Méthode 2: Manuel
npm run install:all
npm run setup:db
npm run start:services
```

## 🌐 Accès à l'Application

Une fois démarrée, votre application sera accessible sur :
- **URL publique** : `https://votre-repl.replit.co`
- **Frontend** : `https://votre-repl.replit.co`
- **Backend API** : `https://votre-repl.replit.co/api`
- **Prisma Studio** : `https://votre-repl.replit.co:5555`

## 🔍 Vérification du Déploiement

### Test de l'API

```bash
# Test de santé
curl https://votre-repl.replit.co/api/health

# Test d'inscription
curl -X POST https://votre-repl.replit.co/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@wifizone.com",
    "password": "test123",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+2250123456789",
    "role": "CLIENT"
  }'
```

### Test du Frontend

Ouvrez votre navigateur et allez sur `https://votre-repl.replit.co`

## 🛠️ Commandes Utiles

```bash
# Voir les logs
npm run logs

# Redémarrer l'application
npm run restart

# Arrêter l'application
npm run stop

# Ouvrir Prisma Studio
npm run studio

# Voir les processus en cours
ps aux | grep node
```

## 🔧 Dépannage

### Problème 1: Port déjà utilisé
```bash
# Vérifier les processus
lsof -i :3000
lsof -i :5000

# Tuer les processus
kill -9 <PID>
```

### Problème 2: Base de données non connectée
```bash
# Vérifier la connexion PostgreSQL
psql -h localhost -U postgres -d wifizone

# Réinitialiser la base de données
npm run setup:db
```

### Problème 3: Dépendances manquantes
```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm run install:all
```

### Problème 4: Variables d'environnement
```bash
# Vérifier les variables
echo $DATABASE_URL
echo $JWT_SECRET

# Redémarrer après modification
npm run restart
```

## 📊 Monitoring

### Logs en Temps Réel
```bash
# Logs backend
tail -f backend/logs/app.log

# Logs frontend
tail -f frontend/.next/server.log
```

### Métriques
- **CPU** : Surveillé par Replit
- **Mémoire** : Surveillé par Replit
- **Trafic** : Surveillé par Replit

## 🔒 Sécurité

### Variables Sensibles
- Ne jamais commiter les fichiers `.env`
- Utiliser les **Secrets** de Replit
- Changer les mots de passe par défaut

### HTTPS
- Replit fournit automatiquement HTTPS
- Certificats SSL automatiques
- Pas de configuration supplémentaire nécessaire

## 🚀 Déploiement en Production

### Option 1: Replit Pro
- Déploiement permanent
- Domaine personnalisé
- Plus de ressources

### Option 2: Export vers VPS
```bash
# Exporter le code
git clone https://github.com/votre-username/wifizone.git

# Configurer sur votre serveur
npm run install:all
npm run setup:db
npm start
```

## 📱 Test Mobile

Votre application est responsive et fonctionne sur mobile :
- **Android** : Chrome, Firefox
- **iOS** : Safari, Chrome
- **PWA** : Installable comme une app native

## 🎯 Fonctionnalités Testées

✅ **Authentification** - Inscription/Connexion  
✅ **Gestion des tickets** - CRUD complet  
✅ **Paiements simulés** - MTN, Moov, Orange  
✅ **Notifications temps réel** - WebSocket  
✅ **Interface admin** - Gestion des utilisateurs  
✅ **API REST** - Toutes les routes  
✅ **Base de données** - PostgreSQL + Prisma  
✅ **Frontend** - Next.js + TailwindCSS  

## 🎉 Résultat Final

Votre application WiFiZone sera accessible publiquement sur :
**`https://votre-repl.replit.co`**

Avec toutes les fonctionnalités opérationnelles :
- Interface utilisateur moderne
- API backend complète
- Base de données PostgreSQL
- Paiements mobile money simulés
- Notifications temps réel
- Interface d'administration

---

**🎊 Félicitations ! Votre application WiFiZone est maintenant déployée et accessible publiquement sur Replit !** 