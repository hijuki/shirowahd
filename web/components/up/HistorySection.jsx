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
    <div className="card p-4">
      {/* Header */}
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between group">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 grid place-items-center"
            style={{ background: 'var(--t-accent)', border: '2.5px solid var(--t-hard)', borderRadius: 11, boxShadow: 'var(--sh-xs)', color: '#131311' }}>
            <i className="fa-solid fa-clock-rotate-left text-[13px]" />
          </span>
          <div className="text-left">
            <span className="font-display text-[13px] block leading-none">RIWAYAT KLAIM</span>
            <span className="font-mono text-[9px] font-bold text-[var(--t-muted)] tnum">{history.length} tiket tersimpan</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {active.length > 0 && (
            <span className="px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider tnum"
              style={{ background: 'var(--t-ok)', color: '#fff', border: '2px solid var(--t-hard)', borderRadius: 99 }}>
              {active.length} AKTIF
            </span>
          )}
          <i className={`fa-solid fa-chevron-down text-[11px] font-black transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="anim-slide-up mt-3 space-y-2.5">
          {/* Filter pills */}
          {history.length > 0 && (
            <div className="pill-switch w-full">
              {[['all', 'Semua', history.length], ['active', 'Aktif', active.length], ['expired', 'Habis', expired.length]].map(([k, label, n]) => (
                <button key={k} onClick={() => setFilter(k)} className={`pill-switch-btn flex-1 tnum ${filter === k ? 'active' : ''}`}>
                  {label}·{n}
                </button>
              ))}
            </div>
          )}

          {!history.length && (
            <p className="text-center text-[11px] font-mono font-bold text-[var(--t-muted)] py-6"
              style={{ border: '3px dashed var(--t-line-strong)', borderRadius: 12 }}>
              BELUM ADA RIWAYAT
            </p>
          )}

          {/* List */}
          <div className="stagger-in space-y-2">
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
                  className={`flex items-center gap-2.5 p-2.5 hist-item ${dead ? 'opacity-55' : ''}`}
                  style={{ background: 'var(--t-surface2)', border: '2px solid var(--t-hard)', borderRadius: 12 }}>

                  <span className="w-9 h-9 shrink-0 grid place-items-center"
                    style={{ background: dead ? 'var(--t-surface)' : h.bundle ? 'var(--t-accent-2)' : 'var(--t-pop)', border: '2px solid var(--t-hard)', borderRadius: 10, color: dead ? 'var(--t-muted)' : '#fff' }}>
                    <i className={`fa-solid ${dead ? 'fa-clock' : h.bundle ? 'fa-layer-group' : h.count > 1 ? 'fa-images' : 'fa-film'} text-[12px]`} />
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className={`font-extrabold text-[11.5px] truncate ${dead ? 'text-[var(--t-muted)] line-through' : ''}`}>{h.files?.[0] || code}</p>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-[var(--t-muted)] mt-0.5 tnum font-bold">
                      <span>{timeAgo(h.timestamp)}</span>
                      {h.totalSize > 0 && <span>· {fmtSize(h.totalSize)}</span>}
                      {dead
                        ? <span style={{ color: 'var(--t-bad)' }}>· EXPIRED</span>
                        : <span className={urgent ? '' : ''} style={{ color: urgent ? 'var(--t-bad)' : 'var(--t-ok)' }}>· sisa {remaining}m</span>}
                    </div>
                    {!dead && (
                      <div className="expire-bar mt-1.5">
                        <div style={{ width: `${usedPct}%` }} className={urgent ? 'is-timeout' : ''} />
                      </div>
                    )}
                  </div>

                  {!dead && (
                    <button onClick={() => copyCode(code, h.timestamp)}
                      className={`shrink-0 px-2.5 py-1.5 text-[10px] font-mono font-bold transition-all duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${isCopied ? '' : 'hover:-translate-y-0.5'}`}
                      style={isCopied
                        ? { background: 'var(--t-ok)', color: '#fff', border: '2px solid var(--t-hard)', borderRadius: 9 }
                        : { background: 'var(--t-accent)', color: '#131311', border: '2px solid var(--t-hard)', borderRadius: 9, boxShadow: 'var(--sh-xs)' }}>
                      {isCopied ? <><i className="fa-solid fa-check mr-1" />OK</> : <><i className="fa-regular fa-copy mr-1" />{code}</>}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Clear */}
          {history.length > 0 && (
            <button onClick={clearAll}
              className="w-full py-2 text-[10px] font-mono font-bold tracking-wider transition-all duration-150 hover:!text-white active:translate-y-0.5"
              onMouseEnter={e => e.currentTarget.style.background = 'var(--t-bad)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              style={{ color: 'var(--t-bad)', border: '2px dashed var(--t-bad)', borderRadius: 10 }}>
              <i className="fa-solid fa-trash-can mr-1.5" />BERSIHKAN RIWAYAT
            </button>
          )}
        </div>
      )}
    </div>
  )
}
