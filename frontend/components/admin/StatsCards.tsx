'use client'

import { UsersStats } from '@/lib/api'

const cards = [
  {
    key: 'total' as const,
    label: 'Total utilisateurs',
    color: 'from-[#0066FF]/30 to-[#60A5FA]/20 border-[#0066FF]/40',
  },
  {
    key: 'client' as const,
    label: 'Clients',
    color: 'from-emerald-500/30 to-emerald-400/20 border-emerald-400/40',
  },
  {
    key: 'technician' as const,
    label: 'Techniciens',
    color: 'from-amber-500/30 to-amber-400/20 border-amber-400/40',
  },
  {
    key: 'admin' as const,
    label: 'Admins',
    color: 'from-violet-500/30 to-violet-400/20 border-violet-400/40',
  },
]

type StatsCardsProps = {
  stats: UsersStats | null
  loading?: boolean
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.key}
            className="backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] rounded-2xl p-5 animate-pulse"
          >
            <div className="h-4 bg-white/20 rounded w-2/3 mb-3" />
            <div className="h-8 bg-white/20 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  const value = (key: string) =>
    key === 'total' ? stats?.total ?? 0 : stats?.byRole?.[key] ?? 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.key}
          className={`backdrop-blur-xl bg-gradient-to-br ${c.color} border rounded-2xl p-5 shadow-xl`}
        >
          <p className="text-white/70 text-sm font-medium mb-1">{c.label}</p>
          <p className="text-2xl font-bold text-white">{value(c.key)}</p>
        </div>
      ))}
    </div>
  )
}
