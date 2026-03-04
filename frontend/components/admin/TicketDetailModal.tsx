'use client'

import { X } from 'lucide-react'
import type { TicketResponse } from '@/lib/api'

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
          {Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold uppercase text-white/50">Pièces jointes</span>
              <ul className="text-white/80 mt-1 list-disc list-inside">
                {ticket.attachments.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
