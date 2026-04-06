'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

type Option = { value: string; label: string; disabled?: boolean }

type SelectProps = {
  value: string
  onChange: (v: string) => void
  options: Option[]
  placeholder?: string
  className?: string
}

export function Select({ value, onChange, options, placeholder = 'Sélectionner…', className }: SelectProps) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [openUp, setOpenUp] = useState(false)
  const [maxHeightPx, setMaxHeightPx] = useState<string>('60vh')
  // Si value === '' on considère que rien n'est sélectionné => afficher le placeholder
  const selected = value !== '' ? options.find((o) => o.value === value) : undefined

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current || !btnRef.current) return
      if (!panelRef.current.contains(e.target as Node) && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const recalcPanel = () => {
    const btn = btnRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const vh = window.innerHeight
    const below = vh - rect.bottom
    const above = rect.top
    const up = below < 240 && above > below
    if (up !== openUp) setOpenUp(up)
    const maxH = Math.min(Math.max((up ? above : below) - 16, 200), Math.round(vh * 0.8))
    const next = `${maxH}px`
    if (next !== maxHeightPx) setMaxHeightPx(next)
  }

  useEffect(() => {
    if (!open) return
    const onResize = () => recalcPanel()
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open])

  return (
    <div className={`relative ${className ?? ''}`}>
      <button
        ref={btnRef}
        type="button"
        className="tm-select pr-8 text-left relative"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => {
            const next = !o
            if (next) recalcPanel()
            return next
          })
        }}
      >
        {selected ? selected.label : <span className="text-white/50">{placeholder}</span>}
        <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
      </button>
      {open && (
        <div
          ref={panelRef}
          role="listbox"
          className={`absolute z-50 w-full rounded-xl bg-[#0A1628] border border-white/[0.15] shadow-xl p-1 overscroll-contain ${openUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
          style={{ maxHeight: maxHeightPx }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              disabled={opt.disabled}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                opt.value === value
                  ? 'bg-[#0066FF] text-white'
                  : 'text-white/90 hover:bg-white/[0.08]'
              } ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
