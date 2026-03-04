'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, ApiError, type TicketResponse, type UserResponse } from '@/lib/api'
import { AssignTicketModal } from './AssignTicketModal'
import { TicketDetailModal } from './TicketDetailModal'

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

export function AdminTicketsList() {
  const [tickets, setTickets] = useState<TicketResponse[]>([])
  const [technicians, setTechnicians] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignTicket, setAssignTicket] = useState<TicketResponse | null>(null)
  const [detailTicket, setDetailTicket] = useState<TicketResponse | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchTickets = useCallback(async () => {
    try {
      const data = await api.tickets.list()
      setTickets(data)
      setError(null)
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setTickets([])
      else setError(e instanceof ApiError ? e.message : 'Erreur chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  useEffect(() => {
    api.users.list({ role: 'technician' }).then(setTechnicians).catch(() => setTechnicians([]))
  }, [])

  const technicianMap = Object.fromEntries(
    technicians.map((t) => [t.id, `${t.firstName} ${t.lastName}`])
  )

  const handleStatusChange = async (ticket: TicketResponse, newStatus: 'open' | 'in_progress' | 'closed') => {
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
                <td className="py-3 text-white/70">{priorityLabel[t.priority] ?? t.priority}</td>
                <td className="py-3">
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t, e.target.value as 'open' | 'in_progress' | 'closed')}
                    disabled={updatingId === t.id}
                    className="bg-white/[0.08] border border-white/[0.12] rounded-lg px-2 py-1 text-white/90 text-sm focus:outline-none focus:border-[#0066FF]"
                  >
                    <option value="open" className="bg-[#0A1628]">Ouvert</option>
                    <option value="in_progress" className="bg-[#0A1628]">En cours</option>
                    <option value="closed" className="bg-[#0A1628]">Fermé</option>
                  </select>
                </td>
                <td className="py-3 text-white/70">
                  {t.assignedTo ? (technicianMap[t.assignedTo] ?? t.assignedTo) : '—'}
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
                    {t.status !== 'closed' && (
                      <button
                        type="button"
                        onClick={() => handleCloseTicket(t)}
                        disabled={updatingId === t.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 disabled:opacity-50"
                      >
                        Valider & Clôturer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
          technicianLabel={detailTicket.assignedTo ? technicianMap[detailTicket.assignedTo] : undefined}
          onClose={() => setDetailTicket(null)}
        />
      )}
    </>
  )
}
