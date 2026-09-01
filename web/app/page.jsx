'use client'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/up/Navbar'
import UploadPanel from '@/components/up/UploadPanel'
import HistorySection from '@/components/up/HistorySection'
import LiveStats from '@/components/up/LiveStats'
import MetallicChains from '@/components/up/MetallicChains'
import { IntroModal, FaqModal, AboutModal } from '@/components/up/Modals'
import { loadSettings } from '@/lib/up-api'

function SkeletonPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center px-4 pb-20 pt-2 animate-pulse">
      <div className="w-full max-w-[480px] sm:max-w-[620px]">
        <div className="h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-8" />
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="w-36 h-36 rounded-3xl bg-white/[0.04]" />
          <div className="h-8 w-64 bg-white/[0.04] rounded-xl" />
          <div className="h-4 w-48 bg-white/[0.03] rounded-lg" />
        </div>
        <div className="h-80 rounded-[26px] bg-white/[0.03] border border-white/[0.06]" />
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

  const maxMB = settings?.maxFileSizeMB || 100
  const expMins = settings?.expireMinutes || 60
  const expLabel = expMins >= 1440 ? `${Math.floor(expMins / 1440)} Hari` : `${Math.floor(expMins / 60)} Jam`

  return (
    <div className="relative min-h-dvh bg-[#03060E] text-white selection:bg-sky-500 selection:text-white font-[family-name:var(--font-sans)] overflow-x-hidden">
      {/* Background Aurora & Noise */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-gradient-to-b from-sky-500/12 via-blue-600/8 to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-blue-700/8 blur-[130px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* 3D Metallic Industrial Chains (Left & Right) */}
      <MetallicChains />

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
          <i className="fa-brands fa-whatsapp text-white text-[20px] relative z-10" />
          <span className="fab-owner-label font-extrabold text-[11px]">Chat Owner</span>
        </a>
      )}

      {/* Toasts Container */}
      <div className="fixed top-5 right-5 z-[99] space-y-2 pointer-events-none max-w-[320px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3 rounded-[14px] text-xs font-bold shadow-xl border backdrop-blur-md transition-all duration-300 pointer-events-auto flex items-center gap-2.5 ${
              t.type === 'error'
                ? 'bg-rose-950/85 border-rose-500/30 text-rose-200'
                : t.type === 'success'
                ? 'bg-emerald-950/85 border-emerald-500/30 text-emerald-200'
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
          <div className="w-full max-w-[480px] sm:max-w-[620px]">
            {/* Header Capsule Navbar */}
            <Navbar
              settings={settings}
              onFaq={() => setFaqOpen(true)}
              onAbout={() => setAboutOpen(true)}
            />

            {/* Announcement / Banner */}
            {settings?.announcement ? (
              <div className="mb-6 p-3.5 rounded-[16px] bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-transparent border border-sky-500/25 flex items-start gap-3 shadow-lg">
                <i className="fa-solid fa-bullhorn text-sky-400 text-sm mt-0.5 shrink-0 animate-pulse" />
                <p className="text-[12px] text-slate-200 font-medium leading-relaxed">
                  {settings.announcement}
                </p>
              </div>
            ) : settings?.bannerText ? (
              <div className="mb-6 p-2.5 rounded-[14px] bg-white/[0.02] border border-white/[0.06] flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <i className="fa-solid fa-sparkles text-sky-400 text-xs" />
                <span>{settings.bannerText}</span>
              </div>
            ) : null}

            {/* Hero Section — 3D Floating Cutout (Non-Bulat, Transparent Cutout Ready) */}
            <header className="text-center mb-8 relative">
              <div className="hero-cutout-wrap relative inline-block mb-4">
                {/* 3D Glass Pedestal Base */}
                <div className="hero-pedestal" />

                {/* Rotating Cyber Chassis Rings */}
                <div className="hero-chassis-ring-1" />
                <div className="hero-chassis-ring-2" />

                {/* Floating 3D Character/Logo Cutout Stage */}
                <div
                  className="hero-cutout-stage relative z-10 p-2 cursor-pointer"
                  onPointerMove={(e) => {
                    const el = e.currentTarget
                    const r = el.getBoundingClientRect()
                    const x = (e.clientX - r.left) / r.width - 0.5
                    const y = (e.clientY - r.top) / r.height - 0.5
                    el.style.transform = `perspective(800px) rotateX(${(-y * 20).toFixed(2)}deg) rotateY(${(x * 20).toFixed(2)}deg) translateZ(30px)`
                  }}
                  onPointerLeave={(e) => {
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  <img
                    src={settings?.heroImageUrl || '/hero.jpg'}
                    alt={settings?.siteName || 'SHIROWAHD'}
                    className="hero-cutout-img drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] max-h-[170px] sm:max-h-[210px] w-auto mx-auto"
                  />
                </div>
              </div>

              {/* Developer Verified Pill Signature */}
              <div className="mb-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] shadow-sm">
                <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 grid place-items-center text-[7px] font-black text-white">
                  H
                </span>
                <span className="text-[10px] font-extrabold text-slate-300 tracking-wider">
                  SWHDHLZ <span className="text-slate-600">·</span> BY <span className="text-white">HILLZ</span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>

              {/* Title & Subtitle */}
              <h1 className="font-[family-name:var(--font-display)] font-black text-[26px] sm:text-[32px] tracking-tight text-white leading-tight">
                {settings?.heroTitle ? (
                  <span>{settings.heroTitle}</span>
                ) : (
                  <>
                    Kirim Video HD <span className="anime-text bg-gradient-to-r from-sky-400 via-blue-400 to-teal-300 bg-clip-text text-transparent">Tanpa Kompresi</span>
                  </>
                )}
              </h1>

              <p className="text-slate-400 text-[12px] sm:text-[13px] font-medium max-w-[380px] mx-auto mt-2 leading-relaxed">
                {settings?.heroSubtitle ||
                  'Upload video dari galeri HP, dapatkan kode klaim bot, dan terima media kualitas original di WhatsApp.'}
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
            <div className="mb-6">
              <LiveStats />
            </div>

            {/* Main Upload Card */}
            <main className="mb-8">
              <UploadPanel settings={settings} onToast={addToast} />
            </main>

            {/* History Section */}
            <HistorySection />

            {/* Footer */}
            <footer className="mt-14 text-center text-[11px] text-slate-400 space-y-2">
              <div className="flex items-center justify-center gap-4">
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
              <p>© {new Date().getFullYear()} {settings?.siteName || 'SHIROWAHD'} · Ultra HD Engine</p>
            </footer>
          </div>
        </div>
      )}

      {/* Modals */}
      {showWelcome && (
        <IntroModal onDone={() => setShowWelcome(false)} settings={settings} />
      )}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} settings={settings} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </div>
  )
}
