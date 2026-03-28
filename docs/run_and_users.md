# Run (backend + frontend) + comptes démo

## 1) Lancer MongoDB
Assure-toi que `MONGODB_URI` pointe bien vers ta base locale.

Par défaut (dans `backend/src/scripts/seed.ts`) :
- `mongodb://localhost:27017/ticketmanager`

## 2) Seed utilisateurs & tickets (recommandé)

Dans un terminal :
```powershell
cd "C:\Users\DELL\Downloads\TicketManager\TicketManager\backend"
npm install
npm run seed:reset
```

Ce seed crée/initialise :
- Admin
- Techniciens
- Clients
- Quelques tickets de démonstration

## 3) Lancer le backend (NestJS)
Dans un terminal (après le seed) :
```powershell
cd "C:\Users\DELL\Downloads\TicketManager\TicketManager\backend"
npm run start:dev
```

Le backend expose l’API REST et le WebSocket Socket.IO.

## 4) Lancer le frontend (Next.js)
Dans un autre terminal :
```powershell
cd "C:\Users\DELL\Downloads\TicketManager\TicketManager\frontend"
npm install
npm run dev
```

## 5) Ouvrir les 3 sessions navigateur
Après login, ouvre :
- `/admin` (Admin)
- `/technician` (Technicien)
- `/dashboard` (Client)

Astuce : utilise 3 onglets, ou 3 fenêtres privées pour éviter que le même token soit partagé entre comptes.

## 6) Comptes démo (emails + mots de passe)
Ces comptes sont définis dans `backend/src/scripts/seed.ts`.

### Admin
- email : `admin@ticketmanager.local`
- mot de passe : `Admin123!`

### Technicien(s)
- email : `tech1@ticketmanager.local`
- mot de passe : `Tech123!`

- email : `tech2@ticketmanager.local`
- mot de passe : `Tech123!`

### Client(s)
- email : `client1@ticketmanager.local`
- mot de passe : `Client123!`

- email : `client2@ticketmanager.local`
- mot de passe : `Client123!`

