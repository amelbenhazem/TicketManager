'use client'

import { Calendar, X } from 'lucide-react'

type DateInputProps = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export function DateInput({ value, onChange, placeholder, className }: DateInputProps) {
  return (
    <div className={`tm-input-wrap ${className ?? ''}`}>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="tm-input tm-date pl-3 pr-10"
      />
      {/* Keep native picker icon on the right; no extra left icon to avoid overlap */}
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="tm-clear"
          aria-label="Effacer la date"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
