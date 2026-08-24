'use client'
import { useState, useEffect } from 'react'
import { ModalShell } from './Modals'

export default function SuccessModal({ result, settings, expireMinutes, onClose }) {
  const [copied, setCopied] = useState('')
  const [left, setLeft] = useState(expireMinutes * 60000)
  const [phase, setPhase] = useState(0) // 0=enter, 1=check, 2=content
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200)
    const t2 = setTimeout(() => setPhase(2), 700)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  useEffect(() => { const t = setInterval(() => setLeft(l => Math.max(0, l - 1000)), 1000); return () => clearInterval(t) }, [])
  const codes = result.codes?.length ? result.codes : [{ code: result.code, name: '' }]
  const copy = async (code) => {
    try { await navigator.clipboard.writeText('.claim ' + code) } catch {
      const ta = document.createElement('textarea'); ta.value = '.claim ' + code
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopied(code); setTimeout(() => setCopied(''), 2000)
  }
  const mins = String(Math.floor(left / 60000)).padStart(2, '0')
  const secs = String(Math.floor(left / 1000) % 60).padStart(2, '0')
  const pct = Math.max(0, (left / (expireMinutes * 60000)) * 100)
  const urgent = left < 5 * 60000

  // Respect admin toggles
  const popupBtns = (settings?.showPopupBtns !== false && settings?.popupButtons?.filter(b => b.link)) || []
  const claimGrps = (settings?.showClaimBtn !== false && settings?.claimGroups?.filter(g => g.link)) || []
  const linkBtns = popupBtns.length ? popupBtns : claimGrps

  return (
    <ModalShell onClose={onClose} accent="green">
      {/* ── Confetti rain ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px]">
        {[...Array(18)].map((_, i) => (
          <div key={i} className="confetti-particle" style={{
            '--x': `${5 + Math.random() * 90}%`,
            '--delay': `${i * 0.1}s`,
            '--color': ['#22d3ee','#3b82f6','#34d399','#fbbf24','#fb7185','#a78bfa'][i % 6],
            '--drift': `${-40 + Math.random() * 80}px`,
          }} />
        ))}
      </div>

      {/* ── Header ── */}
      <div className="relative text-center mb-4">
        {/* Burst rings */}
        <div className="relative inline-block mb-3">
          <div className={`absolute -inset-6 rounded-full transition-all duration-[600ms] ${phase >= 1 ? 'success-ring-1' : 'opacity-0 scale-0'}`} />
          <div className={`absolute -inset-10 rounded-full transition-all duration-[800ms] ${phase >= 1 ? 'success-ring-2' : 'opacity-0 scale-0'}`} />
          <div className="absolute -inset-5 rounded-full bg-ok/10 blur-xl success-halo pointer-events-none" />

          {/* Check icon */}
          <div className={`relative w-[56px] h-[56px] mx-auto rounded-full grid place-items-center transition-all duration-[600ms] ${phase >= 1 ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-ok/30 to-ok/5 border-2 border-ok/40 shadow-[0_0_30px_-4px_rgba(52,211,153,.6)]" />
            <i className="fa-solid fa-check text-ok text-[22px] relative drop-shadow-[0_0_16px_rgba(52,211,153,.9)]" />
          </div>

          {/* Sparkle particles around check */}
          {phase >= 1 && [...Array(6)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 rounded-full check-sparkle" style={{
              top: '50%', left: '50%',
              '--angle': `${i * 60}deg`,
              '--dist': `${28 + (i % 2) * 12}px`,
              '--color': ['#34d399', '#22d3ee', '#fbbf24'][i % 3],
              animationDelay: `${300 + i * 80}ms`,
            }} />
          ))}
        </div>

        <h2 className={`font-[family-name:var(--font-display)] font-bold text-[20px] tracking-tight transition-all duration-[400ms] ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
          <span className="grad-text">Upload Berhasil!</span>
        </h2>
        <p className={`text-[#7e90ad] text-[10px] mt-1 transition-all duration-[400ms] delay-75 ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
          {result.bundle ? `${result.count} foto — 1 bundle` : 'File siap diklaim'}
        </p>
      </div>

      {/* ── Code cards ── */}
      <div className={`space-y-2 mb-3 transition-all duration-[400ms] delay-100 ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        {codes.map(({ code, name }) => (
          <div key={code} onClick={() => copy(code)}
            className="relative rounded-[14px] bg-[#040d1a] border border-[#22d3ee]/15 p-3 text-center cursor-pointer group hover:border-[#22d3ee]/35 transition-all duration-[200ms] active:scale-[.97] overflow-hidden">
            {/* Top edge glow */}
            <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#22d3ee]/30 to-transparent" />
            {/* Hover glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#22d3ee]/[.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[200ms]" />

            {name && <p className="text-[#7e90ad] text-[8px] truncate mb-1 relative">{name}</p>}
            <p className="font-mono font-bold text-[19px] tracking-[.04em] code-text select-all relative">.claim {code}</p>
            <p className={`text-[8px] font-bold mt-1.5 transition-colors duration-[150ms] relative ${copied === code ? 'text-ok' : 'text-[#7e90ad]/50 group-hover:text-[#22d3ee]/70'}`}>
              <i className={`fa-solid ${copied === code ? 'fa-check' : 'fa-copy'} mr-1`} />
              {copied === code ? 'Tersalin!' : 'Tap untuk salin kode'}
            </p>
          </div>
        ))}
      </div>

      {/* ── Timer ── */}
      <div className={`mb-3 transition-all duration-[400ms] delay-150 ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[#7e90ad] text-[8px] font-bold flex items-center gap-1">
            <i className="fa-solid fa-hourglass-half text-[7px]" /> Kedaluwarsa
          </span>
          <span className={`font-mono font-bold text-[11px] tabular-nums ${urgent ? 'text-bad animate-pulse' : 'text-[#22d3ee]'}`}>
            {mins}:{secs}
          </span>
        </div>
        <div className="expire-bar"><div style={{ width: pct + '%' }} className={urgent ? '!bg-gradient-to-r !from-bad !to-[#fbbf24]' : ''} /></div>
      </div>

      {/* ── Claim group buttons ── */}
      {linkBtns.length > 0 && (
        <div className={`mb-3 transition-all duration-[400ms] delay-200 ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
          <p className="text-[7px] font-extrabold tracking-[.15em] uppercase text-[#7e90ad]/40 mb-1.5 flex items-center gap-2">
            <span className="flex-1 h-px bg-white/[.05]" />Klaim file di grup<span className="flex-1 h-px bg-white/[.05]" />
          </p>
          <div className="space-y-1.5">
            {linkBtns.map((btn, idx) => (
              <a key={btn.name + btn.link} href={btn.link} target="_blank" rel="noreferrer"
                className="link-btn-premium flex items-center gap-2 px-3 py-2 rounded-[12px] bg-[#34d399]/[.05] border border-[#34d399]/15 group hover:bg-[#34d399]/[.12] hover:border-[#34d399]/25 transition-all duration-[200ms] active:scale-[.97]"
                style={{ animationDelay: `${idx * 60}ms` }}>
                <span className="w-7 h-7 shrink-0 rounded-[9px] bg-[#34d399]/12 border border-[#34d399]/18 grid place-items-center">
                  <i className="fa-solid fa-comments text-[#34d399] text-[10px]" />
                </span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block font-bold text-[11px] truncate">{btn.name || 'Grup Claim'}</span>
                  <span className="block text-[#7e90ad] text-[7px]">Buka &amp; paste kode</span>
                </span>
                <i className="fa-solid fa-arrow-up-right-from-square text-[7px] text-[#34d399]/30 group-hover:text-[#34d399]/70 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className={`grid grid-cols-2 gap-2 mb-3 transition-all duration-[400ms] delay-[250ms] ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <button onClick={() => copy(codes[0].code)}
          className="relative overflow-hidden py-2.5 rounded-[12px] bg-white/[.03] border border-white/[.07] text-[10px] font-bold text-[#e8f1ff] hover:bg-white/[.08] hover:border-white/[.12] active:scale-[.95] transition-all duration-[200ms] flex items-center justify-center gap-1.5">
          <i className={`fa-solid ${copied ? 'fa-check text-ok' : 'fa-copy text-[#22d3ee]'} text-[9px]`} />
          {copied ? 'Tersalin!' : 'Salin Kode'}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent('.claim ' + codes[0].code)}`} target="_blank" rel="noreferrer"
          className="relative overflow-hidden py-2.5 rounded-[12px] bg-[#25D366]/[.06] border border-[#25D366]/18 text-[10px] font-bold text-[#7ce8a8] hover:bg-[#25D366]/[.14] hover:border-[#25D366]/30 active:scale-[.95] transition-all duration-[200ms] flex items-center justify-center gap-1.5">
          <i className="fa-brands fa-whatsapp text-[10px]" /> Bagikan
        </a>
      </div>

      {/* ── Close button (premium) ── */}
      <div className={`transition-all duration-[400ms] delay-300 ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <button onClick={onClose}
          className="relative overflow-hidden w-full py-3 rounded-[14px] bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] text-white font-bold text-[13px] shadow-[0_4px_20px_-4px_rgba(34,211,238,.45)] hover:shadow-[0_6px_28px_-4px_rgba(34,211,238,.6)] hover:brightness-110 active:scale-[.97] transition-all duration-[200ms]">
          <span className="absolute inset-0 btn-shine-sweep pointer-events-none" />
          <span className="relative flex items-center justify-center gap-2">
            Selesai <i className="fa-solid fa-arrow-right text-[11px]" />
          </span>
        </button>
      </div>
    </ModalShell>
  )
}
