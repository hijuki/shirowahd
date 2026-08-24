'use client'
import { useState, useEffect, useRef } from 'react'

export default function SuccessModal({ result, settings, expireMinutes, onClose }) {
  const [copied, setCopied] = useState('')
  const [left, setLeft] = useState(expireMinutes * 60000)
  const [vis, setVis] = useState(false)
  const [done, setDone] = useState(false)
  const bgRef = useRef(null)

  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setVis(true))); setTimeout(() => setDone(true), 400) }, [])
  useEffect(() => { const t = setInterval(() => setLeft(l => Math.max(0, l - 1000)), 1000); return () => clearInterval(t) }, [])

  const close = () => { setVis(false); setTimeout(onClose, 300) }
  const codes = result.codes?.length ? result.codes : [{ code: result.code, name: '' }]

  const copy = async (code) => {
    try { await navigator.clipboard.writeText('.claim ' + code) } catch {
      const t = document.createElement('textarea'); t.value = '.claim ' + code
      document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove()
    }
    setCopied(code); setTimeout(() => setCopied(''), 2000)
  }

  const mins = String(Math.floor(left / 60000)).padStart(2, '0')
  const secs = String(Math.floor(left / 1000) % 60).padStart(2, '0')
  const pct = Math.max(0, (left / (expireMinutes * 60000)) * 100)
  const urgent = left < 5 * 60000

  // claim buttons from settings
  const s = settings || {}
  const claimLinks = []
  if (s.showClaimBtn !== false && s.claimGroups?.length)
    s.claimGroups.forEach(g => g.link && claimLinks.push(g))
  if (s.showPopupBtns !== false && s.popupButtons?.length)
    s.popupButtons.forEach(b => b.link && claimLinks.push(b))

  return (
    <div ref={bgRef} onClick={e => { if (e.target === bgRef.current) close() }}
      className={`fixed inset-0 z-[90] flex items-end sm:items-center justify-center transition-all duration-300 ${vis ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'}`}
      style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      <div className={`relative w-full sm:max-w-[380px] max-h-[90dvh] transition-all duration-300 ${vis ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-[.97]'}`}
        style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <div className="rounded-t-2xl sm:rounded-2xl border border-white/[.06] bg-[#0a1020]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="overflow-y-auto max-h-[90dvh] overscroll-contain">
            {/* Header */}
            <div className="text-center pt-7 pb-2 px-6">
              <div className={`relative inline-block mb-3 transition-all duration-500 ${done ? 'scale-100' : 'scale-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
                <div className="w-16 h-16 rounded-full bg-[#34d399]/10 border-2 border-[#34d399]/30 grid place-items-center">
                  <i className="fa-solid fa-check text-[#34d399] text-2xl" />
                </div>
              </div>
              <h2 className="text-xl font-bold">Upload Berhasil</h2>
              <p className="text-[#7e90ad] text-xs mt-1">
                {result.bundle ? `${result.count} foto — 1 bundle` : 'Kode klaim siap dipakai'}
              </p>
            </div>

            {/* Code cards */}
            <div className="px-5 pt-2 space-y-2">
              {codes.map(({ code, name }) => (
                <button key={code} onClick={() => copy(code)}
                  className={`w-full p-4 rounded-xl text-center border transition-all duration-200 active:scale-[.98] ${copied === code ? 'bg-[#34d399]/8 border-[#34d399]/25' : 'bg-white/[.02] border-white/[.06] hover:bg-white/[.04]'}`}>
                  {name && <p className="text-[#7e90ad] text-[10px] truncate mb-1">{name}</p>}
                  <p className="font-mono font-bold text-2xl tracking-wider select-all">.claim {code}</p>
                  <p className={`text-[10px] font-semibold mt-2 ${copied === code ? 'text-[#34d399]' : 'text-[#7e90ad]/50'}`}>
                    <i className={`fa-solid ${copied === code ? 'fa-check' : 'fa-copy'} mr-1`} />
                    {copied === code ? 'Kode tersalin!' : 'Tap untuk salin'}
                  </p>
                </button>
              ))}
            </div>

            {/* Timer */}
            <div className="px-5 mt-4">
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <span className="text-[#7e90ad] font-medium">Berlaku</span>
                <span className={`font-mono font-bold tabular-nums ${urgent ? 'text-[#fb7185]' : 'text-[#7e90ad]'}`}>{mins}:{secs}</span>
              </div>
              <div className="h-1 rounded-full bg-white/[.06] overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 linear ${urgent ? 'bg-[#fb7185]' : 'bg-[#34d399]'}`} style={{ width: pct + '%' }} />
              </div>
            </div>

            {/* Claim group buttons */}
            {claimLinks.length > 0 && (
              <div className="px-5 mt-4">
                <p className="text-[10px] font-bold text-[#7e90ad]/50 mb-2">Klaim di grup</p>
                <div className="space-y-1.5">
                  {claimLinks.map((g, i) => (
                    <a key={i} href={g.link} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#34d399]/[.04] border border-[#34d399]/10 hover:bg-[#34d399]/[.08] active:scale-[.98] transition-all duration-150 group">
                      <span className="w-8 h-8 rounded-lg bg-[#34d399]/10 grid place-items-center shrink-0">
                        <i className="fa-solid fa-comments text-[#34d399] text-xs" />
                      </span>
                      <span className="flex-1 text-[12px] font-medium truncate">{g.name || 'Grup Claim'}</span>
                      <i className="fa-solid fa-arrow-up-right-from-square text-[8px] text-[#7e90ad]/30 group-hover:text-[#34d399] transition-colors duration-150" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 px-5 mt-4">
              <button onClick={() => copy(codes[0].code)}
                className="py-3 rounded-xl bg-white/[.03] border border-white/[.06] text-[12px] font-semibold hover:bg-white/[.06] active:scale-[.97] transition-all duration-150">
                <i className={`fa-solid ${copied ? 'fa-check text-[#34d399]' : 'fa-copy text-[#22d3ee]'} mr-1.5`} />
                {copied ? 'Tersalin' : 'Salin'}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent('.claim ' + codes[0].code)}`} target="_blank" rel="noreferrer"
                className="py-3 rounded-xl bg-[#25D366]/[.06] border border-[#25D366]/15 text-[12px] font-semibold text-center hover:bg-[#25D366]/[.12] active:scale-[.97] transition-all duration-150">
                <i className="fa-brands fa-whatsapp text-[#25D366] mr-1.5" />Bagikan
              </a>
            </div>

            <div className="p-5 pt-3">
              <button onClick={close} className="btn-primary w-full py-3.5 rounded-xl font-bold text-sm">
                Selesai
              </button>
            </div>
          </div>
          <div className="sm:hidden flex justify-center py-2"><div className="w-10 h-1 rounded-full bg-white/10" /></div>
        </div>
      </div>
    </div>
  )
}
