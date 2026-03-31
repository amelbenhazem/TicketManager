import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// mock next/navigation
const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

// mock api
const loginMock = vi.fn()
vi.mock('@/lib/api', () => ({
  api: {
    auth: { login: (...args: any[]) => loginMock(...args) },
  },
  ApiError: class ApiError extends Error {
    status = 400
    constructor(message: string) {
      super(message)
    }
  },
}))

import { useLogin } from './useLogin'

describe('useLogin (unit)', () => {
  beforeEach(() => {
    push.mockReset()
    loginMock.mockReset()
    localStorage.clear()
  })

  it('stores token and redirects to /admin for admin role', async () => {
    loginMock.mockResolvedValue({ access_token: 't', role: 'admin' })
    const { result } = renderHook(() => useLogin())

    await act(async () => {
      await result.current.login('a@a.tn', 'x')
    })

    expect(localStorage.getItem('access_token')).toBe('t')
    expect(localStorage.getItem('user_role')).toBe('admin')
    expect(push).toHaveBeenCalledWith('/admin')
  })

  it('sets error when api throws', async () => {
    loginMock.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useLogin())

    await act(async () => {
      await result.current.login('a@a.tn', 'x')
    })

    expect(result.current.error).toBeTruthy()
  })
})

