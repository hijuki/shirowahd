'use client'
import { useState, useEffect } from 'react'

export default function SuccessModal({ result, expireMinutes, onClose }) {
  const [copied, setCopied] = useState('')
  const [left, setLeft] = useState(expireMinutes * 60000)
  const [vis, setVis] = useState(false)
  const [checkDone, setCheckDone] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVis(true)); setTimeout(() => setCheckDone(true), 600) }, [])
  useEffect(() => {
    const t = setInterval(() => setLeft(l => Math.max(0, l - 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  const close = () => { setVis(false); setTimeout(onClose, 280) }
  const codes = result.codes?.length ? result.codes : [{ code: result.code, name: '' }]
  const copy = async (code) => {
    try { await navigator.clipboard.writeText('.claim ' + code) } catch {
      const ta = document.createElement('textarea'); ta.value = '.claim ' + code
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
    }
    setCopied(code); setTimeout(() => setCopied(''), 1800)
  }
  const waText = encodeURIComponent(`Halo! Saya baru upload file.\n\nKode klaim: .claim ${codes[0].code}\n\nSilakan gunakan kode ini untuk mengklaim file.`)
  const mins = String(Math.floor(left / 60000)).padStart(2, '0')
  const secs = String(Math.floor(left / 1000) % 60).padStart(2, '0')
  const pct = Math.max(0, (left / (expireMinutes * 60000)) * 100)
  const urgent = left < 5 * 60000

  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-opacity duration-[280ms] ${vis ? 'opacity-100' : 'opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      <div className="absolute inset-0 bg-[#020510]/92 backdrop-blur-md" />

      {/* Confetti particles */}
      {vis && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="confetti-particle" style={{
              '--x': `${10 + Math.random() * 80}%`,
              '--delay': `${i * 0.15}s`,
              '--color': ['#22d3ee', '#3b82f6', '#34d399', '#fbbf24', '#fb7185'][i % 5],
              '--drift': `${-40 + Math.random() * 80}px`,
            }} />
          ))}
        </div>
      )}

      <div className={`relative z-20 w-full max-w-[420px] max-h-[92dvh] overflow-y-auto transition-all duration-[450ms] ${vis ? 'scale-100 translate-y-0 opacity-100' : 'scale-[.88] translate-y-10 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <div className="absolute -inset-10 rounded-[44px] bg-gradient-to-b from-ok/[.10] via-[#22d3ee]/[.06] to-transparent blur-3xl pointer-events-none" />
        <div className="relative rounded-[24px] border border-white/[.08] bg-[#080e1c]/88 backdrop-blur-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,.85)] overflow-hidden">
          {/* Top shimmer */}
          <div className="absolute top-0 inset-x-0 h-px"><div className="h-full bg-gradient-to-r from-transparent via-ok/70 to-transparent modal-shimmer" /></div>
          {/* Side accents */}
          <div className="absolute top-6 bottom-6 left-0 w-px bg-gradient-to-b from-transparent via-ok/20 to-transparent" />
          <div className="absolute top-6 bottom-6 right-0 w-px bg-gradient-to-b from-transparent via-[#22d3ee]/20 to-transparent" />

          {/* Header */}
          <div className="text-center pt-8 pb-4 px-6">
            <div className="relative inline-block mb-5">
              {/* Burst rings */}
              <div className="absolute -inset-6 rounded-full success-ring-1" />
              <div className="absolute -inset-10 rounded-full success-ring-2" />
              {/* Halo glow */}
              <div className="absolute -inset-5 rounded-full bg-ok/12 blur-xl success-halo pointer-events-none" />
              {/* Check icon */}
              <div className={`relative w-[76px] h-[76px] mx-auto rounded-full grid place-items-center transition-all duration-[600ms] ${checkDone ? 'scale-100 rotate-0' : 'scale-0 -rotate-45'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-ok/30 to-ok/5 border border-ok/40" />
                <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-ok/20 to-transparent" />
                <i className="fa-solid fa-check text-ok text-[30px] relative drop-shadow-[0_0_16px_rgba(52,211,153,.8)]" />
              </div>
            </div>
            <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-tight">
              <span className="grad-text">Upload Berhasil!</span>
            </h2>
            <p className="text-[#7e90ad] text-[11px] mt-1.5 leading-relaxed">
              {result.bundle ? `${result.count} foto dalam 1 bundle` : 'File siap diklaim'} — berlaku {expireMinutes} menit
            </p>
          </div>

          {/* Code cards */}
          <div className="px-5 space-y-3">
            {codes.map(({ code, name }) => (
              <div key={code} className="relative rounded-[18px] overflow-hidden group">
                {/* Animated border */}
                <div className="absolute -inset-px rounded-[18px] border-glow-sweep z-0" />
                <div className="relative bg-[#04101f]/95 border border-[#22d3ee]/20 rounded-[18px] p-5 text-center z-10 overflow-hidden">
                  <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-[#22d3ee]/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#22d3ee]/[.03] to-transparent pointer-events-none" />
                  {name && <p className="text-[#7e90ad] text-[10px] truncate mb-2 relative">{name}</p>}
                  <p className="font-mono font-bold text-[28px] tracking-[.1em] code-text select-all relative mb-3">.claim {code}</p>
                  <button
                    onClick={() => copy(code)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-[11px] font-bold transition-all duration-[200ms] active:scale-95 ${copied === code ? 'bg-ok/15 border-ok/30 text-ok' : 'bg-white/[.05] border-white/[.08] text-[#e8f1ff]/80 hover:bg-[#22d3ee]/10 hover:border-[#22d3ee]/30 hover:text-[#22d3ee]'} border`}
                  >
                    <i className={`fa-solid ${copied === code ? 'fa-check' : 'fa-copy'}`} />
                    {copied === code ? 'Tersalin!' : 'Tap untuk salin'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Timer + progress bar */}
          <div className="px-5 mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#7e90ad] text-[10px] font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-hourglass-half text-[9px]" />
                Kedaluwarsa dalam
              </span>
              <span className={`font-mono font-bold text-[13px] tabular-nums transition-colors duration-[250ms] ${urgent ? 'text-bad' : 'text-[#22d3ee]'}`}>
                {mins}:{secs}
              </span>
            </div>
            <div className="expire-bar">
              <div style={{ width: pct + '%' }} className={urgent ? '!bg-gradient-to-r !from-bad !to-[#fbbf24]' : ''} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2 px-5 mt-5">
            <button onClick={() => copy(codes[0].code)}
              className="py-3.5 rounded-[14px] bg-white/[.03] border border-white/[.07] text-[11px] font-bold text-[#e8f1ff] hover:bg-white/[.08] hover:border-white/[.14] active:scale-[.96] transition-all duration-[150ms] flex flex-col items-center gap-1.5 group">
              <div className="w-9 h-9 rounded-[11px] bg-[#22d3ee]/10 border border-[#22d3ee]/20 grid place-items-center group-hover:bg-[#22d3ee]/18 transition-colors duration-[150ms]">
                <i className={`fa-solid ${copied ? 'fa-check text-ok' : 'fa-copy text-[#22d3ee]'} text-sm`} />
              </div>
              {copied ? 'Tersalin!' : 'Salin'}
            </button>
            <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer"
              className="py-3.5 rounded-[14px] bg-[#25D366]/[.06] border border-[#25D366]/25 text-[11px] font-bold text-[#7ce8a8] hover:bg-[#25D366]/[.14] hover:border-[#25D366]/45 active:scale-[.96] transition-all duration-[150ms] flex flex-col items-center gap-1.5 group">
              <div className="w-9 h-9 rounded-[11px] bg-[#25D366]/12 border border-[#25D366]/20 grid place-items-center group-hover:bg-[#25D366]/22 transition-colors duration-[150ms]">
                <i className="fa-brands fa-whatsapp text-[#25D366] text-sm" />
              </div>
              Bagikan
            </a>
            <button onClick={() => copy(codes[0].code)}
              className="py-3.5 rounded-[14px] bg-white/[.03] border border-white/[.07] text-[11px] font-bold text-[#e8f1ff] hover:bg-white/[.08] hover:border-white/[.14] active:scale-[.96] transition-all duration-[150ms] flex flex-col items-center gap-1.5 group">
              <div className="w-9 h-9 rounded-[11px] bg-[#3b82f6]/10 border border-[#3b82f6]/20 grid place-items-center group-hover:bg-[#3b82f6]/18 transition-colors duration-[150ms]">
                <i className="fa-solid fa-link text-[#3b82f6] text-sm" />
              </div>
              Link
            </button>
          </div>

          <div className="p-5 pt-4">
            <button onClick={close} className="btn-primary w-full py-4 rounded-[16px] font-bold text-[14px] group">
              Selesai <i className="fa-solid fa-arrow-right ml-1.5 group-hover:translate-x-1 transition-transform duration-[150ms]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
