'use client'

import { ClientStatsCards } from '@/components/client/ClientStatsCards'
import { NotificationsBell } from '@/components/notifications/NotificationsBell'

export default function DashboardPage() {
  return (
    <div className="text-white">
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold">Mes statistiques</h1>
        <NotificationsBell />
      </div>
      <ClientStatsCards />
    </div>
  )
}
