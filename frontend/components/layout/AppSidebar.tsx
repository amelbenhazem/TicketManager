'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { disconnectRealtime } from '@/lib/realtime'

export type SidebarItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

type AppSidebarProps = {
  userFullName?: string
  items: SidebarItem[]
  isActive?: (pathname: string, href: string) => boolean
}

export function AppSidebar({ userFullName, items, isActive }: AppSidebarProps) {
  const pathname = usePathname()
  const active = (href: string) =>
    (isActive ? isActive(pathname, href) : pathname === href)

  return (
    <aside className="w-64 shrink-0 backdrop-blur-xl bg-white/[0.08] border-r border-white/[0.15] flex flex-col">
      <div className="p-5 border-b border-white/[0.12]">
        <div className="[&_img]:h-9 [&_img]:w-auto" style={{ mixBlendMode: 'lighten' }}>
          <Image
            src="/Logo-RFC.png"
            alt="RFC"
            width={90}
            height={36}
            className="block h-9 w-auto"
          />
        </div>
        <p className="text-white/80 text-sm mt-2 font-medium">
          {userFullName ?? ''}
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium transition-all ${
              active(href)
                ? 'bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/30'
                : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-white/[0.12]">
        <Link
          href="/login"
          onClick={() => {
            disconnectRealtime()
            if (typeof globalThis.window !== 'undefined') {
              globalThis.localStorage?.removeItem('access_token')
              globalThis.localStorage?.removeItem('user_role')
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

