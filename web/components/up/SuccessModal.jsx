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
              <span className="burst-ring" style={{ '--bs': '92px', animationDelay: '80ms', borderColor: 'rgba(52,211,153,.6)' }} />
              <span className="burst-ring" style={{ '--bs': '124px', animationDelay: '260ms', borderColor: 'rgba(52,211,153,.4)' }} />
              <span className="burst-ring" style={{ '--bs': '158px', animationDelay: '440ms', borderColor: 'rgba(52,211,153,.24)' }} />
            </>
          )}
          {/* halo lembut, konsentris sama badge bulat */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[130px] h-[130px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(52,211,153,.28) 0%, rgba(52,211,153,.08) 45%, transparent 70%)' }} />

          <div className={`relative w-[76px] h-[76px] mx-auto rounded-full grid place-items-center transform-gpu transition-[transform,opacity] duration-[600ms] floaty ${phase >= 1 ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`} style={{ transitionTimingFunction: 'var(--ease-out)', background: 'radial-gradient(circle at 35% 28%, #7ff0b0 0%, #21c46b 36%, #0e9c54 70%, #0a7a42 100%)', boxShadow: '0 14px 42px -8px rgba(16,185,129,.6), inset 0 -14px 24px rgba(0,60,25,.6), inset 0 10px 18px rgba(200,255,220,.4), inset 0 0 0 1.5px rgba(255,255,255,.14)' }}>
            {/* crisp rim ring */}
            <span className="absolute -inset-[5px] rounded-full pointer-events-none" style={{ border: '1.5px solid rgba(110,231,183,.45)' }} />
            {/* specular hotspot */}
            <span className="absolute top-[13px] left-[18px] w-[22px] h-[16px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,.95), transparent 70%)', filter: 'blur(1px)' }} />
            {/* bounce light bawah-kanan */}
            <span className="absolute bottom-[14px] right-[16px] w-[18px] h-[12px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(120,255,180,.5), transparent 70%)', filter: 'blur(3px)' }} />
            <i className="fa-solid fa-check text-white text-[34px] relative" style={{ WebkitTextStroke: '1px rgba(255,255,255,.4)', filter: 'drop-shadow(0 2px 3px rgba(0,50,20,.5))' }} />
          </div>

          {/* Sparkle particles — tx/ty precomputed (rad) biar kompatibel semua browser */}
          {phase >= 1 && [...Array(10)].map((_, i) => {
            const rad = (i * 36 * Math.PI) / 180
            const dist = 46 + (i % 3) * 10
            const size = i % 2 ? 5 : 3
            return (
              <div key={i} className="absolute rounded-full check-sparkle" style={{
                top: '50%', left: '50%', width: size, height: size,
                '--tx': `${Math.cos(rad) * dist}px`,
                '--ty': `${Math.sin(rad) * dist}px`,
                '--color': ['#34d399', '#6ee7b7', '#a7f3d0', '#10b981'][i % 4],
                animationDelay: `${300 + i * 55}ms`,
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
          className="action-chip group flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-[14px] text-[10px] font-semibold text-[var(--t-fg)] active:scale-[.95] active:translate-y-px transition-all duration-[180ms]"
          style={{ background: 'linear-gradient(180deg, #37485f, #212f42 50%, #0b1220)', border: '1px solid rgba(255,255,255,.18)', boxShadow: 'inset 0 2.5px 0 rgba(255,255,255,.35), inset 0 -6px 12px rgba(0,0,0,.6), 0 12px 26px -6px rgba(0,0,0,.85)' }}>
          <i className={`fa-solid ${copied ? 'fa-circle-check' : 'fa-copy'} text-[#34d399] text-[17px] drop-shadow-[0_2px_6px_rgba(52,211,153,.5)]`} />
          <span>{copied ? 'Tersalin' : 'Salin'}</span>
        </button>
        <button onClick={() => shareCode(codes[0].code)}
          className="action-chip group flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-[14px] text-[10px] font-semibold text-[var(--t-fg)] active:scale-[.95] active:translate-y-px transition-all duration-[180ms]"
          style={{ background: 'linear-gradient(180deg, #37485f, #212f42 50%, #0b1220)', border: '1px solid rgba(255,255,255,.18)', boxShadow: 'inset 0 2.5px 0 rgba(255,255,255,.35), inset 0 -6px 12px rgba(0,0,0,.6), 0 12px 26px -6px rgba(0,0,0,.85)' }}>
          <i className="fa-solid fa-share-nodes text-[#34d399] text-[17px] drop-shadow-[0_2px_6px_rgba(52,211,153,.5)]" /> <span>Bagikan</span>
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent('.claim ' + codes[0].code)}`} target="_blank" rel="noreferrer"
          className="action-chip group flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-[14px] text-[10px] font-semibold text-white active:scale-[.95] active:translate-y-px transition-all duration-[180ms]"
          style={{ background: 'linear-gradient(180deg, #3bec83, #1faf5c 50%, #0c7139)', border: '1px solid rgba(255,255,255,.4)', boxShadow: 'inset 0 2.5px 0 rgba(255,255,255,.5), inset 0 -6px 12px rgba(0,0,0,.4), 0 12px 28px -6px rgba(37,211,102,.7)' }}>
          <i className="fa-brands fa-whatsapp text-white text-[17px] drop-shadow-[0_2px_6px_rgba(0,0,0,.4)]" /> <span>WhatsApp</span>
        </a>
      </div>

      {/* Close button — sekunder, tetap punya depth (bukan flat) */}
      <div className={`transform-gpu transition-[transform,opacity] duration-[400ms] delay-300 ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <button onClick={onClose}
          className="action-chip w-full py-3.5 rounded-[15px] text-[var(--t-fg)] font-bold text-[12px] active:scale-[.97] active:translate-y-px transition-all duration-[180ms] flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(180deg, #303f52, #1d2938 50%, #0a1018)', border: '1px solid rgba(255,255,255,.18)', boxShadow: 'inset 0 2.5px 0 rgba(255,255,255,.32), inset 0 -6px 12px rgba(0,0,0,.6), 0 12px 26px -6px rgba(0,0,0,.85)' }}>
          Selesai <i className="fa-solid fa-check text-[10px] text-[#34d399]" />
        </button>
      </div>
    </ModalShell>,
    document.body
  )
}
