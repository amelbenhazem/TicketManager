'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, ApiError, type TicketResponse } from '@/lib/api'
import { TicketDetailModal } from '@/components/admin/TicketDetailModal'
import { subscribeTicketRealtime } from '@/lib/realtime'

const statusLabel: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  resolved: 'Résolu',
  closed: 'Clôturé',
}
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
  const [detailTicket, setDetailTicket] = useState<TicketResponse | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })

  const inFlightRef = useRef(false)
  const fetchTickets = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false
      if (inFlightRef.current) return
      inFlightRef.current = true

      try {
        const data = await api.tickets.list({ page: page, limit: 20 })
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

  const handleStatusChange = async (
    ticket: TicketResponse,
    newStatus: 'open' | 'in_progress' | 'resolved'
  ) => {
    setUpdatingId(ticket.id)
    try {
      await api.tickets.update(ticket.id, { status: newStatus })
      await fetchTickets()
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Erreur')
    } finally {
      setUpdatingId(null)
    }
  }

  const getTicketsByStatus = (status: 'open' | 'in_progress' | 'resolved') =>
    tickets.filter((t) => t.status === status)

  const clientLabel = (t: TicketResponse) =>
    t.createdBy
      ? `${t.createdBy.firstName} ${t.createdBy.lastName} (${t.createdBy.email})`
      : undefined

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
        <h1 className="text-2xl font-bold text-white">
          Tableau de bord <span className="text-[#60A5FA]">Technicien</span>
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Tickets qui vous sont assignés — déplacez le statut selon l’avancement.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] p-4"
          >
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-4">
              {col.title}
            </h2>
            <div className="space-y-3 min-h-[120px]">
              {getTicketsByStatus(col.id).map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl bg-white/[0.06] border border-white/[0.1] p-4"
                >
                  <h3 className="font-medium text-white truncate">{t.title}</h3>
                  <p className="text-white/50 text-xs mt-1">
                    {categoryLabel[t.category] ?? t.category} ·{' '}
                    {priorityLabel[t.priority] ?? t.priority}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setDetailTicket(t)}
                      className="px-2 py-1.5 rounded-lg text-xs font-medium bg-white/[0.08] text-white/80 hover:bg-white/[0.12]"
                    >
                      Voir détails
                    </button>
                    <select
                      value={t.status}
                      onChange={(e) =>
                        handleStatusChange(
                          t,
                          e.target.value as 'open' | 'in_progress' | 'resolved'
                        )
                      }
                      disabled={updatingId === t.id}
                      className="px-2 py-1.5 rounded-lg text-xs bg-white/[0.08] border border-white/[0.12] text-white/90 focus:outline-none"
                    >
                      <option value="open" className="bg-[#0A1628]">
                        À traiter
                      </option>
                      <option value="in_progress" className="bg-[#0A1628]">
                        En cours
                      </option>
                      <option value="resolved" className="bg-[#0A1628]">
                        Résolu
                      </option>
                    </select>
                    {t.createdBy && (
                      <button
                        type="button"
                        onClick={() => setDetailTicket(t)}
                        className="px-2 py-1.5 rounded-lg text-xs font-medium text-[#60A5FA] hover:bg-[#0066FF]/20"
                      >
                        Voir client
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-white/60">
          <span>Page {pagination.page} sur {pagination.totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-40 text-white/80"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-40 text-white/80"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {detailTicket && (
        <TicketDetailModal
          ticket={detailTicket}
          clientLabel={clientLabel(detailTicket)}
          onClose={() => setDetailTicket(null)}
        />
      )}
    </>
  )
}
