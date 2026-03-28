'use client'

import Link from 'next/link'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
      <div className="text-center text-white max-w-md mx-4">
        <h1 className="text-2xl font-bold mb-4">Mot de passe oublié</h1>
        <p className="text-white/60 mb-6">
          Page placeholder. À connecter à votre API (envoi d’email de réinitialisation).
        </p>
        <Link
          href="/login"
          className="text-[#60A5FA] hover:text-white font-medium"
        >
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  )
}
