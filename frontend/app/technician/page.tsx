'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, ApiError, type TicketResponse } from '@/lib/api'
import { subscribeTicketRealtime } from '@/lib/realtime'
import { TechnicianStatsCards } from '@/components/technician/TechnicianStatsCards'


// statusLabel est défini mais non utilisé ici; retiré pour éviter les warnings lint
const categoryLabel: Record<string, string> = {
  reseau: 'Réseau',
  logiciel: 'Logiciel',
  materiel: 'Matériel',
  autre: 'Autre',
}
const priorityLabel: Record<string, string> = {
  low: 'Basse',
  medium: 'Moyen',
  high: 'Haute',
}

const COLUMNS: { id: 'open' | 'in_progress' | 'resolved'; title: string }[] = [
  { id: 'open', title: 'À Traiter' },
  { id: 'in_progress', title: 'En Cours' },
  { id: 'resolved', title: 'Résolus' },
]

export default function TechnicianDashboardPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailTicket] = useState<TicketResponse | null>(null)
  const [updatingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  // Pas de filtres sur le tableau de bord

  const inFlightRef = useRef(false)
  const fetchTickets = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false
      if (inFlightRef.current) return
      inFlightRef.current = true

      try {
        const data = await api.tickets.list({ page, limit: 20 })
        setTickets(data.items)
        setPagination({ total: data.total, page: data.page, totalPages: data.totalPages })
        if (!silent) setError(null)
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) {
          router.replace('/login')
        } else if (!silent) {
          setError(e instanceof ApiError ? e.message : 'Erreur chargement')
        }
      } finally {
        inFlightRef.current = false
        if (!silent) setLoading(false)
      }
    },
    [page, router],
  )

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('access_token')) {
      router.replace('/login')
      return
    }
    fetchTickets()
  }, [fetchTickets, router])

  useEffect(() => {
    return subscribeTicketRealtime(() => {
      void fetchTickets({ silent: true })
    })
  }, [fetchTickets])

  // Pas de reset de page sur filtres

  useEffect(() => {
    const POLL_MS = 30_000

    const poll = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      void fetchTickets({ silent: true })
    }

    const id = setInterval(poll, POLL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [fetchTickets])

  // Pas d'actions de statut sur le dashboard

  if (loading) {
    return <p className="text-white/60">Chargement des tickets...</p>
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">
        {error}
      </div>
    )
  }

  return (
    <>
      <header className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Tableau de bord <span className="text-[#60A5FA]">Technicien</span>
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Tickets qui vous sont assignés — déplacez le statut selon l’avancement.
            </p>
          </div>
          {/* Cloche affichée par le layout */}
        </div>
      </header>

      <section className="mb-6">
        <TechnicianStatsCards />
      </section>

      {/* Liste et filtres déplacés dans /technician/tickets */}

      {/* Aucun modal de détail sur le dashboard */}
    </>
  )
}
