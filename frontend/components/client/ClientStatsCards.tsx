'use client'

import { useEffect, useState } from 'react'
import { api, type TicketStatus } from '@/lib/api'

type Stats = {
  open: number
  in_progress: number
  resolved: number
  closed: number
}

export function ClientStatsCards() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchCount = async (status?: TicketStatus): Promise<number> => {
      const res = await api.tickets.list({ status, page: 1, limit: 1 })
      return res.total ?? 0
    }
    ;(async () => {
      try {
        const [open, in_progress, resolved, closed] = await Promise.all([
          fetchCount('open'),
          fetchCount('in_progress'),
          fetchCount('resolved'),
          fetchCount('closed'),
        ])
        if (!cancelled) setStats({ open, in_progress, resolved, closed })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const Card = ({
    title,
    value,
    accentClass,
  }: {
    title: string
    value: number | string
    accentClass: string
  }) => (
    <div className="rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] p-4">
      <div className="text-white/60 text-xs mb-1">{title}</div>
      <div className={`text-2xl font-bold text-white ${accentClass}`}>{value}</div>
    </div>
  )

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Ouverts" value="…" accentClass="" />
        <Card title="En cours" value="…" accentClass="" />
        <Card title="Résolus" value="…" accentClass="" />
        <Card title="Clôturés" value="…" accentClass="" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card title="Ouverts" value={stats.open} accentClass="text-[#93c5fd]" />
      <Card title="En cours" value={stats.in_progress} accentClass="text-[#fbbf24]" />
      <Card title="Résolus" value={stats.resolved} accentClass="text-[#34d399]" />
      <Card title="Clôturés" value={stats.closed} accentClass="text-white/70" />
    </div>
  )
}

