'use client'
import { useState, useEffect, useCallback } from 'react'
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
  const [copied, setCopied] = useState(null)

  const load = useCallback(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem('sw_history') || '[]'))
    } catch { /* fresh */ }
  }, [])

  useEffect(() => {
    load()
    if (!open) return
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [load, open])

  useEffect(() => {
    if (copied === null) return
    const t = setTimeout(() => setCopied(null), 1500)
    return () => clearTimeout(t)
  }, [copied])

  const copyCode = async (code, ts) => {
    try {
      await navigator.clipboard.writeText(code)
      toast('Kode disalin!', 'success')
      setCopied(ts)
    } catch { toast('Gagal menyalin', 'error') }
  }

  const now = Date.now()
  const active = history.filter(h => now - h.timestamp < (h.expireMinutes || 60) * 60000)
  const expired = history.filter(h => now - h.timestamp >= (h.expireMinutes || 60) * 60000)

  const clearHistory = () => localStorage.removeItem('sw_history')

  return (
    <div className="card p-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between mb-1 group">
        <div className="flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left text-[var(--t-muted)] text-[12px]" />
          <span className="font-black text-[13px] tracking-tight">Riwayat Klaim</span>
          <span className="px-1.5 py-0.5 rounded-[2px] bg-[var(--t-surface2)] border border-[var(--t-line)] font-mono text-[9px] font-bold tnum">
            {history.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {active.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-[2px] border border-[var(--t-ok)]/30 bg-[var(--t-ok)]/10 text-[var(--t-ok)] font-mono text-[9px] font-bold tracking-wider">
              {active.length} AKTIF
            </span>
          )}
          <i className={`fa-solid fa-chevron-down text-[10px] text-[var(--t-muted)] transition-transform duration-[200ms] ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="anim-fade space-y-1.5 mt-3">
          {!history.length && (
            <p className="text-center text-[11px] font-mono text-[var(--t-muted)] py-4 border border-dashed border-[var(--t-line)] rounded-[3px]">
              — BELUM ADA RIWAYAT KLAIM —
            </p>
          )}

          {/* Active */}
          {active.map(h => {
            const code = h.bundle || h.code
            const isCopied = copied === h.timestamp
            const remaining = Math.max(0, Math.ceil((h.expireMinutes || 60) - (now - h.timestamp) / 60000))
            const pct = remaining / ((h.expireMinutes || 60) / 100)
            const urgent = remaining <= 10
            return (
              <div key={h.timestamp} className="hist-item rounded-r-[3px] p-2.5 bg-[var(--t-surface2)] border border-l-2 border-[var(--t-line)]">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 shrink-0 rounded-[3px] bg-[var(--t-surface)] border border-[var(--t-line)] grid place-items-center">
                    <i className={`fa-solid ${h.bundle ? 'fa-layer-group' : h.count > 1 ? 'fa-images' : 'fa-film'} text-[11px] text-[var(--t-accent-2)]`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[11px] truncate max-w-[170px]">{h.files?.[0] || code}</p>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-[var(--t-muted)] mt-0.5 tnum">
                      <span>{timeAgo(h.timestamp)}</span>
                      {h.totalSize > 0 && <span>· {fmtSize(h.totalSize)}</span>}
                      <span className={urgent ? 'text-[var(--t-bad)] font-bold' : 'text-[var(--t-ok)]'}>
                        · SISA {remaining}m
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => copyCode(code, h.timestamp)}
                    className={`shrink-0 px-2 py-1.5 rounded-[3px] text-[10px] font-mono font-bold border transition-all duration-[140ms] active:scale-95 ${isCopied
                      ? 'bg-[var(--t-ok)] border-[var(--t-ok)] text-white'
                      : 'code-chip code-text hover:border-[var(--t-ink)]'}`}
                  >
                    {isCopied ? <>TERCOPY</> : <><i className="fa-regular fa-copy mr-1 opacity-50" />{code}</>}
                  </button>
                </div>

                {/* Expire bar */}
                <div className="expire-bar mt-2">
                  <div style={{ width: `${100 - pct}%` }} className={urgent ? 'is-timeout' : ''} />
                </div>
              </div>
            )
          })}

          {/* Expired */}
          {expired.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-0.5 pt-2">
                <span className="field-label">Kadaluarsa</span>
                <div className="flex-1 h-px bg-[var(--t-line)]" />
              </div>
              {expired.map(h => {
                const code = h.bundle || h.code
                return (
                  <div key={h.timestamp} className="rounded-[3px] border border-[var(--t-line)] p-2 bg-[var(--t-surface2)] opacity-60 flex items-center gap-2.5">
                    <div className="w-7 h-7 shrink-0 rounded-[3px] bg-[var(--t-surface)] border border-[var(--t-line)] grid place-items-center">
                      <i className="fa-solid fa-clock text-[var(--t-muted)] text-[9px]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[11px] truncate text-[var(--t-muted)]">{h.files?.[0] || code}</p>
                      <p className="text-[8px] text-[var(--t-muted)] font-mono tnum">{timeAgo(h.timestamp)}{h.count > 1 ? ` · ${h.count} file` : ''}</p>
                    </div>
                    <span className="px-1.5 py-0.5 rounded-[2px] border border-[var(--t-bad)]/30 text-[var(--t-bad)] font-mono text-[8px] font-bold tracking-wider">EXPIRED</span>
                  </div>
                )
              })}
            </>
          )}

          {/* Clear all */}
          {history.length > 0 && (
            <button
              onClick={() => { clearHistory(); setHistory([]); toast('Riwayat dibersihkan', 'info') }}
              className="w-full mt-1 py-2 rounded-[3px] text-[10px] font-mono font-bold tracking-wider text-[var(--t-muted)] border border-dashed border-[var(--t-line)] hover:text-[var(--t-bad)] hover:border-[var(--t-bad)]/40 transition-all duration-[140ms] active:scale-[.98]"
            >
              <i className="fa-solid fa-trash-can mr-1.5" />BERSIHKAN RIWAYAT
            </button>
          )}
        </div>
      )}
    </div>
  )
}
