'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ModalShell } from './Modals'

const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    if (type === 'success') {
      osc.type = 'sine'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
      osc.start()
      osc.stop(ctx.currentTime + 0.35)
      setTimeout(() => {
        const o2 = ctx.createOscillator()
        const g2 = ctx.createGain()
        o2.connect(g2)
        g2.connect(ctx.destination)
        o2.type = 'sine'
        o2.frequency.value = 1320
        g2.gain.setValueAtTime(0.1, ctx.currentTime)
        g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
        o2.start()
        o2.stop(ctx.currentTime + 0.25)
      }, 140)
    } else if (type === 'copy') {
      osc.type = 'sine'
      osc.frequency.value = 1200
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)
      osc.start()
      osc.stop(ctx.currentTime + 0.12)
    }
  } catch {}
}

export default function SuccessModal({ result, settings, expireMinutes = 60, onClose }) {
  const [copied, setCopied] = useState('')
  const [left, setLeft] = useState(expireMinutes * 60000)
  const [phase, setPhase] = useState(0)
  const [mounted, setMounted] = useState(false)
  const soundPlayed = useRef(false)

  useEffect(() => {
    setMounted(true)
    const t1 = setTimeout(() => setPhase(1), 100)
    const t2 = setTimeout(() => {
      setPhase(2)
      if (!soundPlayed.current) {
        playSound('success')
        soundPlayed.current = true
      }
    }, 350)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  useEffect(() => {
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  const codes = result.codes?.length ? result.codes : [{ code: result.code, name: '' }]

  const copy = async (code) => {
    const textToCopy = '.claim ' + code
    try {
      await navigator.clipboard.writeText(textToCopy)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = textToCopy
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    playSound('copy')
    setCopied(code)
    setTimeout(() => setCopied(''), 2500)
  }

  const shareCode = async (code) => {
    const text = `.claim ${code}`
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {}
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const totalSec = Math.floor(left / 1000)
  const showHours = totalSec >= 3600
  const mins = showHours
    ? String(Math.floor(totalSec / 3600)) + ' jam ' + String(Math.floor((totalSec % 3600) / 60)) + 'm'
    : String(Math.floor(totalSec / 60)).padStart(2, '0') + ':' + String(totalSec % 60).padStart(2, '0')
  const pct = Math.max(0, (left / (expireMinutes * 60000)) * 100)
  const urgent = left < 5 * 60000

  // Sinkronisasi tombol grup klaim dan popup button dari admin
  const popupBtns = (settings?.showPopupBtns !== false && settings?.popupButtons?.filter((b) => b.visible !== false && b.link)) || []
  const claimGrps = (settings?.showClaimBtn !== false && settings?.claimGroups?.filter((g) => g.visible !== false && g.link)) || []
  const linkBtns = popupBtns.length ? popupBtns : claimGrps

  if (!mounted) return null

  return createPortal(
    <ModalShell onClose={onClose} accent="green">
      {/* Confetti rain */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[24px]">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="confetti-particle"
            style={{
              '--x': `${8 + Math.random() * 84}%`,
              '--delay': `${i * 0.12}s`,
              '--color': ['#34d399', '#38bdf8', '#60a5fa', '#fbbf24', '#f43f5e', '#a78bfa'][i % 6],
              '--drift': `${-35 + Math.random() * 70}px`,
            }}
          />
        ))}
      </div>

      {/* Header Status & Icon */}
      <div className="relative text-center mb-5">
        <div
          className={`relative inline-block mb-3.5 transform-gpu transition-all duration-500 ${
            phase >= 1 ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 -rotate-45'
          }`}
        >
          {/* Ambient Glow */}
          <div className="absolute -inset-4 rounded-full bg-emerald-500/25 blur-xl pointer-events-none" />

          {/* 3D Emerald Checkmark Badge */}
          <div
            className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full grid place-items-center shadow-[0_14px_36px_-6px_rgba(16,185,129,0.6)] border border-emerald-300/40 floaty"
            style={{
              background: 'radial-gradient(circle at 35% 28%, #7ff0b0 0%, #21c46b 36%, #0e9c54 70%, #0a7a42 100%)',
            }}
          >
            <i className="fa-solid fa-check text-white text-[28px] sm:text-[34px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" />
          </div>
        </div>

        <div
          className={`transform-gpu transition-all duration-400 ${
            phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <h2 className="font-[family-name:var(--font-display)] font-extrabold text-[22px] sm:text-[24px] tracking-tight text-white">
            Upload Berhasil!
          </h2>
          <p className="text-slate-400 text-[12px] mt-1 font-medium">
            {result.bundle ? `${result.count} foto dalam 1 paket klaim` : 'File telah siap diklaim di grup WhatsApp'}
          </p>
        </div>
      </div>

      {/* Code Display Cards */}
      <div
        className={`space-y-2.5 mb-4 transform-gpu transition-all duration-400 delay-75 ${
          phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {codes.map(({ code, name }) => (
          <div
            key={code}
            onClick={() => copy(code)}
            className={`group relative rounded-[20px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] border p-4 text-center cursor-pointer transition-all duration-200 active:scale-[0.98] overflow-hidden ${
              copied === code
                ? 'border-emerald-400/80 bg-emerald-500/[0.08] shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)]'
                : 'border-white/[0.1] hover:border-emerald-400/40 hover:bg-white/[0.04]'
            }`}
          >
            {/* Speed lines & shine sweep */}
            <div className="code-shine" />

            {name && <p className="text-[10px] text-slate-400 truncate mb-1 font-medium">{name}</p>}
            <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-slate-400 mb-1.5">
              Kode Klaim Bot
            </p>
            <div className="py-1">
              <span className="font-mono font-extrabold text-[26px] sm:text-[30px] tracking-wider text-emerald-400 select-all code-text">
                .claim {code}
              </span>
            </div>

            {/* Quick Feedback Pill */}
            <div className="mt-2.5">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-colors ${
                  copied === code
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-white/[0.04] text-slate-300 border border-white/[0.08] group-hover:text-emerald-300 group-hover:border-emerald-400/30'
                }`}
              >
                <i className={`fa-solid ${copied === code ? 'fa-circle-check text-emerald-400' : 'fa-copy'}`} />
                {copied === code ? 'Kode Berhasil Disalin!' : 'Ketuk untuk salin kode'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Countdown Timer */}
      <div
        className={`rounded-[15px] bg-white/[0.02] border border-white/[0.06] p-3 mb-4 transform-gpu transition-all duration-400 delay-100 ${
          phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <div className="flex items-center justify-between text-[11px] mb-2">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <i className="fa-regular fa-clock text-[10px] text-slate-400" /> Masa Aktif Berkas
          </span>
          <span
            className={`font-mono font-bold tabular-nums ${
              urgent ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
            }`}
          >
            {mins}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              urgent ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Tombol Grup Klaim WhatsApp Sesuai Admin Settings */}
      {linkBtns.length > 0 && (
        <div
          className={`mb-4 transform-gpu transition-all duration-400 delay-150 ${
            phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <p className="text-[9px] font-extrabold tracking-[0.16em] uppercase text-slate-400 mb-2 flex items-center gap-2">
            <span className="flex-1 h-px bg-white/[0.06]" />
            <i className="fa-brands fa-whatsapp text-emerald-400 text-[11px]" /> Buka Grup WhatsApp
            <span className="flex-1 h-px bg-white/[0.06]" />
          </p>
          <div className={linkBtns.length > 1 ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
            {linkBtns.map((btn, idx) => (
              <a
                key={btn.name + btn.link + idx}
                href={btn.link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2.5 px-3.5 py-3 rounded-[15px] bg-gradient-to-r from-emerald-500/[0.12] via-emerald-500/[0.06] to-transparent border border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-500/[0.16] shadow-[0_4px_16px_-4px_rgba(16,185,129,0.25)] transition-all duration-200 active:scale-[0.98] text-left group"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#25D366] to-[#128C4A] grid place-items-center shrink-0 shadow-sm">
                    <i className="fa-brands fa-whatsapp text-white text-[14px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-extrabold text-white truncate">{btn.name || 'Grup Klaim'}</p>
                    <p className="text-[9px] text-emerald-400/80 truncate font-medium">Buka grup &amp; paste kode</p>
                  </div>
                </div>
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons Grid */}
      <div
        className={`grid grid-cols-3 gap-2 mb-3 transform-gpu transition-all duration-400 delay-200 ${
          phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <button
          onClick={() => copy(codes[0].code)}
          className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-[15px] bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-emerald-500/30 text-white transition-all active:scale-95"
        >
          <i className={`fa-solid ${copied ? 'fa-circle-check text-emerald-400' : 'fa-copy text-emerald-400'} text-[17px]`} />
          <span className="text-[10px] font-bold">{copied ? 'Tersalin' : 'Salin Kode'}</span>
        </button>

        <button
          onClick={() => shareCode(codes[0].code)}
          className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-[15px] bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-sky-500/30 text-white transition-all active:scale-95"
        >
          <i className="fa-solid fa-share-nodes text-sky-400 text-[17px]" />
          <span className="text-[10px] font-bold">Bagikan</span>
        </button>

        <a
          href={`https://wa.me/?text=${encodeURIComponent('.claim ' + codes[0].code)}`}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-[15px] bg-gradient-to-br from-[#25D366] to-[#128C4A] text-white shadow-[0_8px_22px_-6px_rgba(37,211,102,0.5)] transition-all hover:brightness-110 active:scale-95"
        >
          <i className="fa-brands fa-whatsapp text-white text-[17px]" />
          <span className="text-[10px] font-extrabold">WhatsApp</span>
        </a>
      </div>

      {/* Done / Close Button */}
      <div
        className={`transform-gpu transition-all duration-400 delay-[250ms] ${
          phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-[15px] bg-white/[0.04] border border-white/[0.08] text-white text-[12px] font-extrabold hover:bg-white/[0.08] transition-colors active:scale-95 flex items-center justify-center gap-2"
        >
          Selesai <i className="fa-solid fa-check text-[10px] text-emerald-400" />
        </button>
      </div>
    </ModalShell>,
    document.body
  )
}
