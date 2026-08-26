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
const colors = { success: 'var(--t-ok)', error: 'var(--t-bad)', info: 'var(--t-accent)' }

export default function Toasts({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-3 right-3 z-[999] flex flex-col gap-2 max-w-[300px] pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className="pointer-events-auto toast-pro px-3 py-2.5 flex items-center gap-2.5 text-[12px]"
          style={{ borderColor: t.type === 'error' ? 'var(--t-bad)' : undefined }}>
          <span className="w-6 h-6 shrink-0 grid place-items-center text-[10px] text-white anim-pop-spring"
            style={{ background: colors[t.type] || colors.info, border: '2px solid var(--t-hard)', borderRadius: 8, color: t.type === 'info' ? '#111111' : '#fff' }}>
            <i className={`fa-solid ${icons[t.type] || icons.info}`} />
          </span>
          <span className="font-extrabold leading-snug flex-1">{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
