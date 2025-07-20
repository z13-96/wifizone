const express = require('express');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Route pour récupérer le profil de l'utilisateur connecté
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        sellerProfile: true,
        _count: {
          select: {
            purchases: true,
            tickets: true,
            withdrawals: true
          }
        }
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

// Route pour mettre à jour le profil
router.put('/profile', authenticate, [
  body('firstName').optional().trim().isLength({ min: 2 }).withMessage('Le prénom doit contenir au moins 2 caractères'),
  body('lastName').optional().trim().isLength({ min: 2 }).withMessage('Le nom doit contenir au moins 2 caractères'),
  body('phone').optional().isMobilePhone().withMessage('Numéro de téléphone invalide'),
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

    const { firstName, lastName, phone } = req.body;

    // Vérifier si le numéro de téléphone est déjà utilisé
    if (phone && phone !== req.user.phone) {
      const existingUser = await prisma.user.findUnique({
        where: { phone }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Ce numéro de téléphone est déjà utilisé'
        });
      }
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: firstName || req.user.firstName,
        lastName: lastName || req.user.lastName,
        phone: phone || req.user.phone
      },
      include: {
        sellerProfile: true
      }
    });

    // Supprimer le mot de passe de la réponse
    const { password: _, ...userWithoutPassword } = updatedUser;

    logger.info('Profil utilisateur mis à jour', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: userWithoutPassword
    });

  } catch (error) {
    logger.error('Erreur lors de la mise à jour du profil', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du profil'
    });
  }
});

// Route pour récupérer les statistiques de l'utilisateur
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Statistiques selon le rôle
    if (req.user.role === 'SELLER') {
      const stats = await prisma.$transaction([
        // Nombre total de tickets
        prisma.ticket.count({
          where: { sellerId: req.user.sellerProfile.id }
        }),
        // Nombre total de ventes
        prisma.purchase.count({
          where: {
            ticket: {
              sellerId: req.user.sellerProfile.id
            }
          }
        }),
        // Chiffre d'affaires total
        prisma.purchase.aggregate({
          where: {
            ticket: {
              sellerId: req.user.sellerProfile.id
            },
            paymentStatus: 'COMPLETED'
          },
          _sum: {
            totalAmount: true
          }
        }),
        // Solde actuel
        prisma.sellerProfile.findUnique({
          where: { id: req.user.sellerProfile.id },
          select: { balance: true }
        })
      ]);

      res.json({
        success: true,
        stats: {
          totalTickets: stats[0],
          totalSales: stats[1],
          totalRevenue: stats[2]._sum.totalAmount || 0,
          currentBalance: stats[3]?.balance || 0
        }
      });
    } else {
      // Statistiques pour les clients
      const stats = await prisma.$transaction([
        // Nombre total d'achats
        prisma.purchase.count({
          where: { userId }
        }),
        // Montant total dépensé
        prisma.purchase.aggregate({
          where: {
            userId,
            paymentStatus: 'COMPLETED'
          },
          _sum: {
            totalAmount: true
          }
        }),
        // Tickets actifs
        prisma.purchase.count({
          where: {
            userId,
            expiresAt: {
              gt: new Date()
            }
          }
        })
      ]);

      res.json({
        success: true,
        stats: {
          totalPurchases: stats[0],
          totalSpent: stats[1]._sum.totalAmount || 0,
          activeTickets: stats[2]
        }
      });
    }

  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// Route pour récupérer l'historique des achats (clients)
router.get('/purchases', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const purchases = await prisma.purchase.findMany({
      where: { userId: req.user.id },
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

    const total = await prisma.purchase.count({
      where: { userId: req.user.id }
    });

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

// Route pour récupérer les notifications
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.notification.count({
      where: { userId: req.user.id }
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des notifications', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des notifications'
    });
  }
});

// Route pour marquer une notification comme lue
router.put('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification non trouvée'
      });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Notification marquée comme lue'
    });

  } catch (error) {
    logger.error('Erreur lors du marquage de la notification', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors du marquage de la notification'
    });
  }
});

// Route pour marquer toutes les notifications comme lues
router.put('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues'
    });

  } catch (error) {
    logger.error('Erreur lors du marquage des notifications', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors du marquage des notifications'
    });
  }
});

// Route pour supprimer un compte (admin seulement)
router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Désactiver l'utilisateur au lieu de le supprimer
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    logger.info('Utilisateur désactivé', { userId: id, adminId: req.user.id });

    res.json({
      success: true,
      message: 'Utilisateur désactivé avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de la désactivation de l\'utilisateur', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la désactivation de l\'utilisateur'
    });
  }
});

module.exports = router; 