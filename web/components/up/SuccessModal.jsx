'use client'
import { useState, useEffect } from 'react'
import { ModalShell } from './Modals'

export default function SuccessModal({ result, expireMinutes, onClose }) {
  const [copied, setCopied] = useState('')
  const [left, setLeft] = useState(expireMinutes * 60000)
  useEffect(() => {
    const t = setInterval(() => setLeft(l => Math.max(0, l - 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  const codes = result.codes?.length ? result.codes : [{ code: result.code, name: '' }]
  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText('.claim ' + code)
    } catch {
      // ponytail: clipboard API blocked on plain http; fallback execCommand
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
  // no backdrop close — user must see the code
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade">
      <div className="absolute inset-0 bg-[#04070f]/85 backdrop-blur-sm" />
      <div className="glass anim-pop rounded-[20px] p-6 relative z-10 w-full max-w-[400px] max-h-[92vh] overflow-y-auto">
        <div className="text-center mb-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-ok/10 border border-ok/30 grid place-items-center shadow-[0_0_44px_rgba(52,211,153,.35)]">
            <i className="fa-solid fa-check text-ok text-2xl" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-xl mt-3 grad-text">Upload Berhasil!</h2>
          <p className="text-[#7e90ad] text-xs mt-1">
            {result.bundle ? `${result.count} foto dalam 1 bundle` : 'File siap diklaim'} — kode berlaku {expireMinutes} menit
          </p>
        </div>

        {codes.map(({ code, name }) => (
          <div key={code} className="rounded-[16px] bg-[#04101f]/80 border border-[#3b82f6]/25 p-4 mb-3 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#3b82f6]/50 to-transparent" />
            {name && <p className="text-[#7e90ad] text-[10px] truncate mb-1.5">{name}</p>}
            <p className="font-mono font-bold text-2xl tracking-wider text-[#22d3ee] drop-shadow-[0_0_12px_rgba(34,211,238,.45)] select-all">.claim {code}</p>
          </div>
        ))}

        <div className="flex items-center justify-center gap-2 mb-5 text-[#7e90ad] font-mono text-[11px]">
          <i className="fa-solid fa-hourglass-half" />
          <span>kedaluwarsa dalam</span>
          <span className={`px-2 py-0.5 rounded-[8px] border font-bold ${left < 5 * 60000 ? 'border-bad/40 text-bad' : 'border-[#3b82f6]/30 text-[#22d3ee]'}`}>
            {String(Math.floor(left / 60000)).padStart(2, '0')}:{String(Math.floor(left / 1000) % 60).padStart(2, '0')}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => copy(codes[0].code)}
            className="py-2.5 rounded-[12px] bg-white/5 border border-white/[.07] text-[11px] font-bold text-[#e8f1ff] hover:bg-white/10 active:scale-[.97] transition-all duration-[150ms] flex flex-col items-center gap-1"
          >
            <i className={`fa-solid ${copied ? 'fa-check text-ok' : 'fa-copy'} text-base`} />
            {copied ? 'Tersalin!' : 'Salin'}
          </button>
          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            className="py-2.5 rounded-[12px] bg-[#25D366]/10 border border-[#25D366]/30 text-[11px] font-bold text-[#7ce8a8] hover:bg-[#25D366]/20 active:scale-[.97] transition-all duration-[150ms] flex flex-col items-center gap-1"
          >
            <i className="fa-brands fa-whatsapp text-base" />
            Bagikan
          </a>
          <button
            onClick={() => copy(codes[0].code)}
            className="py-2.5 rounded-[12px] bg-white/5 border border-white/[.07] text-[11px] font-bold text-[#e8f1ff] hover:bg-white/10 active:scale-[.97] transition-all duration-[150ms] flex flex-col items-center gap-1"
          >
            <i className="fa-solid fa-link text-base" />
            Link
          </button>
        </div>

        <button onClick={onClose} className="btn-primary w-full mt-3 py-3 rounded-[12px] font-bold text-sm">
          Selesai <i className="fa-solid fa-arrow-right ml-1" />
        </button>
      </div>
    </div>
  )
}
