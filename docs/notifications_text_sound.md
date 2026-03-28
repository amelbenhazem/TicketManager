# Notifications textuelles (toast) et sonores — logique de code

Ce document récapitule la logique utilisée pour afficher une notification texte (toast) et jouer un son lors des événements temps réel liés aux tickets.

> Rappel (uploads — types MIME autorisés)  
> Aligné avec le backend et l’analyse des besoins :  
> `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `application/pdf`

## Frontend — `frontend/lib/realtime.ts`

### 1) Abonnement aux événements temps réel
Les événements Socket.IO sont abonnés via `subscribeTicketRealtime`. Chaque événement appelle une fonction qui, si `showToast` est vrai, déclenche un toast + un son via `notifyWithSound(...)`, puis exécute `onEvent()` (souvent un refresh silencieux de la liste).

```ts
export function subscribeTicketRealtime(
  onEvent: () => void,
  options: RealtimeOptions = {},
): () => void {
  const s = getSocket()
  if (!s) return () => {}
  const showToast = options.showToast ?? true

  const handlers: Array<{
    event: 'ticket.created' | 'ticket.assigned' | 'ticket.status_changed'
    fn: (payload?: { ticket?: { title?: string; status?: string } }) => void
  }> = [
    {
      event: 'ticket.created',
      fn: (payload) => {
        if (showToast) {
          notifyWithSound(`Nouveau ticket: ${payload?.ticket?.title ?? 'Sans titre'}`)
        }
        onEvent()
      },
    },
    {
      event: 'ticket.assigned',
      fn: (payload) => {
        if (showToast) {
          notifyWithSound(`Ticket affecte: ${payload?.ticket?.title ?? 'Sans titre'}`)
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
```

### 2) Toast + Son
`notifyWithSound` affiche un toast (via `react-hot-toast`) et appelle `playNotificationSound` pour émettre un bip court.

```ts
import toast from 'react-hot-toast'

let lastSoundAt = 0

function notifyWithSound(message: string): void {
  toast(message, { icon: '🔔', duration: 5000 })
  playNotificationSound()
}

function playNotificationSound(): void {
  if (typeof window === 'undefined') return
  const now = Date.now()
  if (now - lastSoundAt < 500) return // anti-spam: pas plus d’un son / 500ms
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

    oscillator.onended = () => { void ctx.close() }
  } catch {
    // Certains navigateurs bloquent l’audio avant une interaction utilisateur.
  }
}
```

### 3) Gestion des erreurs d’auth Socket (rediriger vers /login)
En cas d’erreur d’authentification/reconnexion (`connect_error` contenant "unauthorized"/"jwt"/"authentication"), on coupe la socket, on purge le token, puis on redirige vers `/login`.

```ts
socket.on('connect_error', (error) => {
  const message = String(error?.message ?? '')
  if (
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('jwt') ||
    message.toLowerCase().includes('authentication')
  ) {
    disconnectRealtime()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user_role')
      window.location.href = '/login'
    }
    return
  }
  // Toast d’erreur de connexion temps réel (non bloquant)
  const now = Date.now()
  if (now - lastErrorToastAt > 5000) {
    lastErrorToastAt = now
    toast.error('Connexion temps reel indisponible')
  }
})
```

## Backend — `backend/src/modules/tickets/tickets-notifications.gateway.ts`

Le backend émet les évènements Socket.IO sur le namespace `/notifications`. Chaque changement côté tickets appelle une méthode dédiée qui envoie l’événement dans les rooms appropriées (utilisateurs/roles).

```ts
// Création
notifyTicketCreated(ticket: TicketResponse, actorUserId?: string): void {
  const rooms = new Set<string>([this.userRoom(ticket.userId), this.roleRoom(UserRole.ADMIN)])
  this.emitToRooms(rooms, 'ticket.created', {
    ticket,
    actorUserId,
    timestamp: new Date().toISOString(),
  })
}

// Affectation (ou réaffectation)
notifyTicketAssigned(
  ticket: TicketResponse,
  previousAssignedTo: string | null,
  actorUserId?: string,
): void {
  const rooms = new Set<string>([this.userRoom(ticket.userId), this.roleRoom(UserRole.ADMIN)])
  if (ticket.assignedTo) rooms.add(this.userRoom(ticket.assignedTo))
  if (previousAssignedTo) rooms.add(this.userRoom(previousAssignedTo))
  this.emitToRooms(rooms, 'ticket.assigned', {
    ticket,
    actorUserId,
    previousAssignedTo,
    timestamp: new Date().toISOString(),
  })
}

// Changement de statut
notifyTicketStatusChanged(
  ticket: TicketResponse,
  previousStatus: TicketStatus,
  actorUserId?: string,
): void {
  const rooms = new Set<string>([this.userRoom(ticket.userId), this.roleRoom(UserRole.ADMIN)])
  if (ticket.assignedTo) rooms.add(this.userRoom(ticket.assignedTo))
  this.emitToRooms(rooms, 'ticket.status_changed', {
    ticket,
    actorUserId,
    previousStatus,
    timestamp: new Date().toISOString(),
  })
}
```

## Limites connues / améliorations prévues

1) Gestion de `connect_error` — absence de `socket.off` avant `socket.on`  
   - Constat: le handler `connect_error` est enregistré mais jamais désenregistré si la socket est recréée.  
   - Impact: risque de handlers en double (fuite mémoire / toasts dupliqués) après plusieurs cycles de reconnexion.  
   - Amélioration: centraliser l’attachement/détachement des handlers et appeler `socket.off('connect_error', handler)` dans le cleanup avant de recréer la socket.

2) `notifications.ready` — émis par le backend mais non écouté côté front  
   - Constat: le gateway émet un event d’initialisation à la connexion.  
   - Opportunité: s’abonner côté front à `notifications.ready` pour lancer un refresh initial (sans attendre un event métier).  
   - Amélioration: ajouter `socket.on('notifications.ready', ...)` et déclencher `onEvent()` (refresh silencieux).

3) Pas de refresh sur reconnexion socket  
   - Constat: en cas de coupure puis reconnexion, la liste n’est pas rafraîchie automatiquement.  
   - Impact: risque de rater des changements survenus pendant l’indisponibilité.  
   - Amélioration: écouter `socket.on('connect', ...)` (ou `reconnect`) et déclencher un `fetch` silencieux pour resynchroniser l’état.

## Points de vérification (si erreur constatée)
1) Frontend a bien `react-hot-toast` initialisé (un `<Toaster />` quelque part dans l’app).
2) Le son peut être bloqué si l’utilisateur n’a pas encore interagi avec la page (politique d’autoplay).
3) Le socket est bien connecté (jeton JWT valide dans `localStorage` → `getSocket()`).
4) Les événements sont bien émis par le backend (logs gateway) et reçus par le front (vérifier la console).
5) Pas d’erreur CORS entre front (`env.apiUrl`) et backend.
6) Toasters en double en dev : React StrictMode monte parfois deux fois un composant. Vérifie que le cleanup (`return () => s.off(...)`) de `subscribeTicketRealtime` est bien exécuté au démontage pour éviter le double abonnement.

