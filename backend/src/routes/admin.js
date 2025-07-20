const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Route pour récupérer le tableau de bord admin
router.get('/dashboard', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const stats = await prisma.$transaction([
      // Statistiques utilisateurs
      prisma.user.count(),
      prisma.user.count({ where: { role: 'SELLER' } }),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      
      // Statistiques tickets
      prisma.ticket.count(),
      prisma.ticket.count({ where: { isActive: true } }),
      
      // Statistiques achats
      prisma.purchase.count(),
      prisma.purchase.aggregate({
        where: { paymentStatus: 'COMPLETED' },
        _sum: { totalAmount: true }
      }),
      
      // Statistiques retraits
      prisma.withdrawal.count({ where: { status: 'PENDING' } }),
      prisma.withdrawal.aggregate({
        where: { status: 'PROCESSED' },
        _sum: { amount: true }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers: stats[0],
        totalSellers: stats[1],
        totalClients: stats[2],
        totalTickets: stats[3],
        activeTickets: stats[4],
        totalPurchases: stats[5],
        totalRevenue: stats[6]._sum.totalAmount || 0,
        pendingWithdrawals: stats[7],
        totalWithdrawn: stats[8]._sum.amount || 0
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération du tableau de bord', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération du tableau de bord'
    });
  }
});

// Route pour récupérer tous les utilisateurs
router.get('/users', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, status } = req.query;
    const skip = (page - 1) * limit;

    const where = {};

    if (role) {
      where.role = role;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        sellerProfile: true,
        _count: {
          select: {
            purchases: true,
            tickets: true,
            withdrawals: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des utilisateurs'
    });
  }
});

// Route pour approuver un vendeur
router.put('/sellers/:id/approve', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!sellerProfile) {
      return res.status(404).json({
        success: false,
        error: 'Profil vendeur non trouvé'
      });
    }

    if (sellerProfile.isApproved) {
      return res.status(400).json({
        success: false,
        error: 'Ce vendeur est déjà approuvé'
      });
    }

    await prisma.sellerProfile.update({
      where: { id },
      data: { isApproved: true }
    });

    logger.info('Vendeur approuvé', { 
      sellerId: id,
      adminId: req.user.id,
      userId: sellerProfile.userId
    });

    res.json({
      success: true,
      message: 'Vendeur approuvé avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de l\'approbation du vendeur', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'approbation du vendeur'
    });
  }
});

// Route pour désactiver un utilisateur
router.put('/users/:id/toggle-status', authenticate, authorize('ADMIN'), async (req, res) => {
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

    const newStatus = !user.isActive;

    await prisma.user.update({
      where: { id },
      data: { isActive: newStatus }
    });

    logger.info('Statut utilisateur modifié', { 
      userId: id,
      adminId: req.user.id,
      newStatus
    });

    res.json({
      success: true,
      message: `Utilisateur ${newStatus ? 'activé' : 'désactivé'} avec succès`
    });

  } catch (error) {
    logger.error('Erreur lors de la modification du statut', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification du statut'
    });
  }
});

// Route pour récupérer les statistiques détaillées
router.get('/stats/detailed', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let startDate = new Date();
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const stats = await prisma.$transaction([
      // Achats par jour
      prisma.purchase.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: startDate },
          paymentStatus: 'COMPLETED'
        },
        _sum: { totalAmount: true },
        _count: true
      }),
      
      // Vendeurs les plus actifs
      prisma.sellerProfile.findMany({
        where: {
          isApproved: true
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              businessName: true
            }
          },
          _count: {
            select: {
              tickets: true
            }
          }
        },
        orderBy: {
          totalSales: 'desc'
        },
        take: 10
      }),
      
      // Tickets les plus vendus
      prisma.ticket.findMany({
        where: {
          isActive: true
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
          },
          _count: {
            select: {
              purchases: true
            }
          }
        },
        orderBy: {
          purchases: {
            _count: 'desc'
          }
        },
        take: 10
      })
    ]);

    res.json({
      success: true,
      stats: {
        salesByDay: stats[0],
        topSellers: stats[1],
        topTickets: stats[2]
      }
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques détaillées', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques détaillées'
    });
  }
});

module.exports = router; 