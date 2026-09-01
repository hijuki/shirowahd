'use client'
import { useState, useEffect, useRef } from 'react'

/* ═══════════════════════════════════════════════
   MODAL SHELL — Ultra Smooth Overlay + Spring GPU Animation
   ═══════════════════════════════════════════════ */
function ModalShell({ onClose, children, accent = 'cyan' }) {
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)

  const close = onClose
    ? () => {
        if (closingRef.current) return
        closingRef.current = true
        setClosing(true)
        setTimeout(onClose, 320)
      }
    : null

  const ac = accent === 'green' ? '#34d399' : '#22d3ee'

  return (
    <div className={`fixed inset-0 z-[80] transition-opacity duration-300 ${closing ? 'overlay-out' : 'overlay-in'}`}>
      {/* Dark Obsidian Luxury Backdrop */}
      <div className="absolute inset-0 bg-[#020408]/95 backdrop-blur-xl" onClick={close} />

      <div className="absolute inset-0 z-10 overflow-y-auto modal-scroll-hide" onClick={close}>
        <div className="min-h-full flex p-4 py-6">
          <div
            onClick={(e) => e.stopPropagation()}
            className={`m-auto relative w-full max-w-[480px] transform-gpu will-change-transform ${
              closing ? 'modal-card-out' : 'modal-card-in'
            }`}
          >
            {/* Main Modal Shell Container */}
            <div
              className="relative rounded-[24px] bg-[#060A14] border border-white/[0.08] shadow-[0_32px_80px_-12px_rgba(0,0,0,0.95)] overflow-hidden"
              style={{
                boxShadow: '0 24px 70px -12px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {/* Dynamic top gradient accent sweep */}
              <div className="absolute top-0 inset-x-0 h-[2px] overflow-hidden rounded-t-[24px]">
                <div
                  className="h-full w-[200%] bg-gradient-to-r from-transparent via-sky-400/60 to-transparent"
                  style={{ animation: 'modalShimmer 3s ease-in-out infinite' }}
                />
              </div>

              {/* Side subtle lines */}
              <div className="absolute top-10 bottom-10 left-0 w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent pointer-events-none" />
              <div className="absolute top-10 bottom-10 right-0 w-px bg-gradient-to-b from-transparent via-sky-400/20 to-transparent pointer-events-none" />

              <div className="relative p-5 sm:p-6">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ModalShell }

/* ─── Smooth Close Button ─── */
function CloseBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Tutup"
      className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] grid place-items-center text-slate-400 hover:text-white hover:bg-white/[0.1] hover:scale-105 active:scale-95 transition-all duration-200"
    >
      <i className="fa-solid fa-xmark text-xs" />
    </button>
  )
}

/* ═══════════════════════════════════════
   LINK BUTTONS — Admin Official Channels & Groups
   ═══════════════════════════════════════ */
export function LinkButtons({ channels = [], claimGroups = [], popupButtons = [], settings = {} }) {
  const items = []

  if (settings.showClaimBtn !== false && claimGroups?.length) {
    claimGroups
      .filter((g) => g.visible !== false && g.link)
      .slice(0, 2)
      .forEach((g) => {
        items.push({
          i: 'fa-brands fa-whatsapp',
          t: g.name || 'Grup Klaim',
          s: 'Klaim berkas via bot',
          href: g.link,
          c: '#34d399',
          isWA: true,
        })
      })
  }

  if (settings.showChannelsBtn !== false && channels?.length) {
    channels
      .filter((c) => c.visible !== false && c.link)
      .slice(0, 2)
      .forEach((ch) => {
        items.push({
          i: 'fa-solid fa-tower-broadcast',
          t: ch.name || 'Saluran Resmi',
          s: 'Info & pembaruan',
          href: ch.link,
          c: '#38bdf8',
        })
      })
  }

  if (settings.showPopupBtns !== false && popupButtons?.length) {
    popupButtons
      .filter((b) => b.visible !== false && b.link)
      .slice(0, 2)
      .forEach((b) => {
        items.push({
          i: 'fa-solid fa-arrow-up-right-from-square',
          t: b.name || 'Link Resmi',
          s: 'Kunjungi tautan',
          href: b.link,
          c: '#60a5fa',
        })
      })
  }

  if (!items.length) return null

  return (
    <div className="space-y-2 mb-4">
      {items.map((it, idx) => (
        <a
          key={it.t + it.href + idx}
          href={it.href}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 p-3 rounded-[15px] bg-white/[0.025] border border-white/[0.08] hover:border-emerald-400/40 hover:bg-white/[0.05] transition-all duration-200 active:scale-[0.98] group text-left"
          style={{
            background: it.isWA ? 'linear-gradient(120deg, rgba(52,211,153,0.08), rgba(255,255,255,0.02))' : undefined,
          }}
        >
          <div
            className="w-10 h-10 shrink-0 rounded-[12px] grid place-items-center relative shadow-sm group-hover:scale-105 transition-transform"
            style={{
              background: it.isWA ? 'linear-gradient(135deg, #25D366, #128C4A)' : `${it.c}14`,
              border: it.isWA ? '1px solid rgba(255,255,255,0.2)' : `1px solid ${it.c}30`,
            }}
          >
            <i className={`${it.i} ${it.isWA ? 'text-white' : ''} text-[15px]`} style={{ color: it.isWA ? '#fff' : it.c }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-[12px] text-white tracking-wide truncate">{it.t}</p>
            <p className="text-slate-400 text-[10px] truncate font-medium">{it.s}</p>
          </div>
          <span className="w-7 h-7 shrink-0 rounded-full bg-white/[0.04] border border-white/[0.08] grid place-items-center group-hover:translate-x-0.5 transition-transform">
            <i className="fa-solid fa-arrow-right text-[9px] text-slate-400 group-hover:text-white" />
          </span>
        </a>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════
   WELCOME / INTRO MODAL
   ═══════════════════════════════════════ */
export function IntroModal({ onDone, settings }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 100)
    const t2 = setTimeout(() => setPhase(2), 350)
    const t3 = setTimeout(() => setPhase(3), 600)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [])

  const steps = [
    {
      i: 'fa-cloud-arrow-up',
      t: '1. Pilih Media HD',
      d: 'Pilih video atau foto langsung dari galeri smartphone Anda.',
      c: '#38bdf8',
    },
    {
      i: 'fa-key',
      t: '2. Dapatkan Kode Klaim',
      d: 'Dapatkan kode unik 2 karakter instan, misal: .claim A7',
      c: '#60a5fa',
    },
    {
      i: 'fa-paper-plane',
      t: '3. Kirim ke WhatsApp',
      d: 'Kirimkan kode klaim ke grup bot WhatsApp, media dikirim utuh.',
      c: '#34d399',
    },
  ]

  return (
    <ModalShell onClose={onDone}>
      <CloseBtn onClick={onDone} />

      {/* Confetti Particles on Welcome */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[24px]">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="confetti-particle"
            style={{
              '--x': `${10 + Math.random() * 80}%`,
              '--delay': `${0.15 + i * 0.12}s`,
              '--color': ['#38bdf8', '#60a5fa', '#34d399', '#fbbf24', '#f43f5e', '#a78bfa'][i % 6],
              '--drift': `${-30 + Math.random() * 60}px`,
            }}
          />
        ))}
      </div>

      {/* Brand Header */}
      <div className="text-center mb-5 pt-2 relative">
        <div
          className={`relative inline-block mb-3.5 transform-gpu transition-all duration-500 ${
            phase >= 1 ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}
        >
          {/* Ambient Glow */}
          <div className="absolute -inset-4 rounded-full bg-[#25D366]/20 blur-xl pointer-events-none" />

          {/* WhatsApp / Custom Brand Logo */}
          {settings?.logoUrl ? (
            <div className="relative w-16 h-16 rounded-[18px] overflow-hidden bg-[#080e1c] border border-white/20 p-1 shadow-[0_10px_28px_-6px_rgba(0,0,0,0.6)]">
              <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="relative w-16 h-16 rounded-[18px] bg-gradient-to-br from-[#25D366] via-[#1fae55] to-[#0e7a5f] grid place-items-center shadow-[0_10px_28px_-6px_rgba(37,211,102,0.5)] border border-white/25 floaty">
              <i className="fa-brands fa-whatsapp text-white text-[28px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
            </div>
          )}
        </div>

        {/* Title */}
        <div
          className={`transform-gpu transition-all duration-400 ${
            phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
          }`}
        >
          <h2 className="font-[family-name:var(--font-display)] font-extrabold text-[22px] tracking-tight text-white">
            Selamat Datang di {settings?.siteName || 'SHIROWAHD'}
          </h2>
          <p className="text-slate-400 text-[12px] mt-1 font-medium">
            {settings?.siteSubtitle || 'Platform uploader media Ultra HD tanpa kompresi WhatsApp'}
          </p>
        </div>

        {/* Verified Developer Signature */}
        <div
          className={`mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] transform-gpu transition-all duration-400 ${
            phase >= 2 ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
          }`}
        >
          <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 grid place-items-center text-[7px] font-black text-white">
            H
          </span>
          <span className="text-[10px] font-bold text-slate-400 tracking-wider">
            SWHDHLZ <span className="text-slate-600">·</span> BY <span className="text-white font-extrabold">HILLZ</span>
          </span>
        </div>
      </div>

      {/* 3 Steps Guide with Staggered Entrance */}
      <div
        className={`space-y-2.5 mb-4 transform-gpu transition-all duration-500 ${
          phase >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}
      >
        {steps.map((s, idx) => (
          <div
            key={s.t}
            className="flex items-start gap-3 p-3 rounded-[15px] bg-white/[0.025] border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
          >
            <div
              className="w-9 h-9 shrink-0 rounded-[11px] grid place-items-center mt-0.5"
              style={{ background: `${s.c}14`, border: `1px solid ${s.c}28` }}
            >
              <i className={`fa-solid ${s.i} text-[13px]`} style={{ color: s.c }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-[12px] text-white tracking-wide">{s.t}</p>
              <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5 font-medium">{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Link Buttons (Saluran & Grup WhatsApp) */}
      <LinkButtons
        channels={settings?.channels}
        claimGroups={settings?.claimGroups}
        popupButtons={settings?.popupButtons}
        settings={settings || {}}
      />

      {/* CTA Button */}
      <button
        onClick={onDone}
        className="w-full py-3.5 rounded-[16px] bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 text-white font-extrabold text-[13px] tracking-wide shadow-[0_10px_28px_-6px_rgba(0,98,255,0.45)] hover:brightness-110 active:scale-[0.98] transition-all"
      >
        Mulai Upload Sekarang
      </button>
    </ModalShell>
  )
}

export function FaqModal({ onClose, settings }) {
  const [openIdx, setOpenIdx] = useState(0)

  const faqs = [
    {
      q: 'Bagaimana cara klaim video di WhatsApp?',
      a: 'Setelah upload selesai, Anda akan mendapatkan kode klaim (misal: .claim A7). Salin kode tersebut dan kirimkan langsung ke grup WhatsApp bot yang tersedia.',
    },
    {
      q: 'Berapa lama masa aktif kode klaim?',
      a: `Kode klaim berlaku selama ${settings?.expireMinutes || 60} menit. Setelah masa aktif habis, file akan otomatis dihapus permanen dari server untuk menjaga privasi.`,
    },
    {
      q: 'Apakah kualitas video / foto saya dikurangi?',
      a: 'Tidak. Sistem kami menggunakan FFMPEG 100% Stream Copy dan CRF 18 HD Engine sehingga kualitas dan resolusi media tetap terjaga utuh sesuai aslinya.',
    },
    {
      q: 'Format file apa saja yang didukung?',
      a: 'Mendukung format video MP4, MOV, MKV, AVI, WEBM serta format foto JPG, PNG, WEBP, GIF, HEIC/HEIF hingga ukuran batas server.',
    },
  ]

  return (
    <ModalShell onClose={onClose}>
      <CloseBtn onClick={onClose} />

      <div className="mb-5 pt-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 grid place-items-center">
            <i className="fa-solid fa-circle-question text-sky-400 text-sm" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] font-extrabold text-[18px] text-white">
            Pertanyaan Umum (FAQ)
          </h2>
        </div>
        <p className="text-slate-400 text-[11px]">Panduan ringkas penggunaan web uploader</p>
      </div>

      <div className="space-y-2 mb-6">
        {faqs.map((f, idx) => (
          <div
            key={f.q}
            className="rounded-[14px] bg-white/[0.02] border border-white/[0.06] overflow-hidden"
          >
            <button
              onClick={() => setOpenIdx(openIdx === idx ? -1 : idx)}
              className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 hover:bg-white/[0.02] transition-colors"
            >
              <span className="font-bold text-[12px] text-white tracking-wide">{f.q}</span>
              <i
                className={`fa-solid ${
                  openIdx === idx ? 'fa-chevron-up text-sky-400' : 'fa-chevron-down text-slate-400'
                } text-[10px]`}
              />
            </button>
            {openIdx === idx && (
              <div className="px-4 pb-3.5 pt-1 text-slate-400 text-[11px] leading-relaxed font-medium border-t border-white/[0.04]">
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="w-full py-3 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-white text-[12px] font-bold hover:bg-white/[0.08] transition-colors"
      >
        Mengerti
      </button>
    </ModalShell>
  )
}

export function AboutModal({ onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <CloseBtn onClick={onClose} />

      <div className="text-center mb-5 pt-2">
        <div className="relative w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 grid place-items-center text-white text-[24px] font-black shadow-[0_8px_24px_-4px_rgba(0,98,255,0.4)] mb-3">
          H
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-extrabold text-[20px] text-white">
          SHIROWAHD HD ENGINE
        </h2>
        <p className="text-slate-400 text-[11px] mt-0.5">Developed by SHIRO HLZ (@Hillz126)</p>
      </div>

      <div className="rounded-[16px] bg-white/[0.02] border border-white/[0.06] p-4 space-y-3 mb-6 text-[11px]">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
          <span className="text-slate-400 font-medium">Core Engine</span>
          <span className="font-mono font-bold text-sky-400">Node.js + FFMPEG High-Profile</span>
        </div>
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
          <span className="text-slate-400 font-medium">Direct Network</span>
          <span className="font-mono font-bold text-emerald-400">High-Speed Direct Stream</span>
        </div>
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
          <span className="text-slate-400 font-medium">Transcoding Profile</span>
          <span className="font-mono font-bold text-white">CRF 18 / Cap 1440p Quad HD</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-medium">Framework</span>
          <span className="font-mono font-bold text-slate-300">Next.js 15 App Router</span>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-3 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-white text-[12px] font-bold hover:bg-white/[0.08] transition-colors"
      >
        Tutup
      </button>
    </ModalShell>
  )
}
