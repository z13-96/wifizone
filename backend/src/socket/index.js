const { logger } = require('../utils/logger');

module.exports = (io) => {
  io.on('connection', (socket) => {
    logger.info(`Utilisateur connecté: ${socket.user?.email || 'Anonyme'} (${socket.id})`);

    // Rejoindre la room de l'utilisateur
    if (socket.user) {
      socket.join(`user:${socket.user.id}`);
      
      // Si c'est un vendeur, rejoindre la room des vendeurs
      if (socket.user.role === 'SELLER') {
        socket.join('sellers');
      }
      
      // Si c'est un admin, rejoindre la room des admins
      if (socket.user.role === 'ADMIN') {
        socket.join('admins');
      }
    }

    // Écouter les événements de paiement
    socket.on('payment:status', (data) => {
      logger.info('Événement de paiement reçu', { data, userId: socket.user?.id });
      
      // Diffuser aux admins
      socket.to('admins').emit('payment:update', {
        ...data,
        userId: socket.user?.id,
        timestamp: new Date().toISOString()
      });
    });

    // Écouter les événements de vente
    socket.on('sale:new', (data) => {
      logger.info('Nouvelle vente', { data, sellerId: socket.user?.id });
      
      // Diffuser aux admins
      socket.to('admins').emit('sale:created', {
        ...data,
        sellerId: socket.user?.id,
        timestamp: new Date().toISOString()
      });
    });

    // Écouter les demandes de retrait
    socket.on('withdrawal:request', (data) => {
      logger.info('Demande de retrait', { data, sellerId: socket.user?.id });
      
      // Diffuser aux admins
      socket.to('admins').emit('withdrawal:requested', {
        ...data,
        sellerId: socket.user?.id,
        timestamp: new Date().toISOString()
      });
    });

    // Écouter les messages de support
    socket.on('support:message', (data) => {
      logger.info('Message de support', { data, userId: socket.user?.id });
      
      // Diffuser aux admins
      socket.to('admins').emit('support:new_message', {
        ...data,
        userId: socket.user?.id,
        timestamp: new Date().toISOString()
      });
    });

    // Gérer la déconnexion
    socket.on('disconnect', () => {
      logger.info(`Utilisateur déconnecté: ${socket.user?.email || 'Anonyme'} (${socket.id})`);
    });

    // Gérer les erreurs
    socket.on('error', (error) => {
      logger.error('Erreur Socket.IO', { error: error.message, userId: socket.user?.id });
    });
  });

  // Fonction pour envoyer une notification à un utilisateur spécifique
  const sendNotification = (userId, notification) => {
    io.to(`user:${userId}`).emit('notification:new', notification);
  };

  // Fonction pour envoyer une notification à tous les vendeurs
  const sendNotificationToSellers = (notification) => {
    io.to('sellers').emit('notification:new', notification);
  };

  // Fonction pour envoyer une notification à tous les admins
  const sendNotificationToAdmins = (notification) => {
    io.to('admins').emit('notification:new', notification);
  };

  // Fonction pour envoyer une notification à tous les utilisateurs
  const broadcastNotification = (notification) => {
    io.emit('notification:new', notification);
  };

  // Exposer les fonctions pour utilisation dans d'autres modules
  io.sendNotification = sendNotification;
  io.sendNotificationToSellers = sendNotificationToSellers;
  io.sendNotificationToAdmins = sendNotificationToAdmins;
  io.broadcastNotification = broadcastNotification;

  return io;
}; 