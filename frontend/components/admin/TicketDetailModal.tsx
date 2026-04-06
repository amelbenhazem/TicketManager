'use client'

import { X } from 'lucide-react'
import type { TicketResponse } from '@/lib/api'

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

type TicketDetailModalProps = {
  ticket: TicketResponse
  technicianLabel?: string
  clientLabel?: string
  onClose: () => void
}

export function TicketDetailModal({
  ticket,
  technicianLabel,
  clientLabel,
  onClose,
}: TicketDetailModalProps) {
  const translateStatus = (s?: string | null) => {
    if (!s) return '—'
    const key = String(s) as keyof typeof statusLabel
    return statusLabel[key] ?? s
  }

  type TicketHistoryItem = {
    actorId: string
    actorRole?: string
    action: string
    field?: string
    from?: string | null
    to?: string | null
    timestamp?: string
  }
  const history = (ticket as unknown as { history?: TicketHistoryItem[] }).history
  const getFileName = (u: string) => {
    try {
      const url = new URL(u)
      const pathname = url.pathname.split('/').filter(Boolean)
      const last = pathname[pathname.length - 1] ?? u
      return decodeURIComponent(last)
    } catch {
      // not a valid URL, fallback to raw string
      const parts = u.split('/')
      return decodeURIComponent(parts[parts.length - 1] ?? u)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-auto rounded-2xl backdrop-blur-xl bg-[#0A1628]/95 border border-white/[0.15] shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Détail du ticket
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
        <div className="space-y-4 text-sm">
          <div>
            <span className="text-[10px] font-semibold uppercase text-white/50">Titre</span>
            <p className="text-white mt-1">{ticket.title}</p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase text-white/50">Description</span>
            <p className="text-white/80 mt-1 whitespace-pre-wrap">
              {ticket.description || '—'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-semibold uppercase text-white/50">Catégorie</span>
              <p className="text-white mt-1">{categoryLabel[ticket.category] ?? ticket.category}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-white/50">Priorité</span>
              <p className="text-white mt-1">{priorityLabel[ticket.priority] ?? ticket.priority}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold uppercase text-white/50">Statut</span>
              <p className="text-white mt-1">{statusLabel[ticket.status] ?? ticket.status}</p>
            </div>
            {technicianLabel !== undefined && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-white/50">Technicien affecté</span>
                <p className="text-white mt-1">{technicianLabel}</p>
              </div>
            )}
            {clientLabel !== undefined && (
              <div>
                <span className="text-[10px] font-semibold uppercase text-white/50">Client</span>
                <p className="text-white mt-1">{clientLabel}</p>
              </div>
            )}
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase text-white/50">Date de création</span>
            <p className="text-white mt-1">
              {ticket.createdAt
                ? new Date(ticket.createdAt).toLocaleString('fr-FR')
                : '—'}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-semibold uppercase text-white/50">Créé par</span>
            <p className="text-white mt-1">
              {(() => {
                if (ticket.createdBy) {
                  const { firstName = '', lastName = '', email = '' } = ticket.createdBy
                  return `${firstName} ${lastName} (${email})`
                }
                return clientLabel ?? ticket.userId ?? '—'
              })()}
            </p>
          </div>
          {Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase text-white/50">Pièces jointes</span>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {ticket.attachments.map((a, i) => {
                  const rawUrl = String(a)
                  const name = getFileName(rawUrl)

                  // Construire deux URLs:
                  // - viewUrl: sans "download" → prévisualisation si possible
                  // - downloadUrl: avec attribut download; pour Cloudinary, on peut ajouter fl_attachment
                  let viewUrl = rawUrl
                  let downloadUrl = rawUrl
                  try {
                    const u = new URL(rawUrl)
                    // Pour Cloudinary, remplacer '/upload/' par '/upload/fl_attachment/'
                    if (u.hostname.includes('cloudinary')) {
                      downloadUrl = rawUrl.replace('/upload/', '/upload/fl_attachment/')
                      viewUrl = rawUrl.replace('/upload/fl_attachment/', '/upload/')
                    }
                  } catch {
                    // laisser tel quel si URL invalide
                  }

                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white/80"
                    >
                      <span className="truncate">{name}</span>
                      <div className="shrink-0 flex items-center gap-2">
                        <a
                          href={viewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-md text-xs bg-white/[0.08] hover:bg-white/[0.12]"
                        >
                          Voir
                        </a>
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="px-2 py-1 rounded-md text-xs bg-[#0066FF]/30 text-[#9ec6ff] hover:bg-[#0066FF]/45"
                        >
                          Télécharger
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {Array.isArray(history) && history.length > 0 && (
            <div className="mt-4">
              <span className="text-[10px] font-semibold uppercase text-white/50">Historique</span>
              <ul className="mt-2 space-y-2">
                {history.map((h, i) => {
                  const when = h.timestamp ? new Date(h.timestamp).toLocaleString('fr-FR') : ''
                  const who = h.actorRole ? `${h.actorRole}` : h.actorId
                  let line = ''
                  if (h.action === 'status_changed') {
                    line = `${who} a changé statut: ${translateStatus(h.from)} → ${translateStatus(h.to)}`
                  } else if (h.action === 'assigned_changed') {
                    line = `${who} a changé affectation: ${h.from ?? '—'} → ${h.to ?? '—'}`
                  } else if (h.action === 'created') {
                    line = `${who} a créé le ticket`
                  } else {
                    line = `${who} a mis à jour ${h.field ?? 'ticket'}: ${h.from ?? '—'} → ${h.to ?? '—'}`
                  }
                  return (
                    <li key={i} className="text-white/80 text-xs">
                      <span className="block">{line}</span>
                      {when && <span className="text-white/40">{when}</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
