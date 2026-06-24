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
import { api, ApiError, type UserRole, type UsersStats, type UserResponse, type TicketsStats } from '@/lib/api'
import { Chart, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import { NotificationsBell } from '@/components/notifications/NotificationsBell'
import { subscribeTicketRealtime } from '@/lib/realtime'
import type { CreateUserData } from '@/components/admin/AddUserForm'
import type { UpdateUserData } from '@/components/admin/EditUserModal'
import { useRequireAuth } from '@/hooks/useRequireAuth'

export default function AdminDashboardPage() {
  Chart.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)
  const router = useRouter()
  useRequireAuth('admin')
  const [activeSection, setActiveSection] = useState<'dashboard' | 'create' | 'tickets'>('dashboard')
  const [stats, setStats] = useState<UsersStats | null>(null)
  const [ticketStats, setTicketStats] = useState<TicketsStats | null>(null)
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
  const [usersPage, setUsersPage] = useState(1)
  const [usersPagination, setUsersPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [flashMessage, setFlashMessage] = useState<string | null>(null)

  useEffect(() => {
    return subscribeTicketRealtime(() => {})
  }, [])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await api.users.getStats()
      setStats(data)
      const t = await api.tickets.getStats()
      setTicketStats(t)
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
        page: usersPage,
        limit: 20,
      })
      setUsers(data.items)
      setUsersPagination({ total: data.total, page: data.page, totalPages: data.totalPages })
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        router.replace('/login')
        return
      }
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }, [roleFilter, search, usersPage, router])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    setUsersPage(1)
  }, [roleFilter, search])

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(), search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchUsers, usersPage, search])

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
      setActiveSection('dashboard')
      setFlashMessage('Utilisateur ajouté avec succès')
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      // Effacer le message après 4s
      window.setTimeout(() => setFlashMessage(null), 4000)
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
            <div className="flex justify-end mb-2">
              <NotificationsBell />
            </div>
            {flashMessage && (
              <div className="mb-4 p-4 rounded-xl bg-green-500/20 border border-green-400/30 text-green-200 text-sm">
                {flashMessage}
              </div>
            )}
            {activeSection === 'dashboard' && (
              <>
                <header className="mb-8">
                  <h1 className="text-xl font-bold text-white">
                    Tableau de bord <span className="text-[#60A5FA]">Administrateur</span>
                  </h1>
                 
                </header>

                <section className="mb-8">
                  <h2 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-4">
                    Statistiques générales
                  </h2>
                  <StatsCards stats={stats} loading={statsLoading} />
                </section>

                <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] p-4">
                    <h3 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Tickets par statut</h3>
                    {ticketStats ? (
                      <Doughnut
                        data={{
                          labels: ['Ouvert', 'En cours', 'Résolu', 'Clôturé'],
                          datasets: [{
                            label: 'Tickets',
                            data: [
                              ticketStats.byStatus.open,
                              ticketStats.byStatus.in_progress,
                              ticketStats.byStatus.resolved,
                              ticketStats.byStatus.closed,
                            ],
                            backgroundColor: ['#60A5FA', '#F59E0B', '#10B981', '#9CA3AF'],
                          }],
                        }}
                        options={{ plugins: { legend: { labels: { color: '#fff' } } } }}
                      />
                    ) : (
                      <p className="text-white/60 text-sm">Chargement...</p>
                    )}
                  </div>

                  <div className="rounded-2xl backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] p-4">
                    <h3 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Tickets par priorité</h3>
                    {ticketStats ? (
                      <Bar
                        data={{
                          labels: ['Basse', 'Moyenne', 'Haute'],
                          datasets: [{
                            label: 'Tickets',
                            data: [
                              ticketStats.byPriority.low,
                              ticketStats.byPriority.medium,
                              ticketStats.byPriority.high,
                            ],
                            backgroundColor: ['#22C55E', '#60A5FA', '#F97316'],
                          }],
                        }}
                        options={{
                          plugins: { legend: { labels: { color: '#fff' } } },
                          scales: {
                            x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                            y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } },
                          },
                        }}
                      />
                    ) : (
                      <p className="text-white/60 text-sm">Chargement...</p>
                    )}
                  </div>
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
                    pagination={usersPagination}
                    onPageChange={setUsersPage}
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
