'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, ApiError } from '@/lib/api'

export type LoginState = {
  loading: boolean
  error: string | null
}

export function useLogin() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null)
      setLoading(true)
      try {
        const data = await api.auth.login({ email, password })
        if (data.access_token) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', data.access_token)
            if (data.role) localStorage.setItem('user_role', data.role)
          }
          if (data.role === 'admin') {
            router.push('/admin')
          } else if (data.role === 'technician') {
            router.push('/technician')
          } else {
            router.push('/dashboard')
          }
        }
      } catch (e) {
        let message: string
        if (e instanceof ApiError) {
          message = e.message
        } else if (e instanceof TypeError && e.message.includes('fetch')) {
          message = 'Impossible de joindre le serveur. Vérifiez que le backend est démarré (port 3000) et CORS.'
        } else {
          message = e instanceof Error ? e.message : 'Erreur de connexion'
        }
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [router],
  )

  return { login, loading, error }
}
