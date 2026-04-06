'use client'

import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, type UserResponse } from '@/lib/api'
import { AppSidebar, type SidebarItem } from '@/components/layout/AppSidebar'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/tickets', label: 'Mes Tickets', icon: Ticket },
  { href: '/dashboard/tickets/new', label: 'Nouveau Ticket', icon: PlusCircle },
  { href: '/dashboard/profil', label: 'Profil', icon: User },
] as const

export function ClientSidebar() {
  const [user, setUser] = useState<UserResponse | null>(null)

  useEffect(() => {
    let mounted = true
    api.auth
      .me()
      .then((u) => {
        if (mounted) setUser(u)
      })
      .catch(() => {
        // silencieux
      })
    return () => {
      mounted = false
    }
  }, [])

  const items: SidebarItem[] = navItems as unknown as SidebarItem[]
  const isActive = (pathname: string, href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  return (
    <AppSidebar
      userFullName={user ? `${user.lastName} ${user.firstName}` : ''}
      items={items}
      isActive={isActive}
    />
  )
}
