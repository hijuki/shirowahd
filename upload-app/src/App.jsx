import { useEffect, useMemo, useRef, useState } from 'react'
import { SettingsProvider, useSettings } from './SettingsContext'
import { useToasts } from './Toasts'
import Toasts from './Toasts'
import Navbar from './Navbar'
import UploadPanel from './UploadPanel'
import HistorySection from './HistorySection'
import { IntroModal, FaqModal, AboutModal } from './Modals'
import { introSeen, markIntroSeen } from './api'

/* Floating particles background */
function Particles() {
  const dots = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: 30 + Math.random() * 65,
      delay: Math.random() * 4,
      dur: 3.5 + Math.random() * 3,
      size: 2 + Math.random() * 3,
      hue: ['129,140,248', '34,211,238', '167,139,250', '244,114,182'][i % 4],
    })), [])
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {dots.map(d => (
        <span key={d.id} className="particle" style={{
          left: d.left + '%', top: d.top + '%',
          width: d.size, height: d.size,
          background: `rgba(${d.hue},.65)`,
          boxShadow: `0 0 ${d.size * 3}px rgba(${d.hue},.6)`,
          animationDelay: d.delay + 's',
          animationDuration: d.dur + 's',
        }} />
      ))}
    </div>
  )
}

function Steps() {
  const steps = [
    { i: 'fa-cloud-arrow-up', t: 'Upload' },
    { i: 'fa-key', t: 'Dapatkan kode' },
    { i: 'fa-comments', t: '.claim di grup' },
  ]
  return (
    <div className="flex items-start justify-between gap-1 mb-5 px-2 anim-emerge" style={{ animationDelay: '.08s' }}>
      {steps.map((s, i) => (
        <div key={s.t} className="flex items-start flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-11 h-11 rounded-2xl icon-tile float-y hover-lift cursor-default" style={{ animationDelay: `${i * 0.6}s` }}>
              <i className={`fa-solid ${s.i} text-cyan text-[13px]`} />
              <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full bg-gradient-to-br from-violet to-brand text-white text-[9px] font-extrabold grid place-items-center shadow-[0_0_12px_rgba(99,102,241,.7)] border border-white/20">{i + 1}</span>
            </div>
            <span className="text-muted text-[9px] font-bold whitespace-nowrap tracking-wide uppercase">{s.t}</span>
          </div>
          {i < steps.length - 1 && <div className="step-line mt-5" />}
        </div>
      ))}
    </div>
  )
}

function Banner({ text }) {
  return (
    <div className="border-flow rounded-2xl px-5 py-3.5 mb-4 anim-emerge hover-lift" style={{ animationDelay: '.1s' }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 shrink-0 rounded-xl icon-tile breathe">
          <i className="fa-solid fa-bullhorn text-cyan text-xs" />
        </div>
        <span className="text-[12px] font-semibold leading-relaxed text-indigo-100/90">{text}</span>
      </div>
    </div>
  )
}

/* Feature ticker under hero */
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
    <div className="ticker-wrap rounded-full border border-line bg-black/20 py-2 mb-4 anim-emerge" style={{ animationDelay: '.14s' }}>
      <div className="ticker-inner px-4">
        {doubled.map(([icon, label], i) => (
          <span key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-muted whitespace-nowrap">
            <i className={`fa-solid ${icon} text-cyan/80 text-[9px]`} />{label}
            <span className="ml-6 opacity-30">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Header({ onFaq }) {
  const { settings } = useSettings()
  const titleRef = useRef(null)
  // subtle parallax tilt on pointer move
  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    const move = e => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - .5
      const y = (e.clientY - r.top) / r.height - .5
      el.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`
    }
    const reset = () => { el.style.transform = '' }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', reset)
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', reset) }
  }, [])

  return (
    <header className="text-center mb-7 anim-emerge" style={{ animationDelay: '.05s' }}>
      {/* Logo mark */}
      <div className="relative inline-block mb-4">
        <div className="w-[74px] h-[74px] mx-auto rounded-[26px] bg-gradient-to-br from-brand via-violet to-cyan p-[2px] shadow-[0_0_50px_-8px_rgba(99,102,241,.8)] float-y">
          <div className="w-full h-full rounded-[24px] bg-[#06041c]/90 grid place-items-center backdrop-blur">
            <i className="fa-brands fa-whatsapp text-[34px] grad-text" />
          </div>
        </div>
        <span className="orb" style={{ top: '50%', left: '50%', marginTop: '-3px', marginLeft: '-3px' }} />
        <span className="absolute inset-0 rounded-[26px] border border-brand2/40 animate-ping [animation-duration:2.5s]" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full chip text-[9px] text-cyan bg-cyan/[.07] border border-cyan/25 mb-3">
        <i className="fa-solid fa-bolt text-[8px]" />
        FAST &amp; SECURE UPLOAD
      </div>

      <h1 ref={titleRef} className="font-display font-bold text-[32px] leading-[1.12] tracking-tight transition-transform duration-200 will-change-transform">
        Upload <span className="grad-text glitch-hover">Media HD</span>
      </h1>
      <p className="text-muted text-xs mt-2 max-w-[300px] mx-auto leading-relaxed">
        Kirim video &amp; foto ke grup WhatsApp lewat kode klaim — cepat, aman, tanpa ribet
      </p>

      {/* Status chips */}
      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
        <span className="chip flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold bg-emerald-400/[.07] border border-emerald-400/25 text-emerald-300">
          <span className="w-[6px] h-[6px] rounded-full bg-emerald-400" style={{ animation: 'pulseDot 1.7s infinite' }} />
          SERVER ONLINE
        </span>
        {settings?.maxFileSizeMB > 0 && (
          <span className="chip flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold bg-brand/10 border border-line2/50 text-indigo-200">
            <i className="fa-solid fa-weight-hanging text-[8px]" />MAX {settings.maxFileSizeMB}MB
          </span>
        )}
        <span className="chip flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-bold bg-violet/10 border border-violet/30 text-violet-300">
          <i className="fa-regular fa-clock text-[8px]" />EXPIRE {settings?.expireMinutes || 60}MENIT
        </span>
      </div>

      {/* Quick FAQ link */}
      <button onClick={onFaq} className="mt-4 btn-outline rounded-xl px-4 py-2 text-[10px] font-bold text-muted hover:text-ink inline-flex items-center gap-1.5">
        <i className="fa-solid fa-circle-question text-cyan text-[10px]" />Cara pakai?
        <i className="fa-solid fa-arrow-right text-[8px] opacity-60" />
      </button>
    </header>
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
      {/* Background layers */}
      <div className="bg-aurora" />
      <div className="bg-grid" />
      <div className="bg-noise" />
      <Particles />

      <Toasts toasts={toasts} />
      {showIntro && <IntroModal onDone={() => { markIntroSeen(); setShowIntro(false) }} />}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

      <div className="relative z-10 min-h-dvh flex flex-col items-center px-4 pb-16 pt-2">
        <div className="w-full max-w-[460px]">
          <Navbar onFaq={() => setFaqOpen(true)} onAbout={() => setAboutOpen(true)} />

          <Header onFaq={() => setFaqOpen(true)} />

          <FeatureTicker />
          <Steps />
          {settings?.bannerText && <Banner text={settings.bannerText} />}

          <UploadPanel toast={toast} />

          <HistorySection />

          <footer className="mt-10 text-center anim-fade" style={{ animationDelay: '.3s' }}>
            <div className="divider-glow mb-4" />
            <p className="text-muted/60 text-[10px] font-medium tracking-wide">
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
