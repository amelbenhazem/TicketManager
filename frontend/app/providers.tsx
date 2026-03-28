'use client'

import { Toaster } from 'react-hot-toast'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#0F172A',
            color: '#E2E8F0',
            border: '1px solid rgba(148, 163, 184, 0.35)',
          },
        }}
      />
    </>
  )
}
