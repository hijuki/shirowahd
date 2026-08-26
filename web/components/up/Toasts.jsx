'use client'
import { useState, useCallback } from 'react'

let toastId = 0

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type = 'info') => {
    const id = ++toastId
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  return { toasts, add }
}

const icons = { success: 'fa-check', error: 'fa-xmark', info: 'fa-info' }
const colors = {
  success: 'var(--t-ok)',
  error: 'var(--t-bad)',
  info: 'var(--t-accent-2)',
}

export default function Toasts({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-3 right-3 z-[999] flex flex-col gap-2 max-w-[300px] pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto toast-pro px-3.5 py-2.5 flex items-center gap-2.5 text-[12px]">
          <span className="w-5 h-5 rounded-full grid place-items-center text-[9px] shrink-0 text-white shadow-sm"
            style={{ background: colors[t.type] || colors.info }}>
            <i className={`fa-solid ${icons[t.type] || icons.info}`} />
          </span>
          <span className="font-medium leading-snug flex-1">{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
