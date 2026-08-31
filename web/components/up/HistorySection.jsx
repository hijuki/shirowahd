'use client'
import { useState } from 'react'
import { getHistory, clearHistory, fmtSize } from '@/lib/up-api'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'baru aja'
  if (s < 3600) return `${Math.floor(s / 60)}m lalu`
  if (s < 86400) return `${Math.floor(s / 3600)}j lalu`
  return `${Math.floor(s / 86400)}h lalu`
}

// Sisa waktu terbaca: "1440m" tidak informatif, jadi >=60 menit tampil jam.
function fmtRemaining(m) {
  if (m >= 1440) return `${Math.floor(m / 1440)}h ${Math.floor((m % 1440) / 60)}j`
  if (m >= 60) return `${Math.floor(m / 60)}j ${m % 60}m`
  return `${m}m`
}

function expirePercent(h) {
  if (!h.timestamp || !h.expireMinutes) return 0
  const elapsed = Date.now() - h.timestamp
  const total = h.expireMinutes * 60 * 1000
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

function isExpired(h) { return expirePercent(h) >= 100 }

export default function HistorySection() {
  const [history, setHistory] = useState(() => {
    if (typeof window === 'undefined') return []
    return getHistory()
  })
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(null)

  const copyCode = (code, ts) => {
    navigator.clipboard.writeText(code)
    // Pop sound
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = 1200
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      osc.start(); osc.stop(ctx.currentTime + 0.15)
    } catch {}
    setCopied(ts)
    setTimeout(() => setCopied(null), 1500)
  }

  if (!history.length) return null

  const active = history.filter(h => !isExpired(h))
  const expired = history.filter(h => isExpired(h))

  return (
    <div className="mt-6">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-1 mb-3 group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#22d3ee]/15 to-[#3b82f6]/10 border border-[#22d3ee]/20 grid place-items-center">
            <i className="fa-solid fa-clock-rotate-left text-[#22d3ee] text-[11px]" />
          </div>
          <span className="font-[family-name:var(--font-display)] font-bold text-[14px] tracking-tight">Riwayat</span>
          <span className="px-2 py-0.5 rounded-full bg-[#22d3ee]/10 border border-[#22d3ee]/20 text-[#67e8f9] text-[9px] font-extrabold tracking-wider">
            {history.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {active.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-ok/10 border border-ok/20 text-ok text-[8px] font-extrabold tracking-wider">
              {active.length} AKTIF
            </span>
          )}
          <i className={`fa-solid fa-chevron-down text-[10px] text-[var(--t-muted)] transition-transform duration-[250ms] ${open ? 'rotate-180' : ''}`} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
        </div>
      </button>

      {open && (
        <div className="space-y-2 anim-fade">
          {/* Active uploads */}
          {active.map(h => {
            const pct = expirePercent(h)
            const code = h.bundle || h.code
            const isCopied = copied === h.timestamp
            const remaining = Math.max(0, Math.ceil((h.expireMinutes || 60) - (Date.now() - h.timestamp) / 60000))
            return (
              <div key={h.timestamp} className="relative rounded-[16px] border border-white/[.06] overflow-hidden group hover:border-[#22d3ee]/25 transition-all duration-[250ms]" style={{ transitionTimingFunction: 'var(--ease-out)' }}>
                {/* Glow top edge */}
                <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#22d3ee]/30 to-transparent" />

                <div className="relative p-3.5 bg-white/[.02]">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-10 h-10 shrink-0 rounded-[12px] bg-gradient-to-br from-[#22d3ee]/12 to-[#3b82f6]/8 border border-[#22d3ee]/20 grid place-items-center shadow-[0_0_20px_-6px_rgba(34,211,238,.2)]">
                      <i className={`fa-solid ${h.bundle ? 'fa-layer-group' : h.count > 1 ? 'fa-images' : 'fa-film'} text-[#67e8f9] text-[13px]`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-[12px] truncate max-w-[160px]">
                          {h.files?.[0] || code}
                        </p>
                        {h.count > 1 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#93c5fd] text-[8px] font-extrabold shrink-0">
                            +{h.count - 1}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[var(--t-muted)]">
                        <span className="flex items-center gap-1">
                          <i className="fa-regular fa-clock text-[7px] opacity-60" />
                          {timeAgo(h.timestamp)}
                        </span>
                        {h.totalSize > 0 && (
                          <span className="flex items-center gap-1">
                            <i className="fa-solid fa-hard-drive text-[7px] opacity-60" />
                            {fmtSize(h.totalSize)}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-ok">
                          <i className="fa-solid fa-hourglass-half text-[7px]" />
                          {fmtRemaining(remaining)}
                        </span>
                      </div>
                    </div>

                    {/* Copy code button */}
                    <button
                      onClick={() => copyCode(code, h.timestamp)}
                      className={`shrink-0 px-3 py-2 rounded-[12px] text-[12px] font-mono font-bold transition-all duration-[250ms] active:scale-95 ${isCopied
                        ? 'bg-ok/15 border border-ok/30 text-ok shadow-[0_0_16px_-4px_rgba(52,211,153,.4)]'
                        : 'bg-gradient-to-br from-[#22d3ee]/10 to-[#080e1c] border border-[#22d3ee]/25 text-[#a5f3fc] shadow-[0_0_20px_-6px_rgba(34,211,238,.25)] hover:border-[#22d3ee]/40 hover:shadow-[0_0_28px_-6px_rgba(34,211,238,.4)]'
                      }`}
                      style={{ transitionTimingFunction: 'var(--ease-out)', textShadow: '0 0 14px rgba(34,211,238,.4)' }}
                    >
                      {isCopied ? (
                        <><i className="fa-solid fa-check mr-1" />OK</>
                      ) : (
                        <><i className="fa-regular fa-copy mr-1 text-[9px] opacity-60" />{code}</>
                      )}
                    </button>
                  </div>

                  {/* Expire progress bar */}
                  <div className="mt-3 h-[3px] rounded-full bg-white/[.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-[450ms]"
                      style={{
                        width: `${100 - pct}%`,
                        background: pct > 80 ? 'linear-gradient(90deg, #fb7185, #fbbf24)' : 'linear-gradient(90deg, #22d3ee, #3b82f6)',
                        boxShadow: pct > 80 ? '0 0 8px rgba(251,113,133,.4)' : '0 0 8px rgba(34,211,238,.3)',
                        transitionTimingFunction: 'var(--ease-out)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Expired uploads */}
          {expired.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-1 pt-2">
                <span className="text-[9px] font-extrabold tracking-[.15em] uppercase text-[var(--t-muted)]/60">Kadaluarsa</span>
                <div className="flex-1 h-px bg-white/[.04]" />
              </div>
              {expired.map(h => {
                const code = h.bundle || h.code
                return (
                  <div key={h.timestamp} className="rounded-[14px] border border-white/[.04] p-3 bg-white/[.01] opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 shrink-0 rounded-[10px] bg-white/[.03] border border-white/[.06] grid place-items-center">
                        <i className="fa-solid fa-clock text-[var(--t-muted)]/50 text-[10px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[11px] truncate text-[var(--t-muted)]/70">{h.files?.[0] || code}</p>
                        <p className="text-[9px] text-[var(--t-muted)]/50 font-mono">{timeAgo(h.timestamp)}{h.count > 1 ? ` · ${h.count} file` : ''}</p>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-bad/8 border border-bad/15 text-bad/50 text-[8px] font-extrabold tracking-wider">EXPIRED</span>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* Clear all */}
          <button
            onClick={() => { clearHistory(); setHistory([]) }}
            className="w-full mt-1 py-2.5 rounded-[12px] text-[10px] font-bold tracking-wider text-[#7e90ad]/50 border border-white/[.04] bg-white/[.01] hover:text-bad/70 hover:border-bad/20 hover:bg-bad/[.04] transition-all duration-[250ms] active:scale-[.98]"
            style={{ transitionTimingFunction: 'var(--ease-out)' }}
          >
            <i className="fa-solid fa-trash-can mr-1.5" />BERSIHKAN RIWAYAT
          </button>
        </div>
      )}
    </div>
  )
}
