'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Logo from '@/components/up/Logo'
import Navbar from '@/components/up/Navbar'
import UploadPanel from '@/components/up/UploadPanel'
import HistorySection from '@/components/up/HistorySection'
import Toasts, { useToasts } from '@/components/up/Toasts'
import { IntroModal, FaqModal, AboutModal } from '@/components/up/Modals'
import { loadSettings } from '@/lib/up-api'

/* Scroll reveal hook — adds .in-view when element enters viewport */
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target) } }),
      { threshold: 0.12 }
    )
    el.querySelectorAll('.reveal').forEach(n => obs.observe(n))
    return () => obs.disconnect()
  }, [])
  return ref
}

function SkeletonPage() {
  return (
    <div className="w-full max-w-[480px] mx-auto px-4 pt-6 space-y-4">
      <div className="skeleton h-16" />
      <div className="skeleton h-36" />
      <div className="skeleton h-72" />
    </div>
  )
}

const MARQUEE_ITEMS = ['NO COMPRESS', '★', 'ORIGINAL QUALITY', '★', 'FAST UPLOAD', '★', 'AUTO CLAIM BOT', '★', 'SECURE & TEMPORARY', '★']

const DEFAULT_SETTINGS = {
  siteName: 'SHIROWAHD',
  heroTitle: 'SHIRO',
  heroSubtitle: 'WA-HD',
  heroDesc: 'Kirim video & foto resolusi penuh tanpa kompresi ke grup WhatsApp via tiket klaim otomatis.',
  expireMinutes: 60,
}

export default function UploaderPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [showWelcome, setShowWelcome] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { toasts, add: toast } = useToasts()
  const revealRef = useReveal()

  const reload = useCallback(() => {
    loadSettings()
      .then(setSettings)
      .catch(e => toast('Gagal memuat pengaturan: ' + e.message, 'error'))
  }, [toast])

  useEffect(reload, [reload])

  useEffect(() => {
    const skip = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('nowelcome')
    if (settings && settings.showWelcome !== false && !skip) setShowWelcome(true)
  }, [settings])

  const heroTitle = settings?.heroTitle || 'SHIRO'
  const heroHighlight = settings?.heroSubtitle || 'WA-HD'
  const heroDesc = settings?.heroDesc || 'Kirim video & foto resolusi penuh tanpa kompresi ke grup WhatsApp via tiket klaim otomatis.'
  const logoUrl = settings?.logoUrl || ''
  const footerText = settings?.footerText || ''

  return (
    <>
      <Toasts toasts={toasts} />
      {showWelcome && <IntroModal onDone={() => setShowWelcome(false)} settings={settings} />}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

      {!settings ? (
        <SkeletonPage />
      ) : (
        <div ref={revealRef} className="anim-ready relative z-10 min-h-dvh flex flex-col items-center px-4 pb-16 pt-4">
          <div className="w-full max-w-[480px] space-y-5">

            {/* Navbar */}
            <Navbar settings={settings} onFaq={() => setFaqOpen(true)} onAbout={() => setAboutOpen(true)} />

            {/* Announcement */}
            {settings?.announcement && (
              <div className="card p-3.5 text-[12px] flex items-start gap-3 anim-slide-up" style={{ background: 'var(--t-accent)' }}>
                <div className="w-7 h-7 grid place-items-center shrink-0" style={{ border: '2px solid var(--t-hard)', borderRadius: 9, background: 'var(--t-surface)', boxShadow: 'var(--sh-xs)' }}>
                  <i className="fa-solid fa-bullhorn text-[11px]" />
                </div>
                <p className="leading-snug font-bold flex-1 pt-1" style={{ color: '#111111' }}>{settings.announcement}</p>
              </div>
            )}

            {/* HERO */}
            <header className="reveal card card-3d-hover p-5 relative overflow-hidden">
              {/* Giant ghost word */}
              <span aria-hidden className="font-display absolute -top-3 -right-2 text-[92px] leading-none select-none pointer-events-none"
                style={{ color: 'transparent', WebkitTextStroke: '2px var(--t-line-soft)' }}>
                HD
              </span>

              <div className="relative">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 mb-3 wobble"
                  style={{ border: '2px solid var(--t-hard)', borderRadius: 99, background: 'var(--t-accent)', boxShadow: 'var(--sh-xs)' }}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#111111] opacity-70" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#111111]" />
                  </span>
                  <span className="font-mono text-[9px] font-bold tracking-[0.14em] uppercase" style={{ color: '#111111' }}>
                    Online Gateway
                  </span>
                </div>

                <h1 className="font-display text-[40px] leading-[0.95] text-[var(--t-ink)]">
                  {heroTitle}<br />
                  <span className="inline-block px-2 -rotate-1" style={{ background: 'var(--t-accent)', border: '2px solid var(--t-hard)', borderRadius: 12, boxShadow: '4px 4px 0 var(--t-hard)', color: '#111111' }}>
                    {heroHighlight}
                  </span>
                </h1>

                <p className="text-[13px] text-[var(--t-muted)] leading-relaxed mt-4 font-medium max-w-[90%]">
                  {heroDesc}
                </p>
              </div>

              {/* Spec strip */}
              <div className="grid grid-cols-3 gap-2 mt-4 relative">
                {[
                  { l: 'Kualitas', v: 'ORIGINAL', c: 'var(--t-accent-2)', tc: '#fff' },
                  { l: 'Berlaku', v: `${settings?.expireMinutes || 60} MENIT`, c: 'var(--t-surface)', tc: 'var(--t-ink)' },
                  { l: 'Engine', v: 'V2.4 CORE', c: 'var(--t-accent)', tc: '#111111' },
                ].map(s => (
                  <div key={s.l} className="p-2 text-center" style={{ border: '2px solid var(--t-hard)', borderRadius: 11, background: s.c, color: s.tc, boxShadow: 'var(--sh-xs)' }}>
                    <div className="font-mono text-[8px] font-bold uppercase tracking-wider opacity-80">{s.l}</div>
                    <div className="font-display text-[10px] mt-0.5 tnum">{s.v}</div>
                  </div>
                ))}
              </div>
            </header>

            {/* MARQUEE */}
            <div className="marquee reveal py-2 -mx-1" style={{ borderTop: '2px solid var(--t-hard)', borderBottom: '2px solid var(--t-hard)', background: 'var(--t-surface)' }}>
              <div className="marquee-track">
                {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((m, i) => (
                  <span key={i} className={`font-display text-[12px] tracking-wide ${m === '★' ? '' : ''}`} style={{ color: m === '★' ? 'var(--t-pop)' : 'var(--t-ink)' }}>{m}</span>
                ))}
              </div>
            </div>

            {/* STEPS */}
            <div className="grid grid-cols-3 gap-2.5 reveal">
              {[
                { no: '01', title: 'UPLOAD', sub: 'Pilih media', icon: 'fa-cloud-arrow-up', bg: 'var(--t-accent)', tc: '#111111' },
                { no: '02', title: 'TIKET', sub: 'Dapat kode', icon: 'fa-ticket', bg: 'var(--t-surface)', tc: 'var(--t-ink)' },
                { no: '03', title: 'KLAIM', sub: 'Di grup WA', icon: 'fa-paper-plane', bg: 'var(--t-accent-2)', tc: '#fff' },
              ].map((s, i) => (
                <div key={s.no} className="card hover-lift p-3 text-center anim-pop-spring" style={{ animationDelay: `${i * 90}ms` }}>
                  <div className="w-10 h-10 mx-auto grid place-items-center mb-2" style={{ border: '2px solid var(--t-hard)', borderRadius: 12, background: s.bg, color: s.tc, boxShadow: 'var(--sh-xs)' }}>
                    <i className={`fa-solid ${s.icon} text-[15px]`} />
                  </div>
                  <div className="font-display text-[11px] text-[var(--t-ink)]">{s.title}</div>
                  <div className="font-mono text-[8.5px] font-bold text-[var(--t-muted)] uppercase tracking-wide mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Upload */}
            <div className="reveal"><UploadPanel settings={settings} onToast={toast} /></div>

            {/* History */}
            <div className="reveal"><HistorySection settings={settings} onToast={toast} /></div>

            {/* Footer */}
            <footer className="text-center pt-4 pb-2 reveal space-y-3">
              <div className="perforated-line" />
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 grid place-items-center" style={{ border: '2px solid var(--t-hard)', borderRadius: 8, background: 'var(--t-accent)', boxShadow: 'var(--sh-xs)' }}>
                  <Logo size={13} />
                </div>
                <span className="font-display text-[11px] text-[var(--t-ink)]">SHIROWAHD</span>
                <span className="font-mono text-[9px] text-[var(--t-muted)]">• DEV HILLZ •</span>
              </div>
              {footerText && <p className="text-[11px] font-medium text-[var(--t-muted)]">{footerText}</p>}
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
