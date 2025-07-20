# Dockerfile pour le backend WiFiZone
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances
RUN npm ci --only=production

# Générer le client Prisma
RUN npx prisma generate

# Copier le code source
COPY . .

# Créer le dossier de logs
RUN mkdir -p logs

# Exposer le port
EXPOSE 5000

# Commande par défaut
CMD ["npm", "start"] 