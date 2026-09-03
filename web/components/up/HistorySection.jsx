'use client'
import { useState } from 'react'
import { getHistory, clearHistory, fmtSize } from '@/lib/up-api'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'baru saja'
  if (s < 3600) return Math.floor(s / 60) + ' menit lalu'
  if (s < 86400) return Math.floor(s / 3600) + ' jam lalu'
  return Math.floor(s / 86400) + ' hari lalu'
}

function expirePercent(h) {
  const total = (h.expireMinutes || 60) * 60000
  const elapsed = Date.now() - h.timestamp
  return Math.min(100, (elapsed / total) * 100)
}
function isExpired(h) { return expirePercent(h) >= 100 }

export default function HistorySection() {
  const [history, setHistory] = useState(() => (typeof window === 'undefined' ? [] : getHistory()))
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(null)

  const copyCode = async (code, ts) => {
    const text = '.claim ' + code
    try { await navigator.clipboard.writeText(text) } catch {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    setCopied(ts)
    setTimeout(() => setCopied(null), 1500)
  }

  if (!history.length) return null

  const active = history.filter(h => !isExpired(h))
  const expired = history.filter(h => isExpired(h))

  return (
    <section className="plate plate-seam mt-5" data-reveal="">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5"
        aria-expanded={open}>
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="icon-tile !w-8 !h-8"><i className="fa-solid fa-clock-rotate-left text-[11px]" /></span>
          <span className="min-w-0 text-left">
            <span className="block display-m !text-[15px]">Riwayat</span>
            <span className="kicker !text-[9px] block mt-[2px]">{history.length} UPLOAD DI PERANGKAT INI</span>
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {active.length > 0 && <span className="chip"><span className="dot-live" />{active.length} AKTIF</span>}
          <i className={`fa-solid fa-plus text-[11px] transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
        </span>
      </button>

      <div className={`grid transition-[grid-template-rows] duration-[380ms] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        style={{ transitionTimingFunction: 'var(--ease)' }}>
        <div className="overflow-hidden">
          <div className="border-t-2 border-[var(--edge)] p-3 space-y-1.5">
            {active.map(h => {
              const pct = expirePercent(h)
              const code = h.bundle || h.code
              const remaining = Math.max(0, Math.ceil((h.expireMinutes || 60) - (Date.now() - h.timestamp) / 60000))
              return (
                <div key={h.timestamp} className="hist-item p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="data text-[13px] font-bold">.claim {code}</p>
                      <p className="text-[10px] text-[var(--ink-2)] mt-1 truncate max-w-[190px]">
                        {(h.files || []).join(', ') || '—'}
                      </p>
                      <p className="kicker !text-[8px] mt-1.5">
                        {timeAgo(h.timestamp)} · {fmtSize(h.totalSize || 0)}
                      </p>
                    </div>
                    <button onClick={() => copyCode(code, h.timestamp)}
                      className="btn btn-sm shrink-0" aria-label={'Salin kode ' + code}>
                      <i className={`fa-solid ${copied === h.timestamp ? 'fa-check' : 'fa-copy'} text-[10px]`} />
                      {copied === h.timestamp ? 'OK' : 'SALIN'}
                    </button>
                  </div>
                  <div className="mt-2.5">
                    <div className="gauge !h-[10px]"><span style={{ width: (100 - pct) + '%' }} /></div>
                    <p className="kicker !text-[8px] mt-1.5 opacity-65">SISA ± {remaining} MENIT</p>
                  </div>
                </div>
              )
            })}

            {expired.length > 0 && (
              <>
                <div className="flex items-center gap-2.5 pt-2">
                  <span className="flex-1 rule-dash" />
                  <span className="kicker !text-[8px] opacity-55">KEDALUWARSA</span>
                  <span className="flex-1 rule-dash" />
                </div>
                {expired.map(h => (
                  <div key={h.timestamp} className="hist-item p-3 opacity-45">
                    <p className="data text-[12px] line-through">.claim {h.bundle || h.code}</p>
                    <p className="kicker !text-[8px] mt-1">{timeAgo(h.timestamp)}</p>
                  </div>
                ))}
              </>
            )}

            <button onClick={() => { clearHistory(); setHistory([]) }}
              className="btn btn-sm btn-ghost w-full mt-1">
              <i className="fa-solid fa-trash text-[10px]" />HAPUS RIWAYAT
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
