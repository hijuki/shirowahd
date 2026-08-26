'use client'
import { useState, useEffect } from 'react'
import { fmtSize } from '@/lib/up-api'

export default function SuccessModal({ result, settings, expireMinutes = 60, onClose }) {
  const [copied, setCopied] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [timeLeft, setTimeLeft] = useState(expireMinutes * 60)

  const CONFETTI = [...Array(18)].map((_, i) => ({
    left: `${6 + ((i * 37) % 88)}%`,
    delay: `${(i % 9) * 0.12}s`,
    color: ['var(--t-accent)', 'var(--t-pop)', 'var(--t-accent-2)', 'var(--t-ok)'][i % 4],
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
  const progressPct = Math.max(2, (timeLeft / (expireMinutes * 60)) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-blur">
      {/* Confetti burst */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {CONFETTI.map((c, i) => (
          <span key={i} className="confetti-piece" style={{ left: c.left, background: c.color, animationDelay: c.delay }} />
        ))}
      </div>

      <div className="w-full max-w-[420px] modal-sheet p-6 space-y-5 text-center relative">
        {/* Hanko stamp */}
        <div className="pt-1">
          <div className="hanko-seal mx-auto anim-stamp">
            <span className="text-[26px] leading-none">済</span>
            <span className="font-mono text-[7px] tracking-[0.2em] font-extrabold uppercase mt-1">VERIFIED</span>
          </div>
        </div>

        <div>
          <h3 className="font-display text-[20px] leading-tight text-[var(--t-ink)]">
            BERHASIL DIPROSES!
          </h3>
          <p className="text-[12px] text-[var(--t-muted)] mt-1.5 font-mono font-bold">
            {result.count || 1} file siap diklaim ke grup WA
          </p>
        </div>

        {/* Voucher ticket */}
        <div className="voucher-box p-4 space-y-3 text-left">
          <div className="flex items-center justify-between">
            <span className="field-label flex items-center gap-1.5">
              <i className="fa-solid fa-ticket" style={{ color: 'var(--t-pop)' }} />
              {isMulti ? 'KODE KLAIM BUNDLE' : 'KODE KLAIM UTAMA'}
            </span>
            <span className="text-[8px] font-mono font-bold text-white px-2 py-0.5"
              style={{ background: 'var(--t-ok)', border: '2px solid var(--t-hard)', borderRadius: 99 }}>
              SIAP KLAIM
            </span>
          </div>

          {/* Primary code */}
          <div className="flex items-center gap-2 p-3" style={{ background: 'var(--t-surface)', border: '2px solid var(--t-hard)', borderRadius: 12 }}>
            <div className="flex-1 font-mono text-[18px] font-black tracking-wider text-[var(--t-ink)] truncate tnum">
              {result.code}
            </div>
            <button onClick={() => copyText(result.code)}
              className="btn-accent px-3.5 py-2 text-[11px] shrink-0 active:translate-x-1 active:translate-y-1 active:shadow-none">
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'} mr-1`} />
              {copied ? 'TERSALIN' : 'SALIN'}
            </button>
          </div>

          {isMulti && (
            <div className="space-y-1.5 pt-2 perforated-line">
              <div className="text-[10px] font-mono font-bold text-[var(--t-muted)] pt-1">KODE PER FILE:</div>
              <div className="max-h-28 overflow-y-auto modal-scroll-hide space-y-1 pr-1">
                {result.codes.map((c, i) => (
                  <div key={c} className="flex items-center justify-between px-2.5 py-1.5 text-[11px] font-mono"
                    style={{ background: 'var(--t-surface)', border: '2px solid var(--t-hard)', borderRadius: 10, boxShadow: '1.5px 1.5px 0 var(--t-hard)' }}>
                    <span className="truncate font-semibold text-[var(--t-ink)]">{c}</span>
                    <button onClick={() => copyText(c, i)}
                      className="font-bold text-[10px] ml-2 shrink-0 hover:text-white hover:bg-[var(--t-accent-2)] px-1.5 rounded transition-colors"
                      style={{ color: 'var(--t-accent-2)' }}>
                      {copiedIdx === i ? '✓ OK' : 'SALIN'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiration */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-[var(--t-muted)] tnum font-bold">
              <span>KADALUARSA:</span>
              <span style={{ color: 'var(--t-pop)' }}>{minutes}m {seconds < 10 ? `0${seconds}` : seconds}s</span>
            </div>
            <div className="expire-bar">
              <div style={{ width: `${progressPct}%`, background: 'var(--t-accent)' }} />
            </div>
          </div>
        </div>

        {/* WA instruction */}
        <div className="p-3 text-[11px] text-[var(--t-muted)] flex items-start gap-2.5 text-left"
          style={{ background: 'var(--t-surface2)', border: '2px dashed var(--t-hard)', borderRadius: 12 }}>
          <span className="shrink-0 w-7 h-7 grid place-items-center mt-0.5" style={{ background: 'var(--t-wa)', border: '2px solid var(--t-hard)', borderRadius: 8, color: '#fff' }}>
            <i className="fa-brands fa-whatsapp text-[14px]" />
          </span>
          <p className="leading-snug font-medium">
            Ketik kode <span className="font-mono font-extrabold text-[var(--t-ink)]">{result.code}</span> di grup WhatsApp tujuan untuk kirim otomatis.
          </p>
        </div>

        <button onClick={onClose} className="btn-outline w-full py-3 text-[12px] font-mono">
          TUTUP & BUAT TIKET BARU
        </button>
      </div>
    </div>
  )
}
