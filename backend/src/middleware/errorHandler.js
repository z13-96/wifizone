const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log de l'erreur
  logger.error('Error Handler', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || 'anonymous'
  });

  // Erreur Prisma
  if (err.code === 'P2002') {
    const message = 'Une valeur en double a été détectée';
    error = { message, statusCode: 400 };
  }

  if (err.code === 'P2025') {
    const message = 'Enregistrement non trouvé';
    error = { message, statusCode: 404 };
  }

  // Erreur de validation
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token invalide';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expiré';
    error = { message, statusCode: 401 };
  }

  // Erreur de cast MongoDB (si utilisé)
  if (err.name === 'CastError') {
    const message = 'Format d\'ID invalide';
    error = { message, statusCode: 400 };
  }

  // Erreur de limite de taille de fichier
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'Fichier trop volumineux';
    error = { message, statusCode: 400 };
  }

  // Erreur de type de fichier
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Type de fichier non autorisé';
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler }; 