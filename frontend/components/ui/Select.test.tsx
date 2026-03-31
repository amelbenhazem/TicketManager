import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select'

describe('Select (unit)', () => {
  it('shows placeholder when value is empty', () => {
    render(
      <Select
        value=""
        onChange={() => {}}
        placeholder="Statut"
        options={[
          { value: '', label: 'Tous' },
          { value: 'open', label: 'Ouvert' },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: /statut/i })).toBeInTheDocument()
  })

  it('calls onChange when an option is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Select
        value=""
        onChange={onChange}
        placeholder="Priorité"
        options={[
          { value: '', label: 'Toutes' },
          { value: 'high', label: 'Haute' },
        ]}
      />,
    )

    await user.click(screen.getByRole('button', { name: /priorité/i }))
    await user.click(screen.getByRole('option', { name: 'Haute' }))
    expect(onChange).toHaveBeenCalledWith('high')
  })
})

