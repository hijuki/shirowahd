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
const typeStyles = {
  success: 'border-l-[var(--t-ok)] text-[var(--t-ink)]',
  error: 'border-l-[var(--t-bad)] text-[var(--t-bad)]',
  info: 'border-l-[var(--t-accent)] text-[var(--t-ink)]',
}

export default function Toasts({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-3 right-3 z-[999] flex flex-col gap-1.5 max-w-[300px] pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto toast-card card px-3 py-2 flex items-center gap-2 anim-pop border-l-4 text-[12px] ${typeStyles[t.type] || typeStyles.info}`}
        >
          <span className="w-4 h-4 rounded-full border border-current grid place-items-center text-[9px] shrink-0 font-mono font-bold">
            <i className={`fa-solid ${icons[t.type] || icons.info}`} />
          </span>
          <span className="font-medium leading-snug flex-1">{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
