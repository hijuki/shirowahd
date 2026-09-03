'use client'
import { useState, useEffect } from 'react'
import { useTheme, useVelocityMarquee } from '@/lib/motion'

/* ══════════════════════════════════════════════════════════════
   NAVBAR — bilah plat, bukan pil melayang.
   Struktur: [brand cell] │ [status cell] │ [aksi cell] + tick-rail.
   Di mobile aksi masuk drawer full-screen (bukan ikon berdesakan).
   ══════════════════════════════════════════════════════════════ */

function SunGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="mode-glyph" aria-hidden>
      <path d="M12 5V2m0 20v-3m7-7h3M2 12h3m12.07-5.07 2.12-2.12M4.81 19.19l2.12-2.12m0-10.14L4.81 4.81m14.38 14.38-2.12-2.12" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="square" />
      <circle cx="12" cy="12" r="4.2" />
    </svg>
  )
}
function MoonGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="mode-glyph" aria-hidden>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  )
}

export default function Navbar({ settings, onFaq, onAbout, onStats, onUpload }) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const tickRef = useVelocityMarquee(26, 90)
  const { isDark, toggle } = useTheme(settings?.themeDefault)
  const logoUrl = settings?.logoUrl || ''

  // Drawer terbuka: badan tidak boleh ikut ter-scroll di belakangnya.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') closeDrawer() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open])

  const closeDrawer = () => {
    setClosing(true)
    setTimeout(() => { setOpen(false); setClosing(false) }, 270)
  }
  const go = (fn) => { closeDrawer(); setTimeout(() => fn?.(), 200) }

  const expText = (() => {
    const m = settings?.expireMinutes || 60
    return m >= 1440 ? Math.floor(m / 1440) + ' HARI' : m >= 60 ? Math.floor(m / 60) + ' JAM' : m + 'M'
  })()

  return (
    <>
      <nav className="navbar">
        <div className="wrap navbar-inner">
          {/* ── Brand ── */}
          <div className="nav-cell min-w-0 flex-1">
            <span className="relative w-9 h-9 shrink-0 grid place-items-center border-2 border-[var(--edge)] bg-wa">
              {logoUrl
                ? <img src={logoUrl} alt="" className="w-full h-full object-contain p-[2px]" />
                : <i className="fa-brands fa-whatsapp text-[17px] text-[#06180d]" />}
            </span>
            <span className="min-w-0">
              <span className="block font-[family-name:var(--font-display)] text-[15px] leading-none uppercase tracking-[-0.02em] truncate">
                {settings?.siteName || 'SHIROWAHD'}
              </span>
              <span className="kicker block mt-[3px] truncate text-[9px]">
                {settings?.siteSubtitle || 'SWHDHLZ · BY HILLZ'}
              </span>
            </span>
          </div>

          <span className="nav-div" />

          {/* ── Status: hanya tampil di layar lebar ──
              `hidden!` WAJIB pakai important. `.nav-cell { display: flex }`
              ditulis di luar @layer, jadi ia MENGALAHKAN utility `hidden`
              milik Tailwind → di layar 390px sel ini tetap tampil 183px dan
              mencuri ruang brand sampai nama situs menyusut jadi 0px. */}
          <div className="nav-cell hidden! md:flex!">
            <span className="chip">
              <span className="dot-live" />ONLINE
            </span>
            <span className="chip">TTL {expText}</span>
          </div>

          <span className="nav-div hidden md:block" />

          {/* ── Aksi ── */}
          <div className="nav-cell gap-2">
            <button onClick={toggle} className="mode-switch" role="switch" aria-checked={isDark}
              aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
              title={isDark ? 'Mode terang' : 'Mode gelap'}>
              <span className="mode-knob">{isDark ? <MoonGlyph /> : <SunGlyph />}</span>
            </button>

            {/* Desktop: tombol langsung. Mobile: burger → drawer. */}
            <div className="hidden sm:flex items-center gap-2">
              <button onClick={onFaq} className="ibtn" aria-label="FAQ" title="FAQ">
                <i className="fa-solid fa-circle-question text-[13px]" />
              </button>
              <button onClick={onAbout} className="ibtn" aria-label="Tentang" title="Tentang">
                <i className="fa-solid fa-circle-info text-[13px]" />
              </button>
              <a href="/admin" className="ibtn" aria-label="Panel admin" title="Panel admin">
                <i className="fa-solid fa-user-shield text-[12px]" />
              </a>
            </div>

            {/* `sm:hidden!` — sama seperti di atas: `.ibtn { display: grid }`
                mengalahkan utility `sm:hidden` tanpa important, jadi tombol
                burger tetap muncul di desktop berdampingan dengan menu penuh. */}
            <button onClick={() => setOpen(true)} className="ibtn sm:hidden!" aria-label="Buka menu"
              aria-expanded={open}>
              <span className="burger" data-open={open ? '1' : '0'}>
                <span /><span /><span />
              </span>
            </button>
          </div>
        </div>

        {/* ── Tick rail: marquee tipis kecepatan-reaktif ── */}
        {settings?.showTicker !== false && (
          <div className="nav-tick">
            <div className="vel-track" ref={tickRef}>
              {[0, 1].map(dup => (
                <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
                  {(settings?.tickerText
                    ? settings.tickerText.split('·').map(s => s.trim()).filter(Boolean)
                    : ['TANPA KOMPRESI', 'HINGGA 1440P', 'FPS ASLI DIPERTAHANKAN', 'KODE KLAIM SEKALI PAKAI', 'HAPUS OTOMATIS']
                  ).map((t, i) => (
                    <span key={dup + '-' + i} className="vel-item !py-[5px] !text-[10px] !gap-2.5 font-[family-name:var(--font-mono)] font-bold tracking-[0.16em]">
                      <span className="vel-dot !w-[5px] !h-[5px]" />{t}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ── Drawer mobile ── */}
      {open && (
        <div className="drawer sm:hidden" data-out={closing ? '1' : '0'} role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex items-center justify-between px-4 py-3 border-b-[3px] border-[var(--edge)]">
            <span className="sticker sticker-accent">MENU</span>
            <button onClick={closeDrawer} className="ibtn" aria-label="Tutup menu">
              <span className="burger" data-open="1"><span /><span /><span /></span>
            </button>
          </div>

          <div className="flex flex-col">
            {[
              /* BUG LAMA: ini `window.scrollTo({top:0})` — mengembalikan user ke
                 PUNCAK HALAMAN (hero), padahal panel upload ada di y≈1467.
                 Terukur setelah klik: scrollY=0, panel masih 1467px di bawah,
                 `panelTerlihat: false`. Jadi tombol "Upload" tidak pernah
                 membawa siapa pun ke uploader. Sekarang menuju #upload. */
              { t: 'Upload', d: '0ms', i: 'fa-cloud-arrow-up', fn: onUpload },
              { t: 'Statistik', d: '60ms', i: 'fa-chart-column', fn: onStats },
              { t: 'FAQ', d: '120ms', i: 'fa-circle-question', fn: onFaq },
              { t: 'Tentang', d: '180ms', i: 'fa-circle-info', fn: onAbout },
            ].map(item => (
              <button key={item.t} className="drawer-link" style={{ '--d': item.d }} onClick={() => go(item.fn)}>
                <span>{item.t}</span>
                <i className={`fa-solid ${item.i} text-[16px] opacity-45`} />
              </button>
            ))}
            <a href="/admin" className="drawer-link" style={{ '--d': '240ms' }}>
              <span>Admin</span>
              <i className="fa-solid fa-user-shield text-[16px] opacity-45" />
            </a>
          </div>

          <div className="px-4 py-5 flex flex-wrap items-center gap-2" style={{ animation: 'fadeIn 500ms 320ms both' }}>
            <span className="chip"><span className="dot-live" />ONLINE</span>
            <span className="chip">TTL {expText}</span>
            {settings?.maxFileSizeMB > 0 && <span className="chip">MAX {settings.maxFileSizeMB}MB</span>}
          </div>
        </div>
      )}
    </>
  )
}
