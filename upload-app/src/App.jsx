import { useEffect, useState } from 'react'
import { SettingsProvider, useSettings } from './SettingsContext'
import { useToasts } from './Toasts'
import Toasts from './Toasts'
import Navbar from './Navbar'
import UploadPanel from './UploadPanel'
import HistorySection from './HistorySection'
import { IntroModal, FaqModal, AboutModal } from './Modals'
import { introSeen, markIntroSeen } from './api'

function Steps() {
  const steps = [
    { i: 'fa-cloud-arrow-up', t: 'Upload' },
    { i: 'fa-key', t: 'Dapatkan kode' },
    { i: 'fa-comments', t: '.claim di grup' },
  ]
  return (
    <div className="flex items-center justify-between gap-1 mb-4 px-1">
      {steps.map((s, i) => (
        <div key={s.t} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-brand/12 border border-line2/60 grid place-items-center relative">
              <i className={`fa-solid ${s.i} text-cyan text-[11px]`} />
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gradient-to-br from-brand2 to-brand text-white text-[8px] font-bold grid place-items-center shadow">{i + 1}</span>
            </div>
            <span className="text-muted text-[9px] font-semibold whitespace-nowrap">{s.t}</span>
          </div>
          {i < steps.length - 1 && <div className="flex-1 h-px mx-2 bg-gradient-to-r from-line2/60 to-transparent mb-4" />}
        </div>
      ))}
    </div>
  )
}

function Banner({ text }) {
  return (
    <div className="relative overflow-hidden rounded-2xl px-5 py-3.5 mb-4 border border-brand/20 bg-gradient-to-br from-brand/[.08] to-cyan/[.04] backdrop-blur-xl anim-emerge" style={{ animationDelay: '.05s' }}>
      <span className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
      <div className="flex items-start gap-3">
        <i className="fa-solid fa-bullhorn text-cyan mt-0.5 drop-shadow-[0_0_8px_rgba(59,200,255,.4)]" />
        <span className="text-[12px] font-semibold leading-relaxed text-[#c5d8f0]">{text}</span>
      </div>
    </div>
  )
}

function Page() {
  const { settings, error } = useSettings()
  const [showIntro, setShowIntro] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { toasts, add: toast } = useToasts()

  useEffect(() => {
    if (!introSeen()) setShowIntro(true)
  }, [])

  useEffect(() => {
    if (error) toast('Gagal memuat pengaturan: ' + error, 'error')
  }, [error])

  return (
    <>
      <Toasts toasts={toasts} />
      {showIntro && <IntroModal onDone={() => { markIntroSeen(); setShowIntro(false) }} />}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

      {/* Floating orbs */}
      <div className="orb pointer-events-none fixed rounded-full -top-[8%] left-[15%] w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(22,119,255,.07),transparent_70%)]" style={{ animation: 'orbA 14s ease-in-out infinite' }} />
      <div className="orb pointer-events-none fixed rounded-full bottom-[10%] -right-[5%] w-[220px] h-[220px] bg-[radial-gradient(circle,rgba(59,200,255,.05),transparent_70%)]" style={{ animation: 'orbA 18s ease-in-out infinite reverse' }} />

      <div className="relative z-10 min-h-dvh flex flex-col items-center px-4 pb-14">
        <div className="w-full max-w-[440px]">
          <Navbar onFaq={() => setFaqOpen(true)} onAbout={() => setAboutOpen(true)} />

          <header className="text-center mb-5 anim-emerge">
            <h1 className="font-display font-bold text-[26px] leading-tight tracking-tight">
              Upload <span className="grad-text">Media HD</span>
            </h1>
            <p className="text-muted text-xs mt-1.5">Kirim ke grup WhatsApp via kode klaim — cepat & tanpa ribet</p>
          </header>

          <Steps />
          {settings?.bannerText && <Banner text={settings.bannerText} />}

          <UploadPanel toast={toast} />

          <HistorySection />

          <footer className="mt-8 text-center">
            <p className="text-muted/70 text-[10px] font-medium">
              {settings?.siteName || 'SHIROWAHD'} • Powered by WhatsApp Bot
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <Page />
    </SettingsProvider>
  )
}
