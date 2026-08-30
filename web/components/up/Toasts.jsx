'use client'
import { useState, useCallback } from 'react'

let toastId = 0

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const remove = useCallback((id) => {
    setToasts(t => t.map(x => x.id === id ? { ...x, leaving: true } : x))
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 450)
  }, [])
  const add = useCallback((msg, type = 'info') => {
    const id = ++toastId
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => remove(id), 4000)
  }, [remove])
  return { toasts, add }
}

const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' }
const colors = { success: 'text-ok border-ok/30 bg-ok/[.08]', error: 'text-bad border-bad/30 bg-bad/[.08]', info: 'text-[#22d3ee] border-[#22d3ee]/30 bg-[#22d3ee]/[.06]' }

export default function Toasts({ toasts }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[999] flex flex-col items-center gap-2 w-[calc(100%-32px)] max-w-[340px]">
      {toasts.map(t => (
        <div key={t.id} className={`rounded-[14px] px-4 py-3 flex items-center gap-3 border shadow-[0_12px_36px_-10px_rgba(0,0,0,.7)] backdrop-blur-xl w-full justify-center transition-all duration-[450ms] will-change-transform ${colors[t.type] || colors.info} ${t.leaving ? 'opacity-0 -translate-y-3 scale-[.96]' : 'toast-in'}`}>
          <i className={`fa-solid ${icons[t.type] || icons.info} text-sm shrink-0`} />
          <span className="text-[12px] font-semibold text-[#e8f1ff]/90 leading-relaxed">{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
