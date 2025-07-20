const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { authenticate } = require('../middleware/auth');
const { generateTicketCode } = require('../utils/ticketUtils');

const router = express.Router();
const prisma = new PrismaClient();

// Route pour créer un nouvel achat
router.post('/', authenticate, [
  body('ticketId').notEmpty().withMessage('ID du ticket requis'),
  body('quantity').isInt({ min: 1 }).withMessage('La quantité doit être supérieure à 0'),
  body('paymentMethod').isIn(['MTN_MOBILE_MONEY', 'MOOV_MONEY', 'ORANGE_MONEY']).withMessage('Méthode de paiement invalide'),
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

    const { ticketId, quantity, paymentMethod } = req.body;

    // Vérifier que le ticket existe et est actif
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        seller: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                businessName: true
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé'
      });
    }

    if (!ticket.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Ce ticket n\'est plus disponible'
      });
    }

    if (ticket.remainingQty < quantity) {
      return res.status(400).json({
        success: false,
        error: `Quantité insuffisante. Il ne reste que ${ticket.remainingQty} tickets disponibles`
      });
    }

    // Calculer le montant total
    const unitPrice = ticket.price;
    const totalAmount = unitPrice * quantity;

    // Créer l'achat
    const purchase = await prisma.purchase.create({
      data: {
        userId: req.user.id,
        ticketId,
        quantity,
        unitPrice,
        totalAmount,
        paymentMethod,
        paymentStatus: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire dans 24h
      },
      include: {
        ticket: {
          include: {
            seller: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    businessName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    logger.info('Nouvel achat créé', { 
      purchaseId: purchase.id,
      userId: req.user.id,
      ticketId,
      amount: totalAmount
    });

    res.status(201).json({
      success: true,
      message: 'Achat créé avec succès',
      purchase
    });

  } catch (error) {
    logger.error('Erreur lors de la création de l\'achat', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'achat'
    });
  }
});

// Route pour confirmer un achat (après paiement réussi)
router.put('/:id/confirm', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer l'achat
    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
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
        error: 'Cet achat a déjà été confirmé'
      });
    }

    // Générer le code du ticket
    const ticketCode = generateTicketCode();

    // Calculer la date d'expiration
    const expiresAt = new Date(Date.now() + purchase.ticket.duration * 60 * 1000);

    // Mettre à jour l'achat et le ticket
    const [updatedPurchase, updatedTicket] = await prisma.$transaction([
      // Mettre à jour l'achat
      prisma.purchase.update({
        where: { id },
        data: {
          paymentStatus: 'COMPLETED',
          ticketCode,
          expiresAt
        }
      }),
      // Mettre à jour la quantité restante du ticket
      prisma.ticket.update({
        where: { id: purchase.ticketId },
        data: {
          remainingQty: {
            decrement: purchase.quantity
          }
        }
      }),
      // Mettre à jour le solde du vendeur
      prisma.sellerProfile.update({
        where: { id: purchase.ticket.sellerId },
        data: {
          balance: {
            increment: purchase.totalAmount * (1 - purchase.ticket.seller.commissionRate)
          },
          totalSales: {
            increment: purchase.totalAmount
          }
        }
      })
    ]);

    logger.info('Achat confirmé', { 
      purchaseId: id,
      userId: req.user.id,
      ticketCode
    });

    res.json({
      success: true,
      message: 'Achat confirmé avec succès',
      purchase: updatedPurchase,
      ticketCode
    });

  } catch (error) {
    logger.error('Erreur lors de la confirmation de l\'achat', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la confirmation de l\'achat'
    });
  }
});

// Route pour annuler un achat
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer l'achat
    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
        userId: req.user.id
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
        error: 'Impossible d\'annuler un achat déjà confirmé'
      });
    }

    // Mettre à jour le statut
    await prisma.purchase.update({
      where: { id },
      data: {
        paymentStatus: 'CANCELLED'
      }
    });

    logger.info('Achat annulé', { 
      purchaseId: id,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Achat annulé avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de l\'annulation de l\'achat', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'annulation de l\'achat'
    });
  }
});

// Route pour récupérer un achat spécifique
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const purchase = await prisma.purchase.findFirst({
      where: {
        id,
        userId: req.user.id
      },
      include: {
        ticket: {
          include: {
            seller: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    businessName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'Achat non trouvé'
      });
    }

    res.json({
      success: true,
      purchase
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'achat', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'achat'
    });
  }
});

// Route pour récupérer les achats d'un utilisateur
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      userId: req.user.id
    };

    if (status) {
      where.paymentStatus = status;
    }

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        ticket: {
          include: {
            seller: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    businessName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.purchase.count({ where });

    res.json({
      success: true,
      purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des achats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des achats'
    });
  }
});

// Route pour vérifier le statut d'un ticket
router.get('/ticket/:code/status', async (req, res) => {
  try {
    const { code } = req.params;

    const purchase = await prisma.purchase.findFirst({
      where: {
        ticketCode: code,
        paymentStatus: 'COMPLETED'
      },
      include: {
        ticket: {
          include: {
            seller: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    businessName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé'
      });
    }

    const isExpired = new Date() > purchase.expiresAt;
    const timeRemaining = Math.max(0, purchase.expiresAt.getTime() - new Date().getTime());

    res.json({
      success: true,
      ticket: {
        code: purchase.ticketCode,
        name: purchase.ticket.name,
        duration: purchase.ticket.duration,
        seller: purchase.ticket.seller.user.businessName || `${purchase.ticket.seller.user.firstName} ${purchase.ticket.seller.user.lastName}`,
        isExpired,
        timeRemaining,
        expiresAt: purchase.expiresAt
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la vérification du ticket', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification du ticket'
    });
  }
});

module.exports = router; 