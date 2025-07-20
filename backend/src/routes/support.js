const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Route pour créer un ticket de support
router.post('/tickets', authenticate, [
  body('subject').trim().isLength({ min: 5, max: 200 }).withMessage('Le sujet doit contenir entre 5 et 200 caractères'),
  body('message').trim().isLength({ min: 10, max: 2000 }).withMessage('Le message doit contenir entre 10 et 2000 caractères'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).withMessage('Priorité invalide'),
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

    const { subject, message, priority = 'MEDIUM' } = req.body;

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        subject,
        message,
        priority,
        status: 'OPEN'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        }
      }
    });

    logger.info('Nouveau ticket de support créé', { 
      ticketId: ticket.id,
      userId: req.user.id,
      priority
    });

    res.status(201).json({
      success: true,
      message: 'Ticket de support créé avec succès',
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

// Route pour récupérer les tickets d'un utilisateur
router.get('/tickets', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      userId: req.user.id
    };

    if (status) {
      where.status = status;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        _count: {
          select: {
            responses: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.supportTicket.count({ where });

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
router.get('/tickets/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId: req.user.id
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        responses: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
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

// Route pour répondre à un ticket
router.post('/tickets/:id/respond', authenticate, [
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Le message doit contenir entre 1 et 2000 caractères'),
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
    const { message } = req.body;

    // Vérifier que le ticket existe
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé'
      });
    }

    if (ticket.status === 'CLOSED') {
      return res.status(400).json({
        success: false,
        error: 'Ce ticket est fermé'
      });
    }

    const response = await prisma.supportResponse.create({
      data: {
        ticketId: id,
        userId: req.user.id,
        message,
        isFromAdmin: req.user.role === 'ADMIN'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    // Mettre à jour le statut du ticket
    await prisma.supportTicket.update({
      where: { id },
      data: { status: 'IN_PROGRESS' }
    });

    logger.info('Réponse ajoutée au ticket', { 
      ticketId: id,
      userId: req.user.id,
      isAdmin: req.user.role === 'ADMIN'
    });

    res.status(201).json({
      success: true,
      message: 'Réponse ajoutée avec succès',
      response
    });

  } catch (error) {
    logger.error('Erreur lors de l\'ajout de la réponse', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout de la réponse'
    });
  }
});

// Route pour fermer un ticket
router.put('/tickets/:id/close', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé'
      });
    }

    if (ticket.status === 'CLOSED') {
      return res.status(400).json({
        success: false,
        error: 'Ce ticket est déjà fermé'
      });
    }

    await prisma.supportTicket.update({
      where: { id },
      data: { 
        status: 'CLOSED',
        resolvedAt: new Date()
      }
    });

    logger.info('Ticket fermé', { 
      ticketId: id,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: 'Ticket fermé avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de la fermeture du ticket', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la fermeture du ticket'
    });
  }
});

// Routes admin pour gérer tous les tickets
router.get('/admin/tickets', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            responses: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.supportTicket.count({ where });

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
    logger.error('Erreur lors de la récupération des tickets admin', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des tickets'
    });
  }
});

// Route admin pour assigner un ticket
router.put('/admin/tickets/:id/assign', authenticate, authorize('ADMIN'), [
  body('assignedTo').notEmpty().withMessage('ID de l\'admin assigné requis'),
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
    const { assignedTo } = req.body;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket non trouvé'
      });
    }

    await prisma.supportTicket.update({
      where: { id },
      data: { assignedTo }
    });

    logger.info('Ticket assigné', { 
      ticketId: id,
      adminId: req.user.id,
      assignedTo
    });

    res.json({
      success: true,
      message: 'Ticket assigné avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de l\'assignation du ticket', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'assignation du ticket'
    });
  }
});

module.exports = router; 