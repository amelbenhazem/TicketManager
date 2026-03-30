'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, type TicketResponse, type UserResponse } from '@/lib/api'
import { AssignTicketModal } from './AssignTicketModal'
import { TicketDetailModal } from './TicketDetailModal'
import { subscribeTicketRealtime } from '@/lib/realtime'
import { Select } from '@/components/ui/Select'
import { SearchInput } from '@/components/ui/SearchInput'
import { DateInput } from '@/components/ui/DateInput'

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

export function AdminTicketsList() {
  const [tickets, setTickets] = useState<TicketResponse[]>([])
  const [technicians, setTechnicians] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignTicket, setAssignTicket] = useState<TicketResponse | null>(null)
  const [detailTicket, setDetailTicket] = useState<TicketResponse | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [ticketsPage, setTicketsPage] = useState(1)
  const [ticketsPagination, setTicketsPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  // Filtres
  const [status, setStatus] = useState<string>('')
  const [priority, setPriority] = useState<string>('')
  const [category, setCategory] = useState<string>('')
  const [createdFrom, setCreatedFrom] = useState<string>('')
  const [createdTo, setCreatedTo] = useState<string>('')
  const [search, setSearch] = useState<string>('')

  const inFlightRef = useRef(false)
  const fetchTickets = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false
      if (inFlightRef.current) return
      inFlightRef.current = true

      try {
        const data = await api.tickets.list({
          page: ticketsPage,
          limit: 20,
          status: (status || undefined) as any,
          priority: (priority || undefined) as any,
          category: (category || undefined) as any,
          createdFrom: createdFrom || undefined,
          createdTo: createdTo || undefined,
          search: search.trim() || undefined,
        })
        setTickets(data.items)
        setTicketsPagination({ total: data.total, page: data.page, totalPages: data.totalPages })
        if (!silent) setError(null)
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) setTickets([])
        else if (!silent) setError(e instanceof ApiError ? e.message : 'Erreur chargement')
      } finally {
        inFlightRef.current = false
        if (!silent) setLoading(false)
      }
    },
    [ticketsPage, status, priority, category, createdFrom, createdTo, search],
  )

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  useEffect(() => {
    return subscribeTicketRealtime(
      () => {
        void fetchTickets({ silent: true })
      },
      { showToast: false },
    )
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

  useEffect(() => {
    api.users.list({ role: 'technician', limit: 200 }).then((data) => setTechnicians(data.items)).catch(() => setTechnicians([]))
  }, [])

  // Reset pagination à 1 sur changement de filtres
  useEffect(() => {
    setTicketsPage(1)
  }, [status, priority, category, createdFrom, createdTo, search])

  const technicianMap = Object.fromEntries(
    technicians.map((t) => [t.id, `${t.firstName} ${t.lastName}`])
  )

  const getTechnicianLabel = (t: TicketResponse) =>
    t.assignedToUser
      ? `${t.assignedToUser.firstName} ${t.assignedToUser.lastName}`
      : t.assignedTo
        ? (technicianMap[t.assignedTo] ?? t.assignedTo)
        : '—'

  const priorityIcon: Record<string, string> = {
    low: '🟢',
    medium: '🟠',
    high: '🔴',
  }
  const statusIcon: Record<string, string> = {
    open: '🔵',
    in_progress: '🟠',
    resolved: '🟢',
    closed: '⚫',
  }

  const handleStatusChange = async (ticket: TicketResponse, newStatus: 'open' | 'in_progress' | 'resolved' | 'closed') => {
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

  const handleCloseTicket = async (ticket: TicketResponse) => {
    if (ticket.status === 'closed') return
    setUpdatingId(ticket.id)
    try {
      await api.tickets.update(ticket.id, { status: 'closed' })
      await fetchTickets()
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Erreur')
    } finally {
      setUpdatingId(null)
    }
  }

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

  if (tickets.length === 0) {
    return <p className="text-white/60">Aucun ticket.</p>
  }

  return (
    <>
      {/* Filtres */}
      <div className="mb-4 rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Recherche (titre, description)" />

          <div className="flex gap-2">
            <Select
              className="flex-1"
              placeholder="Statut"
              value={status}
              onChange={setStatus}
              options={[
                { value: '', label: 'Tous' },
                { value: 'open', label: 'Ouvert' },
                { value: 'in_progress', label: 'En cours' },
                { value: 'resolved', label: 'Résolu' },
                { value: 'closed', label: 'Clôturé' },
              ]}
            />
            <Select
              className="flex-1"
              placeholder="Priorité"
              value={priority}
              onChange={setPriority}
              options={[
                { value: '', label: 'Toutes' },
                { value: 'low', label: 'Basse' },
                { value: 'medium', label: 'Moyenne' },
                { value: 'high', label: 'Haute' },
              ]}
            />
          </div>

          <div className="space-y-3">
            <Select
              placeholder="Catégorie"
              value={category}
              onChange={setCategory}
              options={[
                { value: '', label: 'Toutes' },
                { value: 'reseau', label: 'Réseau' },
                { value: 'logiciel', label: 'Logiciel' },
                { value: 'materiel', label: 'Matériel' },
                { value: 'autre', label: 'Autre' },
              ]}
            />
          </div>

          {/* Période (Du / Au) sur une ligne dédiée, labels au-dessus pour éviter le décalage */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Du</div>
              <DateInput value={createdFrom} onChange={setCreatedFrom} />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Au</div>
              <DateInput value={createdTo} onChange={setCreatedTo} />
            </div>
          </div>

          {/* Bouton reset après la période, aligné à droite */}
          <div className="md:col-span-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatus('')
                setPriority('')
                setCategory('')
                setCreatedFrom('')
                setCreatedTo('')
                setTicketsPage(1)
              }}
              className="tm-button"
            >
              Réinitialiser filtres
            </button>
          </div>

        </div>
      </div>

      <div className="mb-2 text-sm text-white/70">
        {ticketsPagination.total} ticket(s) trouvés
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pb-3 text-[10px] font-semibold uppercase text-white/50">Titre</th>
              <th className="pb-3 text-[10px] font-semibold uppercase text-white/50">Catégorie</th>
              <th className="pb-3 text-[10px] font-semibold uppercase text-white/50">Priorité</th>
              <th className="pb-3 text-[10px] font-semibold uppercase text-white/50">Statut</th>
              <th className="pb-3 text-[10px] font-semibold uppercase text-white/50">Technicien</th>
              <th className="pb-3 text-[10px] font-semibold uppercase text-white/50">Date</th>
              <th className="pb-3 text-[10px] font-semibold uppercase text-white/50">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b border-white/5">
                <td className="py-3 text-white font-medium">{t.title}</td>
                <td className="py-3 text-white/70">{categoryLabel[t.category] ?? t.category}</td>
                <td className="py-3 text-white/70">
                  <span className={`tm-badge-priority ${t.priority}`}>
                    {priorityLabel[t.priority] ?? t.priority}
                  </span>
                </td>
                <td className="py-3">
                  <Select
                    value={t.status}
                    onChange={(v) => handleStatusChange(t, v as 'open' | 'in_progress' | 'resolved' | 'closed')}
                    options={[
                      { value: 'open', label: 'Ouvert' },
                      { value: 'in_progress', label: 'En cours' },
                      { value: 'resolved', label: 'Résolu' },
                      { value: 'closed', label: 'Clôturé' },
                    ]}
                    className="w-[180px]"
                  />
                </td>
                <td className="py-3 text-white/70">
                  {getTechnicianLabel(t)}
                </td>
                <td className="py-3 text-white/50 text-sm">
                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString('fr-FR') : '—'}
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailTicket(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.08] text-white/80 hover:bg-white/[0.12]"
                    >
                      Voir
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignTicket(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0066FF]/30 text-[#60A5FA] hover:bg-[#0066FF]/50"
                    >
                      Affecter
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ticketsPagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-white/60">
          <span>
            Page {ticketsPagination.page} sur {ticketsPagination.totalPages} ({ticketsPagination.total} ticket(s))
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTicketsPage((p) => Math.max(1, p - 1))}
              disabled={ticketsPagination.page <= 1}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:pointer-events-none text-white/80"
            >
              Précédent
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: ticketsPagination.totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTicketsPage(n)}
                  className={`px-2.5 py-1.5 rounded-lg text-white/80 ${n === ticketsPagination.page ? 'bg-[#0066FF] text-white' : 'bg-white/[0.06] hover:bg-white/[0.1]'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTicketsPage((p) => Math.min(ticketsPagination.totalPages, p + 1))}
              disabled={ticketsPagination.page >= ticketsPagination.totalPages}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:pointer-events-none text-white/80"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {assignTicket && (
        <AssignTicketModal
          ticket={assignTicket}
          onClose={() => setAssignTicket(null)}
          onAssigned={fetchTickets}
        />
      )}

      {detailTicket && (
        <TicketDetailModal
          ticket={detailTicket}
          technicianLabel={getTechnicianLabel(detailTicket)}
          onClose={() => setDetailTicket(null)}
        />
      )}
    </>
  )
}
