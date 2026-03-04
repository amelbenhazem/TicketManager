'use client'

import { ReactNode } from 'react'
import { TechnicianSidebar } from '@/components/technician/TechnicianSidebar'
import { LoginStyleLayout } from '@/components/layout/LoginStyleLayout'

export default function TechnicianLayout({ children }: { children: ReactNode }) {
  return (
    <LoginStyleLayout>
      <div className="flex min-h-screen">
        <TechnicianSidebar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </LoginStyleLayout>
  )
}
