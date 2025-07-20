const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient();

// Middleware d'authentification
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Vérifier si le token est dans les headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Vérifier si le token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Accès refusé. Token requis.'
      });
    }

    try {
      // Vérifier le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Récupérer l'utilisateur depuis la base de données
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          sellerProfile: true
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Token invalide. Utilisateur non trouvé.'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Compte désactivé.'
        });
      }

      // Ajouter l'utilisateur à la requête
      req.user = user;
      next();

    } catch (error) {
      logger.error('Token verification failed', { error: error.message });
      return res.status(401).json({
        success: false,
        error: 'Token invalide.'
      });
    }

  } catch (error) {
    logger.error('Authentication middleware error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Erreur d\'authentification.'
    });
  }
};

// Middleware pour vérifier les rôles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Accès refusé. Authentification requise.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Permissions insuffisantes.'
      });
    }

    next();
  };
};

// Middleware pour vérifier si l'utilisateur est un vendeur approuvé
const requireApprovedSeller = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Accès refusé. Authentification requise.'
      });
    }

    if (req.user.role !== 'SELLER') {
      return res.status(403).json({
        success: false,
        error: 'Accès refusé. Rôle vendeur requis.'
      });
    }

    if (!req.user.sellerProfile) {
      return res.status(403).json({
        success: false,
        error: 'Profil vendeur non configuré.'
      });
    }

    if (!req.user.sellerProfile.isApproved) {
      return res.status(403).json({
        success: false,
        error: 'Compte vendeur en attente d\'approbation.'
      });
    }

    next();
  } catch (error) {
    logger.error('Approved seller check error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Erreur de vérification du statut vendeur.'
    });
  }
};

// Middleware pour vérifier la propriété de la ressource
const checkOwnership = (model, idField = 'id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idField];
      const userId = req.user.id;

      const resource = await prisma[model].findUnique({
        where: { id: resourceId },
        include: {
          user: true
        }
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Ressource non trouvée.'
        });
      }

      // Vérifier si l'utilisateur est propriétaire ou admin
      if (resource.userId !== userId && req.user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Accès refusé. Vous n\'êtes pas autorisé à accéder à cette ressource.'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Ownership check error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Erreur de vérification de propriété.'
      });
    }
  };
};

module.exports = {
  authenticate,
  authorize,
  requireApprovedSeller,
  checkOwnership
}; 