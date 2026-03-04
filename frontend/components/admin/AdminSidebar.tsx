'use client'

import Link from 'next/link'
import { LayoutDashboard, UserPlus, LogOut } from 'lucide-react'

type AdminSidebarProps = {
  activeSection: 'dashboard' | 'create'
  onNavigate: (section: 'dashboard' | 'create') => void
}

export function AdminSidebar({ activeSection, onNavigate }: AdminSidebarProps) {
  return (
    <aside className="w-64 shrink-0 backdrop-blur-xl bg-white/[0.08] border-r border-white/[0.15] flex flex-col">
      <div className="p-5 border-b border-white/[0.12]">
        <div className="[&_img]:h-9 [&_img]:w-auto" style={{ mixBlendMode: 'lighten' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo-RFC.png" alt="RFC" className="block" />
        </div>
        <p className="text-white/60 text-xs mt-2 font-medium">TicketDesk Admin</p>
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
      </nav>

      <div className="p-3 border-t border-white/[0.12]">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-white/[0.06] hover:text-white transition-all"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Déconnexion
        </Link>
      </div>
    </aside>
  )
}
