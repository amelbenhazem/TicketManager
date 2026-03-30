'use client'

import { TechnicianStatsCards } from '@/components/technician/TechnicianStatsCards'


export default function TechnicianDashboardPage() {
  return (
    <>
      <header className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Tableau de bord <span className="text-[#60A5FA]">Technicien</span>
            </h1>
            <p className="text-white/50 text-sm mt-1">
              Tickets qui vous sont assignés — déplacez le statut selon l’avancement.
            </p>
          </div>
          {/* Cloche affichée par le layout */}
        </div>
      </header>

      <section className="mb-6">
        <TechnicianStatsCards />
      </section>

      {/* Liste et filtres déplacés dans /technician/tickets */}

      {/* Aucun modal de détail sur le dashboard */}
    </>
  )
}
