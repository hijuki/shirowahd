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
    loadSettings().then(setSettings).catch(e => toast('Gagal memuat pengaturan: ' + e.message, 'error'))
  }, [])
  useEffect(reload, [reload])
  useEffect(() => { setShowWelcome(true) }, [])

  return (
    <>
      <div className="bg-aurora" />
      <div className="bg-grid" />
      <div className="bg-noise" />

      <Toasts toasts={toasts} />
      {showWelcome && <IntroModal onDone={() => setShowWelcome(false)} />}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

      <div className="relative z-10 min-h-dvh flex flex-col items-center px-4 pb-20 pt-2">
        <div className="w-full max-w-[440px]">
          <Navbar settings={settings} onFaq={() => setFaqOpen(true)} onAbout={() => setAboutOpen(true)} />

          {/* Hero */}
          <header className="text-center mb-8 anim-entrance" style={{ animationDelay: '60ms' }}>
            <div className="relative inline-flex items-center justify-center w-[72px] h-[72px] rounded-[22px] bg-gradient-to-br from-[#22d3ee] via-[#3b82f6] to-[#34d399] mb-4 shadow-[0_0_60px_-10px_rgba(34,211,238,.6)]">
              <span className="absolute inset-[1px] rounded-[21px] bg-[#04070f]/60 backdrop-blur-sm" />
              <i className="fa-brands fa-whatsapp text-white text-3xl relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,.3)]" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[28px] leading-tight tracking-tight">
              Upload <span className="grad-text">Media HD</span>
            </h1>
            <p className="text-[#7e90ad] text-[12px] mt-2 max-w-[300px] mx-auto leading-relaxed">
              Kirim video &amp; foto ke grup WhatsApp<br/>lewat kode klaim — cepat &amp; mudah
            </p>
          </header>

          {/* 3-step mini guide */}
          <div className="flex items-stretch gap-2 mb-6 anim-entrance" style={{ animationDelay: '120ms' }}>
            {[
              { n: 1, t: 'Upload file', i: 'fa-cloud-arrow-up', c: '#22d3ee' },
              { n: 2, t: 'Dapat kode', i: 'fa-key', c: '#3b82f6' },
              { n: 3, t: '.claim di grup', i: 'fa-comments', c: '#34d399' },
            ].map((s, i) => (
              <div key={s.n} className="flex-1 flex flex-col items-center gap-2 py-3 px-2 rounded-[16px] bg-white/[.03] border border-white/[.06] hover:border-white/[.12] transition-all duration-[250ms]" style={{ transitionTimingFunction: 'var(--ease-out)' }}>
                <div className="w-9 h-9 rounded-[12px] grid place-items-center" style={{ background: `${s.c}15`, border: `1px solid ${s.c}30` }}>
                  <i className={`fa-solid ${s.i} text-[13px]`} style={{ color: s.c }} />
                </div>
                <span className="text-[10px] font-bold text-[#7e90ad] text-center leading-tight">{s.t}</span>
              </div>
            ))}
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between mb-5 px-1 anim-entrance" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[9px] font-extrabold tracking-wider bg-[#34d399]/[.08] border border-[#34d399]/25 text-[#34d399]">
                <span className="w-[6px] h-[6px] rounded-full bg-[#34d399]" style={{ animation: 'pulseDot 1.7s infinite' }} />
                ONLINE
              </span>
              {settings?.maxFileSizeMB > 0 && (
                <span className="px-2.5 py-1 rounded-[8px] text-[9px] font-extrabold tracking-wider bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#93c5fd]">
                  MAX {settings.maxFileSizeMB}MB
                </span>
              )}
            </div>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[9px] font-extrabold tracking-wider bg-[#22d3ee]/10 border border-[#22d3ee]/25 text-[#67e8f9]">
              <i className="fa-regular fa-clock text-[8px] opacity-70" />
              {settings?.expireMinutes || 60}m
            </span>
          </div>

          {/* Banner */}
          {settings?.bannerText && (
            <div className="rounded-[16px] px-4 py-3 mb-5 anim-entrance border border-[#3b82f6]/20 bg-[#3b82f6]/[.06]" style={{ animationDelay: '180ms' }}>
              <div className="flex items-start gap-2.5">
                <i className="fa-solid fa-bullhorn text-[#22d3ee] text-xs mt-0.5 shrink-0" />
                <span className="text-[11px] font-medium leading-relaxed text-[#e8f1ff]/85">{settings.bannerText}</span>
              </div>
            </div>
          )}

          <div className="anim-entrance" style={{ animationDelay: '200ms' }}>
            <UploadPanel settings={settings} toast={toast} />
          </div>

          <div className="anim-entrance" style={{ animationDelay: '280ms' }}>
            <HistorySection />
          </div>

          <footer className="mt-10 text-center anim-fade" style={{ animationDelay: '400ms' }}>
            <div className="divider-glow mb-3" />
            <p className="text-[#7e90ad]/40 text-[9px] font-medium tracking-widest uppercase">
              {settings?.siteName || 'SHIROWAHD'} · Upload &amp; Claim
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}
