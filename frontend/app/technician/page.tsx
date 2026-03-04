'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api, ApiError, type TicketResponse } from '@/lib/api'
import { TicketDetailModal } from '@/components/admin/TicketDetailModal'

const statusLabel: Record<string, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  closed: 'Fermé',
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

const COLUMNS: { id: 'open' | 'in_progress' | 'closed'; title: string }[] = [
  { id: 'open', title: 'À Traiter' },
  { id: 'in_progress', title: 'En Cours' },
  { id: 'closed', title: 'Résolus' },
]

export default function TechnicianDashboardPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailTicket, setDetailTicket] = useState<TicketResponse | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchTickets = useCallback(async () => {
    try {
      const data = await api.tickets.list()
      setTickets(data)
      setError(null)
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) router.replace('/')
      else setError(e instanceof ApiError ? e.message : 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('access_token')) {
      router.replace('/')
      return
    }
    fetchTickets()
  }, [fetchTickets, router])

  const handleStatusChange = async (
    ticket: TicketResponse,
    newStatus: 'open' | 'in_progress' | 'closed'
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

  const getTicketsByStatus = (status: 'open' | 'in_progress' | 'closed') =>
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
                          e.target.value as 'open' | 'in_progress' | 'closed'
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
                      <option value="closed" className="bg-[#0A1628]">
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
