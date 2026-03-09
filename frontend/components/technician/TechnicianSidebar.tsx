'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LogOut } from 'lucide-react'

export function TechnicianSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 backdrop-blur-xl bg-white/[0.08] border-r border-white/[0.15] flex flex-col">
      <div className="p-5 border-b border-white/[0.12]">
        <div
          className="[&_img]:h-9 [&_img]:w-auto"
          style={{ mixBlendMode: 'lighten' }}
        >
          <Image
            src="/Logo-RFC.png"
            alt="RFC"
            width={90}
            height={36}
            className="block h-9 w-auto"
          />
        </div>
        <p className="text-white/60 text-xs mt-2 font-medium">
          TicketDesk Technicien
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <Link
          href="/technician"
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${
            pathname === '/technician'
              ? 'bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/30'
              : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          Tableau de bord
        </Link>
      </nav>

      <div className="p-3 border-t border-white/[0.12]">
        <Link
          href="/"
          onClick={() => {
            if (typeof window !== 'undefined') {
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
