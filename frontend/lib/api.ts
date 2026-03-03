/**
 * Client API : appels backend, gestion des erreurs.
 * Logique métier des appels HTTP, pas d'UI.
 */

import { env } from './env';

export type LoginPayload = { email: string; password: string };
export type LoginResponse = { access_token: string; expiresIn: string };

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${env.apiUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  let body: unknown;
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    const message =
      typeof body === 'object' && body !== null && 'message' in body
        ? String((body as { message: unknown }).message)
        : res.statusText;
    throw new ApiError(message, res.status, body);
  }

  return body as T;
}

export const api = {
  auth: {
    login: (payload: LoginPayload) =>
      request<LoginResponse>('auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
};

export { ApiError };
