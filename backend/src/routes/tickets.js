const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { authenticate, requireApprovedSeller } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Route pour récupérer tous les tickets disponibles (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, sellerId, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      remainingQty: { gt: 0 }
    };

    if (sellerId) {
      where.sellerId = sellerId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
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
        },
        _count: {
          select: {
            purchases: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.ticket.count({ where });

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des tickets', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des tickets'
    });
  }
});

// Route pour récupérer un ticket spécifique
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
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
        },
        _count: {
          select: {
            purchases: true
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

    res.json({
      success: true,
      ticket
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération du ticket', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du ticket'
    });
  }
});

// Route pour créer un nouveau ticket (vendeurs seulement)
router.post('/', authenticate, requireApprovedSeller, [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Le nom doit contenir entre 3 et 100 caractères'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('La description ne peut pas dépasser 500 caractères'),
  body('duration').isInt({ min: 1, max: 1440 }).withMessage('La durée doit être entre 1 et 1440 minutes'),
  body('price').isFloat({ min: 0.01 }).withMessage('Le prix doit être supérieur à 0'),
  body('quantity').isInt({ min: 1 }).withMessage('La quantité doit être supérieure à 0'),
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

    const { name, description, duration, price, quantity } = req.body;

    const ticket = await prisma.ticket.create({
      data: {
        sellerId: req.user.sellerProfile.id,
        name,
        description,
        duration,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        remainingQty: parseInt(quantity)
      },
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

    logger.info('Nouveau ticket créé', { 
      ticketId: ticket.id, 
      sellerId: req.user.sellerProfile.id,
      name: ticket.name 
    });

    res.status(201).json({
      success: true,
      message: 'Ticket créé avec succès',
      ticket
    });

  } catch (error) {
    logger.error('Erreur lors de la création du ticket', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du ticket'
    });
  }
});

// Route pour mettre à jour un ticket
router.put('/:id', authenticate, requireApprovedSeller, [
  body('name').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Le nom doit contenir entre 3 et 100 caractères'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('La description ne peut pas dépasser 500 caractères'),
  body('duration').optional().isInt({ min: 1, max: 1440 }).withMessage('La durée doit être entre 1 et 1440 minutes'),
  body('price').optional().isFloat({ min: 0.01 }).withMessage('Le prix doit être supérieur à 0'),
  body('isActive').optional().isBoolean().withMessage('Le statut actif doit être un booléen'),
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
    const { name, description, duration, price, isActive } = req.body;

    // Vérifier que le ticket appartient au vendeur
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        id,
        sellerId: req.user.sellerProfile.id
      }
    });

    if (!existingTicket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé'
      });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        name: name || existingTicket.name,
        description: description !== undefined ? description : existingTicket.description,
        duration: duration || existingTicket.duration,
        price: price ? parseFloat(price) : existingTicket.price,
        isActive: isActive !== undefined ? isActive : existingTicket.isActive
      },
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

    logger.info('Ticket mis à jour', { 
      ticketId: id, 
      sellerId: req.user.sellerProfile.id 
    });

    res.json({
      success: true,
      message: 'Ticket mis à jour avec succès',
      ticket: updatedTicket
    });

  } catch (error) {
    logger.error('Erreur lors de la mise à jour du ticket', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du ticket'
    });
  }
});

// Route pour supprimer un ticket
router.delete('/:id', authenticate, requireApprovedSeller, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le ticket appartient au vendeur
    const ticket = await prisma.ticket.findFirst({
      where: {
        id,
        sellerId: req.user.sellerProfile.id
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé'
      });
    }

    // Vérifier s'il y a des achats en cours
    const activePurchases = await prisma.purchase.count({
      where: {
        ticketId: id,
        paymentStatus: 'PENDING'
      }
    });

    if (activePurchases > 0) {
      return res.status(400).json({
        success: false,
        error: 'Impossible de supprimer ce ticket car il y a des achats en cours'
      });
    }

    // Désactiver le ticket au lieu de le supprimer
    await prisma.ticket.update({
      where: { id },
      data: { isActive: false }
    });

    logger.info('Ticket désactivé', { 
      ticketId: id, 
      sellerId: req.user.sellerProfile.id 
    });

    res.json({
      success: true,
      message: 'Ticket désactivé avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de la désactivation du ticket', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la désactivation du ticket'
    });
  }
});

// Route pour récupérer les tickets d'un vendeur
router.get('/seller/my-tickets', authenticate, requireApprovedSeller, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      sellerId: req.user.sellerProfile.id
    };

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        _count: {
          select: {
            purchases: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.ticket.count({ where });

    res.json({
      success: true,
      tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des tickets du vendeur', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des tickets'
    });
  }
});

// Route pour importer des tickets en lot (vendeurs seulement)
router.post('/import', authenticate, requireApprovedSeller, [
  body('tickets').isArray({ min: 1 }).withMessage('Au moins un ticket doit être fourni'),
  body('tickets.*.name').trim().isLength({ min: 3, max: 100 }).withMessage('Le nom doit contenir entre 3 et 100 caractères'),
  body('tickets.*.duration').isInt({ min: 1, max: 1440 }).withMessage('La durée doit être entre 1 et 1440 minutes'),
  body('tickets.*.price').isFloat({ min: 0.01 }).withMessage('Le prix doit être supérieur à 0'),
  body('tickets.*.quantity').isInt({ min: 1 }).withMessage('La quantité doit être supérieure à 0'),
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

    const { tickets } = req.body;

    // Créer tous les tickets en transaction
    const createdTickets = await prisma.$transaction(
      tickets.map(ticket => 
        prisma.ticket.create({
          data: {
            sellerId: req.user.sellerProfile.id,
            name: ticket.name,
            description: ticket.description || null,
            duration: ticket.duration,
            price: parseFloat(ticket.price),
            quantity: parseInt(ticket.quantity),
            remainingQty: parseInt(ticket.quantity)
          }
        })
      )
    );

    logger.info('Tickets importés en lot', { 
      count: createdTickets.length,
      sellerId: req.user.sellerProfile.id 
    });

    res.status(201).json({
      success: true,
      message: `${createdTickets.length} tickets importés avec succès`,
      tickets: createdTickets
    });

  } catch (error) {
    logger.error('Erreur lors de l\'import des tickets', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'import des tickets'
    });
  }
});

module.exports = router; 