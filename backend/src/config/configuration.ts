/**
 * Configuration centralisée et validation des variables d'environnement.
 * Ne jamais mettre de valeurs réelles (secrets) dans ce fichier.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongodb: {
    uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ticketmanager',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
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
});
