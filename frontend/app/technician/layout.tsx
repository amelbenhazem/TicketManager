'use client'

import { ReactNode } from 'react'
import { TechnicianSidebar } from '@/components/technician/TechnicianSidebar'
import { LoginStyleLayout } from '@/components/layout/LoginStyleLayout'
import { NotificationsBell } from '@/components/notifications/NotificationsBell'
import { useRequireAuth } from '@/hooks/useRequireAuth'

export default function TechnicianLayout({ children }: { children: ReactNode }) {
  useRequireAuth('technician')

  return (
    <LoginStyleLayout>
      <div className="flex min-h-screen">
        <TechnicianSidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
            <div className="flex items-start justify-end mb-4">
              <NotificationsBell />
            </div>
            {children}
          </div>
          <p className="text-center text-white/20 text-xs py-6">
            &copy; 2026 RFC. Tous droits réservés.
          </p>
        </main>
      </div>
    </LoginStyleLayout>
  )
}
