'use client'
import { useState, useEffect } from 'react'
import { fmtSize } from '@/lib/up-api'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'baru saja'
  if (s < 3600) return `${Math.floor(s / 60)}m lalu`
  if (s < 86400) return `${Math.floor(s / 3600)}j lalu`
  return `${Math.floor(s / 86400)}h lalu`
}

export default function HistorySection({ onToast: toast }) {
  const [history, setHistory] = useState([])
  const [open, setOpen] = useState(true)
  const [filter, setFilter] = useState('all')
  const [copied, setCopied] = useState(null)

  const load = () => {
    try {
      setHistory(JSON.parse(localStorage.getItem('sw_history') || '[]'))
    } catch { /* fresh */ }
  }

  useEffect(() => {
    load()
    if (!open) return
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [open])

  useEffect(() => {
    if (copied === null) return
    const t = setTimeout(() => setCopied(null), 1500)
    return () => clearTimeout(t)
  }, [copied])

  const isExpired = h => Date.now() - h.timestamp >= (h.expireMinutes || 60) * 60000
  const now = Date.now()
  const active = history.filter(h => !isExpired(h))
  const expired = history.filter(isExpired)

  const shown = filter === 'active' ? active : filter === 'expired' ? expired : history

  const copyCode = async (code, ts) => {
    try {
      await navigator.clipboard.writeText(code)
      toast('Kode disalin!', 'success')
      setCopied(ts)
    } catch { toast('Gagal menyalin', 'error') }
  }

  const clearAll = () => {
    localStorage.removeItem('sw_history')
    setHistory([])
    toast('Riwayat dibersihkan', 'info')
  }

  return (
    <div className="card card-3d-hover p-4">
      {/* Header */}
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between group">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl grid place-items-center shadow-sm"
            style={{ background: 'color-mix(in srgb, var(--t-accent-2) 12%, var(--t-surface))', color: 'var(--t-accent-2)' }}>
            <i className="fa-solid fa-clock-rotate-left text-[12px]" />
          </span>
          <div className="text-left">
            <span className="font-black text-[13px] tracking-tight block leading-none">Riwayat Klaim</span>
            <span className="font-mono text-[9px] text-[var(--t-muted)] tnum">{history.length} tiket tersimpan</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {active.length > 0 && (
            <span className="px-2 py-0.5 rounded-full border font-mono text-[9px] font-bold tracking-wider tnum"
              style={{ borderColor: 'color-mix(in srgb, var(--t-ok) 35%, transparent)', background: 'color-mix(in srgb, var(--t-ok) 10%, transparent)', color: 'var(--t-ok)' }}>
              {active.length} AKTIF
            </span>
          )}
          <i className={`fa-solid fa-chevron-down text-[10px] text-[var(--t-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="anim-slide-up mt-3 space-y-2.5">
          {/* Filter pills */}
          {history.length > 0 && (
            <div className="pill-switch w-full">
              {[['all', 'Semua', history.length], ['active', 'Aktif', active.length], ['expired', 'Kedaluwarsa', expired.length]].map(([k, label, n]) => (
                <button key={k} onClick={() => setFilter(k)} className={`pill-switch-btn flex-1 tnum ${filter === k ? 'active' : ''}`}>
                  {label} · {n}
                </button>
              ))}
            </div>
          )}

          {!history.length && (
            <p className="text-center text-[11px] font-mono text-[var(--t-muted)] py-6 border border-dashed border-[var(--t-line-strong)] rounded-xl">
              Belum ada riwayat klaim
            </p>
          )}

          {/* List */}
          <div className="stagger-in space-y-1.5">
            {shown.map(h => {
              const code = h.bundle || h.code
              const dead = isExpired(h)
              const isCopied = copied === h.timestamp
              const total = (h.expireMinutes || 60) * 60000
              const usedPct = Math.min(100, ((now - h.timestamp) / total) * 100)
              const remaining = Math.max(0, Math.ceil((total - (now - h.timestamp)) / 60000))
              const urgent = !dead && remaining <= 10

              return (
                <div key={h.timestamp}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-200 group ${dead
                    ? 'bg-[var(--t-surface2)]/50 border-[var(--t-line)] opacity-60'
                    : 'bg-[var(--t-surface2)]/60 border-[var(--t-line)] hover:border-[var(--t-line-strong)] hover:-translate-y-0.5 hover:shadow-sm'}`}>

                  <span className="w-9 h-9 shrink-0 rounded-xl bg-[var(--t-surface)] border border-[var(--t-line)] grid place-items-center shadow-sm">
                    <i className={`fa-solid ${dead ? 'fa-clock text-[var(--t-muted)]' : h.bundle ? 'fa-layer-group' : h.count > 1 ? 'fa-images' : 'fa-film'} text-[12px]`}
                      style={dead ? {} : { color: h.bundle || h.count > 1 ? 'var(--t-accent-2)' : 'var(--t-accent)' }} />
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-[11.5px] truncate ${dead ? 'text-[var(--t-muted)]' : ''}`}>{h.files?.[0] || code}</p>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--t-muted)] mt-0.5 tnum">
                      <span>{timeAgo(h.timestamp)}</span>
                      {h.totalSize > 0 && <span>· {fmtSize(h.totalSize)}</span>}
                      {dead
                        ? <span className="text-[var(--t-bad)] font-bold">· EXPIRED</span>
                        : <span className={urgent ? 'text-[var(--t-bad)] font-bold' : 'text-[var(--t-ok)]'}>· sisa {remaining}m</span>}
                    </div>
                    {!dead && (
                      <div className="expire-bar mt-1.5">
                        <div style={{ width: `${usedPct}%` }} className={urgent ? 'is-timeout' : ''} />
                      </div>
                    )}
                  </div>

                  {!dead && (
                    <button onClick={() => copyCode(code, h.timestamp)}
                      className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border transition-all duration-200 active:scale-95 ${isCopied
                        ? 'border-transparent text-white'
                        : 'code-chip hover:border-[var(--t-ink)] hover:-translate-y-0.5'}`}
                      style={isCopied ? { background: 'var(--t-ok)' } : {}}>
                      {isCopied ? <><i className="fa-solid fa-check mr-1" />OK</> : <><i className="fa-regular fa-copy mr-1 opacity-50" />{code}</>}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Clear */}
          {history.length > 0 && (
            <button onClick={clearAll}
              className="w-full py-2 rounded-xl text-[10px] font-mono font-bold tracking-wider text-[var(--t-muted)] border border-dashed border-[var(--t-line-strong)] hover:text-white hover:border-transparent transition-all duration-200 active:scale-[.98]"
              onMouseEnter={e => e.currentTarget.style.background = 'var(--t-bad)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <i className="fa-solid fa-trash-can mr-1.5" />BERSIHKAN RIWAYAT
            </button>
          )}
        </div>
      )}
    </div>
  )
}
