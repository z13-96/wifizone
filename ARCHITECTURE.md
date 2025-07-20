# Architecture WiFiZone - Plateforme de Vente de Tickets Wi-Fi

## 🏗️ Vue d'ensemble

WiFiZone est une plateforme complète permettant aux vendeurs indépendants de créer, importer et vendre des tickets Wi-Fi via Mobile Money. L'architecture suit les principes de séparation des responsabilités et de scalabilité.

## 📁 Structure du Projet

```
wifizone/
├── 📁 backend/                    # API Express.js
│   ├── 📁 src/
│   │   ├── 📁 middleware/         # Middlewares d'authentification et sécurité
│   │   ├── 📁 routes/            # Routes API organisées par fonctionnalité
│   │   ├── 📁 utils/             # Utilitaires et helpers
│   │   ├── 📁 socket/            # Configuration Socket.IO
│   │   └── server.js             # Point d'entrée du serveur
│   ├── 📁 prisma/                # Schéma et migrations de base de données
│   ├── 📁 logs/                  # Fichiers de logs
│   └── package.json
├── 📁 frontend/                   # Application Next.js
│   ├── 📁 src/
│   │   ├── 📁 app/               # Pages et layouts Next.js 14
│   │   ├── 📁 components/        # Composants React réutilisables
│   │   ├── 📁 contexts/          # Contextes React (Auth, etc.)
│   │   ├── 📁 hooks/             # Hooks personnalisés
│   │   ├── 📁 lib/               # Utilitaires et configurations
│   │   ├── 📁 types/             # Types TypeScript
│   │   └── 📁 utils/             # Fonctions utilitaires
│   ├── 📁 public/                # Assets statiques
│   └── package.json
├── 📁 mobile/                     # Application React Native (future)
├── 📁 docs/                       # Documentation technique
├── 📁 scripts/                    # Scripts de déploiement et maintenance
├── package.json                   # Scripts racine
├── README.md                      # Documentation principale
└── ARCHITECTURE.md               # Ce fichier
```

## 🗄️ Base de Données (PostgreSQL + Prisma)

### Modèles Principaux

#### 1. **User** - Utilisateurs de la plateforme
- `id`, `email`, `phone`, `password` (hashé)
- `firstName`, `lastName`, `role` (ADMIN/SELLER/CLIENT)
- `isActive`, `isVerified`, `avatar`
- Relations: `sellerProfile`, `purchases`, `tickets`, `withdrawals`

#### 2. **SellerProfile** - Profils des vendeurs
- `businessName`, `businessAddress`
- `commissionRate`, `balance`, `totalSales`
- `isApproved` - Statut d'approbation admin
- Relations: `user`, `tickets`, `withdrawals`

#### 3. **Ticket** - Tickets Wi-Fi
- `name`, `description`, `duration` (minutes)
- `price`, `quantity`, `remainingQty`
- `isActive` - Statut de disponibilité
- Relations: `seller`, `purchases`

#### 4. **Purchase** - Achats de tickets
- `quantity`, `unitPrice`, `totalAmount`
- `paymentMethod`, `paymentStatus`
- `ticketCode` - Code généré après paiement
- `expiresAt` - Date d'expiration du ticket
- Relations: `user`, `ticket`, `transaction`

#### 5. **Transaction** - Transactions de paiement
- `amount`, `currency`, `paymentMethod`
- `status`, `providerRef`, `providerData`
- Relations: `purchase`, `user`

#### 6. **Withdrawal** - Demandes de retrait
- `amount`, `status`, `paymentMethod`
- `accountDetails` (JSON), `adminNotes`
- Relations: `seller`

#### 7. **Notification** - Notifications système
- `title`, `message`, `type`
- `isRead`, `data` (JSON)
- Relations: `user`

#### 8. **SupportTicket** - Tickets de support
- `subject`, `message`, `status`, `priority`
- `assignedTo`, `resolvedAt`
- Relations: `user`, `responses`

### Enums Principaux

```sql
-- Rôles utilisateur
UserRole: ADMIN, SELLER, CLIENT

-- Méthodes de paiement
PaymentMethod: MTN_MOBILE_MONEY, MOOV_MONEY, ORANGE_MONEY, BANK_TRANSFER

-- Statuts de paiement
PaymentStatus: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED

-- Statuts de retrait
WithdrawalStatus: PENDING, APPROVED, REJECTED, PROCESSED

-- Types de notification
NotificationType: PURCHASE_SUCCESS, PURCHASE_FAILED, WITHDRAWAL_APPROVED, etc.
```

## 🔧 Backend (Node.js + Express)

### Architecture des Routes

#### 1. **Authentication** (`/api/auth`)
- `POST /register` - Inscription utilisateur
- `POST /login` - Connexion
- `GET /me` - Profil utilisateur connecté
- `PUT /change-password` - Changement de mot de passe
- `POST /forgot-password` - Réinitialisation de mot de passe

#### 2. **Users** (`/api/users`)
- `GET /profile` - Profil utilisateur
- `PUT /profile` - Mise à jour du profil
- `GET /stats` - Statistiques utilisateur
- `GET /purchases` - Historique des achats
- `GET /notifications` - Notifications utilisateur

#### 3. **Tickets** (`/api/tickets`)
- `GET /` - Liste des tickets disponibles (public)
- `GET /:id` - Détails d'un ticket
- `POST /` - Créer un ticket (vendeurs)
- `PUT /:id` - Modifier un ticket
- `DELETE /:id` - Supprimer un ticket
- `GET /seller/my-tickets` - Tickets du vendeur
- `POST /import` - Import en lot

#### 4. **Purchases** (`/api/purchases`)
- `POST /` - Créer un achat
- `PUT /:id/confirm` - Confirmer un achat
- `PUT /:id/cancel` - Annuler un achat
- `GET /` - Historique des achats
- `GET /ticket/:code/status` - Statut d'un ticket

#### 5. **Payments** (`/api/payments`)
- `POST /initiate` - Initier un paiement
- `GET /status/:id` - Statut d'un paiement
- `POST /webhook/:provider` - Webhooks de paiement
- `POST /simulate-success/:id` - Simulation (dev)
- `GET /history` - Historique des paiements

#### 6. **Withdrawals** (`/api/withdrawals`)
- `POST /` - Demander un retrait
- `GET /my-withdrawals` - Retraits du vendeur
- `GET /` - Tous les retraits (admin)
- `PUT /:id/approve` - Approuver un retrait
- `PUT /:id/reject` - Rejeter un retrait
- `PUT /:id/process` - Traiter un retrait

#### 7. **Admin** (`/api/admin`)
- `GET /dashboard` - Tableau de bord admin
- `GET /users` - Gestion des utilisateurs
- `PUT /sellers/:id/approve` - Approuver un vendeur
- `PUT /users/:id/toggle-status` - Activer/désactiver un utilisateur
- `GET /stats/detailed` - Statistiques détaillées

#### 8. **Support** (`/api/support`)
- `POST /tickets` - Créer un ticket de support
- `GET /tickets` - Tickets de l'utilisateur
- `GET /tickets/:id` - Détails d'un ticket
- `POST /tickets/:id/respond` - Répondre à un ticket
- `PUT /tickets/:id/close` - Fermer un ticket
- `GET /admin/tickets` - Tous les tickets (admin)

#### 9. **Notifications** (`/api/notifications`)
- `GET /` - Notifications de l'utilisateur
- `PUT /:id/read` - Marquer comme lue
- `PUT /read-all` - Marquer toutes comme lues
- `DELETE /:id` - Supprimer une notification
- `GET /unread-count` - Nombre de non lues

### Middlewares de Sécurité

#### 1. **Authentication**
- Vérification JWT
- Récupération de l'utilisateur depuis la DB
- Vérification du statut actif

#### 2. **Authorization**
- Vérification des rôles (ADMIN, SELLER, CLIENT)
- Middleware `requireApprovedSeller` pour les vendeurs
- Middleware `checkOwnership` pour la propriété des ressources

#### 3. **Sécurité**
- Helmet pour les headers de sécurité
- Rate limiting (100 req/15min par IP)
- CORS configuré
- Validation des données avec express-validator
- Logging complet avec Winston

### Utilitaires

#### 1. **Logger** (`utils/logger.js`)
- Configuration Winston
- Logs dans fichiers et console
- Formatage structuré
- Rotation automatique des logs

#### 2. **Ticket Utils** (`utils/ticketUtils.js`)
- Génération de codes de tickets
- Validation des codes
- Calcul des durées restantes
- Formatage des prix
- Génération de QR codes

## 🎨 Frontend (Next.js 14 + TypeScript)

### Architecture des Pages

#### 1. **Pages Publiques**
- `/` - Page d'accueil avec présentation
- `/auth/login` - Connexion
- `/auth/register` - Inscription
- `/tickets` - Catalogue des tickets

#### 2. **Pages Client**
- `/dashboard` - Tableau de bord client
- `/purchases` - Historique des achats
- `/profile` - Profil utilisateur
- `/support` - Support client

#### 3. **Pages Vendeur**
- `/seller/dashboard` - Tableau de bord vendeur
- `/seller/tickets` - Gestion des tickets
- `/seller/sales` - Statistiques de vente
- `/seller/withdrawals` - Demandes de retrait

#### 4. **Pages Admin**
- `/admin/dashboard` - Tableau de bord admin
- `/admin/users` - Gestion des utilisateurs
- `/admin/withdrawals` - Gestion des retraits
- `/admin/support` - Support admin

### Composants Principaux

#### 1. **Layout Components**
- `Header` - Navigation principale
- `Sidebar` - Menu latéral
- `Footer` - Pied de page
- `AuthGuard` - Protection des routes

#### 2. **UI Components**
- `Button` - Boutons avec variantes
- `Input` - Champs de saisie
- `Card` - Conteneurs de contenu
- `Modal` - Fenêtres modales
- `Table` - Tableaux de données
- `Chart` - Graphiques avec Recharts

#### 3. **Feature Components**
- `TicketCard` - Affichage d'un ticket
- `PurchaseForm` - Formulaire d'achat
- `PaymentMethods` - Sélection de paiement
- `QRCodeDisplay` - Affichage QR code
- `StatsCard` - Cartes de statistiques

### Gestion d'État

#### 1. **Context API**
- `AuthContext` - État d'authentification
- `NotificationContext` - Notifications en temps réel

#### 2. **React Query**
- Cache des données API
- Synchronisation automatique
- Gestion des états de chargement

#### 3. **Zustand** (optionnel)
- État global simple
- Persistance locale

### Styling

#### 1. **TailwindCSS**
- Configuration personnalisée
- Composants utilitaires
- Responsive design
- Thème cohérent

#### 2. **Animations**
- Framer Motion pour les transitions
- Animations d'entrée/sortie
- Micro-interactions

## 🔌 Intégrations

### 1. **Mobile Money APIs**
- **MTN Mobile Money** - API officielle
- **Moov Money** - API officielle  
- **Orange Money** - API officielle
- **Fallback** - Agrégateurs (CinetPay, PayDunya)

### 2. **Notifications**
- **Email** - Nodemailer + templates
- **SMS** - API Twilio ou équivalent local
- **WhatsApp** - WhatsApp Business API
- **Push** - Service Workers (future)

### 3. **Monitoring**
- **Logs** - Winston + rotation
- **Métriques** - Prometheus + Grafana (future)
- **Alertes** - Webhooks + notifications

## 🚀 Déploiement

### 1. **Environnements**
- **Development** - Local avec hot reload
- **Staging** - Tests et validation
- **Production** - Serveur de production

### 2. **Configuration**
- Variables d'environnement par environnement
- Base de données séparée par environnement
- Logs centralisés en production

### 3. **CI/CD** (Future)
- Tests automatisés
- Build et déploiement automatique
- Rollback en cas de problème

## 📱 Application Mobile (Future)

### 1. **React Native**
- Code partagé avec le web
- Interface native
- Notifications push

### 2. **Fonctionnalités**
- Achat de tickets
- Consultation des achats
- QR codes pour connexion
- Notifications en temps réel

## 🔒 Sécurité

### 1. **Authentification**
- JWT avec expiration
- Refresh tokens
- Logout automatique

### 2. **Autorisation**
- Rôles et permissions
- Vérification des propriétés
- Middleware de sécurité

### 3. **Données**
- Validation côté serveur
- Sanitisation des entrées
- Protection contre les injections

### 4. **Paiements**
- Chiffrement des données sensibles
- Webhooks sécurisés
- Audit trail complet

## 📊 Performance

### 1. **Base de Données**
- Index optimisés
- Requêtes paginées
- Cache Redis (future)

### 2. **API**
- Compression gzip
- Rate limiting
- Caching des réponses

### 3. **Frontend**
- Code splitting
- Lazy loading
- Optimisation des images
- Service Workers (future)

## 🧪 Tests

### 1. **Backend**
- Tests unitaires avec Jest
- Tests d'intégration
- Tests de sécurité

### 2. **Frontend**
- Tests composants avec React Testing Library
- Tests E2E avec Playwright
- Tests de performance

## 📈 Scalabilité

### 1. **Architecture**
- Microservices ready
- API Gateway (future)
- Load balancing

### 2. **Base de Données**
- Réplication read/write
- Sharding (future)
- Backup automatisé

### 3. **Cache**
- Redis pour les sessions
- CDN pour les assets
- Cache des API

## 🔧 Maintenance

### 1. **Monitoring**
- Health checks
- Métriques de performance
- Alertes automatiques

### 2. **Backup**
- Base de données quotidienne
- Fichiers de configuration
- Logs archivés

### 3. **Mises à jour**
- Migrations de base de données
- Déploiement sans interruption
- Rollback automatique

---

Cette architecture fournit une base solide pour une plateforme de vente de tickets Wi-Fi scalable, sécurisée et maintenable. Elle peut évoluer selon les besoins métier et les contraintes techniques. 