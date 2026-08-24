import { useState } from 'react'

export default function Toasts({ toasts }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-32px)] max-w-sm space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`anim-pop flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-xl text-[12.5px] font-semibold shadow-2xl ${
            t.type === 'error'
              ? 'bg-red-950/70 border-bad/40 text-red-200'
              : t.type === 'success'
                ? 'bg-emerald-950/70 border-ok/40 text-emerald-100'
                : 'bg-slate-900/80 border-line text-ink'
          }`}
        >
          <i
            className={`fa-solid ${
              t.type === 'error' ? 'fa-circle-exclamation text-bad' : t.type === 'success' ? 'fa-circle-check text-ok' : 'fa-circle-info text-cyan'
            }`}
          />
          {t.msg}
        </div>
      ))}
    </div>
  )
}

let nextId = 1
export function useToasts() {
  const [toasts, setToasts] = useState([])
  const add = (msg, type = 'info') => {
    const id = nextId++
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }
  return { toasts, add }
}
