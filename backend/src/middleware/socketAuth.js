const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Token d\'authentification requis'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        sellerProfile: true
      }
    });

    if (!user || !user.isActive) {
      return next(new Error('Utilisateur non trouvé ou inactif'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Token invalide'));
  }
};

module.exports = { authenticateSocket }; 