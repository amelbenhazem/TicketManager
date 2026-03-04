'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LoginStyleLayout } from '@/components/layout/LoginStyleLayout'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { StatsCards } from '@/components/admin/StatsCards'
import { UserList } from '@/components/admin/UserList'
import { AddUserForm } from '@/components/admin/AddUserForm'
import { EditUserModal } from '@/components/admin/EditUserModal'
import { AdminTicketsList } from '@/components/admin/AdminTicketsList'
import { api, ApiError, type UserRole, type UsersStats, type UserResponse } from '@/lib/api'
import type { CreateUserData } from '@/components/admin/AddUserForm'
import type { UpdateUserData } from '@/components/admin/EditUserModal'

export default function AdminDashboardPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<'dashboard' | 'create' | 'tickets'>('dashboard')
  const [stats, setStats] = useState<UsersStats | null>(null)
  const [users, setUsers] = useState<UserResponse[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [editUser, setEditUser] = useState<UserResponse | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('access_token')) {
      router.replace('/')
      return
    }
  }, [router])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await api.users.getStats()
      setStats(data)
    } catch {
      setStats({ total: 0, byRole: {} })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const data = await api.users.list({
        role: roleFilter || undefined,
        search: search.trim() || undefined,
      })
      setUsers(data)
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        router.replace('/')
        return
      }
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [roleFilter, search, router])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(), 300)
    return () => clearTimeout(t)
  }, [fetchUsers, roleFilter, search])

  const handleCreateUser = async (data: CreateUserData) => {
    setCreateError(null)
    setCreateLoading(true)
    try {
      await api.users.create({
        lastName: data.lastName,
        firstName: data.firstName,
        email: data.email,
        password: data.password,
        role: data.role,
      })
      await fetchStats()
      await fetchUsers()
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : 'Erreur lors de la création')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpdateUser = async (id: string, data: UpdateUserData) => {
    setUpdateError(null)
    setUpdateLoading(true)
    try {
      const payload: Parameters<typeof api.users.update>[1] = {
        lastName: data.lastName,
        firstName: data.firstName,
        email: data.email,
        role: data.role,
      }
      if (data.password.trim()) payload.password = data.password
      await api.users.update(id, payload)
      await fetchStats()
      await fetchUsers()
      setEditUser(null)
    } catch (e) {
      setUpdateError(e instanceof ApiError ? e.message : 'Erreur lors de la modification')
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleDeleteUser = async (user: UserResponse) => {
    try {
      await api.users.delete(user.id)
      await fetchStats()
      await fetchUsers()
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Erreur lors de la suppression')
    }
  }

  return (
    <LoginStyleLayout>
      <div className="flex min-h-screen">
        <AdminSidebar activeSection={activeSection} onNavigate={setActiveSection} />

        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
            {activeSection === 'dashboard' && (
              <>
                <header className="mb-8">
                  <h1 className="text-xl font-bold text-white">
                    Tableau de bord <span className="text-[#60A5FA]">Administrateur</span>
                  </h1>
                  <p className="text-white/50 text-sm mt-1">
                    Statistiques et gestion des utilisateurs
                  </p>
                </header>

                <section className="mb-8">
                  <h2 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-4">
                    Statistiques générales
                  </h2>
                  <StatsCards stats={stats} loading={statsLoading} />
                </section>

                <section>
                  <UserList
                    users={users}
                    loading={usersLoading}
                    roleFilter={roleFilter}
                    onRoleFilterChange={setRoleFilter}
                    search={search}
                    onSearchChange={setSearch}
                    onEdit={setEditUser}
                    onDelete={handleDeleteUser}
                  />
                </section>
              </>
            )}

            {activeSection === 'create' && (
              <div className="max-w-md">
                <header className="mb-6">
                  <h1 className="text-xl font-bold text-white">
                    Créer un compte
                  </h1>
                  <p className="text-white/50 text-sm mt-1">
                    Client ou Technicien — pour accéder à TicketDesk.
                  </p>
                </header>
                <AddUserForm
                  onSubmit={handleCreateUser}
                  loading={createLoading}
                  error={createError}
                  onClearError={() => setCreateError(null)}
                />
              </div>
            )}

            {activeSection === 'tickets' && (
              <>
                <header className="mb-6">
                  <h1 className="text-xl font-bold text-white">
                    Gérer les tickets
                  </h1>
                  <p className="text-white/50 text-sm mt-1">
                    Voir toutes les informations, affecter un technicien, changer le statut ou clôturer.
                  </p>
                </header>
                <AdminTicketsList />
              </>
            )}
          </div>

          <p className="text-center text-white/20 text-xs py-6">
            &copy; 2026 RFC. Tous droits réservés.
          </p>
        </main>
      </div>

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => { setEditUser(null); setUpdateError(null) }}
          onSave={handleUpdateUser}
          loading={updateLoading}
          error={updateError}
          onClearError={() => setUpdateError(null)}
        />
      )}
    </LoginStyleLayout>
  )
}
