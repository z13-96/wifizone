const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Route pour initier un paiement
router.post('/initiate', authenticate, [
  body('purchaseId').notEmpty().withMessage('ID de l\'achat requis'),
  body('phoneNumber').isMobilePhone().withMessage('Numéro de téléphone invalide'),
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

    const { purchaseId, phoneNumber } = req.body;

    // Récupérer l'achat
    const purchase = await prisma.purchase.findFirst({
      where: {
        id: purchaseId,
        userId: req.user.id
      },
      include: {
        ticket: true
      }
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'Achat non trouvé'
      });
    }

    if (purchase.paymentStatus === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Cet achat a déjà été payé'
      });
    }

    // Créer la transaction de paiement
    const transaction = await prisma.transaction.create({
      data: {
        purchaseId,
        userId: req.user.id,
        amount: purchase.totalAmount,
        paymentMethod: purchase.paymentMethod,
        status: 'PENDING',
        providerData: {
          phoneNumber,
          initiatedAt: new Date().toISOString()
        }
      }
    });

    // TODO: Intégrer avec l'API Mobile Money réelle
    // Pour l'instant, on simule l'initiation du paiement
    const paymentData = {
      transactionId: transaction.id,
      amount: purchase.totalAmount,
      phoneNumber,
      paymentMethod: purchase.paymentMethod,
      status: 'PENDING',
      message: 'Paiement initié avec succès'
    };

    logger.info('Paiement initié', { 
      transactionId: transaction.id,
      purchaseId,
      userId: req.user.id,
      amount: purchase.totalAmount
    });

    res.json({
      success: true,
      message: 'Paiement initié avec succès',
      payment: paymentData
    });

  } catch (error) {
    logger.error('Erreur lors de l\'initiation du paiement', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'initiation du paiement'
    });
  }
});

// Route pour vérifier le statut d'un paiement
router.get('/status/:transactionId', authenticate, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: req.user.id
      },
      include: {
        purchase: {
          include: {
            ticket: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction non trouvée'
      });
    }

    // TODO: Vérifier le statut réel avec l'API Mobile Money
    // Pour l'instant, on retourne le statut stocké

    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la vérification du statut', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification du statut'
    });
  }
});

// Route pour confirmer un paiement (webhook)
router.post('/webhook/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { transactionId, status, reference, amount } = req.body;

    // Vérifier la signature du webhook (sécurité)
    // TODO: Implémenter la vérification de signature

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        purchase: true
      }
    });

    if (!transaction) {
      logger.error('Transaction non trouvée dans le webhook', { transactionId, provider });
      return res.status(404).json({ error: 'Transaction non trouvée' });
    }

    // Mettre à jour le statut de la transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: status === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
        providerRef: reference,
        providerData: {
          ...transaction.providerData,
          webhookData: req.body,
          processedAt: new Date().toISOString()
        }
      }
    });

    // Si le paiement est réussi, confirmer l'achat
    if (status === 'SUCCESS') {
      // TODO: Appeler la logique de confirmation d'achat
      logger.info('Paiement confirmé via webhook', { 
        transactionId, 
        provider,
        amount 
      });
    }

    res.json({ success: true });

  } catch (error) {
    logger.error('Erreur dans le webhook de paiement', { error: error.message });
    res.status(500).json({ error: 'Erreur interne' });
  }
});

// Route pour simuler un paiement réussi (développement seulement)
router.post('/simulate-success/:transactionId', authenticate, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Cette route n\'est disponible qu\'en développement'
      });
    }

    const { transactionId } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: req.user.id
      },
      include: {
        purchase: true
      }
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction non trouvée'
      });
    }

    // Simuler un paiement réussi
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        providerRef: `SIM_${Date.now()}`,
        providerData: {
          ...transaction.providerData,
          simulated: true,
          simulatedAt: new Date().toISOString()
        }
      }
    });

    logger.info('Paiement simulé avec succès', { transactionId });

    res.json({
      success: true,
      message: 'Paiement simulé avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de la simulation du paiement', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la simulation du paiement'
    });
  }
});

// Route pour récupérer l'historique des paiements
router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      userId: req.user.id
    };

    if (status) {
      where.status = status;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        purchase: {
          include: {
            ticket: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.transaction.count({ where });

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique'
    });
  }
});

module.exports = router; 