/**
 * Client API : appels backend, gestion des erreurs.
 * Logique métier des appels HTTP, pas d'UI.
 */

import { env } from './env';

export type LoginPayload = { email: string; password: string };
export type LoginResponse = { access_token: string; expiresIn: string; role: string };

export type UserRole = 'client' | 'technician' | 'admin';
export type UserResponse = {
  id: string;
  lastName: string;
  firstName: string;
  email: string;
  role: UserRole;
};
export type UsersStats = { total: number; byRole: Record<string, number> };

export type PaginatedUsers = {
  items: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory = 'reseau' | 'logiciel' | 'materiel' | 'autre';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketResponse = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  priority: TicketPriority;
  attachments: string[];
  userId: string;
  assignedTo: string | null;
  createdAt: string;
  createdBy?: { id: string; firstName: string; lastName: string; email: string };
  assignedToUser?: { id: string; firstName: string; lastName: string; email: string };
};

export type PaginatedTickets = {
  items: TicketResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

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

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  authenticated = false,
): Promise<T> {
  const url = `${env.apiUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authenticated ? getAuthHeaders() : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let body: unknown;
  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    let message: string
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const m = (body as { message: unknown }).message
      message = Array.isArray(m) ? m.join('. ') : String(m)
    } else {
      message = res.statusText || 'Erreur lors de la requête'
    }
    throw new ApiError(message, res.status, body)
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
    me: () => request<UserResponse>('auth/me', {}, true),
  },
  users: {
    list: (params?: { role?: UserRole; search?: string; page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.role) q.set('role', params.role);
      if (params?.search) q.set('search', params.search);
      if (params?.page != null) q.set('page', String(params.page));
      if (params?.limit != null) q.set('limit', String(params.limit));
      const query = q.toString();
      return request<PaginatedUsers>(
        `users${query ? `?${query}` : ''}`,
        {},
        true,
      );
    },
    getStats: () => request<UsersStats>('users/stats', {}, true),
    getOne: (id: string) =>
      request<UserResponse>(`users/${id}`, {}, true),
    create: (payload: {
      lastName: string;
      firstName: string;
      email: string;
      password: string;
      role: UserRole;
    }) =>
      request<UserResponse>(
        'users',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        true,
      ),
    update: (
      id: string,
      payload: {
        lastName?: string;
        firstName?: string;
        email?: string;
        password?: string;
        role?: UserRole;
      },
    ) =>
      request<UserResponse>(`users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }, true),
    delete: (id: string) =>
      request<{ success: true }>(`users/${id}`, {
        method: 'DELETE',
      }, true),
  },
  tickets: {
    list: (params?: { page?: number; limit?: number }) => {
      const q = new URLSearchParams();
      if (params?.page != null) q.set('page', String(params.page));
      if (params?.limit != null) q.set('limit', String(params.limit));
      const query = q.toString();
      return request<PaginatedTickets>(
        `tickets${query ? `?${query}` : ''}`,
        {},
        true,
      );
    },
    getOne: (id: string) =>
      request<TicketResponse | null>(`tickets/${id}`, {}, true),
    create: (payload: {
        title: string;
        description?: string;
        category?: TicketCategory;
        priority?: TicketPriority;
        attachments?: string[];
      }) =>
      request<TicketResponse>('tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, true),
    update: (
      id: string,
      payload: { status?: TicketStatus; assignedTo?: string | null },
    ) =>
      request<TicketResponse>(`tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }, true),
  },
};

export { ApiError };
