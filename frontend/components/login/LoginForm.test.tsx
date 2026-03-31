import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'
import type React from 'react'

describe('LoginForm (unit)', () => {
  it('calls onEmailChange/onPasswordChange and onSubmit', async () => {
    const user = userEvent.setup()
    const onEmailChange = vi.fn()
    const onPasswordChange = vi.fn()
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())

    render(
      <LoginForm
        email=""
        password=""
        onEmailChange={onEmailChange}
        onPasswordChange={onPasswordChange}
        onSubmit={onSubmit}
        onForgotPassword={() => {}}
        loading={false}
        error={null}
        showPassword={false}
        onToggleShowPassword={() => {}}
        emailFocused={false}
        onEmailFocus={() => {}}
        passFocused={false}
        onPassFocus={() => {}}
      />,
    )

    await user.type(screen.getByLabelText('Email'), 'a@a.tn')
    await user.type(screen.getByLabelText('Mot de passe'), 'secret')
    expect(onEmailChange).toHaveBeenCalled()
    expect(onPasswordChange).toHaveBeenCalled()

    const submitBtn = screen.getByRole('button', { name: 'Se connecter' })
    const form = submitBtn.closest('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form!)
    expect(onSubmit).toHaveBeenCalled()
  })

  it('toggle password button changes aria-label intent', async () => {
    const user = userEvent.setup()
    const onToggleShowPassword = vi.fn()
    render(
      <LoginForm
        email="x"
        password="y"
        onEmailChange={() => {}}
        onPasswordChange={() => {}}
        onSubmit={(e) => e.preventDefault()}
        onForgotPassword={() => {}}
        loading={false}
        error={null}
        showPassword={false}
        onToggleShowPassword={onToggleShowPassword}
        emailFocused={false}
        onEmailFocus={() => {}}
        passFocused={false}
        onPassFocus={() => {}}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Afficher le mot de passe' }))
    expect(onToggleShowPassword).toHaveBeenCalled()
  })
})

