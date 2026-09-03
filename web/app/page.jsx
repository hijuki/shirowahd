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
import { useVelocityScroll, useReveal, useVelocityMarquee } from '@/lib/motion'
import WaMark from '@/components/up/WaMark'

/* ── Velocity band ──
   Posisi digerakkan rAF (useVelocityMarquee), BUKAN animation-duration.
   Versi lama memodulasi durasi via `calc(24s / (1 + var(--vel)*0.5))`; karena
   progres animasi CSS = waktu/durasi, tiap perubahan durasi memindahkan posisi
   seketika. Terukur: lompatan 243px dalam satu frame. */
function VelocityBand({ items, invert, speed = 42, rev }) {
  const ref = useVelocityMarquee(speed)
  return (
    <div className={`vel-band ${invert ? 'vel-band-invert' : ''}`}>
      <div className="vel-track" data-dir={rev ? 'rev' : undefined} ref={ref}>
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

  /* Satu jalan menuju satu bagian. `scroll-padding-top: 96px` di <html> yang
     memberi jarak dari navbar sticky, jadi tidak perlu offset manual. */
  const goto = useCallback((id) => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

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
      {showWelcome && (
        <IntroModal settings={settings}
          onDone={() => setShowWelcome(false)}
          /* CTA popup harus MENGANTAR ke panel upload. Sebelumnya hanya
             menutup popup, jadi user ditinggal di hero dan harus mencari
             sendiri panel yang ada 1467px di bawah. */
          onStart={() => { setShowWelcome(false); setTimeout(() => goto('upload'), 380) }} />
      )}
      {faqOpen && <FaqModal onClose={() => setFaqOpen(false)} settings={settings} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} settings={settings} />}

      {settings?.ownerWhatsapp && settings?.showOwnerBtn !== false && (
        /* Tombol chat: kapsul, bukan kotak 54px dengan cincin ping.
           Yang lama jelek karena tiga hal sekaligus — ikon font `fa-whatsapp`
           menggambar handset sebagai GARIS (kurus dan pucat di atas hijau),
           border 3px + shadow 4px pada kotak 54px membuatnya seberat kartu
           utama, dan cincin `fab-ping` berdenyut tanpa henti di sudut mata.
           Sekarang: mark SVG resmi yang solid, kapsul dengan label yang
           muncul saat disentuh, satu bayangan. */
        <a href={`https://wa.me/${String(settings.ownerWhatsapp).replace(/[^0-9]/g, '')}`}
          target="_blank" rel="noreferrer" className="fab group" title="Chat developer"
          aria-label="Chat developer lewat WhatsApp">
          <WaMark className="fab-mark" />
          <span className="fab-label">CHAT</span>
        </a>
      )}

      {!settings ? <Skeleton /> : (
        <div className="relative z-10 min-h-dvh flex flex-col">
          <Navbar settings={settings}
            onFaq={() => setFaqOpen(true)}
            onAbout={() => setAboutOpen(true)}
            onUpload={() => goto('upload')}
            onStats={() => goto('statistik')} />

          <main className="wrap px-4 flex-1 max-w-[720px]">
            <Hero settings={settings} />
          </main>

          {/* Velocity band #1 */}
          <div className="mt-8">
            <VelocityBand items={ticker} speed={38} />
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

            {/* Panel upload — `id` WAJIB ada: navbar & drawer memanggil
                goto('upload') yang memakai getElementById. Tanpa id, handler
                keluar diam-diam dan tombol terasa mati. */}
            <div id="upload" className="mt-5 scroll-mt-[96px]">
              <UploadPanel settings={settings} toast={toast} />
            </div>

            {/* Statistik */}
            {settings.showStats !== false && (
              <div id="statistik" className="mt-5 scroll-mt-[96px]">
                <LiveStats />
              </div>
            )}

            {/* Riwayat */}
            {settings.showHistory !== false && <HistorySection />}
          </main>

          {/* Velocity band #2 — arah berlawanan, memberi rasa kedalaman */}
          <VelocityBand items={['SWHDHLZ', 'BY HILLZ', 'WHATSAPP UPLOADER', 'SWHDHLZ', 'BY HILLZ']} invert speed={30} rev />

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
