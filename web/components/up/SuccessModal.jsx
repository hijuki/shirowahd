'use client'
import { useState, useEffect } from 'react'

export default function SuccessModal({ result, settings, expireMinutes, onClose }) {
  const [copied, setCopied] = useState('')
  const [left, setLeft] = useState(expireMinutes * 60000)
  const [vis, setVis] = useState(false)
  const [checkDone, setCheckDone] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVis(true)); setTimeout(() => setCheckDone(true), 500) }, [])
  useEffect(() => { const t = setInterval(() => setLeft(l => Math.max(0, l - 1000)), 1000); return () => clearInterval(t) }, [])
  const close = () => { setVis(false); setTimeout(onClose, 280) }
  const codes = result.codes?.length ? result.codes : [{ code: result.code, name: '' }]
  const copy = async (code) => {
    try { await navigator.clipboard.writeText('.claim ' + code) } catch {
      const ta = document.createElement('textarea'); ta.value = '.claim ' + code
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopied(code); setTimeout(() => setCopied(''), 1800)
  }
  const mins = String(Math.floor(left / 60000)).padStart(2, '0')
  const secs = String(Math.floor(left / 1000) % 60).padStart(2, '0')
  const pct = Math.max(0, (left / (expireMinutes * 60000)) * 100)
  const urgent = left < 5 * 60000

  const popupBtns = settings?.popupButtons?.filter(b => b.link) || []
  const claimGrps = settings?.claimGroups?.filter(g => g.link) || []
  const linkBtns = popupBtns.length ? popupBtns : claimGrps

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center p-5 transition-opacity duration-[280ms] ${vis ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      {/* Confetti */}
      {vis && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="confetti-particle" style={{ '--x': `${10 + Math.random() * 80}%`, '--delay': `${i * 0.12}s`, '--color': ['#22d3ee','#3b82f6','#34d399','#fbbf24','#fb7185'][i % 5], '--drift': `${-50 + Math.random() * 100}px` }} />
          ))}
        </div>
      )}

      {/* Popup card */}
      <div className={`relative z-20 w-full max-w-[360px] transition-all duration-[350ms] ${vis ? 'scale-100 translate-y-0 opacity-100' : 'scale-[.85] translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-b from-ok/[.08] to-transparent blur-2xl pointer-events-none" />

        <div className="relative rounded-[20px] border border-white/[.1] bg-[#0a1628] shadow-[0_24px_60px_-12px_rgba(0,0,0,.9)] overflow-hidden">
          {/* Shimmer line */}
          <div className="absolute top-0 inset-x-0 h-px"><div className="h-full bg-gradient-to-r from-transparent via-ok/50 to-transparent modal-shimmer" /></div>

          {/* Header */}
          <div className="text-center pt-5 pb-1 px-5">
            <div className="relative inline-block mb-2">
              <div className="absolute -inset-4 rounded-full bg-ok/10 blur-lg pointer-events-none" />
              <div className={`relative w-[44px] h-[44px] mx-auto rounded-full grid place-items-center transition-all duration-[500ms] ${checkDone ? 'scale-100 rotate-0' : 'scale-0 -rotate-45'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-ok/25 to-ok/5 border border-ok/30" />
                <i className="fa-solid fa-check text-ok text-[18px] relative drop-shadow-[0_0_10px_rgba(52,211,153,.7)]" />
              </div>
            </div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[17px] tracking-tight">
              <span className="grad-text">Upload Berhasil!</span>
            </h2>
            <p className="text-[#7e90ad] text-[10px] mt-0.5">
              {result.bundle ? `${result.count} foto — 1 bundle` : 'File siap diklaim'}
            </p>
          </div>

          {/* Code cards */}
          <div className="px-4 pt-2 space-y-2">
            {codes.map(({ code, name }) => (
              <div key={code} onClick={() => copy(code)} className="rounded-[12px] bg-[#040e1c] border border-[#22d3ee]/15 p-3 text-center cursor-pointer group hover:border-[#22d3ee]/35 transition-all duration-[200ms] active:scale-[.97]">
                {name && <p className="text-[#7e90ad] text-[8px] truncate mb-1">{name}</p>}
                <p className="font-mono font-bold text-[18px] tracking-[.03em] code-text select-all">.claim {code}</p>
                <p className={`text-[8px] font-bold mt-1 transition-colors ${copied === code ? 'text-ok' : 'text-[#7e90ad]/50'}`}>
                  <i className={`fa-solid ${copied === code ? 'fa-check' : 'fa-copy'} mr-1`} />
                  {copied === code ? 'Tersalin!' : 'Tap untuk salin'}
                </p>
              </div>
            ))}
          </div>

          {/* Timer */}
          <div className="px-4 mt-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#7e90ad] text-[8px] font-bold flex items-center gap-1">
                <i className="fa-solid fa-hourglass-half text-[7px]" />Kedaluwarsa
              </span>
              <span className={`font-mono font-bold text-[11px] tabular-nums ${urgent ? 'text-bad' : 'text-[#22d3ee]'}`}>
                {mins}:{secs}
              </span>
            </div>
            <div className="expire-bar"><div style={{ width: pct + '%' }} className={urgent ? '!bg-gradient-to-r !from-bad !to-[#fbbf24]' : ''} /></div>
          </div>

          {/* Claim buttons */}
          {linkBtns.length > 0 && (
            <div className="px-4 mt-2.5">
              <p className="text-[7px] font-extrabold tracking-[.15em] uppercase text-[#7e90ad]/40 mb-1.5 text-center">Klaim file di grup</p>
              <div className="space-y-1">
                {linkBtns.map(btn => (
                  <a key={btn.name + btn.link} href={btn.link} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-[#34d399]/[.05] border border-[#34d399]/15 hover:bg-[#34d399]/[.10] transition-all duration-[200ms] active:scale-[.97]">
                    <span className="w-6 h-6 shrink-0 rounded-[7px] bg-[#34d399]/12 grid place-items-center">
                      <i className="fa-solid fa-comments text-[#34d399] text-[9px]" />
                    </span>
                    <span className="flex-1 min-w-0 font-bold text-[10px] truncate">{btn.name || 'Grup Claim'}</span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[7px] text-[#34d399]/40" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-1.5 px-4 mt-2.5">
            <button onClick={() => copy(codes[0].code)}
              className="py-2 rounded-[10px] bg-white/[.03] border border-white/[.06] text-[10px] font-bold hover:bg-white/[.07] active:scale-[.96] transition-all flex items-center justify-center gap-1.5">
              <i className={`fa-solid ${copied ? 'fa-check text-ok' : 'fa-copy text-[#22d3ee]'} text-[9px]`} />
              {copied ? 'Tersalin!' : 'Salin'}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent('.claim ' + codes[0].code)}`} target="_blank" rel="noreferrer"
              className="py-2 rounded-[10px] bg-[#25D366]/[.05] border border-[#25D366]/20 text-[10px] font-bold text-[#7ce8a8] hover:bg-[#25D366]/[.12] active:scale-[.96] transition-all flex items-center justify-center gap-1.5">
              <i className="fa-brands fa-whatsapp text-[9px]" /> Bagikan
            </a>
          </div>

          {/* Close */}
          <div className="p-4 pt-2.5">
            <button onClick={close} className="btn-primary w-full py-2.5 rounded-[12px] font-bold text-[12px] group">
              Selesai <i className="fa-solid fa-arrow-right ml-1 text-[10px] group-hover:translate-x-1 transition-transform duration-[150ms]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
