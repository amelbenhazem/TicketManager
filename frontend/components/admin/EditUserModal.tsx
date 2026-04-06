'use client'

import { useState, useEffect } from 'react'
import { Mail, Lock, User, Eye, EyeOff, X } from 'lucide-react'
import type { UserRole } from '@/lib/api'
import type { UserResponse } from '@/lib/api'

export type UpdateUserData = {
  lastName: string
  firstName: string
  email: string
  password: string
  role: UserRole
}

type EditUserModalProps = {
  user: UserResponse | null
  onClose: () => void
  onSave: (id: string, data: UpdateUserData) => Promise<void>
  loading: boolean
  error: string | null
  onClearError: () => void
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'technician', label: 'Technicien' },
  { value: 'admin', label: 'Admin' },
]

function LabeledInput({
  id,
  label,
  value,
  onChange,
  focused,
  onFocusChange,
  type = 'text',
  required = true,
  icon: Icon,
  rightButton,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  focused: boolean
  onFocusChange: (f: boolean) => void
  type?: string
  required?: boolean
  icon: React.ComponentType<{ className?: string }>
  rightButton?: React.ReactNode
  placeholder?: string
}) {
  const active = focused || value.length > 0
  const pr = rightButton ? 'pr-12' : 'pr-4'
  return (
    <div
      className={`relative rounded-xl border transition-all duration-300 ${focused ? 'border-[#0066FF] shadow-[0_0_0_2px_rgba(0,102,255,0.15)]' : 'border-white/[0.12] hover:border-white/[0.2]'} bg-white/[0.05]`}
    >
      <Icon
        className={`absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] ${focused ? 'text-[#60A5FA]' : 'text-white/30'}`}
      />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        required={required}
        placeholder={placeholder}
        className={`w-full bg-transparent pl-12 ${pr} pt-5 pb-2 text-white text-[15px] outline-none placeholder-transparent`}
        id={id}
      />
      <label
        htmlFor={id}
        className={`absolute left-12 transition-all duration-200 pointer-events-none ${active ? 'top-1.5 text-[10px] font-semibold tracking-wider uppercase' : 'top-1/2 -translate-y-1/2 text-sm'} ${focused ? 'text-[#60A5FA]' : 'text-white/35'}`}
      >
        {label}
      </label>
      {rightButton && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightButton}</div>
      )}
    </div>
  )
}

export function EditUserModal({
  user,
  onClose,
  onSave,
  loading,
  error,
  onClearError,
}: EditUserModalProps) {
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('client')
  const [showPassword, setShowPassword] = useState(false)
  const [nomFocused, setNomFocused] = useState(false)
  const [prenomFocused, setPrenomFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)

  useEffect(() => {
    if (!user) return
    const next = {
      lastName: user.lastName || '',
      firstName: user.firstName || '',
      email: user.email || '',
      password: '',
      role: user.role,
    }
    queueMicrotask(() => {
      setLastName(next.lastName)
      setFirstName(next.firstName)
      setEmail(next.email)
      setPassword(next.password)
      setRole(next.role)
    })
  }, [user])

  if (!user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    onClearError()
    await onSave(user.id, {
      lastName,
      firstName,
      email,
      password,
      role,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md backdrop-blur-xl bg-[#0A1628]/95 border border-white/[0.15] rounded-3xl shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Modifier l&apos;utilisateur</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div
            className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <LabeledInput
            id="edit-user-nom"
            label="Nom"
            value={lastName}
            onChange={setLastName}
            focused={nomFocused}
            onFocusChange={setNomFocused}
            icon={User}
          />
          <LabeledInput
            id="edit-user-prenom"
            label="Prénom"
            value={firstName}
            onChange={setFirstName}
            focused={prenomFocused}
            onFocusChange={setPrenomFocused}
            icon={User}
          />
          <LabeledInput
            id="edit-user-email"
            label="Email"
            value={email}
            onChange={setEmail}
            focused={emailFocused}
            onFocusChange={setEmailFocused}
            type="email"
            icon={Mail}
          />
          <LabeledInput
            id="edit-user-pass"
            label="Mot de passe (laisser vide pour ne pas modifier)"
            value={password}
            onChange={setPassword}
            focused={passFocused}
            onFocusChange={setPassFocused}
            type={showPassword ? 'text' : 'password'}
            required={false}
            icon={Lock}
            rightButton={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/30 hover:text-white/60"
                aria-label={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? (
                  <EyeOff className="w-[18px] h-[18px]" />
                ) : (
                  <Eye className="w-[18px] h-[18px]" />
                )}
              </button>
            }
          />

          <div>
            <label
              htmlFor="edit-user-role"
              className="block text-[10px] font-semibold tracking-wider uppercase text-white/50 mb-2"
            >
              Rôle
            </label>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`flex-1 min-w-[80px] py-2.5 rounded-xl text-sm font-medium transition-all ${role === r.value ? 'bg-[#0066FF] text-white shadow-lg shadow-[#0066FF]/30' : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white/80'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <input id="edit-user-role" value={role} readOnly type="hidden" />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-[15px] font-medium bg-white/[0.08] text-white/80 hover:bg-white/[0.12]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl text-[15px] font-semibold bg-[#0066FF] hover:bg-[#0052CC] text-white disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
