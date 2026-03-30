'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, ApiError, type TicketCategory, type TicketPriority, type TicketResponse, type TicketStatus } from '@/lib/api'
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

export default function TechnicianTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  // Filtres (technicien)
  const [status, setStatus] = useState<string>('')
  const [priority, setPriority] = useState<string>('')
  const [category, setCategory] = useState<string>('')
  const [createdFrom, setCreatedFrom] = useState<string>('')
  const [createdTo, setCreatedTo] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [, setUpdatingId] = useState<string | null>(null)

  const asEnum = <T extends string>(value: string, allowed: readonly T[]): T | undefined =>
    (allowed as readonly string[]).includes(value) ? (value as T) : undefined

  const inFlightRef = useRef(false)
  const fetchTickets = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false
      if (inFlightRef.current) return
      inFlightRef.current = true

      try {
        const data = await api.tickets.list({
          page: page,
          limit: 20,
          status: asEnum(status, ['open', 'in_progress', 'resolved'] as const satisfies readonly TicketStatus[]),
          priority: asEnum(priority, ['low', 'medium', 'high'] as const satisfies readonly TicketPriority[]),
          category: asEnum(category, ['reseau', 'logiciel', 'materiel', 'autre'] as const satisfies readonly TicketCategory[]),
          createdFrom: createdFrom || undefined,
          createdTo: createdTo || undefined,
          search: search.trim() || undefined,
        })
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
    [page, status, priority, category, createdFrom, createdTo, search, router],
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

  // Reset page si filtres changent
  useEffect(() => {
    setPage(1)
  }, [status, priority, category, createdFrom, createdTo, search])

  const handleStatusChange = async (
    ticket: TicketResponse,
    newStatus: 'open' | 'in_progress' | 'resolved',
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

  return (
    <>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Mes tickets assignés</h1>
        {/* Cloche déjà affichée par le layout */}
      </div>

      {/* Filtres */}
      <div className="mb-4 rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Recherche (titre, description)" />
          <div className="flex gap-2">
            <Select
              value={status}
              onChange={setStatus}
              options={[
                { value: '', label: 'Tous' },
                { value: 'open', label: 'Ouvert' },
                { value: 'in_progress', label: 'En cours' },
                { value: 'resolved', label: 'Résolu' },
              ]}
              className="flex-1"
              placeholder="Statut"
            />
            <Select
              value={priority}
              onChange={setPriority}
              options={[
                { value: '', label: 'Toutes' },
                { value: 'low', label: 'Basse' },
                { value: 'medium', label: 'Moyenne' },
                { value: 'high', label: 'Haute' },
              ]}
              className="flex-1"
              placeholder="Priorité"
            />
          </div>
          <Select
            value={category}
            onChange={setCategory}
            options={[
              { value: '', label: 'Toutes' },
              { value: 'reseau', label: 'Réseau' },
              { value: 'logiciel', label: 'Logiciel' },
              { value: 'materiel', label: 'Matériel' },
              { value: 'autre', label: 'Autre' },
            ]}
            placeholder="Catégorie"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Du</div>
              <DateInput value={createdFrom} onChange={setCreatedFrom} />
            </div>
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Au</div>
              <DateInput value={createdTo} onChange={setCreatedTo} />
            </div>
          </div>
          <div className="self-end">
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStatus('')
                setPriority('')
                setCategory('')
                setCreatedFrom('')
                setCreatedTo('')
                setPage(1)
              }}
              className="w-full tm-button"
            >
              Réinitialiser filtres
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-white/60">Chargement...</p>
      ) : tickets.length === 0 ? (
        <p className="text-white/60">Aucun ticket assigné.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 text-[10px] font-semibold uppercase text-white/50">Titre</th>
                  <th className="pb-3 text-[10px] font-semibold uppercase text-white/50">Catégorie</th>
                  <th className="pb-3 text-[10px] font-semibold uppercase text-white/50">Priorité</th>
                  <th className="pb-3 text-[10px] font-semibold uppercase text-white/50">Statut</th>
                  <th className="pb-3 text-[10px] font-semibold uppercase text-white/50">Date</th>
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
                      {(() => {
                        const allowed = new Set(['open', 'in_progress', 'resolved'])
                        const current = allowed.has(t.status as string) ? (t.status as 'open' | 'in_progress' | 'resolved') : 'open'
                        return (
                      <Select
                        value={current}
                        onChange={(v) =>
                          handleStatusChange(t, v as 'open' | 'in_progress' | 'resolved')
                        }
                        options={[
                          { value: 'open', label: 'À traiter' },
                          { value: 'in_progress', label: 'En cours' },
                          { value: 'resolved', label: 'Résolu' },
                        ]}
                        className="w-[160px]"
                      />
                        )
                      })()}
                    </td>
                    <td className="py-3 text-white/50 text-sm">
                      {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm text-white/50">
              <span>Page {pagination.page} sur {pagination.totalPages} ({pagination.total} ticket(s))</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-40 text-white/70"
                >
                  Précédent
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={`px-2.5 py-1.5 rounded-lg text-white/80 ${n === pagination.page ? 'bg-[#0066FF] text-white' : 'bg-white/[0.06] hover:bg-white/[0.1]'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
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
    </>
  )
}

