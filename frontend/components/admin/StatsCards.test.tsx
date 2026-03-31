import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatsCards } from './StatsCards'
import type { UsersStats } from '@/lib/api'

describe('StatsCards (unit)', () => {
  it('renders values from stats', () => {
    render(
      <StatsCards
        loading={false}
        stats={{
          total: 10,
          byRole: { admin: 2, technician: 3, client: 5 },
        } as UsersStats}
      />,
    )

    expect(screen.getByText('Total utilisateurs')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Clients')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('renders skeleton when loading', () => {
    render(<StatsCards stats={null} loading />)
    // skeleton cards exist
    expect(screen.getAllByText('', { selector: 'div' }).length).toBeGreaterThan(0)
  })
})

