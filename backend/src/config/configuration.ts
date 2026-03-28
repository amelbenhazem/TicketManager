/**
 * Configuration centralisée et validation des variables d'environnement.
 * Ne jamais mettre de valeurs réelles (secrets) dans ce fichier.
 */
export default () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const jwtSecret = process.env.JWT_SECRET;

  // Validation de sécurité : en production, JWT_SECRET doit être défini et différent de la valeur par défaut
  if (nodeEnv === 'production') {
    if (!jwtSecret || jwtSecret === 'change-me-in-production') {
      throw new Error(
        'JWT_SECRET doit être défini avec une valeur sécurisée en production. ' +
          "Générez-en un avec: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
  }

  return {
    port: parseInt(process.env.PORT ?? '3001', 10),
    nodeEnv,
    mongodb: {
      uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ticketmanager',
    },
    jwt: {
      secret: jwtSecret ?? 'change-me-in-production',
      // Durée de vie du JWT (format supporté par `ms`, ex: `24h`)
      expiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
    },
    cors: {
      origin:
        process.env.CORS_ORIGIN ??
        'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001',
    },
    // Compte démo (à remplacer par vraie base utilisateurs)
    auth: {
      demoEmail: process.env.AUTH_DEMO_EMAIL,
      demoPassword: process.env.AUTH_DEMO_PASSWORD,
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
      apiKey: process.env.CLOUDINARY_API_KEY ?? '',
      apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    },
  };
};
