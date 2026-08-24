'use client'
import { useState, useEffect } from 'react'
import { ModalShell } from './Modals'

export default function SuccessModal({ result, settings, expireMinutes, onClose }) {
  const [copied, setCopied] = useState('')
  const [left, setLeft] = useState(expireMinutes * 60000)
  const [checkDone, setCheckDone] = useState(false)
  useEffect(() => { setTimeout(() => setCheckDone(true), 500) }, [])
  useEffect(() => { const t = setInterval(() => setLeft(l => Math.max(0, l - 1000)), 1000); return () => clearInterval(t) }, [])
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
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div className="text-center mb-3">
        <div className="relative inline-block mb-2">
          <div className="absolute -inset-4 rounded-full bg-ok/10 blur-lg pointer-events-none" />
          <div className={`relative w-[48px] h-[48px] mx-auto rounded-full grid place-items-center transition-all duration-[500ms] ${checkDone ? 'scale-100 rotate-0' : 'scale-0 -rotate-45'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-ok/25 to-ok/5 border border-ok/35" />
            <i className="fa-solid fa-check text-ok text-[20px] relative drop-shadow-[0_0_12px_rgba(52,211,153,.7)]" />
          </div>
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] tracking-tight">
          <span className="grad-text">Upload Berhasil!</span>
        </h2>
        <p className="text-[#7e90ad] text-[10px] mt-0.5">
          {result.bundle ? `${result.count} foto — 1 bundle` : 'File siap diklaim'}
        </p>
      </div>

      {/* Code cards */}
      <div className="space-y-2 mb-3">
        {codes.map(({ code, name }) => (
          <div key={code} onClick={() => copy(code)} className="relative rounded-[14px] bg-[#04101f] border border-[#22d3ee]/20 p-3 text-center cursor-pointer group hover:border-[#22d3ee]/40 transition-all duration-[200ms] active:scale-[.98] overflow-hidden">
            <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-[#22d3ee]/30 to-transparent" />
            {name && <p className="text-[#7e90ad] text-[8px] truncate mb-1 relative">{name}</p>}
            <p className="font-mono font-bold text-[18px] tracking-[.04em] code-text select-all relative">.claim {code}</p>
            <p className={`text-[8px] font-bold mt-1 transition-colors duration-[150ms] ${copied === code ? 'text-ok' : 'text-[#7e90ad]/50 group-hover:text-[#22d3ee]/70'}`}>
              <i className={`fa-solid ${copied === code ? 'fa-check' : 'fa-copy'} mr-1`} />
              {copied === code ? 'Tersalin!' : 'Tap untuk salin kode'}
            </p>
          </div>
        ))}
      </div>

      {/* Timer */}
      <div className="mb-3">
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

      {/* Claim group buttons */}
      {linkBtns.length > 0 && (
        <div className="mb-3">
          <p className="text-[8px] font-extrabold tracking-[.15em] uppercase text-[#7e90ad]/50 mb-1.5 flex items-center gap-2">
            <span className="flex-1 h-px bg-white/[.06]" />Klaim file di grup<span className="flex-1 h-px bg-white/[.06]" />
          </p>
          <div className="space-y-1.5">
            {linkBtns.map(btn => (
              <a key={btn.name + btn.link} href={btn.link} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-[12px] bg-[#34d399]/[.05] border border-[#34d399]/18 group hover:bg-[#34d399]/[.10] transition-all duration-[200ms] active:scale-[.98]">
                <span className="w-7 h-7 shrink-0 rounded-[9px] bg-[#34d399]/12 border border-[#34d399]/18 grid place-items-center">
                  <i className="fa-solid fa-comments text-[#34d399] text-[10px]" />
                </span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block font-bold text-[11px] truncate">{btn.name || 'Grup Claim'}</span>
                  <span className="block text-[#7e90ad] text-[7px]">Buka &amp; paste kode</span>
                </span>
                <i className="fa-solid fa-arrow-up-right-from-square text-[8px] text-[#34d399]/40" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={() => copy(codes[0].code)}
          className="py-2.5 rounded-[12px] bg-white/[.03] border border-white/[.07] text-[10px] font-bold text-[#e8f1ff] hover:bg-white/[.07] active:scale-[.96] transition-all duration-[150ms] flex items-center justify-center gap-1.5">
          <i className={`fa-solid ${copied ? 'fa-check text-ok' : 'fa-copy text-[#22d3ee]'} text-[9px]`} />
          {copied ? 'Tersalin!' : 'Salin Kode'}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent('.claim ' + codes[0].code)}`} target="_blank" rel="noreferrer"
          className="py-2.5 rounded-[12px] bg-[#25D366]/[.05] border border-[#25D366]/20 text-[10px] font-bold text-[#7ce8a8] hover:bg-[#25D366]/[.12] active:scale-[.96] transition-all duration-[150ms] flex items-center justify-center gap-1.5">
          <i className="fa-brands fa-whatsapp text-[9px]" /> Bagikan
        </a>
      </div>

      <button onClick={onClose} className="btn-primary w-full py-3 rounded-[14px] font-bold text-[13px] group">
        Selesai <i className="fa-solid fa-arrow-right ml-1.5 group-hover:translate-x-1 transition-transform duration-[150ms]" />
      </button>
    </ModalShell>
  )
}
