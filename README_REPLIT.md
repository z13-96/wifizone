# 🌐 WiFiZone sur Replit

## 🚀 Déploiement Rapide

Ce projet est configuré pour fonctionner immédiatement sur Replit !

### 📋 Étapes Simples

1. **Cloner ce repository** sur Replit
2. **Cliquer sur "Run"** - tout se configure automatiquement
3. **Accéder à l'application** via l'URL générée

### 🔧 Configuration Automatique

Le projet inclut :
- ✅ **Configuration Replit** (`.replit`, `replit.nix`)
- ✅ **Script de démarrage** (`replit-start.sh`)
- ✅ **Base de données PostgreSQL** intégrée
- ✅ **Variables d'environnement** préconfigurées
- ✅ **HTTPS automatique** fourni par Replit

## 🌐 Accès à l'Application

Une fois démarrée, votre application sera accessible sur :
```
https://votre-repl.replit.co
```

### 📱 URLs Importantes

- **Frontend** : `https://votre-repl.replit.co`
- **API Backend** : `https://votre-repl.replit.co/api`
- **Documentation API** : `https://votre-repl.replit.co/api/docs`
- **Prisma Studio** : `https://votre-repl.replit.co:5555`

## 🎯 Fonctionnalités Disponibles

### 👤 Authentification
- Inscription utilisateur
- Connexion sécurisée
- Gestion des rôles (ADMIN, SELLER, CLIENT)

### 🎫 Gestion des Tickets
- Création de tickets WiFi
- Gestion des prix et durées
- Codes QR automatiques
- Import/Export en masse

### 💰 Paiements Mobile Money
- **MTN Mobile Money** (simulé)
- **Moov Money** (simulé)
- **Orange Money** (simulé)
- Webhooks de confirmation

### 📊 Interface d'Administration
- Tableau de bord complet
- Gestion des utilisateurs
- Statistiques de vente
- Approbation des vendeurs

### 🔔 Notifications Temps Réel
- Notifications push
- WebSocket intégré
- Historique des notifications

## 🛠️ Commandes Utiles

### Dans la Console Replit

```bash
# Démarrer l'application
npm run replit:start

# Installation complète
npm run replit:setup

# Voir les logs
tail -f backend/logs/app.log

# Ouvrir Prisma Studio
npm run studio

# Redémarrer les services
npm run restart
```

### Tests Rapides

```bash
# Test de l'API
curl https://votre-repl.replit.co/api/health

# Créer un utilisateur de test
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

## 🔧 Configuration Avancée

### Variables d'Environnement

Dans **Tools > Secrets** de Replit, ajoutez :

```bash
# Base de données (optionnel - configurée automatiquement)
DATABASE_URL=postgresql://postgres:password@localhost:5432/wifizone

# JWT Secret (optionnel - généré automatiquement)
JWT_SECRET=votre_secret_jwt_personnalise

# URLs publiques (optionnel - configurées automatiquement)
NEXT_PUBLIC_API_URL=https://votre-repl.replit.co/api
NEXT_PUBLIC_SOCKET_URL=https://votre-repl.replit.co

# Configuration des paiements (simulation)
MTN_MOMO_API_KEY=simulation_key
MOOV_MONEY_API_KEY=simulation_key
ORANGE_MONEY_API_KEY=simulation_key
```

### Base de Données Externe

Pour utiliser une base de données externe (Supabase, Neon, etc.) :

1. Créez votre base de données
2. Ajoutez l'URL dans les Secrets Replit
3. Redémarrez l'application

## 📊 Monitoring

### Logs en Temps Réel
```bash
# Logs backend
tail -f backend/logs/app.log

# Logs PostgreSQL
tail -f /tmp/postgres.log

# Logs Redis
redis-cli monitor
```

### Métriques Replit
- **CPU** : Surveillé automatiquement
- **Mémoire** : Surveillé automatiquement
- **Trafic** : Surveillé automatiquement

## 🔒 Sécurité

### HTTPS Automatique
- Certificats SSL fournis par Replit
- Pas de configuration supplémentaire
- Sécurisé par défaut

### Variables Sensibles
- Utilisez les **Secrets** de Replit
- Ne commitez jamais les fichiers `.env`
- JWT Secret généré automatiquement

## 🚀 Déploiement en Production

### Option 1: Replit Pro
- Déploiement permanent
- Domaine personnalisé
- Plus de ressources

### Option 2: Export vers VPS
```bash
# Cloner le projet
git clone https://github.com/votre-username/wifizone.git

# Configurer sur votre serveur
npm run install:all
npm run setup:db
npm start
```

## 📱 Test Mobile

L'application est responsive et fonctionne parfaitement sur :
- **Android** : Chrome, Firefox, Samsung Internet
- **iOS** : Safari, Chrome
- **PWA** : Installable comme une app native

## 🎯 Cas d'Usage

### Pour les Cyber Cafés
1. Créer un compte vendeur
2. Ajouter des tickets WiFi
3. Vendre aux clients
4. Suivre les statistiques

### Pour les Clients
1. S'inscrire
2. Acheter des tickets
3. Payer via mobile money
4. Utiliser les codes WiFi

### Pour les Administrateurs
1. Gérer les vendeurs
2. Surveiller les ventes
3. Configurer le système
4. Analyser les données

## 🔧 Dépannage

### Problème 1: Application ne démarre pas
```bash
# Vérifier les logs
npm run logs

# Redémarrer
npm run restart

# Réinstaller les dépendances
npm run install:all
```

### Problème 2: Base de données non connectée
```bash
# Vérifier PostgreSQL
psql -h localhost -U postgres -d wifizone

# Réinitialiser
npm run setup:db
```

### Problème 3: Variables d'environnement
```bash
# Vérifier les variables
echo $DATABASE_URL
echo $JWT_SECRET

# Redémarrer après modification
npm run restart
```

## 📞 Support

### Ressources Utiles
- **Documentation API** : `/api/docs`
- **Prisma Studio** : Port 5555
- **Logs** : `backend/logs/`

### Contact
- **Email** : support@wifizone.com
- **GitHub** : [Issues](https://github.com/votre-username/wifizone/issues)

## 🎉 Résultat Final

Votre application WiFiZone sera accessible publiquement avec :

✅ **Interface moderne** et responsive  
✅ **API complète** avec documentation  
✅ **Base de données PostgreSQL** opérationnelle  
✅ **Paiements mobile money** simulés  
✅ **Notifications temps réel** via WebSocket  
✅ **Interface d'administration** complète  
✅ **HTTPS automatique** et sécurisé  
✅ **Monitoring** intégré  

---

**🎊 Félicitations ! Votre plateforme WiFiZone est maintenant déployée et accessible publiquement sur Replit !**

**URL de votre application : `https://votre-repl.replit.co`** 