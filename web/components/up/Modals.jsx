'use client'
import { useState, useRef } from 'react'

export function ModalShell({ onClose, children }) {
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)

  const close = onClose
    ? () => {
        if (closingRef.current) return
        closingRef.current = true
        setClosing(true)
        setTimeout(onClose, 250)
      }
    : null

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-opacity duration-200 ${
        closing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Dark Obsidian Backdrop */}
      <div
        className="fixed inset-0 bg-[#020408]/90 backdrop-blur-md transition-opacity"
        onClick={close}
      />

      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative z-10 w-full max-w-[460px] max-h-[90dvh] overflow-y-auto rounded-[24px] bg-[#060A14] border border-white/[0.08] p-5 sm:p-6 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.9)] transition-all duration-200 ${
          closing ? 'scale-95 translate-y-2 opacity-0' : 'scale-100 translate-y-0 opacity-100'
        }`}
        style={{
          boxShadow: '0 24px 64px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function CloseBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Tutup"
      className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] grid place-items-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
    >
      <i className="fa-solid fa-xmark text-xs" />
    </button>
  )
}

export function IntroModal({ onDone, settings }) {
  const steps = [
    {
      i: 'fa-cloud-arrow-up',
      t: '1. Pilih Media',
      d: 'Pilih video atau foto langsung dari galeri smartphone Anda.',
      c: '#38bdf8',
    },
    {
      i: 'fa-key',
      t: '2. Terima Kode Klaim',
      d: 'Dapatkan kode 2 karakter instan, misal: .claim A7',
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

      {/* Header Emblem */}
      <div className="text-center mb-6 pt-2">
        <div className="relative inline-block mb-3.5">
          <div className="absolute inset-0 rounded-2xl bg-[#25D366]/20 blur-xl pointer-events-none" />
          <div className="relative w-16 h-16 rounded-[18px] bg-gradient-to-br from-[#25D366] via-[#1fae55] to-[#0e7a5f] grid place-items-center shadow-[0_10px_28px_-6px_rgba(37,211,102,0.5)] border border-white/20">
            <i className="fa-brands fa-whatsapp text-white text-[28px] drop-shadow" />
          </div>
        </div>

        <h2 className="font-[family-name:var(--font-display)] font-extrabold text-[22px] tracking-tight text-white">
          Selamat Datang di {settings?.siteName || 'SHIROWAHD'}
        </h2>
        <p className="text-slate-400 text-[12px] mt-1 font-medium">
          Platform uploader media Ultra HD tanpa kompresi WhatsApp
        </p>

        {/* Developer Badge */}
        <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08]">
          <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 grid place-items-center text-[7px] font-black text-white">
            H
          </span>
          <span className="text-[10px] font-bold text-slate-400 tracking-wider">
            SWHDHLZ <span className="text-slate-600">·</span> BY <span className="text-white font-extrabold">HILLZ</span>
          </span>
        </div>
      </div>

      {/* 3 Step List */}
      <div className="space-y-2.5 mb-6">
        {steps.map((s) => (
          <div
            key={s.t}
            className="flex items-start gap-3 p-3.5 rounded-[16px] bg-white/[0.02] border border-white/[0.06] transition-colors hover:bg-white/[0.04]"
          >
            <div
              className="w-10 h-10 shrink-0 rounded-[12px] grid place-items-center mt-0.5"
              style={{ background: `${s.c}14`, border: `1px solid ${s.c}28` }}
            >
              <i className={`fa-solid ${s.i} text-[14px]`} style={{ color: s.c }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[12px] text-white tracking-wide">{s.t}</p>
              <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5 font-medium">{s.d}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <button
        onClick={onDone}
        className="w-full py-3.5 rounded-[16px] bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 text-white font-extrabold text-[13px] tracking-wide shadow-[0_10px_28px_-6px_rgba(0,98,255,0.4)] hover:brightness-110 active:scale-[0.98] transition-all"
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
                className={`fa-solid fa-chevron-down text-slate-400 text-[10px] transition-transform ${
                  openIdx === idx ? 'rotate-180 text-sky-400' : ''
                }`}
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
          <span className="text-slate-400 font-medium">Direct Port</span>
          <span className="font-mono font-bold text-emerald-400">TLS Port 8443 (Grey Cloud)</span>
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
