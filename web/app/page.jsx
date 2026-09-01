'use client'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/up/Navbar'
import UploadPanel from '@/components/up/UploadPanel'
import LiveStats from '@/components/up/LiveStats'
import HistorySection from '@/components/up/HistorySection'
import Toasts, { useToasts } from '@/components/up/Toasts'
import { IntroModal, FaqModal, AboutModal } from '@/components/up/Modals'
import { loadSettings } from '@/lib/up-api'

/* Skeleton placeholder */
function SkeletonPage() {
  return (
    <div className="w-full max-w-[440px] sm:max-w-[560px] mx-auto px-4 pt-16 space-y-6">
      <div className="skeleton h-[52px] rounded-[18px]" />
      <div className="flex flex-col items-center gap-3">
        <div className="skeleton w-[76px] h-[76px] rounded-[24px]" />
        <div className="skeleton skeleton-text w-[180px] h-[28px]" />
        <div className="skeleton skeleton-text w-[240px] h-[12px]" />
        <div className="skeleton skeleton-text w-[200px] h-[12px]" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => <div key={i} className="skeleton h-[90px] rounded-[18px]" />)}
      </div>
      <div className="skeleton h-[280px] rounded-[20px]" />
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
    loadSettings().then(setSettings).catch(e => toast('Gagal memuat pengaturan: ' + e.message, 'error'))
  }, [toast])

  useEffect(reload, [reload])

  // Welcome popup SELALU muncul saat dibuka jika admin mengaktifkan showWelcome
  useEffect(() => {
    if (settings && settings.showWelcome !== false) {
      setShowWelcome(true)
    }
  }, [settings])

  const heroTitle = settings?.heroTitle || 'Upload'
  const heroHighlight = settings?.heroSubtitle || 'Media HD'
  const heroDesc = settings?.heroDesc || 'Kirim video & foto ke grup WhatsApp\nlewat kode klaim — cepat & mudah'
  const footerText = settings?.footerText || ''

  return (
    <>
      <div className="bg-aurora" />
      <div className="bg-aurora-2" />
      <div className="bg-grid" />
      <div className="bg-noise" />

      <Toasts toasts={toasts} />
      {showWelcome && <IntroModal onDone={() => setShowWelcome(false)} settings={settings} />}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} settings={settings} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

      {/* Floating owner chat button */}
      {settings?.ownerWhatsapp && settings?.showOwnerBtn !== false && (
        <a href={`https://wa.me/${String(settings.ownerWhatsapp).replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer"
          className="fab-owner group" title="Chat Developer" aria-label="Chat Developer">
          <span className="fab-owner-ping" />
          <i className="fa-brands fa-whatsapp text-white text-[22px] relative z-10" />
          <span className="fab-owner-label">Chat Developer</span>
        </a>
      )}

      {!settings ? (
        <SkeletonPage />
      ) : (
        <div className="relative z-10 min-h-dvh flex flex-col items-center px-4 pb-20 pt-2">
          <div className="w-full max-w-[440px] sm:max-w-[560px]">
            <Navbar settings={settings} onFaq={() => setFaqOpen(true)} onAbout={() => setAboutOpen(true)} />

            {/* Hero */}
            <header className="text-center mb-8 anim-entrance perspective-container" style={{ animationDelay: '60ms' }}>
              {/* Hero 3D — tilt mengikuti pointer, layer depth */}
              <div className="relative inline-block mb-5 hero-3d-wrap">
                <div className="absolute -inset-6 rounded-full bg-gradient-to-b from-slate-200/12 to-slate-400/8 blur-2xl pointer-events-none" />
                <div className="hero-3d" aria-hidden
                  onPointerMove={e => {
                    const el = e.currentTarget, r = el.getBoundingClientRect()
                    const x = (e.clientX - r.left) / r.width - 0.5
                    const y = (e.clientY - r.top) / r.height - 0.5
                    el.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`)
                    el.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`)
                  }}
                  onPointerLeave={e => {
                    e.currentTarget.style.setProperty('--rx', '0deg')
                    e.currentTarget.style.setProperty('--ry', '0deg')
                  }}>
                  <span className="hero-3d-shadow" />
                  <span className="hero-orb-aurora" />
                  <span className="hero-3d-ring" />
                  <span className="hero-3d-ring-2" />
                  <span className="hero-mote hero-mote-1" />
                  <span className="hero-mote hero-mote-2" />
                  <span className="hero-mote hero-mote-3" />
                  <span className="hero-mote hero-mote-4" />
                  <span className="hero-3d-card">
                    <img src={settings?.heroImageUrl || '/hero.jpg'} alt={(settings?.siteName || 'SWHDHLZ') + ' — kirim video HD tanpa kompresi'} className="hero-orb-img" />
                    <span className="hero-3d-shine" />
                  </span>
                </div>
              </div>

              <h1 className="font-[family-name:var(--font-display)] font-bold text-[28px] leading-tight tracking-tight">
                {heroTitle}{' '}<span className="anime-text">{heroHighlight}</span>
              </h1>
              <p className="text-[var(--t-muted)] text-[13px] mt-2.5 max-w-[300px] mx-auto leading-relaxed whitespace-pre-line">
                {heroDesc}
              </p>

              {/* Inline dev credit */}
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--t-surface)] border border-[var(--t-border)] text-[10px] tracking-wider text-[var(--t-muted)]">
                <span className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] grid place-items-center text-[8px] font-extrabold text-white shrink-0">H</span>
                <span className="font-semibold">SWHDHLZ</span>
                <span className="opacity-60">BY</span>
                <span className="anime-text font-extrabold">HILLZ</span>
              </div>
            </header>

            {/* 3-step guide — glass cards + speed lines */}
            <div className="grid grid-cols-3 gap-2 mb-6 anim-entrance perspective-container" style={{ animationDelay: '120ms' }}>
              {[
                { n: 1, t: 'Upload', sub: 'Pilih file', i: 'fa-cloud-arrow-up', c: '#22d3ee' },
                { n: 2, t: 'Kode', sub: 'Dapatkan kode', i: 'fa-key', c: '#38bdf8' },
                { n: 3, t: 'Claim', sub: 'Kirim di grup', i: 'fa-comments', c: '#3b82f6' },
              ].map((s, i) => (
                <div key={s.n} className="relative rounded-[18px] border border-[var(--t-border)] overflow-hidden group step-3d" style={{ animationDelay: `${120 + i * 80}ms` }}>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/[.02] to-transparent" />
                  <div className="absolute top-0 left-[15%] right-[15%] h-px" style={{ background: `linear-gradient(to right, transparent, ${s.c}40, transparent)` }} />
                  {/* Speed lines on hover */}
                  <div className="speed-lines opacity-0 group-hover:opacity-100 transition-opacity duration-[250ms]" />
                  <div className="relative flex flex-col items-center py-3.5 px-2 text-center">
                    <div className="w-10 h-10 rounded-[12px] grid place-items-center mb-2 transition-all duration-[250ms] group-hover:scale-110" style={{ background: `${s.c}12`, border: `1px solid ${s.c}25`, boxShadow: `0 0 20px -6px ${s.c}30` }}>
                      <i className={`fa-solid ${s.i} text-[14px]`} style={{ color: s.c }} />
                    </div>
                    <span className="font-bold text-[11px] tracking-wide">{s.t}</span>
                    <span className="text-[var(--t-muted)] text-[9px] mt-0.5">{s.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Server Telemetry Hari Ini */}
            <LiveStats />

            {/* Status chips */}
            <div className="flex items-center justify-between mb-5 px-0.5 anim-entrance" style={{ animationDelay: '180ms' }}>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[9px] font-extrabold tracking-wider bg-ok/[.08] border border-ok/20 text-ok">
                  <span className="w-[5px] h-[5px] rounded-full bg-ok" style={{ animation: 'pulseDot 1.7s infinite' }} />
                  ONLINE
                </span>
                {settings?.maxFileSizeMB > 0 ? (
                  <span className="px-2.5 py-1.5 rounded-[10px] text-[9px] font-extrabold tracking-wider bg-[#3b82f6]/8 border border-[#3b82f6]/20 text-[#93c5fd]">
                    MAX {settings.maxFileSizeMB}MB
                  </span>
                ) : (
                  <span className="px-2.5 py-1.5 rounded-[10px] text-[9px] font-extrabold tracking-wider bg-[#3b82f6]/8 border border-[#3b82f6]/20 text-[#93c5fd]">
                    UNLIMITED
                  </span>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[9px] font-extrabold tracking-wider bg-[#22d3ee]/8 border border-[#22d3ee]/20 text-[#67e8f9]">
                <i className="fa-regular fa-clock text-[8px] opacity-60" />
                {(() => { const m = settings?.expireMinutes || 60; return m >= 1440 ? `${Math.floor(m / 1440)} HARI` : m >= 60 ? `${Math.floor(m / 60)} JAM` : `${m}m` })()}
              </span>
            </div>

            {/* Announcement */}
            {settings?.announcement && (
              <div className="rounded-[16px] px-4 py-3 mb-5 anim-entrance border border-[#fbbf24]/20 bg-[#fbbf24]/[.04]" style={{ animationDelay: '195ms' }}>
                <div className="flex items-start gap-2.5">
                  <i className="fa-solid fa-bullhorn text-[#fbbf24] text-xs mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[9px] font-extrabold text-[#fbbf24]/70 mb-0.5 tracking-wider uppercase">Pengumuman</p>
                    <p className="text-[11px] font-medium leading-relaxed text-[var(--t-ink)]/80 whitespace-pre-line">{settings.announcement}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Banner */}
            {settings?.bannerText && !settings?.announcement && (
              <div className="rounded-[16px] px-4 py-3 mb-5 anim-entrance border border-[#3b82f6]/20 bg-[#3b82f6]/[.05]" style={{ animationDelay: '200ms' }}>
                <div className="flex items-start gap-2.5">
                  <i className="fa-solid fa-bullhorn text-[#22d3ee] text-xs mt-0.5 shrink-0" />
                  <span className="text-[11px] font-medium leading-relaxed text-[var(--t-ink)]/80">{settings.bannerText}</span>
                </div>
              </div>
            )}

            <div className="anim-entrance" style={{ animationDelay: '220ms' }}>
              <UploadPanel settings={settings} toast={toast} />
            </div>

            <div className="anim-entrance perf-section" style={{ animationDelay: '340ms' }}>
              <HistorySection />
            </div>

            <footer className="mt-10 text-center anim-fade" style={{ animationDelay: '500ms' }}>
              <div className="divider-glow mb-3" />
              <p className="text-[var(--t-muted)]/35 text-[9px] font-medium tracking-[.18em] uppercase">
                {footerText || `${settings?.siteName || 'SHIROWAHD'} · SWHDHLZ BY HILLZ`}
              </p>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
