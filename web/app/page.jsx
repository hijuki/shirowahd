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
    <div className="w-full max-w-[440px] mx-auto px-4 pt-4 space-y-3 font-mono">
      <div className="skeleton h-11" />
      <div className="skeleton h-24" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => <div key={i} className="skeleton h-20" />)}
      </div>
      <div className="skeleton h-56" />
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
  const heroDesc = settings?.heroDesc || 'Kirim media resolusi penuh ke grup WhatsApp via kode klaim tiket.'
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
        <div className="relative z-10 min-h-dvh flex flex-col items-center px-3.5 pb-16 pt-3">
          <div className="w-full max-w-[440px] space-y-3">
            <Navbar
              settings={settings}
              onFaq={() => setFaqOpen(true)}
              onAbout={() => setAboutOpen(true)}
            />

            {/* Announcement / Notice */}
            {settings?.announcement && (
              <div className="card p-3 border-l-4 border-l-[var(--t-accent)] bg-[var(--t-surface2)] text-[12px] flex items-start gap-2.5">
                <span className="font-mono text-[10px] font-bold text-[var(--t-accent)] tracking-widest uppercase shrink-0 pt-0.5">
                  [INFO]
                </span>
                <p className="text-[var(--t-ink)] leading-snug flex-1">{settings.announcement}</p>
              </div>
            )}

            {/* Ticket Header / Hero */}
            <header className="card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--t-accent)]" />
                    <span className="field-label">LOKET PENGIRIMAN MEDIA</span>
                  </div>
                  <h1 className="text-[26px] font-black tracking-tight leading-none text-[var(--t-ink)]">
                    {heroTitle} <span className="text-[var(--t-accent)]">{heroHighlight}</span>
                  </h1>
                </div>

                {logoUrl ? (
                  <div className="w-12 h-12 rounded border border-[var(--t-line-strong)] bg-[var(--t-surface2)] p-1 shrink-0">
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded border border-[var(--t-ink)] bg-[var(--t-ink)] text-[var(--t-bg)] flex flex-col items-center justify-center shrink-0">
                    <span className="font-mono text-[9px] font-bold tracking-widest leading-none">HD</span>
                    <i className="fa-brands fa-whatsapp text-[16px] mt-0.5" />
                  </div>
                )}
              </div>

              <p className="text-[12px] text-[var(--t-muted)] leading-relaxed whitespace-pre-line border-t border-[var(--t-line)] pt-2.5">
                {heroDesc}
              </p>

              <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-[var(--t-muted)] border-t border-dashed border-[var(--t-line)]">
                <span>SERI: SWHD-v2</span>
                <span className="tnum">EXP: {settings?.expireMinutes || 60}m</span>
                <span className="text-[var(--t-accent)] font-bold">DEV: HILLZ</span>
              </div>
            </header>

            {/* 3 Step Instruction Strip */}
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
              {[
                { no: '01', title: 'Pilih File', sub: 'Video / Foto', icon: 'fa-arrow-up-from-bracket' },
                { no: '02', title: 'Ambil Kode', sub: 'Tiket Unik', icon: 'fa-ticket' },
                { no: '03', title: 'Klaim WA', sub: 'Ketik di Grup', icon: 'fa-paper-plane' },
              ].map(s => (
                <div key={s.no} className="card p-2.5 space-y-1 hover-lift">
                  <div className="flex items-center justify-between text-[9px] text-[var(--t-muted)]">
                    <span className="font-bold text-[var(--t-accent)]">{s.no}</span>
                    <i className={`fa-solid ${s.icon} text-[10px]`} />
                  </div>
                  <div className="text-[11px] font-bold text-[var(--t-ink)] leading-tight">{s.title}</div>
                  <div className="text-[9px] text-[var(--t-muted)]">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Main Upload Zone */}
            <UploadPanel settings={settings} onToast={toast} />

            {/* History Section */}
            <HistorySection settings={settings} onToast={toast} />

            {/* Footer */}
            <footer className="text-center pt-4 pb-2 space-y-2">
              <div className="perf-x my-2" />
              <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-[var(--t-muted)]">
                <span>SHIROWAHD</span>
                <span>•</span>
                <span>NON-COMPRESSED TRANSFER</span>
                <span>•</span>
                <span className="text-[var(--t-ink)] font-bold">BY HILLZ</span>
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
