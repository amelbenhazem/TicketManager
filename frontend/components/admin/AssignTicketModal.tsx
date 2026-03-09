'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { api, ApiError, type UserResponse, type TicketResponse } from '@/lib/api'

type AssignTicketModalProps = {
  ticket: TicketResponse
  onClose: () => void
  onAssigned: () => void
}

export function AssignTicketModal({
  ticket,
  onClose,
  onAssigned,
}: AssignTicketModalProps) {
  const [technicians, setTechnicians] = useState<UserResponse[]>([])
  const [selectedId, setSelectedId] = useState<string>(ticket.assignedTo ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.users
      .list({ role: 'technician', limit: 200 })
      .then((data) => setTechnicians(data.items ?? []))
      .catch(() => setTechnicians([]))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.tickets.update(ticket.id, {
        assignedTo: selectedId || null,
      })
      onAssigned()
      onClose()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erreur lors de l\'affectation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl backdrop-blur-xl bg-[#0A1628]/95 border border-white/[0.15] shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            Affecter le ticket
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-white/70 text-sm mb-4">
          « {ticket.title} »
        </p>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <label className="block text-[10px] font-semibold tracking-wider uppercase text-white/50 mb-2">
            Choisir un technicien
          </label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white focus:outline-none focus:border-[#0066FF]"
          >
            <option value="" className="bg-[#0A1628]">
              — Aucun —
            </option>
            {(Array.isArray(technicians) ? technicians : []).map((t) => (
              <option key={t.id} value={t.id} className="bg-[#0A1628]">
                {t.firstName} {t.lastName} ({t.email})
              </option>
            ))}
          </select>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-[15px] font-medium bg-white/[0.08] text-white/80"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl text-[15px] font-semibold bg-[#0066FF] text-white disabled:opacity-70"
            >
              {loading ? 'Envoi...' : 'Affecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
