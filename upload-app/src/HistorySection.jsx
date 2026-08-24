import { useState } from 'react'
import { getHistory, clearHistory } from './api'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'baru aja'
  if (s < 3600) return `${Math.floor(s / 60)}m lalu`
  if (s < 86400) return `${Math.floor(s / 3600)}j lalu`
  return `${Math.floor(s / 86400)}h lalu`
}

export default function HistorySection() {
  const [history, setHistory] = useState(getHistory())
  const [open, setOpen] = useState(false)

  if (!history.length) return null

  return (
    <div className="glass mt-5 p-4 anim-emerge" style={{ animationDelay: '.18s' }}>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 font-display font-bold text-[13px]">
          <span className="icon-tile w-7 h-7 !rounded-lg"><i className="fa-solid fa-clock-rotate-left text-cyan text-[11px]" /></span>
          Riwayat Upload
          <span className="chip text-[9px] px-2 py-0.5 bg-brand/20 border border-line2/50 text-indigo-200">{history.length}</span>
          <i className={`fa-solid fa-chevron-down text-[9px] text-muted ml-1 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <button onClick={() => { clearHistory(); setHistory([]) }} className="text-bad/80 text-[10px] font-bold hover:text-bad transition">
            <i className="fa-solid fa-trash-can mr-1" />Bersihkan
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-2 anim-fade">
          {history.map(h => (
            <div key={h.timestamp} className="hist-item flex items-center gap-3 p-2.5 rounded-xl">
              <span className="icon-tile w-9 h-9 shrink-0 !rounded-lg">
                <i className={`fa-solid ${h.bundle ? 'fa-boxes-stacked' : 'fa-film'} text-indigo-300 text-[11px]`} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[11px] truncate">{h.files?.[0] || h.code}{h.count > 1 && ` +${h.count - 1}`}</p>
                <p className="text-muted text-[9px] font-mono">{timeAgo(h.timestamp)}</p>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(h.bundle || h.code)}
                className="code-chip px-2.5 py-1.5 text-[10px] code-text font-bold shrink-0"
                title="Copy kode"
              >
                {h.bundle ? h.bundle : h.code}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
