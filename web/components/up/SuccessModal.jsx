'use client'
import { useState, useEffect, useRef } from 'react'
import { Sheet, LinkButtons } from './Modals'

/* ══════════════════════════════════════════════════════════════
   POPUP CLAIM — hasil upload.
   Stempel sukses (bukan centang generik), plat kode besar yang
   bisa ditekan untuk copy, hitungan mundur nyata, lalu aksi.
   ══════════════════════════════════════════════════════════════ */

function fmtLeft(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export default function SuccessModal({ result, settings, expireMinutes, onClose }) {
  const total = (expireMinutes || 60) * 60000
  const [left, setLeft] = useState(total)
  const [copied, setCopied] = useState('')
  const [p, setP] = useState(0)
  const start = useRef(Date.now())

  useEffect(() => {
    const t = [
      setTimeout(() => setP(1), 260),
      setTimeout(() => setP(2), 560),
      setTimeout(() => setP(3), 860),
    ]
    return () => t.forEach(clearTimeout)
  }, [])

  // Hitung dari timestamp, bukan akumulasi interval: tab yang ter-suspend
  // tidak membuat sisa waktu jadi bohong.
  useEffect(() => {
    const iv = setInterval(() => setLeft(Math.max(0, total - (Date.now() - start.current))), 1000)
    return () => clearInterval(iv)
  }, [total])

  const codes = result.codes?.length ? result.codes : [{ code: result.code, name: '' }]

  const copy = async (code) => {
    const text = '.claim ' + code
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(ta)
    }
    setCopied(code)
    setTimeout(() => setCopied(''), 1600)
  }

  const share = async (code) => {
    const text = '.claim ' + code
    if (navigator.share) {
      try { await navigator.share({ text }); return } catch {}
    }
    copy(code)
  }

  const pct = Math.max(0, Math.min(100, (left / total) * 100))
  const st = n => ({
    opacity: p >= n ? 1 : 0,
    transform: p >= n ? 'none' : 'translate3d(0,16px,0)',
    transition: 'opacity 520ms var(--ease), transform 520ms var(--ease-snap)',
  })

  return (
    <Sheet onClose={onClose} title="Kode Klaim Siap" kicker="UPLOAD BERHASIL">
      {/* Stempel + identitas brand (logo WA hijau & badge H wajib ada) */}
      <div className="flex flex-col items-center">
        <span className="stamp">
          <span className="stamp-ring" />
          <i className="fa-solid fa-check text-[34px] text-[#06180d]" />
        </span>
        <p className="kicker mt-3.5" style={st(1)}>
          {result.bundle ? `${result.count} FOTO · 1 BUNDLE` : 'FILE SIAP DIKLAIM'}
        </p>
        <span className="inline-flex items-center gap-2 mt-3 px-2 py-1 border-2 border-[var(--edge)] bg-[var(--paper-2)]"
          style={st(1)}>
          <span className="w-[18px] h-[18px] grid place-items-center border border-[var(--edge)] bg-wa">
            <i className="fa-brands fa-whatsapp text-[10px] text-[#06180d]" />
          </span>
          <span className="badge-h w-[16px] h-[16px] !border text-[8px]">H</span>
          <span className="kicker !text-[8px]">DIKIRIM LEWAT BOT SWHDHLZ</span>
        </span>
      </div>

      {/* Plat kode */}
      <div className="mt-4 space-y-2" style={st(1)}>
        {codes.map((c, i) => (
          <div key={c.code + i}>
            {c.name && <p className="kicker !text-[8px] mb-1 truncate">{c.name}</p>}
            <button onClick={() => copy(c.code)} className="code-plate w-full block"
              aria-label={'Salin perintah klaim ' + c.code}>
              <span className="kicker !text-[8px] block mb-1.5">TEMPEL DI GRUP WHATSAPP</span>
              <span className="code-text block">.claim {c.code}</span>
              <span className="kicker !text-[8px] block mt-2">
                {copied === c.code ? '✓ TERSALIN' : 'TAP UNTUK MENYALIN'}
              </span>
            </button>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              <button onClick={() => copy(c.code)} className="btn btn-sm">
                <i className="fa-solid fa-copy text-[10px]" />SALIN
              </button>
              <button onClick={() => share(c.code)} className="btn btn-sm btn-accent">
                <i className="fa-solid fa-share-nodes text-[10px]" />BAGIKAN
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sisa waktu — gauge + angka mono */}
      <div className="plate-flat p-3 mt-4" style={st(2)}>
        <div className="flex items-baseline justify-between mb-2">
          <span className="kicker !text-[9px]">SISA WAKTU</span>
          <span className="data text-[15px] font-bold">{fmtLeft(left)}</span>
        </div>
        <div className="gauge"><span style={{ width: pct + '%' }} /></div>
        <p className="text-[10px] leading-snug text-[var(--ink-2)] mt-2">
          Kode hangus setelah waktu habis atau setelah diklaim sekali.
        </p>
      </div>

      {/* Cara pakai singkat */}
      <div className="mt-4" style={st(3)}>
        <div className="flex items-center gap-2.5 mb-2.5">
          <span className="flex-1 rule-dash" />
          <span className="kicker !text-[8px]">LANGKAH BERIKUTNYA</span>
          <span className="flex-1 rule-dash" />
        </div>
        <LinkButtons claimGroups={settings?.claimGroups} channels={settings?.channels}
          popupButtons={settings?.popupButtons} ownerWhatsapp={settings?.ownerWhatsapp} settings={settings} />

        <button onClick={onClose} className="btn btn-primary w-full mt-3">
          <span className="btn-cap"><i className="fa-solid fa-plus text-[10px]" /></span>
          UPLOAD LAGI
        </button>
      </div>
    </Sheet>
  )
}
