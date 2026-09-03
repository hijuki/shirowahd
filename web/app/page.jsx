'use client'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/up/Navbar'
import Hero from '@/components/up/Hero'
import UploadPanel from '@/components/up/UploadPanel'
import HistorySection from '@/components/up/HistorySection'
import LiveStats from '@/components/up/LiveStats'
import Toasts, { useToasts } from '@/components/up/Toasts'
import { IntroModal, FaqModal, AboutModal } from '@/components/up/Modals'
import { loadSettings } from '@/lib/up-api'
import { useVelocityScroll, useReveal } from '@/lib/motion'

/* ── Velocity band: kecepatan animasi & skew ikut kecepatan scroll ── */
function VelocityBand({ items, invert, dur = 22, rev }) {
  return (
    <div className={`vel-band ${invert ? 'vel-band-invert' : ''}`}>
      <div className="vel-track" data-dir={rev ? 'rev' : undefined}
        style={{ '--dur': `calc(${dur}s / (1 + var(--vel) * 0.5))` }}>
        {[0, 1].map(dup => (
          <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
            {items.map((t, i) => (
              <span key={dup + '-' + i} className="vel-item">
                <span className="vel-dot" />{t}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="wrap px-4 pt-10 space-y-4">
      <div className="skeleton h-[54px]" />
      <div className="skeleton h-[120px]" />
      <div className="skeleton h-[300px]" />
    </div>
  )
}

const STEPS = [
  { n: '01', t: 'UPLOAD', d: 'Pilih video atau foto dari perangkat.', i: 'fa-cloud-arrow-up' },
  { n: '02', t: 'AMBIL KODE', d: 'Kode klaim singkat, sekali pakai.', i: 'fa-key' },
  { n: '03', t: 'KIRIM', d: 'Tempel di grup — bot yang mengirim.', i: 'fa-paper-plane' },
]

export default function UploaderPage() {
  const [settings, setSettings] = useState(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { toasts, add: toast } = useToasts()

  useVelocityScroll()
  useReveal([settings])

  const reload = useCallback(() => {
    loadSettings().then(setSettings).catch(e => toast('Gagal memuat pengaturan: ' + e.message, 'error'))
  }, [toast])
  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (settings && settings.showWelcome !== false) setShowWelcome(true)
  }, [settings])

  const footerText = settings?.footerText || ''
  const ticker = settings?.tickerText
    ? settings.tickerText.split('·').map(s => s.trim()).filter(Boolean)
    : ['TANPA KOMPRESI', 'HINGGA 1440P', 'FPS ASLI', 'SEKALI KLAIM', 'HAPUS OTOMATIS']

  return (
    <>
      <div className="bg-field" />
      <div className="bg-grain" />
      <div className="bg-vignette" />

      <Toasts toasts={toasts} />
      {showWelcome && <IntroModal onDone={() => setShowWelcome(false)} settings={settings} />}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} settings={settings} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} settings={settings} />}

      {settings?.ownerWhatsapp && settings?.showOwnerBtn !== false && (
        <a href={`https://wa.me/${String(settings.ownerWhatsapp).replace(/[^0-9]/g, '')}`}
          target="_blank" rel="noreferrer" className="fab" title="Chat Developer" aria-label="Chat Developer">
          <span className="fab-ping" />
          <i className="fa-brands fa-whatsapp text-[24px] relative" />
        </a>
      )}

      {!settings ? <Skeleton /> : (
        <div className="relative z-10 min-h-dvh flex flex-col">
          <Navbar settings={settings}
            onFaq={() => setFaqOpen(true)}
            onAbout={() => setAboutOpen(true)}
            onStats={() => document.getElementById('statistik')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />

          <main className="wrap px-4 flex-1 max-w-[720px]">
            <Hero settings={settings} />
          </main>

          {/* Velocity band #1 */}
          <div className="mt-8">
            <VelocityBand items={ticker} dur={24} />
          </div>

          <main className="wrap px-4 max-w-[720px] pb-16">
            {/* Langkah — hanya kalau admin menyalakan */}
            {settings.showSteps !== false && (
              <div className="grid sm:grid-cols-3 border-2 border-[var(--edge)] rounded-[var(--r)] mt-8 split-y-sm-x stack-shadow bg-[var(--plate-fill)] overflow-hidden"
                data-reveal="">
                {STEPS.map((s, i) => (
                  <div key={s.n} className="p-4" style={{ '--rd': i * 70 + 'ms' }}>
                    <div className="flex items-start justify-between">
                      <span className="icon-tile"><i className={`fa-solid ${s.i} text-[13px]`} /></span>
                      <span className="font-[family-name:var(--font-display)] text-[26px] leading-none opacity-15">{s.n}</span>
                    </div>
                    <p className="display-m !text-[15px] mt-3">{s.t}</p>
                    <p className="text-[12px] leading-[1.55] text-[var(--ink-2)] mt-1.5">{s.d}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Pengumuman / banner */}
            {(settings.announcement || settings.bannerText) && (
              <div className="ticket !py-3 mt-5" data-reveal="">
                <span className="ticket-notch" />
                <span className="icon-tile !w-9 !h-9 shrink-0 !bg-[var(--accent)]">
                  <i className="fa-solid fa-bullhorn text-[11px] text-[#06180d]" />
                </span>
                <span className="min-w-0">
                  <span className="kicker !text-[8px] block">{settings.announcement ? 'PENGUMUMAN' : 'INFO'}</span>
                  <span className="block text-[12px] leading-snug mt-1 whitespace-pre-line">
                    {settings.announcement || settings.bannerText}
                  </span>
                </span>
              </div>
            )}

            {/* Panel upload */}
            <div className="mt-5">
              <UploadPanel settings={settings} toast={toast} />
            </div>

            {/* Statistik */}
            {settings.showStats !== false && (
              <div className="mt-5">
                <LiveStats />
              </div>
            )}

            {/* Riwayat */}
            {settings.showHistory !== false && <HistorySection />}
          </main>

          {/* Velocity band #2 — arah berlawanan, memberi rasa kedalaman */}
          <VelocityBand items={['SWHDHLZ', 'BY HILLZ', 'WHATSAPP UPLOADER', 'SWHDHLZ', 'BY HILLZ']} invert dur={30} rev />

          <footer className="wrap px-4 max-w-[720px] py-8 text-center">
            <p className="kicker !text-[9px] opacity-55">
              {footerText || `${settings.siteName || 'SHIROWAHD'} · SWHDHLZ BY HILLZ`}
            </p>
          </footer>
        </div>
      )}
    </>
  )
}
