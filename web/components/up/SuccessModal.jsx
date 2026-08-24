'use client'
import { useState, useEffect } from 'react'

export default function SuccessModal({ result, expireMinutes, onClose }) {
  const [copied, setCopied] = useState('')
  const [left, setLeft] = useState(expireMinutes * 60000)
  const [vis, setVis] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVis(true)) }, [])
  useEffect(() => {
    const t = setInterval(() => setLeft(l => Math.max(0, l - 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  const close = () => { setVis(false); setTimeout(onClose, 280) }
  const codes = result.codes?.length ? result.codes : [{ code: result.code, name: '' }]
  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText('.claim ' + code)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = '.claim ' + code
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(code)
    setTimeout(() => setCopied(''), 1600)
  }
  const waText = encodeURIComponent(
    `Halo! Saya baru saja upload file.\n\nKode klaim: .claim ${codes[0].code}\n\nSilakan gunakan kode ini untuk mengklaim file.`
  )
  const mins = String(Math.floor(left / 60000)).padStart(2, '0')
  const secs = String(Math.floor(left / 1000) % 60).padStart(2, '0')

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-opacity duration-[280ms] ${vis ? 'opacity-100' : 'opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      <div className="absolute inset-0 bg-[#020510]/92 backdrop-blur-md" />
      <div className={`relative z-10 w-full max-w-[420px] max-h-[92vh] overflow-y-auto transition-all duration-[400ms] ${vis ? 'scale-100 translate-y-0 opacity-100' : 'scale-[.9] translate-y-8 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        {/* Outer glow */}
        <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-b from-[#34d399]/[.10] via-[#22d3ee]/[.05] to-transparent blur-2xl pointer-events-none" />
        <div className="relative rounded-[24px] border border-white/[.08] bg-[#080e1c]/85 backdrop-blur-2xl shadow-[0_32px_80px_-16px_rgba(0,0,0,.85)] overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px">
            <div className="h-full bg-gradient-to-r from-transparent via-[#34d399]/70 to-transparent modal-shimmer" />
          </div>

          {/* Header */}
          <div className="text-center pt-7 pb-5 px-6">
            {/* Check burst */}
            <div className="relative inline-block mb-4">
              <div className="absolute -inset-5 rounded-full bg-ok/15 blur-xl pointer-events-none success-halo" />
              <div className="check-burst relative w-[72px] h-[72px] mx-auto rounded-full bg-gradient-to-br from-ok/25 to-ok/5 border border-ok/40 grid place-items-center shadow-[0_0_50px_-6px_rgba(52,211,153,.55)]">
                <i className="fa-solid fa-check text-ok text-[28px] drop-shadow-[0_0_12px_rgba(52,211,153,.7)]" />
              </div>
            </div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[21px] tracking-tight">
              <span className="grad-text">Upload Berhasil!</span>
            </h2>
            <p className="text-[#7e90ad] text-[11px] mt-1.5">
              {result.bundle ? `${result.count} foto dalam 1 bundle` : 'File siap diklaim'} — kode berlaku {expireMinutes} menit
            </p>
          </div>

          {/* Codes */}
          <div className="px-5 space-y-3 stagger">
            {codes.map(({ code, name }) => (
              <div key={code} className="relative rounded-[18px] bg-[#04101f]/90 border border-[#3b82f6]/25 p-5 text-center overflow-hidden group hover:border-[#22d3ee]/45 transition-colors duration-[250ms]">
                <div className="absolute top-0 left-1/5 right-1/5 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#22d3ee]/[.04] to-transparent pointer-events-none" />
                {name && <p className="text-[#7e90ad] text-[10px] truncate mb-2 relative">{name}</p>}
                <p className="font-mono font-bold text-[26px] tracking-[.08em] code-text select-all relative">.claim {code}</p>
                <button
                  onClick={() => copy(code)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-white/[.05] border border-white/[.08] text-[10px] font-bold text-[#e8f1ff]/80 hover:bg-white/10 hover:border-[#22d3ee]/30 active:scale-95 transition-all duration-[150ms]"
                >
                  <i className={`fa-solid ${copied === code ? 'fa-check text-ok' : 'fa-copy'}`} />
                  {copied === code ? 'Tersalin!' : 'Tap untuk salin'}
                </button>
              </div>
            ))}
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-2 mt-5 mb-5 text-[#7e90ad] font-mono text-[11px] px-5">
            <i className="fa-solid fa-hourglass-half text-[#22d3ee]/70" />
            <span>kedaluwarsa dalam</span>
            <span className={`px-2.5 py-1 rounded-[8px] border font-bold tabular-nums transition-colors duration-[250ms] ${left < 5 * 60000 ? 'border-bad/40 text-bad bg-bad/[.06]' : 'border-[#3b82f6]/30 text-[#22d3ee] bg-[#22d3ee]/[.05]'}`}>
              {mins}:{secs}
            </span>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2 px-5 stagger">
            <button
              onClick={() => copy(codes[0].code)}
              className="py-3 rounded-[14px] bg-white/[.04] border border-white/[.08] text-[11px] font-bold text-[#e8f1ff] hover:bg-white/[.09] hover:border-white/[.15] active:scale-[.96] transition-all duration-[150ms] flex flex-col items-center gap-1.5"
            >
              <i className={`fa-solid ${copied ? 'fa-check text-ok' : 'fa-copy'} text-base`} />
              {copied ? 'Tersalin!' : 'Salin'}
            </button>
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              className="py-3 rounded-[14px] bg-[#25D366]/[.08] border border-[#25D366]/30 text-[11px] font-bold text-[#7ce8a8] hover:bg-[#25D366]/[.16] hover:border-[#25D366]/50 active:scale-[.96] transition-all duration-[150ms] flex flex-col items-center gap-1.5"
            >
              <i className="fa-brands fa-whatsapp text-base" />
              Bagikan
            </a>
            <button
              onClick={() => copy(codes[0].code)}
              className="py-3 rounded-[14px] bg-white/[.04] border border-white/[.08] text-[11px] font-bold text-[#e8f1ff] hover:bg-white/[.09] hover:border-white/[.15] active:scale-[.96] transition-all duration-[150ms] flex flex-col items-center gap-1.5"
            >
              <i className="fa-solid fa-link text-base" />
              Link
            </button>
          </div>

          <div className="p-5">
            <button onClick={close} className="btn-primary w-full py-3.5 rounded-[14px] font-bold text-sm group">
              Selesai <i className="fa-solid fa-arrow-right ml-1 group-hover:translate-x-1 transition-transform duration-[150ms]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
