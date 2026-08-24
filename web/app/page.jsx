'use client'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/up/Navbar'
import UploadPanel from '@/components/up/UploadPanel'
import HistorySection from '@/components/up/HistorySection'
import Toasts, { useToasts } from '@/components/up/Toasts'
import { IntroModal, FaqModal, AboutModal } from '@/components/up/Modals'
import { loadSettings } from '@/lib/up-api'

export default function UploaderPage() {
  const [settings, setSettings] = useState(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { toasts, add: toast } = useToasts()

  const reload = useCallback(() => {
    loadSettings().then(setSettings).catch(() => {})
  }, [])
  useEffect(reload, [reload])
  useEffect(() => {
    // respect admin toggle
    if (settings && settings.showWelcome !== false) setShowWelcome(true)
  }, [settings])

  return (
    <>
      <div className="bg-aurora" />
      <div className="bg-grid" />
      <div className="bg-noise" />

      <Toasts toasts={toasts} />
      {showWelcome && <IntroModal onDone={() => setShowWelcome(false)} settings={settings} />}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

      <div className="relative z-10 min-h-dvh flex flex-col items-center px-4 pb-16 pt-2">
        <div className="w-full max-w-[440px]">
          <Navbar settings={settings} onFaq={() => setFaqOpen(true)} onAbout={() => setAboutOpen(true)} />

          {/* Hero — compact */}
          <header className="text-center mb-6 anim-entrance" style={{ animationDelay: '50ms' }}>
            <div className="relative inline-block mb-4">
              <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] grid place-items-center shadow-lg">
                <i className="fa-brands fa-whatsapp text-white text-[28px]" />
              </div>
            </div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[24px] leading-tight tracking-tight">
              {settings?.siteName || 'SHIROWAHD'}
            </h1>
            <p className="text-[#7e90ad] text-xs mt-1.5 max-w-[280px] mx-auto leading-relaxed">
              {settings?.siteSubtitle || 'Upload & claim media HD ke grup WhatsApp'}
            </p>
          </header>

          {/* Steps — minimal */}
          <div className="flex items-center justify-center gap-2 mb-5 anim-entrance" style={{ animationDelay: '100ms' }}>
            {[
              { t: 'Upload', i: 'fa-cloud-arrow-up', c: '#22d3ee' },
              { t: 'Kode', i: 'fa-hashtag', c: '#3b82f6' },
              { t: 'Claim', i: 'fa-comments', c: '#34d399' },
            ].map((s, i) => (
              <div key={s.t} className="flex items-center gap-1">
                {i > 0 && <i className="fa-solid fa-chevron-right text-[7px] text-[#7e90ad]/20 mr-1" />}
                <span className="w-7 h-7 rounded-lg grid place-items-center" style={{ background: `${s.c}10` }}>
                  <i className={`fa-solid ${s.i} text-[10px]`} style={{ color: s.c }} />
                </span>
                <span className="text-[10px] font-semibold text-[#7e90ad]">{s.t}</span>
              </div>
            ))}
          </div>

          {/* Status line */}
          <div className="flex items-center justify-between mb-4 px-0.5 anim-entrance" style={{ animationDelay: '130ms' }}>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-bold tracking-wider bg-[#34d399]/8 border border-[#34d399]/15 text-[#34d399]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399]" style={{ animation: 'pulseDot 2s infinite' }} />
                Online
              </span>
              {settings?.maxFileSizeMB > 0 && (
                <span className="px-2 py-1 rounded-lg text-[9px] font-bold text-[#7e90ad] bg-white/[.03] border border-white/[.05]">
                  Maks {settings.maxFileSizeMB}MB
                </span>
              )}
            </div>
            <span className="text-[9px] font-mono text-[#7e90ad]/50">{settings?.expireMinutes || 60}m expire</span>
          </div>

          {/* Announcement */}
          {settings?.announcement && (
            <div className="rounded-xl px-4 py-3 mb-4 bg-[#fbbf24]/[.04] border border-[#fbbf24]/10 anim-entrance" style={{ animationDelay: '140ms' }}>
              <div className="flex items-start gap-2.5">
                <i className="fa-solid fa-bullhorn text-[#fbbf24] text-xs mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-[#fbbf24]/80 mb-0.5">Pengumuman</p>
                  <p className="text-[11px] text-[#e8f1ff]/70 leading-relaxed whitespace-pre-line">{settings.announcement}</p>
                </div>
              </div>
            </div>
          )}

          {/* Banner (short) */}
          {settings?.bannerText && !settings?.announcement && (
            <div className="rounded-xl px-4 py-2.5 mb-4 bg-[#22d3ee]/[.04] border border-[#22d3ee]/10 anim-entrance" style={{ animationDelay: '140ms' }}>
              <p className="text-[11px] text-[#7e90ad] flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-[#22d3ee] text-[10px]" />
                {settings.bannerText}
              </p>
            </div>
          )}

          <div className="anim-entrance" style={{ animationDelay: '180ms' }}>
            <UploadPanel settings={settings} toast={toast} />
          </div>

          <div className="anim-entrance" style={{ animationDelay: '280ms' }}>
            <HistorySection />
          </div>

          <footer className="mt-8 text-center">
            <p className="text-[#7e90ad]/25 text-[9px] tracking-widest font-bold uppercase">
              {settings?.siteName || 'SHIROWAHD'} · SWHDHLZ BY HILLZ
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}
