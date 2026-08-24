import { useState, useEffect } from 'react'
import { getHistory, clearHistory, timeAgo } from './api'

export default function HistorySection({ onCodeCopied }) {
  const [history, setHistory] = useState([])
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    setHistory(getHistory())
    const onStorage = () => setHistory(getHistory())
    window.addEventListener('sw-history-updated', onStorage)
    return () => window.removeEventListener('sw-history-updated', onStorage)
  }, [])

  if (!history.length) return null

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText('.claim ' + code)
    } catch {
      // ponytail: clipboard API blocked on plain http; fallback execCommand
      const ta = document.createElement('textarea')
      ta.value = '.claim ' + code
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopiedId(code)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="glass rounded-[22px] p-5 anim-emerge mt-4" style={{ animationDelay: '.15s' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left text-cyan" /> Riwayat Upload
        </h3>
        <button
          onClick={() => { clearHistory(); dispatchEvent(new Event('sw-history-updated')) }}
          className="text-bad/70 text-[10px] font-bold hover:text-bad transition"
        >
          Hapus semua
        </button>
      </div>
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {history.map((h, i) => (
          <button key={i} onClick={() => copy(h.code)} className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[.03] border border-white/5 hover:bg-brand/10 hover:border-line2/50 transition text-left group">
            <div className={`w-8 h-8 shrink-0 rounded-lg grid place-items-center ${h.bundle ? 'bg-pink-500/10 border border-pink-500/25' : 'bg-brand/10 border border-brand/25'}`}>
              <i className={`fa-solid ${h.bundle ? 'fa-images text-pink-400' : 'fa-video text-brand2'} text-xs`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono font-bold text-[12px] text-cyan truncate">.claim {h.code}</p>
              <p className="text-muted text-[10px] truncate">{(h.files || []).join(', ')}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-muted text-[9px]">{timeAgo(h.timestamp)}</p>
              <i className={`fa-solid ${copiedId === h.code ? 'fa-check text-ok' : 'fa-copy text-muted'} text-[10px] group-hover:text-cyan transition-colors`} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
