'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { api, type NotificationItem } from '@/lib/api'

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [pollTick, setPollTick] = useState(0)

  const fetchUnreadCount = async () => {
    const res = await api.notifications.unreadCount()
    setUnread(res.count)
  }
  const fetchPage = async (p: number, replace = false) => {
    setLoading(true)
    try {
      const res = await api.notifications.list({ page: p, limit: 20 })
      setTotalPages(res.totalPages)
      setItems((prev) => (replace ? res.items : [...prev, ...res.items]))
      // Mettre à jour le compteur à partir de la page chargée (évite un 2e fetch)
      const unreadInPage = res.items.reduce((acc: number, n: NotificationItem) => acc + (n.isRead ? 0 : 1), 0)
      if (p === 1) setUnread(unreadInPage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Polling du compteur uniquement quand la cloche est fermée (évite double fetch à l'ouverture)
    if (open) return
    void fetchUnreadCount()
    const id = setInterval(() => setPollTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [open])

  useEffect(() => {
    if (open) return
    void fetchUnreadCount()
  }, [pollTick, open])

  useEffect(() => {
    if (open) {
      setPage(1)
      void fetchPage(1, true)
    }
  }, [open])

  const hasMore = useMemo(() => page < totalPages, [page, totalPages])

  const markAll = async () => {
    await api.notifications.markAllRead()
    setUnread(0)
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const formatTitle = (n: NotificationItem) => n.title || n.event

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#0066FF] text-white text-[10px] px-1.5 py-0.5 rounded-full">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-4 top-16 z-[1000] w-[360px] max-h-[60vh] overflow-auto rounded-2xl backdrop-blur-xl bg-[#0A1628]/98 border border-white/[0.15] shadow-2xl p-2">
          <div className="flex items-center justify-between px-2 py-2">
            <h4 className="text-white/80 text-sm font-semibold">Notifications</h4>
            <button
              type="button"
              onClick={markAll}
              className="flex items-center gap-1 text-xs text-white/70 hover:text-white"
            >
              <CheckCheck className="w-4 h-4" /> Tout lu
            </button>
          </div>
          <ul className="divide-y divide-white/10">
            {items.map((n) => (
              <li key={n.id} className="px-2 py-2">
                <a
                  href={`/tickets/${n.ticketId}`}
                  className={`block text-sm ${n.isRead ? 'text-white/60' : 'text-white'}`}
                  onClick={async () => {
                    if (!n.isRead) {
                      await api.notifications.markRead(n.id)
                      setUnread((u) => Math.max(0, u - 1))
                      setItems((prev) =>
                        prev.map((it) => (it.id === n.id ? { ...it, isRead: true } : it)),
                      )
                    }
                  }}
                >
                  {formatTitle(n)}
                  <span className="block text-[11px] text-white/40">
                    {new Date(n.createdAt).toLocaleString('fr-FR')}
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="p-2">
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  const next = page + 1
                  setPage(next)
                  await fetchPage(next)
                }}
                className="w-full text-sm px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white/80 disabled:opacity-50"
              >
                {loading ? 'Chargement…' : 'Charger plus'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
