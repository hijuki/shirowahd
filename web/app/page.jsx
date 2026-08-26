'use client'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/up/Navbar'
import UploadPanel from '@/components/up/UploadPanel'
import HistorySection from '@/components/up/HistorySection'
import Toasts, { useToasts } from '@/components/up/Toasts'
import { IntroModal, FaqModal, AboutModal } from '@/components/up/Modals'
import { loadSettings } from '@/lib/up-api'

function SkeletonPage() {
  return (
    <div className="w-full max-w-[460px] mx-auto px-4 pt-6 space-y-4">
      <div className="skeleton h-14 rounded-2xl" />
      <div className="skeleton h-32 rounded-2xl" />
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
      </div>
      <div className="skeleton h-72 rounded-2xl" />
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
    loadSettings()
      .then(setSettings)
      .catch(e => toast('Gagal memuat pengaturan: ' + e.message, 'error'))
  }, [toast])

  useEffect(reload, [reload])

  useEffect(() => {
    if (settings && settings.showWelcome !== false) setShowWelcome(true)
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
        <div className="relative z-10 min-h-dvh flex flex-col items-center px-4 pb-20 pt-4">
          <div className="w-full max-w-[460px] space-y-4">
            {/* Header Navbar */}
            <Navbar
              settings={settings}
              onFaq={() => setFaqOpen(true)}
              onAbout={() => setAboutOpen(true)}
            />

            {/* Announcement Alert Banner */}
            {settings?.announcement && (
              <div className="card p-3.5 border-l-4 border-l-[var(--t-accent)] bg-[var(--t-surface2)] text-[12px] flex items-start gap-3 shadow-sm anim-slide-up">
                <div className="w-6 h-6 rounded-lg bg-[var(--t-accent)] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <i className="fa-solid fa-bullhorn text-[11px]" />
                </div>
                <p className="text-[var(--t-ink)] leading-snug font-medium flex-1 pt-0.5">{settings.announcement}</p>
              </div>
            )}

            {/* Hero Card with 3D Depth */}
            <header className="card p-5 space-y-4 card-3d-hover anim-slide-up relative overflow-hidden">
              {/* Ambient glow orbs */}
              <div className="glow-orb orb-1 w-36 h-36 -top-12 -right-10" style={{ background: 'var(--t-accent)' }} />
              <div className="glow-orb orb-2 w-28 h-28 -bottom-10 -left-8" style={{ background: 'var(--t-accent-2)' }} />

              <div className="flex items-start justify-between gap-3 relative">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[var(--t-surface2)] border border-[var(--t-line)]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--t-ok)] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--t-ok)]"></span>
                    </span>
                    <span className="font-mono text-[9px] font-bold text-[var(--t-muted)] tracking-wider uppercase">
                      ONLINE GATEWAY
                    </span>
                  </div>

                  <h1 className="text-[30px] font-black tracking-tight leading-none text-[var(--t-ink)]">
                    {heroTitle} <span className="grad-anim">{heroHighlight}</span>
                  </h1>
                </div>

                {logoUrl ? (
                  <div className="w-14 h-14 rounded-2xl border border-[var(--t-line-strong)] bg-[var(--t-surface2)] p-2 shadow-md shrink-0 anim-float">
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--t-ink)] to-[var(--t-surface3)] text-[var(--t-bg)] flex flex-col items-center justify-center shrink-0 shadow-lg anim-float border border-[var(--t-line-strong)] brand-shine relative overflow-hidden">
                    <span className="font-mono text-[9px] font-extrabold tracking-widest text-[var(--t-accent)]">4K+</span>
                    <i className="fa-brands fa-whatsapp text-[20px] text-white" />
                  </div>
                )}
              </div>

              <p className="text-[13px] text-[var(--t-muted)] leading-relaxed font-normal">
                {heroDesc}
              </p>

              {/* Status Spec Strip */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[var(--t-line)] font-mono text-[11px]">
                <div className="bg-[var(--t-surface2)] p-2 rounded-lg text-center">
                  <div className="text-[9px] text-[var(--t-muted)] uppercase">Kualitas</div>
                  <div className="font-bold text-[var(--t-ink)]">Original 100%</div>
                </div>
                <div className="bg-[var(--t-surface2)] p-2 rounded-lg text-center">
                  <div className="text-[9px] text-[var(--t-muted)] uppercase">Masa Berlaku</div>
                  <div className="font-bold text-[var(--t-accent)] tnum">{settings?.expireMinutes || 60}m</div>
                </div>
                <div className="bg-[var(--t-surface2)] p-2 rounded-lg text-center">
                  <div className="text-[9px] text-[var(--t-muted)] uppercase">Engine</div>
                  <div className="font-bold text-[var(--t-ink)]">v2.4 Core</div>
                </div>
              </div>
            </header>

            {/* 3 Step Interactive Workflow */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              {[
                { no: '01', title: 'Upload', sub: 'Pilih Media HD', icon: 'fa-cloud-arrow-up', color: 'var(--t-accent)' },
                { no: '02', title: 'Tiket', sub: 'Dapat Kode Unik', icon: 'fa-ticket', color: 'var(--t-accent-2)' },
                { no: '03', title: 'Kirim', sub: 'Klaim di WA Grup', icon: 'fa-paper-plane', color: 'var(--t-ok)' },
              ].map(s => (
                <div key={s.no} className="card p-3 space-y-1.5 hover-lift transition-all">
                  <div className="w-8 h-8 mx-auto rounded-xl flex items-center justify-center mb-1" style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)`, color: s.color }}>
                    <i className={`fa-solid ${s.icon} text-[14px]`} />
                  </div>
                  <div className="text-[12px] font-bold text-[var(--t-ink)] leading-tight">{s.title}</div>
                  <div className="text-[9px] text-[var(--t-muted)] leading-tight">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Main Upload Zone */}
            <UploadPanel settings={settings} onToast={toast} />

            {/* History Section */}
            <HistorySection settings={settings} onToast={toast} />

            {/* Footer */}
            <footer className="text-center pt-6 pb-4 space-y-2">
              <div className="perforated-line my-3" />
              <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-[var(--t-muted)]">
                <span>SHIROWAHD</span>
                <span>•</span>
                <span className="text-[var(--t-accent)] font-semibold">ULTRA HD ENGINE</span>
                <span>•</span>
                <span className="text-[var(--t-ink)] font-bold">DEV HILLZ</span>
              </div>
              {footerText && (
                <p className="text-[11px] text-[var(--t-muted)]">{footerText}</p>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
