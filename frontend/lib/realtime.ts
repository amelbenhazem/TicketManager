import { io, Socket } from 'socket.io-client'
import toast from 'react-hot-toast'
import { env } from './env'

export type TicketRealtimeEvent =
  | 'ticket.created'
  | 'ticket.assigned'
  | 'ticket.status_changed'

type RealtimeOptions = {
  showToast?: boolean
}

type TicketRealtimePayload = {
  ticket?: {
    title?: string
    status?: string
  }
}

let socket: Socket | null = null
let socketToken: string | null = null
let lastSoundAt = 0
let lastErrorToastAt = 0

function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('access_token')
  if (!token) {
    disconnectRealtime()
    return null
  }

  if (socket && socketToken !== token) {
    // Token changed after logout/login: fully reset socket with new auth context.
    socket.disconnect()
    socket = null
    socketToken = null
  }

  if (socket) return socket

  socket = io(`${env.apiUrl.replace(/\/$/, '')}/notifications`, {
    transports: ['websocket'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
  })
  socketToken = token

  socket.on('connect_error', (error) => {
    const message = String(error?.message ?? '')
    if (
      message.toLowerCase().includes('unauthorized') ||
      message.toLowerCase().includes('jwt') ||
      message.toLowerCase().includes('authentication')
    ) {
      disconnectRealtime()
      if (typeof window !== 'undefined') {
        // Token expiré / invalide: on force une reconnexion.
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_role')
        window.location.href = '/login'
      }
      return
    }
    const now = Date.now()
    if (now - lastErrorToastAt > 5000) {
      lastErrorToastAt = now
      toast.error('Connexion temps reel indisponible')
    }
  })

  return socket
}

export function subscribeTicketRealtime(
  onEvent: () => void,
  options: RealtimeOptions = {},
): () => void {
  const s = getSocket()
  if (!s) return () => {}
  const showToast = options.showToast ?? true

  const handlers: Array<{
    event: TicketRealtimeEvent
    fn: (payload?: TicketRealtimePayload) => void
  }> = [
    {
      event: 'ticket.created',
      fn: (payload) => {
        if (showToast) {
          notifyWithSound(
            `Nouveau ticket: ${payload?.ticket?.title ?? 'Sans titre'}`,
          )
        }
        onEvent()
      },
    },
    {
      event: 'ticket.assigned',
      fn: (payload) => {
        if (showToast) {
          notifyWithSound(
            `Ticket affecte: ${payload?.ticket?.title ?? 'Sans titre'}`,
          )
        }
        onEvent()
      },
    },
    {
      event: 'ticket.status_changed',
      fn: (payload) => {
        const status = payload?.ticket?.status ?? 'mis a jour'
        if (showToast) {
          notifyWithSound(`Statut ticket: ${status}`)
        }
        onEvent()
      },
    },
  ]
  for (const h of handlers) s.on(h.event, h.fn)

  return () => {
    for (const h of handlers) s.off(h.event, h.fn)
  }
}

export function disconnectRealtime(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  socketToken = null
}

function notifyWithSound(message: string): void {
  toast(message, { icon: '🔔', duration: 5000 })
  playNotificationSound()
}

function playNotificationSound(): void {
  if (typeof window === 'undefined') return
  const now = Date.now()
  if (now - lastSoundAt < 500) return
  lastSoundAt = now

  const AudioContextCtor = window.AudioContext || (window as typeof window & {
    webkitAudioContext?: typeof AudioContext
  }).webkitAudioContext
  if (!AudioContextCtor) return

  try {
    const ctx = new AudioContextCtor()
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.value = 0.1

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + 0.25)

    oscillator.onended = () => {
      void ctx.close()
    }
  } catch {
    // Some browsers block autoplay sound until user interaction.
  }
}
