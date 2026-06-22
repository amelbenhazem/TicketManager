'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Upload, X } from 'lucide-react'
import {
  api,
  ApiError,
  type TicketCategory,
  type TicketPriority,
  type TicketResponse,
} from '@/lib/api'
import { NotificationsBell } from '@/components/notifications/NotificationsBell'
import { Select } from '@/components/ui/Select'

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'reseau', label: 'Réseau' },
  { value: 'logiciel', label: 'Logiciel' },
  { value: 'materiel', label: 'Matériel' },
  { value: 'autre', label: 'Autre' },
]

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Basse' },
  { value: 'medium', label: 'Moyen' },
  { value: 'high', label: 'Haute' },
]

export default function EditTicketPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = String(params.id ?? '')

  const [ticket, setTicket] = useState<TicketResponse | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TicketCategory>('autre')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [description, setDescription] = useState('')
  const [existingAttachments, setExistingAttachments] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.tickets
      .getOne(ticketId)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setError('Ticket introuvable.')
          return
        }
        if (data.status !== 'open') {
          setError('Seuls les tickets au statut « Ouvert » peuvent être modifiés.')
          setTicket(data)
          return
        }
        setTicket(data)
        setTitle(data.title)
        setCategory(data.category ?? 'autre')
        setPriority(data.priority ?? 'medium')
        setDescription(data.description ?? '')
        setExistingAttachments(data.attachments ?? [])
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Erreur lors du chargement')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ticketId])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const dropped = Array.from(e.dataTransfer.files)
    setNewFiles((prev) => [...prev, ...dropped])
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : []
    setNewFiles((prev) => [...prev, ...selected])
    e.target.value = ''
  }, [])

  const removeExistingAttachment = useCallback((index: number) => {
    setExistingAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const removeNewFile = useCallback((index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticket || ticket.status !== 'open') return
    setError(null)
    setSaving(true)
    try {
      const attachments = [
        ...existingAttachments,
        ...newFiles.map((f) => f.name),
      ]
      await api.tickets.update(ticketId, {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        attachments,
      })
      router.push('/dashboard/tickets')
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Erreur lors de la modification',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-white/60">Chargement...</p>
  }

  if (!ticket && error) {
    return (
      <div className="text-white max-w-2xl">
        <div className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">
          {error}
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/tickets')}
          className="tm-button"
        >
          Retour à mes tickets
        </button>
      </div>
    )
  }

  if (ticket && ticket.status !== 'open') {
    return (
      <div className="text-white max-w-2xl">
        <div className="mb-4 p-4 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-100 text-sm">
          {error ?? 'Ce ticket ne peut plus être modifié.'}
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/tickets')}
          className="tm-button"
        >
          Retour à mes tickets
        </button>
      </div>
    )
  }

  return (
    <div className="text-white max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold">Modifier le ticket</h1>
        <NotificationsBell />
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 p-6 rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.15]"
      >
        <div>
          <label
            htmlFor="title"
            className="block text-[10px] font-semibold tracking-wider uppercase text-white/50 mb-2"
          >
            Titre du problème *
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder-white/30 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold tracking-wider uppercase text-white/50 mb-2">
            Catégorie
          </label>
          <Select
            value={category}
            onChange={(v) => setCategory(v as TicketCategory)}
            options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            placeholder="Sélectionner une catégorie"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold tracking-wider uppercase text-white/50 mb-2">
            Priorité
          </label>
          <Select
            value={priority}
            onChange={(v) => setPriority(v as TicketPriority)}
            options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
            placeholder="Sélectionner une priorité"
            className="w-full"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-[10px] font-semibold tracking-wider uppercase text-white/50 mb-2"
          >
            Description détaillée
          </label>
          <textarea
            id="description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder-white/30 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] resize-none"
          />
        </div>

        <div>
          <label htmlFor="attachments" className="block text-[10px] font-semibold tracking-wider uppercase text-white/50 mb-2">
            Pièces jointes
          </label>
          {existingAttachments.length > 0 && (
            <ul className="mb-3 space-y-2">
              {existingAttachments.map((url, index) => (
                <li
                  key={`${url}-${index}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white/90"
                >
                  <span className="truncate">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeExistingAttachment(index)}
                    className="p-1 rounded text-white/50 hover:text-red-400 hover:bg-white/10"
                    aria-label="Retirer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div
            role="group"
            aria-label="Zone de dépôt de fichiers"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? 'border-[#0066FF] bg-[#0066FF]/10'
                : 'border-white/[0.2] hover:border-white/[0.3] bg-white/[0.02]'
            }`}
          >
            <input
              type="file"
              multiple
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Ajouter des fichiers"
              id="attachments"
            />
            <Upload className="w-10 h-10 mx-auto text-white/40 mb-3" />
            <p className="text-white/70 text-sm">
              Cliquez ou glissez des fichiers ici
            </p>
          </div>
          {newFiles.length > 0 && (
            <ul className="mt-3 space-y-2">
              {newFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white/90"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeNewFile(index)}
                    className="p-1 rounded text-white/50 hover:text-red-400 hover:bg-white/10"
                    aria-label="Retirer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard/tickets')}
            className="flex-1 py-3 rounded-xl text-[15px] font-medium bg-white/[0.08] text-white/80 hover:bg-white/[0.12]"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-[15px] font-semibold bg-[#0066FF] hover:bg-[#0052CC] text-white disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </div>
  )
}
