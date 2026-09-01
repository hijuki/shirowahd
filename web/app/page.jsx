'use client'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/up/Navbar'
import UploadPanel from '@/components/up/UploadPanel'
import LiveStats from '@/components/up/LiveStats'
import HistorySection from '@/components/up/HistorySection'
import Toasts, { useToasts } from '@/components/up/Toasts'
import { IntroModal, FaqModal, AboutModal } from '@/components/up/Modals'
import { loadSettings } from '@/lib/up-api'

function SkeletonPage() {
  return (
    <div className="w-full max-w-[480px] sm:max-w-[560px] mx-auto px-4 pt-12 space-y-6">
      <div className="h-[52px] rounded-[18px] bg-white/[0.03] border border-white/[0.06] animate-pulse" />
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 rounded-full bg-white/[0.04] animate-pulse" />
        <div className="w-48 h-7 rounded-lg bg-white/[0.04] animate-pulse" />
        <div className="w-64 h-3.5 rounded bg-white/[0.03] animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-[16px] bg-white/[0.02] border border-white/[0.05] animate-pulse" />
        ))}
      </div>
      <div className="h-[320px] rounded-[22px] bg-white/[0.03] border border-white/[0.06] animate-pulse" />
    </div>
  )
}

export default function UploaderPage() {
  const [settings, setSettings] = useState(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { toasts, add: toast } = useToasts()

  const reload = useCallback(() => {
    loadSettings()
      .then(setSettings)
      .catch((e) => toast('Gagal memuat pengaturan: ' + e.message, 'error'))
  }, [toast])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (settings && settings.showWelcome !== false) {
      const seen = localStorage.getItem('sw_intro_seen_v2')
      if (!seen) setShowWelcome(true)
    }
  }, [settings])

  const handleWelcomeDone = () => {
    localStorage.setItem('sw_intro_seen_v2', '1')
    setShowWelcome(false)
  }

  const heroTitle = settings?.heroTitle || 'Upload'
  const heroHighlight = settings?.heroSubtitle || 'Media HD'
  const heroDesc = settings?.heroDesc || 'Kirim video & foto ke grup WhatsApp\nlewat kode klaim — kualitas penuh tanpa kompresi'
  const footerText = settings?.footerText || ''

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-[#04070F] text-[#e8f1ff] antialiased selection:bg-sky-500/30 selection:text-white">
      {/* Background Atmosphere Layers */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/[0.08] blur-[120px]" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-sky-500/[0.05] blur-[140px]" />
        {/* Minimal Subtle Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at 50% 30%, black 40%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 40%, transparent 80%)',
          }}
        />
      </div>

      <Toasts toasts={toasts} />
      {showWelcome && <IntroModal onDone={handleWelcomeDone} settings={settings} />}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} settings={settings} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

      {/* Floating owner chat button */}
      {settings?.ownerWhatsapp && settings?.showOwnerBtn !== false && (
        <a
          href={`https://wa.me/${String(settings.ownerWhatsapp).replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="fab-owner group fixed right-5 bottom-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C4A] shadow-[0_10px_30px_-6px_rgba(37,211,102,0.5)] grid place-items-center transition-transform duration-200 hover:scale-105 active:scale-95"
          title="Chat Developer"
          aria-label="Chat Developer"
        >
          <span className="fab-owner-ping absolute inset-0 rounded-full bg-[#25D366]/40 animate-ping pointer-events-none" />
          <i className="fa-brands fa-whatsapp text-white text-[24px] relative z-10 drop-shadow" />
          <span className="fab-owner-label absolute right-16 px-3 py-1.5 rounded-xl bg-[#0a1020]/90 border border-white/10 text-[11px] font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
            Chat Developer
          </span>
        </a>
      )}

      {!settings ? (
        <SkeletonPage />
      ) : (
        <main className="relative z-10 min-h-dvh flex flex-col items-center px-4 pb-20 pt-3">
          <div className="w-full max-w-[480px] sm:max-w-[560px]">
            {/* Navbar Shell */}
            <Navbar settings={settings} onFaq={() => setFaqOpen(true)} onAbout={() => setAboutOpen(true)} />

            {/* Hero Section with High-Contrast Typography & Depth */}
            <header className="text-center mt-2 mb-7">
              {/* Hero Image / Brand Emblem with Fluid Tilt & Micro-Ambient Halo */}
              <div className="relative inline-block mb-4 hero-3d-wrap">
                <div className="hero-3d relative w-24 h-24 sm:w-28 sm:h-28 mx-auto" aria-hidden
                  onPointerMove={e => {
                    const el = e.currentTarget, r = el.getBoundingClientRect()
                    const x = (e.clientX - r.left) / r.width - 0.5
                    const y = (e.clientY - r.top) / r.height - 0.5
                    el.style.setProperty('--rx', `${(-y * 16).toFixed(2)}deg`)
                    el.style.setProperty('--ry', `${(x * 16).toFixed(2)}deg`)
                  }}
                  onPointerLeave={e => {
                    e.currentTarget.style.setProperty('--rx', '0deg')
                    e.currentTarget.style.setProperty('--ry', '0deg')
                  }}>
                  {/* Outer glow ring */}
                  <div className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-sky-500/20 via-blue-600/10 to-transparent blur-md pointer-events-none" />
                  <div className="relative w-full h-full rounded-full p-[2px] bg-gradient-to-b from-white/20 via-sky-500/30 to-white/5 shadow-[0_12px_36px_-8px_rgba(0,98,255,0.35)] overflow-hidden">
                    <img
                      src={settings?.heroImageUrl || '/hero.jpg'}
                      alt={settings?.siteName || 'SWHDHLZ'}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Title & Subtitle */}
              <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[28px] sm:text-[32px] tracking-tight leading-tight">
                {heroTitle}{' '}
                <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  {heroHighlight}
                </span>
              </h1>
              <p className="text-slate-400 text-[13px] sm:text-[14px] mt-2 max-w-[340px] mx-auto leading-relaxed whitespace-pre-line font-medium">
                {heroDesc}
              </p>

              {/* Verified Author / Brand Pill */}
              <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5)]">
                <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 grid place-items-center text-[8px] font-black text-white">
                  H
                </span>
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                  SWHDHLZ <span className="text-slate-600 font-normal">·</span> BY <span className="text-white font-extrabold">HILLZ</span>
                </span>
              </div>
            </header>

            {/* 3-Step Interactive Process Cards */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[
                { n: 1, t: '1. Upload', sub: 'Pilih media', i: 'fa-cloud-arrow-up', c: '#38bdf8' },
                { n: 2, t: '2. Kode', sub: 'Dapat .claim', i: 'fa-key', c: '#60a5fa' },
                { n: 3, t: '3. Kirim', sub: 'Kirim di WA', i: 'fa-comments', c: '#34d399' },
              ].map((s) => (
                <div
                  key={s.n}
                  className="relative rounded-[16px] bg-gradient-to-b from-white/[0.03] to-white/[0.008] border border-white/[0.07] p-3 text-center transition-all duration-200 hover:border-sky-500/30 hover:bg-white/[0.035]"
                >
                  <div
                    className="w-9 h-9 mx-auto rounded-[11px] grid place-items-center mb-2"
                    style={{ background: `${s.c}14`, border: `1px solid ${s.c}28` }}
                  >
                    <i className={`fa-solid ${s.i} text-[13px]`} style={{ color: s.c }} />
                  </div>
                  <p className="font-bold text-[11px] text-white tracking-wide">{s.t}</p>
                  <p className="text-slate-500 text-[9px] mt-0.5 font-medium">{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Live Public Upload Telemetry / Logs */}
            <LiveStats />

            {/* Announcement / Alert if any */}
            {settings?.announcement && (
              <div className="rounded-[16px] px-4 py-3 mb-5 border border-amber-400/20 bg-amber-500/[0.05] flex items-start gap-2.5">
                <i className="fa-solid fa-bullhorn text-amber-400 text-xs mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-400/80 mb-0.5">
                    Pengumuman
                  </p>
                  <p className="text-[11px] font-medium leading-relaxed text-slate-300 whitespace-pre-line">
                    {settings.announcement}
                  </p>
                </div>
              </div>
            )}

            {/* Main Upload Card Panel */}
            <UploadPanel settings={settings} toast={toast} />

            {/* Local History Section */}
            <div className="mt-7">
              <HistorySection />
            </div>

            {/* Clean Luxury Footer */}
            <footer className="mt-12 text-center pb-6 border-t border-white/[0.06] pt-6">
              <p className="text-slate-500 text-[10px] font-bold tracking-[0.18em] uppercase">
                {footerText || `${settings?.siteName || 'SHIROWAHD'} · SWHDHLZ BY HILLZ`}
              </p>
              <p className="text-slate-600 text-[9px] mt-1 font-mono">
                Ultra HD Engine · High-Speed Active
              </p>
            </footer>
          </div>
        </main>
      )}
    </div>
  )
}
