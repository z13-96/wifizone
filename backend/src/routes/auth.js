const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validation des données d'inscription
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('phone').isMobilePhone().withMessage('Numéro de téléphone invalide'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('firstName').trim().isLength({ min: 2 }).withMessage('Le prénom doit contenir au moins 2 caractères'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caractères'),
  body('role').isIn(['SELLER', 'CLIENT']).withMessage('Rôle invalide'),
  body('businessName').if(body('role').equals('SELLER')).notEmpty().withMessage('Nom de l\'entreprise requis pour les vendeurs'),
];

// Validation des données de connexion
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

// Route d'inscription
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { email, phone, password, firstName, lastName, role, businessName, businessAddress } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Un utilisateur avec cet email ou numéro de téléphone existe déjà'
      });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        phone,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        isVerified: false,
        sellerProfile: role === 'SELLER' ? {
          create: {
            businessName,
            businessAddress,
            commissionRate: parseFloat(process.env.DEFAULT_COMMISSION_RATE) || 0.05,
            isApproved: false
          }
        } : undefined
      },
      include: {
        sellerProfile: true
      }
    });

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Supprimer le mot de passe de la réponse
    const { password: _, ...userWithoutPassword } = user;

    logger.info('Nouvel utilisateur inscrit', { userId: user.id, email: user.email, role: user.role });

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    logger.error('Erreur lors de l\'inscription', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'inscription'
    });
  }
});

// Route de connexion
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        sellerProfile: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Compte désactivé'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Supprimer le mot de passe de la réponse
    const { password: _, ...userWithoutPassword } = user;

    logger.info('Utilisateur connecté', { userId: user.id, email: user.email, role: user.role });

    res.json({
      success: true,
      message: 'Connexion réussie',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    logger.error('Erreur lors de la connexion', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la connexion'
    });
  }
});

// Route pour récupérer les informations de l'utilisateur connecté
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        sellerProfile: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Supprimer le mot de passe de la réponse
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération du profil', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du profil'
    });
  }
});

// Route pour changer le mot de passe
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
  body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
], async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Récupérer l'utilisateur avec le mot de passe
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Mot de passe actuel incorrect'
      });
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword }
    });

    logger.info('Mot de passe changé', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Mot de passe changé avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors du changement de mot de passe', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors du changement de mot de passe'
    });
  }
});

// Route pour réinitialiser le mot de passe (demande)
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
], async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { email } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Pour des raisons de sécurité, ne pas révéler si l'email existe ou non
      return res.json({
        success: true,
        message: 'Si un compte avec cet email existe, un lien de réinitialisation a été envoyé'
      });
    }

    // Générer un token de réinitialisation
    const resetToken = jwt.sign(
      { id: user.id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // TODO: Envoyer l'email de réinitialisation
    // Pour l'instant, on simule l'envoi

    logger.info('Demande de réinitialisation de mot de passe', { userId: user.id, email });

    res.json({
      success: true,
      message: 'Si un compte avec cet email existe, un lien de réinitialisation a été envoyé'
    });

  } catch (error) {
    logger.error('Erreur lors de la demande de réinitialisation', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la demande de réinitialisation'
    });
  }
});

module.exports = router; 