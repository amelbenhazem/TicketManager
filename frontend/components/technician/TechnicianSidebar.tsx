'use client'

import { LayoutDashboard, ListChecks } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, type UserResponse } from '@/lib/api'
import { AppSidebar, type SidebarItem } from '@/components/layout/AppSidebar'

export function TechnicianSidebar() {
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

  const items: SidebarItem[] = [
    { href: '/technician', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/technician/tickets', label: 'Mes tickets assignés', icon: ListChecks },
  ]
  return <AppSidebar userFullName={user ? `${user.lastName} ${user.firstName}` : ''} items={items} />
}
