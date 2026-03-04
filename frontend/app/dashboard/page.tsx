'use client'

export default function DashboardPage() {
  return (
    <div className="text-white">
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-white/60 mb-6">
        Bienvenue sur votre espace client. Consultez vos tickets ou créez-en un
        nouveau.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="/dashboard/tickets"
          className="block p-6 rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] hover:bg-white/[0.12] transition-colors"
        >
          <h2 className="text-lg font-semibold text-white mb-1">
            Mes Tickets
          </h2>
          <p className="text-white/60 text-sm">
            Voir et suivre tous vos tickets.
          </p>
        </a>
        <a
          href="/dashboard/tickets/new"
          className="block p-6 rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] hover:bg-white/[0.12] transition-colors"
        >
          <h2 className="text-lg font-semibold text-white mb-1">
            Nouveau Ticket
          </h2>
          <p className="text-white/60 text-sm">
            Ouvrir une nouvelle demande.
          </p>
        </a>
      </div>
    </div>
  )
}
