/**
 * Variables d'environnement côté client.
 * Seules les variables NEXT_PUBLIC_* sont exposées au navigateur.
 * Ne jamais mettre de secrets ici (pas de clés API, JWT, etc.).
 */

const getEnv = (key: string, fallback: string): string => {
  if (typeof window === 'undefined') {
    return process.env[key] ?? fallback;
  }
  return (process.env[key] ?? fallback);
};

/** URL de l'API backend — en dev, même machine = localhost ou 127.0.0.1 */
const defaultApiUrl =
  typeof window !== 'undefined' && window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3000'
    : 'http://localhost:3000';

export const env = {
  apiUrl: getEnv('NEXT_PUBLIC_API_URL', defaultApiUrl),
} as const;
