'use client'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/up/Navbar'
import UploadPanel from '@/components/up/UploadPanel'
import HistorySection from '@/components/up/HistorySection'
import LiveStats from '@/components/up/LiveStats'
import { IntroModal, FaqModal, AboutModal } from '@/components/up/Modals'
import { loadSettings } from '@/lib/up-api'

function SkeletonPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center px-4 pb-20 pt-2 animate-pulse">
      <div className="w-full max-w-[460px] sm:max-w-[580px]">
        <div className="h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-8" />
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="w-32 h-32 rounded-3xl bg-white/[0.04]" />
          <div className="h-8 w-60 bg-white/[0.04] rounded-xl" />
          <div className="h-4 w-44 bg-white/[0.03] rounded-lg" />
        </div>
        <div className="h-80 rounded-3xl bg-white/[0.03] border border-white/[0.06]" />
      </div>
    </div>
  )
}

export default function UploaderPage() {
  const [settings, setSettings] = useState(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, msg, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3800)
  }, [])

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s)
      if (s && s.showWelcome !== false) {
        setShowWelcome(true)
      }
    })
  }, [])

  const maxMB = settings?.maxFileSizeMB || 0
  const expMins = settings?.expireMinutes || 60
  const expLabel = expMins >= 1440 ? `${Math.floor(expMins / 1440)} Hari` : `${Math.floor(expMins / 60)} Jam`

  return (
    <div className="relative min-h-dvh bg-[#030712] text-white selection:bg-sky-500 selection:text-white font-[family-name:var(--font-sans)]">
      
      {/* Background Soft Glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[360px] bg-gradient-to-b from-sky-500/10 via-blue-600/5 to-transparent blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Floating Owner WhatsApp Button */}
      {settings?.showOwnerBtn && settings?.ownerWhatsapp && (
        <a
          href={`https://wa.me/${settings.ownerWhatsapp.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="fab-owner"
          aria-label="Chat Developer WhatsApp"
        >
          <span className="fab-owner-ping" />
          <i className="fa-brands fa-whatsapp text-white text-[18px] relative z-10" />
          <span className="font-bold text-[11px]">Chat Owner</span>
        </a>
      )}

      {/* Toast Container */}
      <div className="fixed top-5 right-5 z-[99] space-y-2 pointer-events-none max-w-[320px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3 rounded-2xl text-xs font-bold shadow-xl border backdrop-blur-md transition-all duration-300 pointer-events-auto flex items-center gap-2.5 ${
              t.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/30 text-rose-200'
                : t.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
                : 'bg-[#0a1224]/90 border-sky-500/30 text-sky-200'
            }`}
          >
            <i
              className={`fa-solid ${
                t.type === 'error'
                  ? 'fa-triangle-exclamation text-rose-400'
                  : t.type === 'success'
                  ? 'fa-circle-check text-emerald-400'
                  : 'fa-circle-info text-sky-400'
              } text-sm`}
            />
            <span className="flex-1 leading-tight">{t.msg}</span>
          </div>
        ))}
      </div>

      {!settings ? (
        <SkeletonPage />
      ) : (
        <div className="relative z-10 min-h-dvh flex flex-col items-center px-4 pb-20 pt-2 sm:pt-4">
          <div className="w-full max-w-[460px] sm:max-w-[580px]">
            
            {/* Header Navigation Bar */}
            <Navbar
              settings={settings}
              onFaq={() => setFaqOpen(true)}
              onAbout={() => setAboutOpen(true)}
            />

            {/* Announcement / Banner */}
            {settings?.announcement ? (
              <div className="mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-transparent border border-sky-500/25 flex items-start gap-3 shadow-md">
                <i className="fa-solid fa-bullhorn text-sky-400 text-sm mt-0.5 shrink-0 animate-pulse" />
                <p className="text-[12px] text-slate-200 font-medium leading-relaxed">
                  {settings.announcement}
                </p>
              </div>
            ) : settings?.bannerText ? (
              <div className="mb-6 p-2.5 rounded-xl bg-white/[0.025] border border-white/[0.06] flex items-center justify-center gap-2 text-[11px] text-slate-300 font-medium shadow-sm">
                <i className="fa-solid fa-sparkles text-sky-400 text-xs" />
                <span>{settings.bannerText}</span>
              </div>
            ) : null}

            {/* Hero Section */}
            <header className="text-center mb-7">
              {/* 3D Showcase Frame for Hero Image (Works seamlessly with transparent PNG & normal photos) */}
              <div className="relative inline-block mb-4">
                {/* Backlight Glow */}
                <div className="absolute -inset-3 rounded-[32px] bg-sky-500/20 blur-xl pointer-events-none" />

                {/* 3D Interactive Showcase Frame */}
                <div
                  className="hero-3d-card-stage relative w-32 h-32 sm:w-40 sm:h-40 rounded-[28px] bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.12] p-2.5 shadow-[0_20px_50px_-10px_rgba(0,98,255,0.4)] backdrop-blur-sm cursor-pointer transition-transform duration-200"
                  onPointerMove={(e) => {
                    const el = e.currentTarget
                    const r = el.getBoundingClientRect()
                    const x = (e.clientX - r.left) / r.width - 0.5
                    const y = (e.clientY - r.top) / r.height - 0.5
                    el.style.transform = `perspective(600px) rotateX(${(-y * 18).toFixed(2)}deg) rotateY(${(x * 18).toFixed(2)}deg) scale3d(1.03, 1.03, 1.03)`
                  }}
                  onPointerLeave={(e) => {
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  <img
                    src={settings?.heroImageUrl || '/hero.jpg'}
                    alt={settings?.siteName || 'STATUSHD'}
                    className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] select-none pointer-events-none"
                  />
                </div>
              </div>

              {/* Developer Verified Pill */}
              <div className="mb-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] shadow-sm">
                <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 grid place-items-center text-[7px] font-black text-white">
                  H
                </span>
                <span className="text-[10px] font-extrabold text-slate-300 tracking-wider">
                  SWHDHLZ <span className="text-slate-600">·</span> BY <span className="text-white">HILLZ</span>
                </span>
              </div>

              {/* Hero Title & Subtitle */}
              <h2 className="font-[family-name:var(--font-display)] font-black text-[24px] sm:text-[30px] tracking-tight text-white leading-tight">
                {settings?.heroTitle ? (
                  <span>
                    {settings.heroTitle}{' '}
                    {settings.heroSubtitle && (
                      <span className="grad-text-anim">{settings.heroSubtitle}</span>
                    )}
                  </span>
                ) : (
                  <>
                    Kirim Video HD <span className="grad-text-anim">Tanpa Kompresi</span>
                  </>
                )}
              </h2>

              {/* Hero Description from Admin */}
              <p className="text-slate-400 text-[12px] sm:text-[13px] font-medium max-w-[380px] mx-auto mt-2 leading-relaxed">
                {settings?.heroDesc ||
                  'Upload video atau foto original, dapatkan kode klaim bot, dan terima media kualitas original di WhatsApp.'}
              </p>

              {/* Status Chips Row */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-bold text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ONLINE</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-bold text-slate-300">
                  <i className="fa-solid fa-hard-drive text-sky-400 text-[10px]" />
                  <span>MAX {maxMB === 0 ? 'UNLIMITED' : `${maxMB}MB`}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-bold text-slate-300">
                  <i className="fa-regular fa-clock text-amber-400 text-[10px]" />
                  <span>Masa Aktif: {expLabel}</span>
                </div>
              </div>
            </header>

            {/* Live Telemetry Server */}
            <LiveStats />

            {/* Main Upload Card Panel */}
            <main className="mb-8">
              <UploadPanel settings={settings} onToast={addToast} />
            </main>

            {/* History Section */}
            <HistorySection />

            {/* Footer */}
            <footer className="mt-14 text-center text-[11px] text-slate-400 space-y-2">
              <div className="flex items-center justify-center gap-4 font-medium">
                <button onClick={() => setFaqOpen(true)} className="hover:text-white transition-colors">
                  FAQ
                </button>
                <span>·</span>
                <button onClick={() => setAboutOpen(true)} className="hover:text-white transition-colors">
                  About
                </button>
                <span>·</span>
                <a href="/admin" className="hover:text-white transition-colors">
                  Admin Panel
                </a>
              </div>
              <p>© {new Date().getFullYear()} {settings?.siteName || 'STATUSHD'} · {settings?.footerText || 'Ultra HD Engine'}</p>
            </footer>
          </div>
        </div>
      )}

      {/* Modals & Popups */}
      {showWelcome && (
        <IntroModal onDone={() => setShowWelcome(false)} settings={settings} />
      )}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} settings={settings} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  )
}
