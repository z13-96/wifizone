const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const { logger } = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { notFound } = require('./middleware/notFound');
const { authenticateSocket } = require('./middleware/socketAuth');

// Import des routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const ticketRoutes = require('./routes/tickets');
const purchaseRoutes = require('./routes/purchases');
const paymentRoutes = require('./routes/payments');
const withdrawalRoutes = require('./routes/withdrawals');
const adminRoutes = require('./routes/admin');
const supportRoutes = require('./routes/support');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = createServer(app);

// Configuration Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware Socket.IO
io.use(authenticateSocket);

// Configuration des middlewares de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Configuration CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par fenêtre
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // permettre 50 requêtes par 15 minutes sans délai
  delayMs: 500 // ajouter 500ms de délai par requête après 50 requêtes
});

app.use(limiter);
app.use(speedLimiter);

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Parsing des requêtes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes de base
app.get('/', (req, res) => {
  res.json({
    message: 'WiFiZone API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/notifications', notificationRoutes);

// Gestion des erreurs
app.use(notFound);
app.use(errorHandler);

// Configuration Socket.IO events
require('./socket')(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 Serveur WiFiZone démarré sur le port ${PORT}`);
  logger.info(`📱 Mode: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 URL: http://localhost:${PORT}`);
});

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', () => {
  logger.info('SIGTERM reçu, arrêt gracieux du serveur...');
  server.close(() => {
    logger.info('Processus terminé');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT reçu, arrêt gracieux du serveur...');
  server.close(() => {
    logger.info('Processus terminé');
    process.exit(0);
  });
});

module.exports = { app, server, io }; 