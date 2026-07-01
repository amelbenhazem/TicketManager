/**
 * Variables d'environnement côté client.
 * Seules les variables NEXT_PUBLIC_* sont exposées au navigateur.
 * Ne jamais mettre de secrets ici (pas de clés API, JWT, etc.).
 */

const getEnv = (key: string, fallback: string): string => {
  if (typeof globalThis.window === 'undefined') {
    return process.env[key] ?? fallback;
  }
  return process.env[key] ?? fallback;
};

/** URL de l'API backend — en dev, frontend sur 3000, backend sur 3001 */
const defaultApiUrl =
  typeof globalThis.window !== 'undefined' &&
  globalThis.window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3001'
    : 'http://localhost:3001';

/**
 * En production K8s NodePort : frontend :30080, backend :30081 sur la même IP.
 * Priorité au hostname du navigateur (IP publique) pour éviter localhost au build Docker.
 */
export function getApiUrl(): string {
  if (typeof globalThis.window !== 'undefined') {
    const { hostname, protocol, port } = globalThis.window.location;
    const isLocal =
      hostname === 'localhost' || hostname === '127.0.0.1';

    if (!isLocal) {
      return `${protocol}//${hostname}:30081`;
    }
    if (port === '30080') {
      return `${protocol}//${hostname}:30081`;
    }
  }
  return getEnv('NEXT_PUBLIC_API_URL', defaultApiUrl);
}

export const env = {
  get apiUrl(): string {
    return getApiUrl();
  },
} as const;
