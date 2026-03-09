'use client'

import { useEffect, useState } from 'react'
import { api, ApiError, type TicketResponse } from '@/lib/api'

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

export default function MesTicketsPage() {
  const [tickets, setTickets] = useState<TicketResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })

  useEffect(() => {
    let cancelled = false
    api.tickets
      .list({ page, limit: 20 })
      .then((data) => {
        if (!cancelled) {
          setTickets(data.items)
          setPagination({ total: data.total, page: data.page, totalPages: data.totalPages })
        }
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            e instanceof ApiError ? e.message : 'Erreur lors du chargement',
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page])

  return (
    <div className="text-white">
      <h1 className="text-2xl font-bold mb-6">Mes Tickets</h1>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-white/60">Chargement...</p>
      ) : tickets.length === 0 ? (
        <p className="text-white/60">
          Aucun ticket. Créez-en un depuis « Nouveau Ticket ».
        </p>
      ) : (
        <>
        <ul className="space-y-4">
          {tickets.map((t) => (
            <li
              key={t.id}
              className="p-5 rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.15]"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="font-semibold text-white">{t.title}</h2>
                  {t.description && (
                    <p className="text-white/60 text-sm mt-1 line-clamp-2">
                      {t.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                  <span className="text-white/50">
                    {categoryLabel[t.category ?? 'autre'] ?? t.category}
                  </span>
                  <span className="text-white/30">•</span>
                  <span className="text-white/50">
                    {priorityLabel[t.priority ?? 'medium'] ?? t.priority}
                  </span>
                  {Array.isArray(t.attachments) && t.attachments.length > 0 && (
                    <>
                      <span className="text-white/30">•</span>
                      <span className="text-white/50">
                        {t.attachments.length} pièce(s)
                      </span>
                    </>
                  )}
                </div>
                <p className="text-white/40 text-xs mt-1">
                  {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                </p>
                <span
                  className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium ${
                    t.status === 'closed'
                      ? 'bg-white/10 text-white/70'
                      : t.status === 'resolved'
                        ? 'bg-green-500/20 text-green-300'
                        : t.status === 'in_progress'
                          ? 'bg-[#0066FF]/30 text-[#60A5FA]'
                          : 'bg-white/10 text-white/80'
                  }`}
                >
                  {statusLabel[t.status] ?? t.status}
                </span>
              </div>
              </div>
            </li>
          ))}
        </ul>

        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between text-sm text-white/50">
            <span>Page {pagination.page} sur {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-40 text-white/70"
              >
                Précédent
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-40 text-white/70"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        </>
      )}
    </div>
  )
}
