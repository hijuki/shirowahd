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

  // popup buttons from admin settings + claimGroups fallback
  const popupBtns = settings?.popupButtons?.filter(b => b.link) || []
  const claimGrps = settings?.claimGroups?.filter(g => g.link) || []
  const linkBtns = popupBtns.length ? popupBtns : claimGrps

  return (
    <div className={`fixed inset-0 z-[80] overflow-hidden flex items-center justify-center p-3 sm:p-4 transition-opacity duration-[280ms] ${vis ? 'opacity-100' : 'opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      <div className="absolute inset-0 bg-[#020510]/97 backdrop-blur-xl" />

      {/* Confetti */}
      {vis && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="confetti-particle" style={{ '--x': `${8 + Math.random() * 84}%`, '--delay': `${i * 0.12}s`, '--color': ['#22d3ee','#3b82f6','#34d399','#fbbf24','#fb7185'][i % 5], '--drift': `${-50 + Math.random() * 100}px` }} />
          ))}
        </div>
      )}

      <div className={`relative z-20 w-full max-w-[400px] max-h-[calc(100dvh-24px)] transition-all duration-[400ms] ${vis ? 'scale-100 translate-y-0 opacity-100' : 'scale-[.9] translate-y-8 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <div className="absolute -inset-10 rounded-[44px] bg-gradient-to-b from-ok/[.10] via-[#22d3ee]/[.05] to-transparent blur-3xl pointer-events-none" />
        <div className="relative max-h-[calc(100dvh-24px)] rounded-[24px] border border-white/[.1] bg-[#06101f]/[.98] backdrop-blur-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,.95)] overflow-hidden flex flex-col">
          {/* Top shimmer */}
          <div className="absolute top-0 inset-x-0 h-px"><div className="h-full bg-gradient-to-r from-transparent via-ok/60 to-transparent modal-shimmer" /></div>

          {/* ─── Header ─── */}
          <div className="text-center pt-5 sm:pt-7 pb-3 px-6 shrink-0">
            <div className="relative inline-block mb-4">
              <div className="absolute -inset-6 rounded-full success-ring-1" />
              <div className="absolute -inset-10 rounded-full success-ring-2" />
              <div className="absolute -inset-5 rounded-full bg-ok/12 blur-xl success-halo pointer-events-none" />
              <div className={`relative w-[58px] h-[58px] mx-auto rounded-full grid place-items-center transition-all duration-[500ms] ${checkDone ? 'scale-100 rotate-0' : 'scale-0 -rotate-45'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}> 
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-ok/25 to-ok/5 border border-ok/35" />
                <i className="fa-solid fa-check text-ok text-[26px] relative drop-shadow-[0_0_14px_rgba(52,211,153,.8)]" />
              </div>
            </div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[20px] tracking-tight">
              <span className="grad-text">Upload Berhasil!</span>
            </h2>
            <p className="text-[#7e90ad] text-[11px] mt-1">
              {result.bundle ? `${result.count} foto — 1 bundle` : 'File siap diklaim'}
            </p>
          </div>

          {/* ─── Code cards ─── */}
          <div className="px-5 space-y-2.5 overflow-y-auto overscroll-contain scrollbar-none">
            {codes.map(({ code, name }) => (
              <div key={code} onClick={() => copy(code)} className="relative rounded-[16px] bg-[#04101f]/90 border border-[#22d3ee]/20 p-4 text-center cursor-pointer group hover:border-[#22d3ee]/40 transition-all duration-[200ms] active:scale-[.98] overflow-hidden">
                <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-[#22d3ee]/35 to-transparent" />
                {name && <p className="text-[#7e90ad] text-[9px] truncate mb-1.5 relative">{name}</p>}
                <p className="font-mono font-bold text-[22px] sm:text-[24px] tracking-[.06em] code-text select-all relative">.claim {code}</p>
                <p className={`text-[9px] font-bold mt-2 transition-colors duration-[150ms] ${copied === code ? 'text-ok' : 'text-[#7e90ad]/60 group-hover:text-[#22d3ee]/80'}`}>
                  <i className={`fa-solid ${copied === code ? 'fa-check' : 'fa-copy'} mr-1`} />
                  {copied === code ? 'Tersalin!' : 'Tap untuk salin kode'}
                </p>
              </div>
            ))}
          </div>

          {/* ─── Timer bar ─── */}
          <div className="px-5 mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[#7e90ad] text-[9px] font-bold flex items-center gap-1">
                <i className="fa-solid fa-hourglass-half text-[8px]" />Kedaluwarsa
              </span>
              <span className={`font-mono font-bold text-[12px] tabular-nums ${urgent ? 'text-bad' : 'text-[#22d3ee]'}`}>
                {mins}:{secs}
              </span>
            </div>
            <div className="expire-bar"><div style={{ width: pct + '%' }} className={urgent ? '!bg-gradient-to-r !from-bad !to-[#fbbf24]' : ''} /></div>
          </div>

          {/* ─── Claim group buttons (from admin settings) ─── */}
          {linkBtns.length > 0 && (
            <div className="px-5 mt-4">
              <p className="text-[8px] font-extrabold tracking-[.18em] uppercase text-[#7e90ad]/50 mb-2 text-center">Klaim file di grup</p>
              <div className="space-y-1.5">
                {linkBtns.map(btn => (
                  <a key={btn.name + btn.link} href={btn.link} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[12px] bg-[#34d399]/[.06] border border-[#34d399]/20 group hover:bg-[#34d399]/[.12] hover:border-[#34d399]/35 transition-all duration-[200ms] active:scale-[.98]">
                    <span className="w-8 h-8 shrink-0 rounded-[10px] bg-[#34d399]/15 border border-[#34d399]/20 grid place-items-center">
                      <i className="fa-solid fa-comments text-[#34d399] text-[11px]" />
                    </span>
                    <span className="flex-1 min-w-0 text-left">
                      <span className="block font-bold text-[11px] truncate">{btn.name || 'Grup Claim'}</span>
                      <span className="block text-[#7e90ad] text-[8px]">Buka &amp; paste kode di sini</span>
                    </span>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[8px] text-[#34d399]/50 group-hover:text-[#34d399] transition-colors duration-[150ms]" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ─── Action row ─── */}
          <div className="grid grid-cols-2 gap-2 px-5 mt-4">
            <button onClick={() => copy(codes[0].code)}
              className="py-3 rounded-[12px] bg-white/[.03] border border-white/[.07] text-[11px] font-bold text-[#e8f1ff] hover:bg-white/[.08] active:scale-[.96] transition-all duration-[150ms] flex items-center justify-center gap-2">
              <i className={`fa-solid ${copied ? 'fa-check text-ok' : 'fa-copy text-[#22d3ee]'}`} />
              {copied ? 'Tersalin!' : 'Salin Kode'}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent('.claim ' + codes[0].code)}`} target="_blank" rel="noreferrer"
              className="py-3 rounded-[12px] bg-[#25D366]/[.06] border border-[#25D366]/25 text-[11px] font-bold text-[#7ce8a8] hover:bg-[#25D366]/[.14] active:scale-[.96] transition-all duration-[150ms] flex items-center justify-center gap-2">
              <i className="fa-brands fa-whatsapp" /> Bagikan
            </a>
          </div>

          <div className="p-5 pt-3 shrink-0 bg-[#06101f]/[.98]">
            <button onClick={close} className="btn-primary w-full py-3.5 rounded-[14px] font-bold text-[13px] group">
              Selesai <i className="fa-solid fa-arrow-right ml-1.5 group-hover:translate-x-1 transition-transform duration-[150ms]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
