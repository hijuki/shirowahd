'use client'
import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

let toastId = 0

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const remove = useCallback((id) => {
    setToasts(t => t.map(x => x.id === id ? { ...x, out: true } : x))
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 320)
  }, [])
  const add = useCallback((msg, type = 'info') => {
    const id = ++toastId
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => remove(id), 4200)
  }, [remove])
  return { toasts, add }
}

const ICON = { success: 'fa-check', error: 'fa-triangle-exclamation', info: 'fa-circle-info' }

/* Toast di TENGAH ATAS (aturan tuan), lewat portal supaya tidak pernah
   tertutup plat/sheet yang punya stacking context sendiri. */
export default function Toasts({ toasts }) {
  const [host, setHost] = useState(null)
  useEffect(() => { setHost(document.body) }, [])
  if (!host || !toasts.length) return null

  return createPortal(
    <div className="fixed top-[86px] left-1/2 -translate-x-1/2 z-[999] flex flex-col items-center gap-2 w-[calc(100%-28px)] max-w-[360px] pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} data-out={t.out ? '1' : '0'}
          className={`toast ${t.type === 'success' ? 'toast-ok' : t.type === 'error' ? 'toast-bad' : ''}`}
          role="status" aria-live="polite">
          <span className="w-6 h-6 shrink-0 grid place-items-center border-2 border-current">
            <i className={`fa-solid ${ICON[t.type] || ICON.info} text-[10px]`} />
          </span>
          <span className="leading-snug">{t.msg}</span>
        </div>
      ))}
    </div>,
    host
  )
}
