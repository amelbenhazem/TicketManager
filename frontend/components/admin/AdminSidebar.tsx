'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LayoutDashboard, UserPlus, Ticket, LogOut } from 'lucide-react'
import { disconnectRealtime } from '@/lib/realtime'
import { useEffect, useState } from 'react'
import { api, type UserResponse } from '@/lib/api'

type AdminSidebarProps = {
  activeSection: 'dashboard' | 'create' | 'tickets'
  onNavigate: (section: 'dashboard' | 'create' | 'tickets') => void
}

export function AdminSidebar({ activeSection, onNavigate }: AdminSidebarProps) {
  const [user, setUser] = useState<UserResponse | null>(null)

  useEffect(() => {
    let mounted = true
    api.auth
      .me()
      .then((u) => {
        if (mounted) setUser(u)
      })
      .catch(() => {
        // Silencieux dans la sidebar
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <aside className="w-64 shrink-0 backdrop-blur-xl bg-white/[0.08] border-r border-white/[0.15] flex flex-col">
      <div className="p-5 border-b border-white/[0.12]">
        <div className="[&_img]:h-9 [&_img]:w-auto" style={{ mixBlendMode: 'lighten' }}>
          <Image src="/Logo-RFC.png" alt="RFC" width={90} height={36} className="block h-9 w-auto" />
        </div>
        <p className="text-white/80 text-sm mt-2 font-medium">
          {user ? `${user.lastName} ${user.firstName}` : ''}
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${activeSection === 'dashboard' ? 'bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/30' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}`}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          Tableau de bord
        </button>
        <button
          type="button"
          onClick={() => onNavigate('create')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${activeSection === 'create' ? 'bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/30' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}`}
        >
          <UserPlus className="w-5 h-5 shrink-0" />
          Créer un compte
        </button>
        <button
          type="button"
          onClick={() => onNavigate('tickets')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${activeSection === 'tickets' ? 'bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/30' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}`}
        >
          <Ticket className="w-5 h-5 shrink-0" />
          Gérer les tickets
        </button>
      </nav>

      <div className="p-3 border-t border-white/[0.12]">
        <Link
          href="/login"
          onClick={() => {
            if (typeof window !== 'undefined') {
              disconnectRealtime()
              localStorage.removeItem('access_token')
              localStorage.removeItem('user_role')
            }
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition-all"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Déconnexion
        </Link>
      </div>
    </aside>
  )
}
