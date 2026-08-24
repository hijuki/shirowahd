'use client'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/up/Navbar'
import UploadPanel from '@/components/up/UploadPanel'
import HistorySection from '@/components/up/HistorySection'
import Toasts, { useToasts } from '@/components/up/Toasts'
import { IntroModal, FaqModal, AboutModal } from '@/components/up/Modals'
import { loadSettings, introSeen, markIntroSeen } from '@/lib/up-api'

function Steps() {
  const steps = [
    { i: 'fa-cloud-arrow-up', t: 'Upload' },
    { i: 'fa-key', t: 'Dapatkan kode' },
    { i: 'fa-comments', t: '.claim di grup' },
  ]
  return (
    <div className="flex items-start justify-between gap-1 mb-5 px-2 anim-entrance" style={{ animationDelay: '60ms' }}>
      {steps.map((s, i) => (
        <div key={s.t} className="flex items-start flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-11 h-11 rounded-[14px] icon-tile hover-lift cursor-default">
              <i className={`fa-solid ${s.i} text-[#22d3ee] text-[13px]`} />
              <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] text-white text-[9px] font-extrabold grid place-items-center shadow-[0_0_12px_rgba(34,211,238,.6)] border border-white/20">{i + 1}</span>
            </div>
            <span className="text-[#7e90ad] text-[9px] font-bold whitespace-nowrap tracking-wide uppercase">{s.t}</span>
          </div>
          {i < steps.length - 1 && <div className="step-line mt-5" />}
        </div>
      ))}
    </div>
  )
}

function Banner({ text }) {
  return (
    <div className="card rounded-[16px] px-5 py-3.5 mb-4 anim-entrance hover-lift" style={{ animationDelay: '120ms', borderColor: 'rgba(59,130,246,.25)' }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 shrink-0 rounded-[12px] icon-tile">
          <i className="fa-solid fa-bullhorn text-[#22d3ee] text-xs" />
        </div>
        <span className="text-[12px] font-semibold leading-relaxed text-[#e8f1ff]/90">{text}</span>
      </div>
    </div>
  )
}

function FeatureTicker() {
  const items = [
    ['fa-bolt', 'Upload Kilat'],
    ['fa-shield-halved', 'Aman & Privat'],
    ['fa-film', 'Auto Convert HD'],
    ['fa-layer-group', 'Multi File'],
    ['fa-clock', 'Auto Expire'],
    ['fa-mobile-screen', 'Mobile Friendly'],
  ]
  const doubled = [...items, ...items]
  return (
    <div className="ticker-wrap rounded-full border border-white/[.07] bg-black/20 py-2 mb-4 anim-entrance" style={{ animationDelay: '120ms' }}>
      <div className="ticker-inner px-4">
        {doubled.map(([icon, label], i) => (
          <span key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-[#7e90ad] whitespace-nowrap">
            <i className={`fa-solid ${icon} text-[#22d3ee]/80 text-[9px]`} />{label}
            <span className="ml-6 opacity-30">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Header({ settings, onFaq }) {
  return (
    <header className="text-center mb-7 anim-entrance" style={{ animationDelay: '60ms' }}>
      {/* Logo mark */}
      <div className="relative inline-block mb-4">
        <div className="w-[74px] h-[74px] mx-auto rounded-[24px] bg-gradient-to-br from-[#3b82f6] via-[#22d3ee] to-[#34d399] p-[2px] shadow-[0_0_50px_-8px_rgba(59,130,246,.7)]">
          <div className="w-full h-full rounded-[22px] bg-[#04070f]/95 grid place-items-center backdrop-blur">
            <i className="fa-brands fa-whatsapp text-[34px] grad-text" />
          </div>
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full chip text-[9px] text-[#22d3ee] bg-[#22d3ee]/[.07] border border-[#22d3ee]/25 mb-3">
        <i className="fa-solid fa-bolt text-[8px]" />
        FAST &amp; SECURE UPLOAD
      </div>

      <h1 className="font-[family-name:var(--font-display)] font-bold text-[32px] leading-[1.12] tracking-tight">
        Upload <span className="grad-text">Media HD</span>
      </h1>
      <p className="text-[#7e90ad] text-xs mt-2 max-w-[300px] mx-auto leading-relaxed">
        Kirim video &amp; foto ke grup WhatsApp lewat kode klaim — cepat, aman, tanpa ribet
      </p>

      {/* Status chips */}
      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
        <span className="chip flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold bg-emerald-400/[.07] border border-emerald-400/25 text-emerald-300">
          <span className="w-[6px] h-[6px] rounded-full bg-emerald-400" style={{ animation: 'pulseDot 1.7s infinite' }} />
          SERVER ONLINE
        </span>
        {settings?.maxFileSizeMB > 0 && (
          <span className="chip flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold bg-[#3b82f6]/10 border border-white/[.07] text-[#93c5fd]">
            <i className="fa-solid fa-weight-hanging text-[8px]" />MAX {settings.maxFileSizeMB}MB
          </span>
        )}
        <span className="chip flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold bg-[#22d3ee]/10 border border-[#22d3ee]/30 text-[#67e8f9]">
          <i className="fa-regular fa-clock text-[8px]" />EXPIRE {settings?.expireMinutes || 60}MENIT
        </span>
      </div>

      {/* Quick FAQ link */}
      <button onClick={onFaq} className="mt-4 btn-outline rounded-[12px] px-4 py-2 text-[10px] font-bold text-[#7e90ad] hover:text-[#e8f1ff] inline-flex items-center gap-1.5">
        <i className="fa-solid fa-circle-question text-[#22d3ee] text-[10px]" />Cara pakai?
        <i className="fa-solid fa-arrow-right text-[8px] opacity-60" />
      </button>
    </header>
  )
}

export default function UploaderPage() {
  const [settings, setSettings] = useState(null)
  const [settingsError, setSettingsError] = useState(null)
  const [showIntro, setShowIntro] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { toasts, add: toast } = useToasts()

  const reload = useCallback(() => {
    loadSettings().then(setSettings).catch(e => setSettingsError(e.message))
  }, [])
  useEffect(reload, [reload])

  useEffect(() => {
    if (typeof window !== 'undefined' && !introSeen()) setShowIntro(true)
  }, [])

  useEffect(() => {
    if (settingsError) toast('Gagal memuat pengaturan: ' + settingsError, 'error')
  }, [settingsError])

  return (
    <>
      {/* Background layers */}
      <div className="bg-aurora" />
      <div className="bg-grid" />
      <div className="bg-noise" />

      <Toasts toasts={toasts} />
      {showIntro && <IntroModal onDone={() => { markIntroSeen(); setShowIntro(false) }} />}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

      <div className="relative z-10 min-h-dvh flex flex-col items-center px-4 pb-16 pt-2">
        <div className="w-full max-w-[460px]">
          <Navbar settings={settings} onFaq={() => setFaqOpen(true)} onAbout={() => setAboutOpen(true)} />

          <Header settings={settings} onFaq={() => setFaqOpen(true)} />

          <FeatureTicker />
          <Steps />
          {settings?.bannerText && <Banner text={settings.bannerText} />}

          <UploadPanel settings={settings} toast={toast} />

          <HistorySection />

          <footer className="mt-10 text-center anim-fade" style={{ animationDelay: '300ms' }}>
            <div className="divider-glow mb-4" />
            <p className="text-[#7e90ad]/60 text-[10px] font-medium tracking-wide">
              {settings?.siteName || 'SHIROWAHD'} • Powered by WhatsApp Bot
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}
