'use client'

import { useEffect, useState } from 'react'
import { api, ApiError, type UserResponse } from '@/lib/api'

export default function ProfilPage() {
  const [user, setUser] = useState<UserResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.auth
      .me()
      .then(setUser)
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : 'Erreur chargement profil')
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="text-white">
        <h1 className="text-2xl font-bold mb-6">Profil</h1>
        <p className="text-white/60">Chargement...</p>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="text-white">
        <h1 className="text-2xl font-bold mb-6">Profil</h1>
        <p className="text-red-300">{error}</p>
      </div>
    )
  }

  return (
    <div className="text-white max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Profil</h1>
      <div className="p-6 rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] space-y-4">
        <div>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-white/50">
            Nom
          </span>
          <p className="text-white mt-1">
            {user?.lastName || '—'} {user?.firstName || '—'}
          </p>
        </div>
        <div>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-white/50">
            Email
          </span>
          <p className="text-white mt-1">{user?.email}</p>
        </div>
        <div>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-white/50">
            Rôle
          </span>
          <p className="text-white mt-1 capitalize">{user?.role}</p>
        </div>
      </div>
    </div>
  )
}
