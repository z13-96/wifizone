const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { authenticate, requireApprovedSeller, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Route pour demander un retrait (vendeurs seulement)
router.post('/', authenticate, requireApprovedSeller, [
  body('amount').isFloat({ min: 1000 }).withMessage('Le montant minimum est de 1000 XOF'),
  body('paymentMethod').isIn(['MTN_MOBILE_MONEY', 'MOOV_MONEY', 'ORANGE_MONEY', 'BANK_TRANSFER']).withMessage('Méthode de paiement invalide'),
  body('accountDetails').isObject().withMessage('Détails du compte requis'),
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

    const { amount, paymentMethod, accountDetails } = req.body;

    // Vérifier le solde du vendeur
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { id: req.user.sellerProfile.id }
    });

    if (sellerProfile.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Solde insuffisant'
      });
    }

    // Vérifier le montant minimum et maximum
    const minAmount = parseInt(process.env.MIN_WITHDRAWAL_AMOUNT) || 1000;
    const maxAmount = parseInt(process.env.MAX_WITHDRAWAL_AMOUNT) || 1000000;

    if (amount < minAmount) {
      return res.status(400).json({
        success: false,
        error: `Le montant minimum est de ${minAmount} XOF`
      });
    }

    if (amount > maxAmount) {
      return res.status(400).json({
        success: false,
        error: `Le montant maximum est de ${maxAmount} XOF`
      });
    }

    // Créer la demande de retrait
    const withdrawal = await prisma.withdrawal.create({
      data: {
        sellerId: req.user.sellerProfile.id,
        amount,
        paymentMethod,
        accountDetails,
        status: 'PENDING'
      }
    });

    logger.info('Nouvelle demande de retrait', { 
      withdrawalId: withdrawal.id,
      sellerId: req.user.sellerProfile.id,
      amount
    });

    res.status(201).json({
      success: true,
      message: 'Demande de retrait créée avec succès',
      withdrawal
    });

  } catch (error) {
    logger.error('Erreur lors de la création de la demande de retrait', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la demande de retrait'
    });
  }
});

// Route pour récupérer les demandes de retrait d'un vendeur
router.get('/my-withdrawals', authenticate, requireApprovedSeller, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      sellerId: req.user.sellerProfile.id
    };

    if (status) {
      where.status = status;
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.withdrawal.count({ where });

    res.json({
      success: true,
      withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des retraits', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des retraits'
    });
  }
});

// Route pour récupérer toutes les demandes de retrait (admin seulement)
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = status;
    }

    const withdrawals = await prisma.withdrawal.findMany({
      where,
      include: {
        seller: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.withdrawal.count({ where });

    res.json({
      success: true,
      withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des retraits', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des retraits'
    });
  }
});

// Route pour approuver un retrait (admin seulement)
router.put('/:id/approve', authenticate, authorize('ADMIN'), [
  body('adminNotes').optional().trim().isLength({ max: 500 }).withMessage('Les notes ne peuvent pas dépasser 500 caractères'),
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

    const { id } = req.params;
    const { adminNotes } = req.body;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: {
        seller: true
      }
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Demande de retrait non trouvée'
      });
    }

    if (withdrawal.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Cette demande de retrait ne peut plus être approuvée'
      });
    }

    // Vérifier que le vendeur a suffisamment de solde
    if (withdrawal.seller.balance < withdrawal.amount) {
      return res.status(400).json({
        success: false,
        error: 'Le vendeur n\'a pas suffisamment de solde'
      });
    }

    // Approuver le retrait et déduire le montant du solde
    const [updatedWithdrawal, updatedSeller] = await prisma.$transaction([
      prisma.withdrawal.update({
        where: { id },
        data: {
          status: 'APPROVED',
          adminNotes,
          processedAt: new Date()
        }
      }),
      prisma.sellerProfile.update({
        where: { id: withdrawal.sellerId },
        data: {
          balance: {
            decrement: withdrawal.amount
          },
          totalWithdrawn: {
            increment: withdrawal.amount
          }
        }
      })
    ]);

    logger.info('Retrait approuvé', { 
      withdrawalId: id,
      adminId: req.user.id,
      amount: withdrawal.amount
    });

    res.json({
      success: true,
      message: 'Retrait approuvé avec succès',
      withdrawal: updatedWithdrawal
    });

  } catch (error) {
    logger.error('Erreur lors de l\'approbation du retrait', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'approbation du retrait'
    });
  }
});

// Route pour rejeter un retrait (admin seulement)
router.put('/:id/reject', authenticate, authorize('ADMIN'), [
  body('adminNotes').notEmpty().trim().isLength({ max: 500 }).withMessage('Les notes sont requises et ne peuvent pas dépasser 500 caractères'),
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

    const { id } = req.params;
    const { adminNotes } = req.body;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id }
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Demande de retrait non trouvée'
      });
    }

    if (withdrawal.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Cette demande de retrait ne peut plus être rejetée'
      });
    }

    // Rejeter le retrait
    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNotes,
        processedAt: new Date()
      }
    });

    logger.info('Retrait rejeté', { 
      withdrawalId: id,
      adminId: req.user.id,
      reason: adminNotes
    });

    res.json({
      success: true,
      message: 'Retrait rejeté avec succès',
      withdrawal: updatedWithdrawal
    });

  } catch (error) {
    logger.error('Erreur lors du rejet du retrait', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors du rejet du retrait'
    });
  }
});

// Route pour traiter un retrait (admin seulement)
router.put('/:id/process', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
      include: {
        seller: true
      }
    });

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        error: 'Demande de retrait non trouvée'
      });
    }

    if (withdrawal.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Cette demande de retrait doit d\'abord être approuvée'
      });
    }

    // TODO: Intégrer avec l'API de paiement réelle
    // Pour l'instant, on simule le traitement

    // Marquer comme traité
    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id },
      data: {
        status: 'PROCESSED',
        processedAt: new Date()
      }
    });

    logger.info('Retrait traité', { 
      withdrawalId: id,
      adminId: req.user.id,
      amount: withdrawal.amount
    });

    res.json({
      success: true,
      message: 'Retrait traité avec succès',
      withdrawal: updatedWithdrawal
    });

  } catch (error) {
    logger.error('Erreur lors du traitement du retrait', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement du retrait'
    });
  }
});

// Route pour récupérer les statistiques des retraits
router.get('/stats', authenticate, async (req, res) => {
  try {
    let where = {};

    // Si c'est un vendeur, filtrer par vendeur
    if (req.user.role === 'SELLER') {
      where.sellerId = req.user.sellerProfile.id;
    }

    const stats = await prisma.$transaction([
      // Total des retraits
      prisma.withdrawal.aggregate({
        where,
        _sum: { amount: true },
        _count: true
      }),
      // Retraits en attente
      prisma.withdrawal.count({
        where: { ...where, status: 'PENDING' }
      }),
      // Retraits approuvés
      prisma.withdrawal.count({
        where: { ...where, status: 'APPROVED' }
      }),
      // Retraits traités
      prisma.withdrawal.count({
        where: { ...where, status: 'PROCESSED' }
      }),
      // Retraits rejetés
      prisma.withdrawal.count({
        where: { ...where, status: 'REJECTED' }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalAmount: stats[0]._sum.amount || 0,
        totalCount: stats[0]._count,
        pendingCount: stats[1],
        approvedCount: stats[2],
        processedCount: stats[3],
        rejectedCount: stats[4]
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

module.exports = router; 