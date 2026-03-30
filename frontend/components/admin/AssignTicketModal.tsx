'use client'

import { useState, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'
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
  const [query, setQuery] = useState<string>('')
  const [open, setOpen] = useState<boolean>(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.users
      .list({ role: 'technician', limit: 200 })
      .then((data) => setTechnicians(data.items ?? []))
      .catch(() => setTechnicians([]))
  }, [])

  const filtered = (() => {
    if (!query.trim()) return technicians
    const q = query.trim().toLowerCase()
    return technicians.filter((t) => {
      const name = `${t.firstName ?? ''} ${t.lastName ?? ''}`.toLowerCase()
      const email = (t.email ?? '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  })()

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
          {/* Déclencheur du dropdown */}
          <div className="relative mb-2">
            <button
              type="button"
              className="tm-select pr-8 text-left w-full"
              aria-haspopup="listbox"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {(() => {
                if (!selectedId) return <span className="text-white/50">— Aucun —</span>
                const t = technicians.find((u) => u.id === selectedId)
                return t ? `${t.firstName} ${t.lastName} (${t.email})` : <span className="text-white/50">— Aucun —</span>
              })()}
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
            </button>
            {open && (
              <div className="absolute z-20 mt-1 w-full rounded-xl bg-[#0A1628] border border-white/[0.15] shadow-xl p-2">
                <div className="tm-input-wrap mb-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher (nom ou email)"
                    className="tm-input"
                    autoFocus
                  />
                </div>
                <div className="max-h-56 overflow-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId('')
                      setOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg ${selectedId === '' ? 'bg-white/[0.08] text-white' : 'text-white/80 hover:bg-white/[0.08]'}`}
                    role="option"
                    aria-selected={selectedId === ''}
                  >
                    — Aucun —
                  </button>
                  {(Array.isArray(filtered) ? filtered : []).map((t) => {
                    const id = t.id
                    const label = `${t.firstName} ${t.lastName} (${t.email})`
                    const active = selectedId === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setSelectedId(id)
                          setOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg ${active ? 'bg-white/[0.08] text-white' : 'text-white/80 hover:bg-white/[0.08]'}`}
                        role="option"
                        aria-selected={active}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
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
