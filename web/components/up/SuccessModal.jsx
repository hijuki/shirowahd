'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ModalShell } from './Modals'

/* Sound effects — tiny inline base64 audio */
const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    if (type === 'success') {
      osc.type = 'sine'; osc.frequency.value = 880
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
      osc.start(); osc.stop(ctx.currentTime + 0.4)
      // Second note
      setTimeout(() => {
        const o2 = ctx.createOscillator(), g2 = ctx.createGain()
        o2.connect(g2); g2.connect(ctx.destination)
        o2.type = 'sine'; o2.frequency.value = 1320
        g2.gain.setValueAtTime(0.12, ctx.currentTime)
        g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
        o2.start(); o2.stop(ctx.currentTime + 0.3)
      }, 150)
    } else if (type === 'copy') {
      osc.type = 'sine'; osc.frequency.value = 1200
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      osc.start(); osc.stop(ctx.currentTime + 0.15)
    }
  } catch {}
}

export default function SuccessModal({ result, settings, expireMinutes, onClose }) {
  const [copied, setCopied] = useState('')
  const [left, setLeft] = useState(expireMinutes * 60000)
  const [phase, setPhase] = useState(0)
  const [mounted, setMounted] = useState(false)
  const soundPlayed = useRef(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 350)
    const t2 = setTimeout(() => {
      setPhase(2)
      if (!soundPlayed.current) { playSound('success'); soundPlayed.current = true }
    }, 950)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])
  useEffect(() => { const t = setInterval(() => setLeft(l => Math.max(0, l - 1000)), 1000); return () => clearInterval(t) }, [])

  const codes = result.codes?.length ? result.codes : [{ code: result.code, name: '' }]
  const copy = async (code) => {
    try { await navigator.clipboard.writeText('.claim ' + code) } catch {
      const ta = document.createElement('textarea'); ta.value = '.claim ' + code
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    playSound('copy')
    setCopied(code); setTimeout(() => setCopied(''), 2000)
  }

  const shareCode = async (code) => {
    const text = `.claim ${code}`
    if (navigator.share) {
      try { await navigator.share({ text }); return } catch {}
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const mins = String(Math.floor(left / 60000)).padStart(2, '0')
  const secs = String(Math.floor(left / 1000) % 60).padStart(2, '0')
  const pct = Math.max(0, (left / (expireMinutes * 60000)) * 100)
  const urgent = left < 5 * 60000

  const popupBtns = (settings?.showPopupBtns !== false && settings?.popupButtons?.filter(b => b.link)) || []
  const claimGrps = (settings?.showClaimBtn !== false && settings?.claimGroups?.filter(g => g.link)) || []
  const linkBtns = popupBtns.length ? popupBtns : claimGrps

  if (!mounted) return null

  return createPortal(
    <ModalShell onClose={onClose} accent="green">
      {/* Confetti rain */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px]">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="confetti-particle" style={{
            '--x': `${5 + Math.random() * 90}%`,
            '--delay': `${i * 0.1}s`,
            '--color': ['#22d3ee','#3b82f6','#34d399','#fbbf24','#fb7185','#a78bfa'][i % 6],
            '--drift': `${-40 + Math.random() * 80}px`,
          }} />
        ))}
      </div>

      {/* Header */}
      <div className="relative text-center mb-5">
        <div className="relative inline-block mb-4">
          {phase >= 1 && (
            <>
              <span className="burst-ring" style={{ '--bs': '86px', animationDelay: '80ms', borderColor: 'rgba(52,211,153,.55)' }} />
              <span className="burst-ring" style={{ '--bs': '120px', animationDelay: '240ms', borderColor: 'rgba(52,211,153,.4)' }} />
              <span className="burst-ring" style={{ '--bs': '154px', animationDelay: '400ms', borderColor: 'rgba(52,211,153,.28)' }} />
            </>
          )}
          <div className="absolute -inset-6 rounded-full bg-ok/12 pointer-events-none" style={{ boxShadow: '0 0 70px 14px rgba(52,211,153,.16) inset' }} />

          <div className={`relative w-[72px] h-[72px] mx-auto rounded-[24px] grid place-items-center transform-gpu transition-[transform,opacity] duration-[600ms] floaty ${phase >= 1 ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`} style={{ transitionTimingFunction: 'var(--ease-out)', background: 'linear-gradient(135deg, #34d399, #10b981 55%, #0e9f6e)', boxShadow: '0 12px 40px -8px rgba(52,211,153,.55), inset 0 2px 0 rgba(255,255,255,.35), inset 0 -3px 8px rgba(0,0,0,.25)' }}>
            <span className="absolute inset-[2px] rounded-[22px] bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
            <i className="fa-solid fa-check text-white text-[32px] relative drop-shadow-[0_3px_8px_rgba(0,0,0,.35)]" />
          </div>

          {/* Sparkle particles — tx/ty precomputed (rad) biar kompatibel semua browser */}
          {phase >= 1 && [...Array(8)].map((_, i) => {
            const rad = (i * 45 * Math.PI) / 180
            const dist = 34 + (i % 2) * 14
            return (
              <div key={i} className="absolute w-1 h-1 rounded-full check-sparkle" style={{
                top: '50%', left: '50%',
                '--tx': `${Math.cos(rad) * dist}px`,
                '--ty': `${Math.sin(rad) * dist}px`,
                '--color': ['#34d399', '#6ee7b7', '#10b981', '#a7f3d0'][i % 4],
                animationDelay: `${300 + i * 60}ms`,
              }} />
            )
          })}
        </div>

        <h2 className={`font-[family-name:var(--font-display)] font-extrabold text-[24px] tracking-tight text-[var(--t-fg)] transform-gpu transition-[transform,opacity] duration-[400ms] ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
          Upload Berhasil!
        </h2>
        <p className={`text-[var(--t-muted)] text-[11px] mt-1.5 transform-gpu transition-[transform,opacity] duration-[400ms] delay-75 ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>
          {result.bundle ? `${result.count} foto — 1 bundle` : 'File siap diklaim'}
        </p>
      </div>

      {/* Code cards */}
      <div className={`space-y-2 mb-3 transform-gpu transition-[transform,opacity] duration-[400ms] delay-100 ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        {codes.map(({ code, name }) => (
          <div key={code} onClick={() => copy(code)}
            className="claim-code-card group relative rounded-[18px] p-4 text-center cursor-pointer active:scale-[.97] overflow-hidden">
            {/* Auto shine sweep */}
            <div className="code-shine" />
            {/* Speed lines on hover */}
            <div className="speed-lines opacity-0 group-hover:opacity-100 transition-opacity duration-[200ms]" />

            {name && <p className="text-[var(--t-muted)] text-[9px] truncate mb-1 relative">{name}</p>}
            <p className="text-[8px] font-extrabold tracking-[.24em] uppercase text-[var(--t-muted)]/50 mb-2 relative">Kode Klaim</p>
            <p className="font-mono font-bold text-[26px] tracking-[.04em] code-text select-all relative">.claim {code}</p>
            <p className={`text-[9px] font-bold mt-3 transition-colors duration-[150ms] relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${copied === code ? 'text-ok bg-ok/12' : 'text-[var(--t-muted)]/70 bg-white/[.04] group-hover:text-[#34d399]/90'}`}>
              <i className={`fa-solid ${copied === code ? 'fa-circle-check' : 'fa-copy'}`} />
              {copied === code ? 'Tersalin!' : 'Tap untuk salin'}
            </p>
          </div>
        ))}
      </div>

      {/* Timer */}
      <div className={`mb-5 transform-gpu transition-[transform,opacity] duration-[400ms] delay-150 ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[var(--t-muted)] text-[10px] font-semibold flex items-center gap-1.5">
            <i className="fa-solid fa-hourglass-half text-[9px]" /> Berlaku sampai
          </span>
          <span className={`font-mono font-bold text-[13px] tabular-nums ${urgent ? 'text-bad animate-pulse' : 'text-[#34d399]'}`}>
            {mins}:{secs}
          </span>
        </div>
        <div className="expire-bar"><div style={{ width: pct + '%' }} className={urgent ? '!bg-gradient-to-r !from-bad !to-[#fbbf24]' : '!bg-gradient-to-r !from-[#34d399] !to-[#10b981]'} /></div>
      </div>

      {/* Claim group buttons */}
      {linkBtns.length > 0 && (
        <div className={`mb-3 transform-gpu transition-[transform,opacity] duration-[400ms] delay-200 ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
          <p className="text-[8px] font-extrabold tracking-[.18em] uppercase text-[var(--t-muted)]/50 mb-2 flex items-center gap-2">
            <span className="flex-1 h-px bg-gradient-to-r from-transparent to-[#34d399]/25" />
            <i className="fa-solid fa-comments text-[#34d399]/70 text-[8px]" /> Klaim di Grup
            <span className="flex-1 h-px bg-gradient-to-l from-transparent to-[#34d399]/25" />
          </p>
          <div className={linkBtns.length > 1 ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
            {linkBtns.map((btn, idx) => (
              <a key={btn.name + btn.link} href={btn.link} target="_blank" rel="noreferrer"
                className="claim-btn group relative flex items-center gap-2 px-3 py-3 rounded-[15px] transition-all duration-[200ms] active:scale-[.97] min-w-0"
                style={{ animationDelay: `${idx * 60}ms` }}>
                <span className="claim-btn-icon w-9 h-9 shrink-0 rounded-[11px] grid place-items-center">
                  <i className="fa-solid fa-comments text-[#34d399] text-[12px]" />
                </span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block font-bold text-[11px] truncate">{btn.name || 'Grup Claim'}</span>
                  <span className="block text-[var(--t-muted)] text-[8px] truncate">Buka &amp; paste kode .claim</span>
                </span>
                <span className="w-7 h-7 shrink-0 rounded-full grid place-items-center bg-[#34d399]/12 border border-[#34d399]/20 transition-transform duration-[200ms] group-hover:translate-x-0.5">
                  <i className="fa-solid fa-arrow-right text-[#34d399] text-[9px]" />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons — uniform ghost chips, ikon warna aksen aja */}
      <div className={`grid grid-cols-3 gap-2 mb-3 transform-gpu transition-[transform,opacity] duration-[400ms] delay-[250ms] ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <button onClick={() => copy(codes[0].code)}
          className="action-chip group flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-[14px] text-[10px] font-semibold text-[var(--t-fg)] active:scale-[.95] transition-all duration-[180ms]"
          style={{ background: 'linear-gradient(160deg, rgba(255,255,255,.07), rgba(255,255,255,.02))', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 4px 14px -6px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08)' }}>
          <i className={`fa-solid ${copied ? 'fa-circle-check' : 'fa-copy'} text-[#34d399] text-[17px] drop-shadow-[0_2px_6px_rgba(52,211,153,.4)]`} />
          <span>{copied ? 'Tersalin' : 'Salin'}</span>
        </button>
        <button onClick={() => shareCode(codes[0].code)}
          className="action-chip group flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-[14px] text-[10px] font-semibold text-[var(--t-fg)] active:scale-[.95] transition-all duration-[180ms]"
          style={{ background: 'linear-gradient(160deg, rgba(255,255,255,.07), rgba(255,255,255,.02))', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 4px 14px -6px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08)' }}>
          <i className="fa-solid fa-share-nodes text-[#34d399] text-[17px] drop-shadow-[0_2px_6px_rgba(52,211,153,.4)]" /> <span>Bagikan</span>
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent('.claim ' + codes[0].code)}`} target="_blank" rel="noreferrer"
          className="action-chip group flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-[14px] text-[10px] font-semibold text-[var(--t-fg)] active:scale-[.95] transition-all duration-[180ms]"
          style={{ background: 'linear-gradient(160deg, rgba(37,211,102,.14), rgba(37,211,102,.04))', border: '1px solid rgba(37,211,102,.22)', boxShadow: '0 4px 14px -6px rgba(37,211,102,.4), inset 0 1px 0 rgba(255,255,255,.08)' }}>
          <i className="fa-brands fa-whatsapp text-[#25D366] text-[17px] drop-shadow-[0_2px_6px_rgba(37,211,102,.5)]" /> <span>WhatsApp</span>
        </a>
      </div>

      {/* Close button — sekunder ghost (aksi utama = klaim di grup di atas) */}
      <div className={`transform-gpu transition-[transform,opacity] duration-[400ms] delay-300 ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <button onClick={onClose}
          className="w-full py-3.5 rounded-[15px] text-[var(--t-muted)] font-bold text-[12px] hover:text-[var(--t-fg)] active:scale-[.97] transition-all duration-[180ms] flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(160deg, rgba(255,255,255,.06), rgba(255,255,255,.015))', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 4px 14px -6px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.07)' }}>
          Selesai <i className="fa-solid fa-check text-[10px]" />
        </button>
      </div>
    </ModalShell>,
    document.body
  )
}
