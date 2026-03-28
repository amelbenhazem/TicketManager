import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A1628] text-white p-4">
      <h1 className="text-2xl font-bold mb-2">Page introuvable</h1>
      <p className="text-white/70 mb-6">
        L’adresse demandée n’existe pas ou a été déplacée.
      </p>
      <Link
        href="/login"
        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
      >
        Retour à l’accueil
      </Link>
    </div>
  );
}
