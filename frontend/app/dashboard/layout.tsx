'use client'

import { ReactNode } from 'react'
import { ClientSidebar } from '@/components/client/ClientSidebar'
import { LoginStyleLayout } from '@/components/layout/LoginStyleLayout'
import { useRequireAuth } from '@/hooks/useRequireAuth'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  useRequireAuth('client')

  return (
    <LoginStyleLayout>
      <div className="flex min-h-screen">
        <ClientSidebar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </LoginStyleLayout>
  )
}
