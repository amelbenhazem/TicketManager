'use client'

import { X, Search } from 'lucide-react'

type SearchInputProps = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({ value, onChange, placeholder = 'Recherche…', className }: SearchInputProps) {
  return (
    <div className={`tm-input-wrap ${className ?? ''}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="tm-input pl-14 pr-10"
      />
      <Search className="tm-icon tm-icon-left w-4 h-4" aria-hidden="true" />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="tm-clear"
          aria-label="Effacer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
