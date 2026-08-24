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
  useEffect(() => {
    // respect admin toggle
    if (settings && settings.showWelcome !== false) setShowWelcome(true)
  }, [settings])

  return (
    <>
      <div className="bg-aurora" />
      <div className="bg-grid" />
      <div className="bg-noise" />

      {/* Decorative orbs */}
      <div className="fixed top-[15%] left-[8%] w-[200px] h-[200px] rounded-full bg-[#22d3ee]/[.04] blur-[80px] pointer-events-none z-0 orb-float" />
      <div className="fixed bottom-[20%] right-[5%] w-[180px] h-[180px] rounded-full bg-[#3b82f6]/[.05] blur-[70px] pointer-events-none z-0 orb-float-2" />

      <Toasts toasts={toasts} />
      {showWelcome && <IntroModal onDone={() => setShowWelcome(false)} settings={settings} />}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

      <div className="relative z-10 min-h-dvh flex flex-col items-center px-4 pb-20 pt-2">
        <div className="w-full max-w-[440px]">
          <Navbar settings={settings} onFaq={() => setFaqOpen(true)} onAbout={() => setAboutOpen(true)} />

          {/* Hero */}
          <header className="text-center mb-8 anim-entrance" style={{ animationDelay: '60ms' }}>
            {/* Animated logo ring */}
            <div className="relative inline-block mb-5">
              <div className="absolute -inset-3 rounded-[26px] border-ring-spin pointer-events-none" />
              <div className="absolute -inset-5 rounded-full bg-gradient-to-b from-[#22d3ee]/15 to-[#3b82f6]/10 blur-xl pointer-events-none" />
              <div className="relative w-[76px] h-[76px] rounded-[24px] bg-gradient-to-br from-[#22d3ee] via-[#3b82f6] to-[#34d399] grid place-items-center shadow-[0_0_60px_-8px_rgba(34,211,238,.55)] floaty">
                <span className="absolute inset-[2px] rounded-[22px] bg-[#080e1c]/70 backdrop-blur-sm" />
                <i className="fa-brands fa-whatsapp text-white text-[34px] relative z-10 drop-shadow-[0_2px_10px_rgba(0,0,0,.4)]" />
              </div>
            </div>

            <h1 className="font-[family-name:var(--font-display)] font-bold text-[28px] leading-tight tracking-tight">
              Upload <span className="grad-text">Media HD</span>
            </h1>
            <p className="text-[#7e90ad] text-[12px] mt-2.5 max-w-[300px] mx-auto leading-relaxed">
              Kirim video &amp; foto ke grup WhatsApp<br/>lewat kode klaim — cepat &amp; mudah
            </p>

            {/* Inline dev credit */}
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[.03] border border-white/[.06] text-[9px] tracking-wider text-[#7e90ad]">
              <span className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] grid place-items-center text-[8px] font-extrabold text-white shrink-0">H</span>
              <span className="font-semibold">SWHDHLZ</span>
              <span className="opacity-40">BY</span>
              <span className="grad-text font-extrabold">HILLZ</span>
            </div>
          </header>

          {/* 3-step guide — glass cards */}
          <div className="grid grid-cols-3 gap-2 mb-6 anim-entrance" style={{ animationDelay: '120ms' }}>
            {[
              { n: 1, t: 'Upload', sub: 'Pilih file', i: 'fa-cloud-arrow-up', c: '#22d3ee' },
              { n: 2, t: 'Kode', sub: 'Dapat klaim', i: 'fa-key', c: '#3b82f6' },
              { n: 3, t: 'Claim', sub: 'Kirim di grup', i: 'fa-comments', c: '#34d399' },
            ].map((s, i) => (
              <div key={s.n} className="relative rounded-[18px] border border-white/[.06] overflow-hidden group step-card-hover" style={{ animationDelay: `${120 + i * 80}ms` }}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/[.02] to-transparent" />
                <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent to-transparent" style={{ '--tw-gradient-via': `${s.c}40`, backgroundImage: `linear-gradient(to right, transparent, ${s.c}40, transparent)` }} />
                <div className="relative flex flex-col items-center py-4 px-2 text-center">
                  <div className="w-10 h-10 rounded-[12px] grid place-items-center mb-2.5 transition-all duration-[250ms] group-hover:scale-110" style={{ background: `${s.c}12`, border: `1px solid ${s.c}25`, boxShadow: `0 0 20px -6px ${s.c}30` }}>
                    <i className={`fa-solid ${s.i} text-[14px]`} style={{ color: s.c }} />
                  </div>
                  <span className="font-bold text-[11px] tracking-wide">{s.t}</span>
                  <span className="text-[#7e90ad] text-[9px] mt-0.5">{s.sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Status chips */}
          <div className="flex items-center justify-between mb-5 px-0.5 anim-entrance" style={{ animationDelay: '180ms' }}>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[9px] font-extrabold tracking-wider bg-ok/[.08] border border-ok/20 text-ok">
                <span className="w-[5px] h-[5px] rounded-full bg-ok" style={{ animation: 'pulseDot 1.7s infinite' }} />
                ONLINE
              </span>
              {settings?.maxFileSizeMB > 0 && (
                <span className="px-2.5 py-1.5 rounded-[10px] text-[9px] font-extrabold tracking-wider bg-[#3b82f6]/8 border border-[#3b82f6]/20 text-[#93c5fd]">
                  MAX {settings.maxFileSizeMB}MB
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[9px] font-extrabold tracking-wider bg-[#22d3ee]/8 border border-[#22d3ee]/20 text-[#67e8f9]">
              <i className="fa-regular fa-clock text-[8px] opacity-60" />
              {settings?.expireMinutes || 60}m
            </span>
          </div>

          {/* Announcement */}
          {settings?.announcement && (
            <div className="rounded-[16px] px-4 py-3 mb-5 anim-entrance border border-[#fbbf24]/20 bg-[#fbbf24]/[.04]" style={{ animationDelay: '195ms' }}>
              <div className="flex items-start gap-2.5">
                <i className="fa-solid fa-bullhorn text-[#fbbf24] text-xs mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] font-extrabold text-[#fbbf24]/70 mb-0.5 tracking-wider uppercase">Pengumuman</p>
                  <p className="text-[11px] font-medium leading-relaxed text-[#e8f1ff]/80 whitespace-pre-line">{settings.announcement}</p>
                </div>
              </div>
            </div>
          )}

          {/* Banner */}
          {settings?.bannerText && !settings?.announcement && (
            <div className="rounded-[16px] px-4 py-3 mb-5 anim-entrance border border-[#3b82f6]/20 bg-[#3b82f6]/[.05]" style={{ animationDelay: '200ms' }}>
              <div className="flex items-start gap-2.5">
                <i className="fa-solid fa-bullhorn text-[#22d3ee] text-xs mt-0.5 shrink-0" />
                <span className="text-[11px] font-medium leading-relaxed text-[#e8f1ff]/80">{settings.bannerText}</span>
              </div>
            </div>
          )}

          <div className="anim-entrance" style={{ animationDelay: '220ms' }}>
            <UploadPanel settings={settings} toast={toast} />
          </div>

          <div className="anim-entrance" style={{ animationDelay: '340ms' }}>
            <HistorySection />
          </div>

          <footer className="mt-10 text-center anim-fade" style={{ animationDelay: '500ms' }}>
            <div className="divider-glow mb-3" />
            <p className="text-[#7e90ad]/35 text-[9px] font-medium tracking-[.18em] uppercase">
              {settings?.siteName || 'SHIROWAHD'} · SWHDHLZ BY HILLZ
            </p>
          </footer>
        </div>
      </div>
    </>
  )
}
