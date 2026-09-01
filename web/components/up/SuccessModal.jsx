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
  const [mounted, setMounted] = useState(false)
  const soundPlayed = useRef(false)

  useEffect(() => {
    setMounted(true)
    if (!soundPlayed.current) {
      playSound('success')
      soundPlayed.current = true
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

  const popupBtns = (settings?.showPopupBtns !== false && settings?.popupButtons?.filter((b) => b.link)) || []
  const claimGrps = (settings?.showClaimBtn !== false && settings?.claimGroups?.filter((g) => g.link)) || []
  const linkBtns = popupBtns.length ? popupBtns : claimGrps

  if (!mounted) return null

  return createPortal(
    <ModalShell onClose={onClose} accent="green">
      {/* Header Status & Icon */}
      <div className="relative text-center mb-5">
        {/* Emerald Glow Circle with Specular Rim */}
        <div className="relative inline-block mb-3.5">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl pointer-events-none" />
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 grid place-items-center shadow-[0_12px_32px_-6px_rgba(16,185,129,0.5)] border border-emerald-300/40">
            <i className="fa-solid fa-check text-white text-[28px] sm:text-[34px] drop-shadow-md" />
          </div>
        </div>

        <h2 className="font-[family-name:var(--font-display)] font-extrabold text-[22px] sm:text-[24px] tracking-tight text-white">
          Upload Berhasil!
        </h2>
        <p className="text-slate-400 text-[12px] mt-1 font-medium">
          {result.bundle ? `${result.count} foto dalam 1 paket klaim` : 'File telah siap diklaim di grup WhatsApp'}
        </p>
      </div>

      {/* Code Display Cards */}
      <div className="space-y-2.5 mb-4">
        {codes.map(({ code, name }) => (
          <div
            key={code}
            onClick={() => copy(code)}
            className={`group relative rounded-[18px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] border p-4 text-center cursor-pointer transition-all duration-200 active:scale-[0.98] ${
              copied === code
                ? 'border-emerald-400/80 bg-emerald-500/[0.08] shadow-[0_0_24px_-4px_rgba(16,185,129,0.4)]'
                : 'border-white/[0.1] hover:border-emerald-400/40 hover:bg-white/[0.04]'
            }`}
          >
            {name && (
              <p className="text-[10px] text-slate-400 truncate mb-1 font-medium">{name}</p>
            )}
            <p className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-slate-400 mb-1.5">
              Kode Klaim Bot
            </p>
            <div className="py-1">
              <span className="font-mono font-extrabold text-[26px] sm:text-[30px] tracking-wider text-emerald-400 select-all">
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
      <div className="rounded-[14px] bg-white/[0.02] border border-white/[0.06] p-3 mb-4">
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
        {/* Progress Bar */}
        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              urgent ? 'bg-gradient-to-r from-rose-500 to-amber-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Direct WhatsApp Group Links if Available */}
      {linkBtns.length > 0 && (
        <div className="mb-4">
          <p className="text-[9px] font-extrabold tracking-[0.16em] uppercase text-slate-400 mb-2 flex items-center gap-2">
            <span className="flex-1 h-px bg-white/[0.06]" />
            <i className="fa-solid fa-comments text-emerald-400 text-[10px]" /> Buka Grup WhatsApp
            <span className="flex-1 h-px bg-white/[0.06]" />
          </p>
          <div className={linkBtns.length > 1 ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
            {linkBtns.map((btn) => (
              <a
                key={btn.name + btn.link}
                href={btn.link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-[14px] bg-emerald-500/[0.08] border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/[0.12] transition-all text-left"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 grid place-items-center shrink-0">
                    <i className="fa-brands fa-whatsapp text-emerald-400 text-xs" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{btn.name || 'Grup Klaim'}</p>
                    <p className="text-[9px] text-slate-400 truncate">Paste kode .claim</p>
                  </div>
                </div>
                <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-emerald-400 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={() => copy(codes[0].code)}
          className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-[14px] bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-emerald-500/30 text-white transition-all active:scale-95"
        >
          <i className={`fa-solid ${copied ? 'fa-circle-check text-emerald-400' : 'fa-copy text-emerald-400'} text-[16px]`} />
          <span className="text-[10px] font-bold">{copied ? 'Tersalin' : 'Salin Kode'}</span>
        </button>

        <button
          onClick={() => shareCode(codes[0].code)}
          className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-[14px] bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-sky-500/30 text-white transition-all active:scale-95"
        >
          <i className="fa-solid fa-share-nodes text-sky-400 text-[16px]" />
          <span className="text-[10px] font-bold">Bagikan</span>
        </button>

        <a
          href={`https://wa.me/?text=${encodeURIComponent('.claim ' + codes[0].code)}`}
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-[14px] bg-gradient-to-br from-[#25D366] to-[#128C4A] text-white shadow-[0_6px_20px_-4px_rgba(37,211,102,0.4)] transition-all hover:brightness-110 active:scale-95"
        >
          <i className="fa-brands fa-whatsapp text-white text-[16px]" />
          <span className="text-[10px] font-extrabold">WhatsApp</span>
        </a>
      </div>

      {/* Done / Close Button */}
      <button
        onClick={onClose}
        className="w-full py-3 rounded-[14px] bg-white/[0.05] border border-white/[0.1] text-white text-[12px] font-bold hover:bg-white/[0.08] transition-colors active:scale-95"
      >
        Tutup &amp; Selesai
      </button>
    </ModalShell>,
    document.body
  )
}
