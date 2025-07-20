const crypto = require('crypto');

// Générer un code de ticket unique
const generateTicketCode = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

// Générer un code de ticket sécurisé avec hash
const generateSecureTicketCode = (userId, ticketId, timestamp) => {
  const data = `${userId}-${ticketId}-${timestamp}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  return hash.substring(0, 8).toUpperCase();
};

// Valider un code de ticket
const validateTicketCode = (code) => {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  // Vérifier la longueur
  if (code.length !== 8) {
    return false;
  }
  
  // Vérifier le format (lettres et chiffres seulement)
  const regex = /^[A-Z0-9]{8}$/;
  return regex.test(code);
};

// Calculer la durée restante d'un ticket
const calculateTimeRemaining = (expiresAt) => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const timeRemaining = expiry.getTime() - now.getTime();
  
  return Math.max(0, timeRemaining);
};

// Formater la durée restante en format lisible
const formatTimeRemaining = (milliseconds) => {
  if (milliseconds <= 0) {
    return 'Expiré';
  }
  
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

// Vérifier si un ticket est expiré
const isTicketExpired = (expiresAt) => {
  return new Date() > new Date(expiresAt);
};

// Générer un QR code pour un ticket
const generateTicketQRCode = (ticketCode, additionalData = {}) => {
  const data = {
    code: ticketCode,
    timestamp: new Date().toISOString(),
    ...additionalData
  };
  
  return JSON.stringify(data);
};

// Parser un QR code de ticket
const parseTicketQRCode = (qrData) => {
  try {
    const data = JSON.parse(qrData);
    return {
      code: data.code,
      timestamp: data.timestamp,
      ...data
    };
  } catch (error) {
    return null;
  }
};

// Calculer le prix avec commission
const calculatePriceWithCommission = (basePrice, commissionRate = 0.05) => {
  return basePrice * (1 + commissionRate);
};

// Calculer le montant de commission
const calculateCommission = (totalAmount, commissionRate = 0.05) => {
  return totalAmount * commissionRate;
};

// Formater le prix en format monétaire
const formatPrice = (price, currency = 'XOF') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency
  }).format(price);
};

// Valider les paramètres d'un ticket
const validateTicketParams = (params) => {
  const errors = [];
  
  if (!params.name || params.name.length < 3) {
    errors.push('Le nom du ticket doit contenir au moins 3 caractères');
  }
  
  if (!params.duration || params.duration < 1 || params.duration > 1440) {
    errors.push('La durée doit être entre 1 et 1440 minutes');
  }
  
  if (!params.price || params.price <= 0) {
    errors.push('Le prix doit être supérieur à 0');
  }
  
  if (!params.quantity || params.quantity < 1) {
    errors.push('La quantité doit être supérieure à 0');
  }
  
  return errors;
};

// Générer un nom de ticket par défaut
const generateDefaultTicketName = (duration) => {
  if (duration < 60) {
    return `WiFi ${duration} minutes`;
  } else if (duration < 1440) {
    const hours = Math.floor(duration / 60);
    return `WiFi ${hours} heure${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(duration / 1440);
    return `WiFi ${days} jour${days > 1 ? 's' : ''}`;
  }
};

// Calculer les statistiques d'un ticket
const calculateTicketStats = (purchases) => {
  const totalPurchases = purchases.length;
  const totalRevenue = purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
  const completedPurchases = purchases.filter(p => p.paymentStatus === 'COMPLETED').length;
  const pendingPurchases = purchases.filter(p => p.paymentStatus === 'PENDING').length;
  
  return {
    totalPurchases,
    totalRevenue,
    completedPurchases,
    pendingPurchases,
    completionRate: totalPurchases > 0 ? (completedPurchases / totalPurchases) * 100 : 0
  };
};

module.exports = {
  generateTicketCode,
  generateSecureTicketCode,
  validateTicketCode,
  calculateTimeRemaining,
  formatTimeRemaining,
  isTicketExpired,
  generateTicketQRCode,
  parseTicketQRCode,
  calculatePriceWithCommission,
  calculateCommission,
  formatPrice,
  validateTicketParams,
  generateDefaultTicketName,
  calculateTicketStats
}; 