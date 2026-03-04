'use client'

import { Search, Users, Pencil, Trash2 } from 'lucide-react'
import type { UserResponse, UserRole } from '@/lib/api'

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  technician: 'Technicien',
  admin: 'Admin',
}

type UserListProps = {
  users: UserResponse[]
  loading: boolean
  roleFilter: UserRole | ''
  onRoleFilterChange: (v: UserRole | '') => void
  search: string
  onSearchChange: (v: string) => void
  onEdit: (user: UserResponse) => void
  onDelete: (user: UserResponse) => void
}

export function UserList({
  users,
  loading,
  roleFilter,
  onRoleFilterChange,
  search,
  onSearchChange,
  onEdit,
  onDelete,
}: UserListProps) {
  const handleDeleteClick = (user: UserResponse) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
    if (window.confirm(`Supprimer l'utilisateur "${name}" ? Cette action est irréversible.`)) {
      onDelete(user)
    }
  }

  return (
    <div className="backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] rounded-3xl shadow-2xl shadow-black/30 p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-[#60A5FA]" />
        <h2 className="text-xl font-bold text-white">Gestion des utilisateurs</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher par nom, prénom ou email..."
            className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/40 outline-none focus:border-[#0066FF] transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['', 'client', 'technician', 'admin'] as const).map((r) => (
            <button
              key={r || 'all'}
              type="button"
              onClick={() => onRoleFilterChange(r)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${roleFilter === r ? 'bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/30' : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.1]'}`}
            >
              {r === '' ? 'Tous' : ROLE_LABELS[r] ?? r}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.12] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-white/50">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-white/50">Aucun utilisateur trouvé.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.12] bg-white/[0.04]">
                <th className="text-left py-3 px-4 text-white/60 text-sm font-semibold">Nom</th>
                <th className="text-left py-3 px-4 text-white/60 text-sm font-semibold">Prénom</th>
                <th className="text-left py-3 px-4 text-white/60 text-sm font-semibold">Email</th>
                <th className="text-left py-3 px-4 text-white/60 text-sm font-semibold">Rôle</th>
                <th className="text-right py-3 px-4 text-white/60 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.08] hover:bg-white/[0.04]">
                  <td className="py-3 px-4 text-white">{u.lastName || '—'}</td>
                  <td className="py-3 px-4 text-white">{u.firstName || '—'}</td>
                  <td className="py-3 px-4 text-white">{u.email}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${
                        u.role === 'admin'
                          ? 'bg-violet-500/30 text-violet-200'
                          : u.role === 'technician'
                            ? 'bg-amber-500/30 text-amber-200'
                            : 'bg-emerald-500/30 text-emerald-200'
                      }`}
                    >
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(u)}
                        className="p-2 rounded-lg text-white/60 hover:text-[#60A5FA] hover:bg-white/[0.08] transition-colors"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(u)}
                        className="p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
