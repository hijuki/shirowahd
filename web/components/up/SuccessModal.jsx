'use client'
import { useState, useEffect, useRef } from 'react'
import { ModalShell } from './Modals'

/* Soft click/chime via Web Audio API */
const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const t = ctx.currentTime
    const note = (freq, start, dur, vol = 0.12, wave = 'sine') => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = wave
      osc.frequency.setValueAtTime(freq, t + start)
      gain.gain.setValueAtTime(0, t + start)
      gain.gain.linearRampToValueAtTime(vol, t + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur)
      osc.connect(gain); gain.connect(ctx.destination)
      osc.start(t + start); osc.stop(t + start + dur)
    }
    if (type === 'success') {
      note(1047, 0, 0.35, 0.10)     // C6
      note(1319, 0.08, 0.30, 0.10)  // E6
      note(1568, 0.16, 0.45, 0.10)  // G6
    } else if (type === 'copy') {
      note(784, 0, 0.10, 0.10)
      note(988, 0.06, 0.12, 0.08)
    }
  } catch {}
}

export default function SuccessModal({ result, settings, expireMinutes, onClose }) {
  const [copied, setCopied] = useState('')
  const [left, setLeft] = useState(expireMinutes * 60000)
  const [phase, setPhase] = useState(0)
  const soundPlayed = useRef(false)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 150)
    const t2 = setTimeout(() => {
      setPhase(2)
      if (!soundPlayed.current) { playSound('success'); soundPlayed.current = true }
    }, 500)
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

  return (
    <ModalShell onClose={onClose}>
      {/* ── Receipt ── */}
      <div className={`transition-all duration-[400ms] ${phase >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}>

        {/* Receipt head */}
        <div className="flex items-start justify-between pb-3">
          <div>
            <p className="field-label">BUKTI KIRIM · CLAIM TICKET</p>
            <h2 className="text-[19px] font-black tracking-tight mt-1 leading-none">
              Upload Berhasil<span className="text-[var(--t-accent)]">.</span>
            </h2>
            <p className="text-[11px] text-[var(--t-muted)] mt-1 font-mono">
              {result.bundle ? `${result.count} foto — 1 bundle` : 'File siap diklaim'}
            </p>
          </div>
          {/* Hanko stamp */}
          <div className="stamp stamp-in shrink-0 !w-[54px] !h-[54px]">
            <span className="text-[20px] leading-none">済</span>
          </div>
        </div>

        <div className="perf-x" />

        {/* Code stubs */}
        <div className={`py-3 space-y-2 transition-all duration-[350ms] delay-75 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
          {codes.map(({ code, name }) => (
            <button key={code} onClick={() => copy(code)}
              className="code-chip w-full p-3 text-left cursor-pointer group hover:border-[var(--t-accent)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-[110ms]">
              {name && <p className="field-label mb-1 truncate">{name}</p>}
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono font-bold text-[17px] tracking-[.02em] select-all">.claim {code}</p>
                <span className={`shrink-0 font-mono text-[9px] font-bold tracking-widest border px-1.5 py-1 rounded-[2px] ${copied === code
                  ? 'bg-[var(--t-ok)] border-[var(--t-ok)] text-white'
                  : 'border-[var(--t-line-strong)] text-[var(--t-muted)] group-hover:text-[var(--t-accent)] group-hover:border-[var(--t-accent)]'}`}>
                  {copied === code ? 'TERSALIN ✓' : 'SALIN'}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Validity strip */}
        <div className="perf-dot my-1" />
        <div className="py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="field-label">Berlaku Hingga</span>
            <span className={`font-mono font-bold text-[13px] tnum ${urgent ? 'text-[var(--t-bad)]' : ''}`}>
              {mins}:{secs}
            </span>
          </div>
          <div className="expire-bar"><div style={{ width: pct + '%' }} className={urgent ? 'is-timeout' : ''} /></div>

          {/* Meta row */}
          <div className="flex items-center justify-between pt-1 font-mono text-[9px] text-[var(--t-muted)] tnum">
            <span>NO. {String(result.code || '').slice(-6).toUpperCase()}</span>
            <span>{expireMinutes} MENIT</span>
          </div>
        </div>

        <div className="perf-x" />

        {/* Claim group links */}
        {linkBtns.length > 0 && (
          <div className={`pt-3 transition-all duration-[350ms] delay-100 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
            <p className="field-label mb-2">Klaim di grup</p>
            <div className="space-y-1.5">
              {linkBtns.map(btn => (
                <a key={btn.name + btn.link} href={btn.link} target="_blank" rel="noreferrer"
                  className="link-btn-premium flex items-center gap-2 px-2.5 py-2 rounded-[3px] border border-[var(--t-line)] bg-[var(--t-surface2)] group hover:border-[var(--t-ink)] active:scale-[.98] transition-all duration-[140ms]">
                  <i className="fa-solid fa-comments text-[11px] text-[var(--t-wa)] shrink-0" />
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block font-bold text-[11px] truncate">{btn.name || 'Grup Klaim'}</span>
                    <span className="block font-mono text-[8px] text-[var(--t-muted)]">buka → paste kode</span>
                  </span>
                  <i className="fa-solid fa-arrow-up-right-from-square text-[8px] text-[var(--t-muted)]" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={`grid grid-cols-3 gap-1.5 pt-3 transition-all duration-[350ms] delay-150 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
          <button onClick={() => copy(codes[0].code)}
            className="btn-outline py-2.5 rounded-[3px] text-[10px] font-mono font-bold flex items-center justify-center gap-1.5">
            <i className={`fa-solid ${copied ? 'fa-check text-[var(--t-ok)]' : 'fa-copy'} text-[9px]`} />
            {copied ? 'OK' : 'SALIN'}
          </button>
          <button onClick={() => shareCode(codes[0].code)}
            className="btn-outline py-2.5 rounded-[3px] text-[10px] font-mono font-bold flex items-center justify-center gap-1.5">
            <i className="fa-solid fa-share-nodes text-[9px]" /> SHARE
          </button>
          <a href={`https://wa.me/?text=${encodeURIComponent('.claim ' + codes[0].code)}`} target="_blank" rel="noreferrer"
            className="btn-outline py-2.5 rounded-[3px] text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 text-[var(--t-wa)] border-[var(--t-wa)]/40 hover:border-[var(--t-wa)] hover:bg-[var(--t-wa)]/5">
            <i className="fa-brands fa-whatsapp text-[11px]" /> WA
          </a>
        </div>

        {/* Close */}
        <button onClick={onClose}
          className="btn-primary w-full py-3 rounded-[3px] font-mono text-[12px] mt-3 flex items-center justify-center gap-2">
          SELESAI <i className="fa-solid fa-arrow-right text-[10px]" />
        </button>

        <p className="text-center font-mono text-[8px] text-[var(--t-muted)] mt-3 tracking-[.14em] uppercase">
          simpan tiket ini — hilang sebelum kedaluwarsa = hangus
        </p>
      </div>
    </ModalShell>
  )
}
