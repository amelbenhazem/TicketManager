'use client'

import Image from 'next/image'
import {
 // ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react'

export type LoginFormProps = {
  email: string
  password: string
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onForgotPassword: () => void
  loading: boolean
  error: string | null
  showPassword: boolean
  onToggleShowPassword: () => void
  emailFocused: boolean
  onEmailFocus: (f: boolean) => void
  passFocused: boolean
  onPassFocus: (f: boolean) => void
}

export function LoginForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onForgotPassword,
  loading,
  error,
  showPassword,
  onToggleShowPassword,
  emailFocused,
  onEmailFocus,
  passFocused,
  onPassFocus,
}: LoginFormProps) {
  const emailActive = emailFocused || email.length > 0
  const passActive = passFocused || password.length > 0

  return (
    <div className="backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] rounded-3xl shadow-2xl shadow-black/30 p-8 sm:p-10">
      <div className="flex flex-col items-center mb-8">
        <div className="mb-4 [&_img]:h-12 [&_img]:w-auto" style={{ mixBlendMode: 'lighten' }}>
          <Image src="/Logo-RFC.png" alt="RFC" width={120} height={48} className="block h-12 w-auto" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Ticket<span className="text-[#60A5FA]">Manager</span>
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Portail de gestion amal des incidents
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div
          className={`relative rounded-xl border transition-all duration-300 ${emailFocused ? 'border-[#0066FF] shadow-[0_0_0_2px_rgba(0,102,255,0.15)]' : 'border-white/[0.12] hover:border-white/[0.2]'} bg-white/[0.05]`}
        >
          <Mail
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors duration-300 ${emailFocused ? 'text-[#60A5FA]' : 'text-white/30'}`}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onFocus={() => onEmailFocus(true)}
            onBlur={() => onEmailFocus(false)}
            required
            className="w-full bg-transparent pl-12 pr-4 pt-5 pb-2 text-white text-[15px] outline-none placeholder-transparent"
            placeholder="Email"
            id="login-email"
          />
          <label
            htmlFor="login-email"
            className={`absolute left-12 transition-all duration-200 pointer-events-none ${emailActive ? 'top-1.5 text-[10px] font-semibold tracking-wider uppercase' : 'top-1/2 -translate-y-1/2 text-sm'} ${emailFocused ? 'text-[#60A5FA]' : 'text-white/35'}`}
          >
            Email
          </label>
        </div>

        <div
          className={`relative rounded-xl border transition-all duration-300 ${passFocused ? 'border-[#0066FF] shadow-[0_0_0_2px_rgba(0,102,255,0.15)]' : 'border-white/[0.12] hover:border-white/[0.2]'} bg-white/[0.05]`}
        >
          <Lock
            className={`absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] transition-colors duration-300 ${passFocused ? 'text-[#60A5FA]' : 'text-white/30'}`}
          />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onFocus={() => onPassFocus(true)}
            onBlur={() => onPassFocus(false)}
            required
            className="w-full bg-transparent pl-12 pr-12 pt-5 pb-2 text-white text-[15px] outline-none placeholder-transparent"
            placeholder="Mot de passe"
            id="login-pass"
          />
          <label
            htmlFor="login-pass"
            className={`absolute left-12 transition-all duration-200 pointer-events-none ${passActive ? 'top-1.5 text-[10px] font-semibold tracking-wider uppercase' : 'top-1/2 -translate-y-1/2 text-sm'} ${passFocused ? 'text-[#60A5FA]' : 'text-white/35'}`}
          >
            Mot de passe
          </label>
          <button
            type="button"
            onClick={onToggleShowPassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? (
              <EyeOff className="w-[18px] h-[18px]" />
            ) : (
              <Eye className="w-[18px] h-[18px]" />
            )}
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-[13px] text-[#60A5FA] hover:text-white font-medium transition-colors"
          >
            Mot de passe oublié ?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl text-[15px] transition-all duration-300 mt-2 bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-xl shadow-[#0066FF]/25 hover:shadow-[#0066FF]/40 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
