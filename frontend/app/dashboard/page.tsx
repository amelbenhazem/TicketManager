'use client'

import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
      <div className="text-center text-white">
        <h1 className="text-2xl font-bold mb-4">Tableau de bord</h1>
        <p className="text-white/60 mb-6">
          Page après connexion.
        </p>
        <Link
          href="/"
          className="text-[#60A5FA] hover:text-white font-medium"
        >
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  )
}
