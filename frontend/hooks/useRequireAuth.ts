'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/lib/api'

const ROLE_HOME: Record<UserRole, string> = {
  client: '/dashboard',
  technician: '/technician',
  admin: '/admin',
}

/**
 * Garde d'authentification côté client : redirige vers /login si pas de token,
 * et vers l'espace du bon rôle si le rôle requis ne correspond pas.
 */
export function useRequireAuth(requiredRole?: UserRole) {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const token = localStorage.getItem('access_token')
    if (!token) {
      router.replace('/login')
      return
    }

    if (!requiredRole) return

    const storedRole = localStorage.getItem('user_role') as UserRole | null
    if (storedRole && storedRole !== requiredRole) {
      router.replace(ROLE_HOME[storedRole] ?? '/login')
    }
  }, [router, requiredRole])
}
