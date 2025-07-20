# WiFiZone - Plateforme de Vente de Tickets Wi-Fi

## 📋 Description

WiFiZone est une plateforme web et mobile permettant aux vendeurs indépendants de créer, importer et vendre des tickets Hotspot (MikroTik) via Mobile Money (MTN, Moov, Orange).

## 🏗️ Architecture

- **Frontend**: Next.js 14 + TailwindCSS
- **Backend**: Node.js + Express
- **Base de données**: PostgreSQL
- **ORM**: Prisma
- **Paiements**: Intégration Mobile Money (MTN, Moov, Orange)

## 🚀 Installation

### Prérequis
- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### Installation complète

```bash
# Cloner le projet
git clone <repository-url>
cd wifizone

# Installer toutes les dépendances
npm run install:all

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos configurations

# Générer le client Prisma
npm run db:generate

# Exécuter les migrations
npm run db:migrate

# Lancer le projet en développement
npm run dev
```

## 📁 Structure du Projet

```
wifizone/
├── frontend/                 # Application Next.js
├── backend/                  # API Express
├── mobile/                   # Application React Native (future)
├── docs/                     # Documentation
└── scripts/                  # Scripts utilitaires
```

## 🔧 Configuration

### Variables d'environnement

Créer un fichier `.env` à la racine :

```env
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/wifizone"

# JWT
JWT_SECRET="votre-secret-jwt"

# Mobile Money APIs
MTN_API_KEY=""
MOOV_API_KEY=""
ORANGE_API_KEY=""

# Email
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASS=""

# WhatsApp Business API
WHATSAPP_API_KEY=""
```

## 🎯 Fonctionnalités

### Espace Vendeur
- ✅ Création de compte
- ✅ Importation de tickets
- ✅ Fixation des prix
- ✅ Statistiques de vente
- ✅ Gestion du solde
- ✅ Demandes de retrait

### Espace Client
- ✅ Interface d'achat simple
- ✅ Paiement Mobile Money
- ✅ Réception automatique de tickets

### Espace Admin
- ✅ Gestion globale
- ✅ Commissionnement
- ✅ Validation des retraits
- ✅ Support utilisateurs

## 📱 Application Mobile

L'application mobile sera développée en React Native pour :
- **Clients**: Achat de tickets et réception automatique
- **Vendeurs**: Consultation des ventes, solde et demandes de retrait

## 🔒 Sécurité

- Connexion HTTPS
- Protection anti-fraude
- Logs de sécurité
- Sauvegardes automatiques
- Validation des paiements

## 📊 Statistiques

- Graphiques de ventes
- Historique des transactions
- Rapports par vendeur
- Analyses par période

## 🆘 Support

- Support par chat/WhatsApp
- Notifications par email/WhatsApp
- Documentation utilisateur

## 🛠️ Développement

```bash
# Lancer en mode développement
npm run dev

# Lancer uniquement le frontend
npm run dev:frontend

# Lancer uniquement le backend
npm run dev:backend

# Ouvrir Prisma Studio
npm run db:studio
```

## 📝 Scripts Disponibles

- `npm run dev` - Lance le projet complet
- `npm run build` - Build de production
- `npm run db:migrate` - Exécute les migrations
- `npm run db:studio` - Interface Prisma Studio

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commit vos changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 📄 Licence

MIT License 