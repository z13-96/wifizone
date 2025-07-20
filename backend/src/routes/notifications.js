const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Route pour récupérer les notifications d'un utilisateur
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;

    const where = {
      userId: req.user.id
    };

    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip),
      take: parseInt(limit)
    });

    const total = await prisma.notification.count({ where });
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
router.put('/:id/read', authenticate, async (req, res) => {
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
router.put('/read-all', authenticate, async (req, res) => {
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

// Route pour supprimer une notification
router.delete('/:id', authenticate, async (req, res) => {
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

    await prisma.notification.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Notification supprimée avec succès'
    });

  } catch (error) {
    logger.error('Erreur lors de la suppression de la notification', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la notification'
    });
  }
});

// Route pour supprimer toutes les notifications lues
router.delete('/read', authenticate, async (req, res) => {
  try {
    await prisma.notification.deleteMany({
      where: {
        userId: req.user.id,
        isRead: true
      }
    });

    res.json({
      success: true,
      message: 'Toutes les notifications lues ont été supprimées'
    });

  } catch (error) {
    logger.error('Erreur lors de la suppression des notifications', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression des notifications'
    });
  }
});

// Route pour récupérer le nombre de notifications non lues
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    });

    res.json({
      success: true,
      unreadCount
    });

  } catch (error) {
    logger.error('Erreur lors du comptage des notifications', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Erreur lors du comptage des notifications'
    });
  }
});

module.exports = router; 