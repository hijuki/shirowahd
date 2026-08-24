'use client'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/up/Navbar'
import UploadPanel from '@/components/up/UploadPanel'
import HistorySection from '@/components/up/HistorySection'
import Toasts, { useToasts } from '@/components/up/Toasts'
import { IntroModal, FaqModal, AboutModal } from '@/components/up/Modals'
import { loadSettings } from '@/lib/up-api'

function Steps() {
  const steps = [
    { n: 1, t: 'Upload file', i: 'fa-cloud-arrow-up' },
    { n: 2, t: 'Dapat kode', i: 'fa-key' },
    { n: 3, t: '.claim di grup', i: 'fa-comments' },
  ]
  return (
    <div className="flex items-center gap-3 mb-6 px-1 anim-entrance" style={{ animationDelay: '60ms' }}>
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] text-white text-[10px] font-extrabold grid place-items-center shadow-[0_0_12px_rgba(34,211,238,.4)]">
            {s.n}
          </span>
          <span className="text-[#7e90ad] text-[10px] font-bold truncate">{s.t}</span>
          {i < steps.length - 1 && <div className="flex-1 h-px bg-white/[.06] ml-1 hidden sm:block" />}
        </div>
      ))}
    </div>
  )
}

function Banner({ text }) {
  if (!text) return null
  return (
    <div className="rounded-[14px] px-4 py-3 mb-5 anim-entrance border border-[#3b82f6]/20 bg-[#3b82f6]/[.06]" style={{ animationDelay: '100ms' }}>
      <div className="flex items-start gap-2.5">
        <i className="fa-solid fa-bullhorn text-[#22d3ee] text-xs mt-0.5 shrink-0" />
        <span className="text-[11px] font-medium leading-relaxed text-[#e8f1ff]/85">{text}</span>
      </div>
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
  }, [])
  useEffect(reload, [reload])

  // Always show welcome popup on every visit
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

      <div className="relative z-10 min-h-dvh flex flex-col items-center px-4 pb-16 pt-2">
        <div className="w-full max-w-[440px]">
          <Navbar settings={settings} onFaq={() => setFaqOpen(true)} onAbout={() => setAboutOpen(true)} />

          {/* Header — compact */}
          <header className="text-center mb-6 anim-entrance" style={{ animationDelay: '40ms' }}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-[18px] bg-gradient-to-br from-[#3b82f6] via-[#22d3ee] to-[#34d399] mb-3 shadow-[0_0_40px_-6px_rgba(34,211,238,.5)]">
              <i className="fa-brands fa-whatsapp text-white text-2xl" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] font-bold text-[26px] leading-tight tracking-tight">
              Upload <span className="grad-text">Media HD</span>
            </h1>
            <p className="text-[#7e90ad] text-[11px] mt-1.5 max-w-[280px] mx-auto leading-relaxed">
              Kirim video &amp; foto ke grup WhatsApp lewat kode klaim
            </p>
            <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
              <span className="chip flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold bg-emerald-400/[.07] border border-emerald-400/25 text-emerald-300">
                <span className="w-[5px] h-[5px] rounded-full bg-emerald-400" style={{ animation: 'pulseDot 1.7s infinite' }} />
                ONLINE
              </span>
              {settings?.maxFileSizeMB > 0 && (
                <span className="chip px-2.5 py-1 text-[9px] font-bold bg-[#3b82f6]/10 border border-white/[.07] text-[#93c5fd]">
                  MAX {settings.maxFileSizeMB}MB
                </span>
              )}
              <span className="chip px-2.5 py-1 text-[9px] font-bold bg-[#22d3ee]/10 border border-[#22d3ee]/30 text-[#67e8f9]">
                {settings?.expireMinutes || 60} MENIT
              </span>
            </div>
          </header>

          <Steps />
          <Banner text={settings?.bannerText} />

          <UploadPanel settings={settings} toast={toast} />

          <HistorySection />

          <footer className="mt-8 text-center anim-fade" style={{ animationDelay: '250ms' }}>
            <div className="divider-glow mb-3" />
            <p className="text-[#7e90ad]/50 text-[9px] font-medium tracking-wide">
              {settings?.siteName || 'SHIROWAHD'} · WhatsApp Bot Upload
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}
