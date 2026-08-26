'use client'
import { useState, useEffect } from 'react'
import { fmtSize } from '@/lib/up-api'

export default function SuccessModal({ result, settings, expireMinutes = 60, onClose }) {
  const [copied, setCopied] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [timeLeft, setTimeLeft] = useState(expireMinutes * 60)

  const CONFETTI = [
    ...Array(18)].map((_, i) => ({
      left: `${6 + ((i * 37) % 88)}%`,
      delay: `${(i % 9) * 0.12}s`,
      color: ['var(--t-accent)', 'var(--t-accent-2)', 'var(--t-ok)', 'var(--t-wa)'][i % 4],
      scale: 0.7 + ((i * 13) % 10) / 15,
    }))

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const copyText = async (text, idx = null) => {
    try {
      await navigator.clipboard.writeText(text)
      if (idx !== null) {
        setCopiedIdx(idx)
        setTimeout(() => setCopiedIdx(null), 1800)
      } else {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      }
    } catch {}
  }

  const isMulti = result.bundle && Array.isArray(result.codes) && result.codes.length > 1
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const progressPct = (timeLeft / (expireMinutes * 60)) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-blur">
      {/* Confetti burst */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {CONFETTI.map((c, i) => (
          <span key={i} className="confetti-piece" style={{ left: c.left, background: c.color, animationDelay: c.delay, transform: `scale(${c.scale})` }} />
        ))}
      </div>
      <div className="w-full max-w-[420px] modal-sheet p-6 space-y-5 text-center relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[var(--t-accent)]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[var(--t-accent-2)]/15 blur-3xl pointer-events-none" />

        {/* Hanko 3D Stamp */}
        <div className="pt-2">
          <div className="hanko-seal mx-auto anim-stamp">
            <span className="text-[26px] leading-none">済</span>
            <span className="font-mono text-[8px] tracking-[0.2em] font-extrabold uppercase mt-1">VERIFIED</span>
          </div>
        </div>

        <div>
          <h3 className="text-[20px] font-black tracking-tight text-[var(--t-ink)]">
            Media Berhasil Diproses!
          </h3>
          <p className="text-[12px] text-[var(--t-muted)] mt-1 font-mono">
            {result.count || 1} file siap diklaim ke grup WA
          </p>
        </div>

        {/* Voucher Ticket Box */}
        <div className="voucher-box p-4 space-y-3 text-left">
          <div className="flex items-center justify-between">
            <span className="field-label flex items-center gap-1.5">
              <i className="fa-solid fa-ticket text-[var(--t-accent)]" />
              {isMulti ? 'KODE KLAIM BUNDLE' : 'KODE KLAIM UTAMA'}
            </span>
            <span className="text-[9px] font-mono font-bold text-[var(--t-ok)] bg-[var(--t-ok)]/10 px-2 py-0.5 rounded-full">
              READY TO CLAIM
            </span>
          </div>

          {/* Primary code display */}
          <div className="flex items-center gap-2 bg-[var(--t-surface)] p-3 rounded-xl border border-[var(--t-line)]">
            <div className="flex-1 font-mono text-[18px] font-black tracking-wider text-[var(--t-ink)] truncate">
              {result.code}
            </div>
            <button
              onClick={() => copyText(result.code)}
              className="btn-accent px-3.5 py-2 text-[11px] font-mono tracking-wider shrink-0"
            >
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'} mr-1`} />
              {copied ? 'TERSALIN' : 'SALIN'}
            </button>
          </div>

          {/* Multi-file codes list if any */}
          {isMulti && (
            <div className="space-y-1.5 pt-2 border-t border-[var(--t-line)]">
              <div className="text-[10px] font-mono font-bold text-[var(--t-muted)]">KODE PER FILE:</div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {result.codes.map((c, i) => (
                  <div key={c} className="flex items-center justify-between bg-[var(--t-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--t-line)] text-[11px] font-mono">
                    <span className="truncate font-semibold text-[var(--t-ink)]">{c}</span>
                    <button
                      onClick={() => copyText(c, i)}
                      className="text-[var(--t-accent)] hover:underline font-bold text-[10px] ml-2 shrink-0"
                    >
                      {copiedIdx === i ? '✓ SALIN' : 'SALIN'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiration bar */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--t-muted)] tnum">
              <span>KADALUARSA DALAM:</span>
              <span className="font-bold text-[var(--t-accent)]">{minutes}m {seconds < 10 ? `0${seconds}` : seconds}s</span>
            </div>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fluid" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        {/* WA Claim Instruction */}
        <div className="bg-[var(--t-surface2)] p-3 rounded-xl border border-[var(--t-line)] text-[11px] text-[var(--t-muted)] flex items-start gap-2.5 text-left">
          <i className="fa-brands fa-whatsapp text-[16px] text-[var(--t-wa)] shrink-0 mt-0.5" />
          <p className="leading-snug">
            Ketik kode <span className="font-mono font-bold text-[var(--t-ink)]">{result.code}</span> di grup WhatsApp tujuan untuk mengirim otomatis.
          </p>
        </div>

        <button
          onClick={onClose}
          className="btn-outline w-full py-3 text-[12px] font-mono font-bold"
        >
          TUTUP & BUAT TIKET BARU
        </button>
      </div>
    </div>
  )
}
