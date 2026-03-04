'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import type { TicketCategory, TicketPriority } from '@/lib/api'

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

export default function NouveauTicketPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TicketCategory>('autre')
  const [priority, setPriority] = useState<TicketPriority>('medium')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setFiles((prev) => [...prev, ...dropped])
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : []
    setFiles((prev) => [...prev, ...selected])
    e.target.value = ''
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await api.tickets.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        attachments: files.length > 0 ? files.map((f) => f.name) : undefined,
      })
      router.push('/dashboard/tickets')
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : 'Erreur lors de la création',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="text-white max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Créer un nouveau ticket</h1>

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
            placeholder="Ex: Panne connexion internet"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder-white/30 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold tracking-wider uppercase text-white/50 mb-2">
            Catégorie
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-[#0A1628]">
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold tracking-wider uppercase text-white/50 mb-2">
            Priorité
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value} className="bg-[#0A1628]">
                {p.label}
              </option>
            ))}
          </select>
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
            placeholder="Décrivez le problème en détail..."
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder-white/30 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] resize-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold tracking-wider uppercase text-white/50 mb-2">
            Pièces jointes (Optionnel)
          </label>
          <div
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
            />
            <Upload className="w-10 h-10 mx-auto text-white/40 mb-3" />
            <p className="text-white/70 text-sm">
              Cliquez ou glissez des fichiers ici
            </p>
          </div>
          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white/90"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
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
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl text-[15px] font-medium bg-white/[0.08] text-white/80 hover:bg-white/[0.12]"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-[15px] font-semibold bg-[#0066FF] hover:bg-[#0052CC] text-white disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Envoi...' : 'Créer le ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
