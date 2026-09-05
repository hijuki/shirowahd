'use client'
import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/motion'
import { getSystem } from '@/lib/admin-api'

/* ══════════════════════════════════════════════════════════════
   RANGKA ADMIN — satu bahasa desain dengan halaman uploader:
   plat kertas, border tegas, bayangan tinta. Bukan kartu kaca.

   Struktur baru (bukan restyle):
   · Rel samping desktop = tumpukan plat bernomor, penanda aktif
     berupa balok tinta penuh + takik, bukan pil biru neon.
   · Bilah bawah mobile = kartu tiket, label selalu terlihat.
   · Mode terang/gelap ikut token global, jadi admin & uploader
     tidak pernah beda karakter.
   · IP host dibaca dari /admin/api/system — dulu hardcoded ke IP
     VPS lain (95.111.221.189) sehingga selalu salah.
   ══════════════════════════════════════════════════════════════ */

const tabs = [
  { id: 'dashboard', n: '01', label: 'RINGKASAN', icon: 'fa-chart-pie' },
  { id: 'files', n: '02', label: 'BERKAS', icon: 'fa-folder-open' },
  { id: 'settings', n: '03', label: 'PENGATURAN', icon: 'fa-sliders' },
  { id: 'security', n: '04', label: 'KEAMANAN', icon: 'fa-shield-halved' },
  { id: 'bot', n: '05', label: 'BOT WA', icon: 'fa-robot' },
]

export default function Layout({ active, setActive, children }) {
  const { theme, toggle } = useTheme()
  const [host, setHost] = useState(null)

  useEffect(() => {
    let alive = true
    getSystem().then(d => { if (alive) setHost(d) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const logout = () => {
    localStorage.removeItem('admin_token')
    window.location.reload()
  }

  return (
    <div className="min-h-dvh flex flex-col md:flex-row relative bg-[var(--paper)] text-[var(--ink)]">
      <div className="bg-field" />
      <div className="bg-grain" />
      <div className="bg-vignette" />

      {/* ══ Rel samping (desktop) ══ */}
      <aside className="hidden md:flex flex-col w-[248px] shrink-0 fixed inset-y-0 left-0 z-30
        bg-[var(--plate-fill)] border-r-[3px] border-[var(--edge)]">

        <div className="p-5 border-b-[3px] border-[var(--edge)]">
          <div className="flex items-center gap-3">
            <span className="relative w-11 h-11 shrink-0 grid place-items-center border-[3px] border-[var(--edge)] bg-wa stack-shadow">
              <i className="fa-solid fa-shield-halved text-[15px] text-[#06180d]" />
              <span className="stamp-ring" />
            </span>
            <div className="min-w-0">
              <p className="display-m !text-[15px] leading-none">KONSOL</p>
              <span className="inline-flex items-center gap-1.5 mt-1.5">
                <span className="badge-h w-[15px] h-[15px] !border text-[8px]">H</span>
                <span className="kicker !text-[8px]">SWHDHLZ ADMIN</span>
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto">
          <p className="kicker !text-[8px] px-1.5 pb-2">NAVIGASI</p>
          <div className="space-y-1.5">
            {tabs.map(t => {
              const on = active === t.id
              return (
                <button key={t.id} onClick={() => setActive(t.id)} aria-current={on ? 'page' : undefined}
                  className={`nav-slab w-full ${on ? 'nav-slab-on' : ''}`}>
                  <span className="nav-slab-n data">{t.n}</span>
                  <i className={`fa-solid ${t.icon} text-[12px] w-4 text-center`} />
                  <span className="flex-1 text-left">{t.label}</span>
                  {on && <span className="nav-slab-tip" />}
                </button>
              )
            })}
          </div>
        </nav>

        <div className="p-3 border-t-[3px] border-[var(--edge)] space-y-2">
          <div className="flex items-center justify-between px-2.5 py-2 border-2 border-[var(--edge)] bg-[var(--paper-2)]">
            <span className="flex items-center gap-2 min-w-0">
              <span className="dot-live" />
              <span className="data text-[10px] truncate">
                {host ? 'UP ' + Math.floor(host.uptime / 3600) + 'J · DISK ' + (host.disk?.pct || '—') : 'memuat…'}
              </span>
            </span>
            <span className="chip !px-1.5 !py-[2px] !text-[8px] shrink-0">AKTIF</span>
          </div>

          <button onClick={toggle} className="btn btn-sm btn-ghost w-full !justify-start">
            <span className="btn-cap"><i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'} text-[9px]`} /></span>
            MODE {theme === 'dark' ? 'GELAP' : 'TERANG'}
          </button>

          <button onClick={logout} className="btn btn-sm btn-hot w-full !justify-start">
            <span className="btn-cap"><i className="fa-solid fa-arrow-right-from-bracket text-[9px]" /></span>
            KELUAR SESI
          </button>
        </div>
      </aside>

      {/* ══ Isi ══ */}
      <main className="flex-1 min-w-0 md:ml-[248px] md:max-w-[calc(100%-248px)] relative z-10 pb-32 md:pb-10 min-h-dvh flex flex-col">
        {/* Bilah atas mobile */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-4 py-3
          bg-[var(--plate-fill)] border-b-[3px] border-[var(--edge)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative w-9 h-9 shrink-0 grid place-items-center border-2 border-[var(--edge)] bg-wa">
              <i className="fa-solid fa-shield-halved text-[12px] text-[#06180d]" />
            </span>
            <div className="min-w-0">
              <p className="display-m !text-[13px] leading-none truncate">KONSOL ADMIN</p>
              <span className="kicker !text-[8px]">{tabs.find(t => t.id === active)?.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={toggle} aria-label="Ganti mode tampilan"
              className="btn btn-icon">
              <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'} text-[11px]`} />
            </button>
            <button onClick={logout} aria-label="Keluar sesi"
              className="btn btn-icon bg-[var(--hot)] text-[#fff]">
              <i className="fa-solid fa-arrow-right-from-bracket text-[11px]" />
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto flex-1 anim-fade">
          {children}
        </div>
      </main>

      {/* ══ Bilah bawah mobile ══ */}
      {/* Tab bar bawah: sudut atas dibulatkan (16px) supaya sinkron dgn skala
          radius global; bagian bawah tetap rata karena menempel tepi layar. */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--plate-fill)]
        border-t-[3px] border-[var(--edge)] rounded-t-[16px] px-1.5 pt-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]
        grid grid-cols-5 gap-1.5">
        {tabs.map(t => {
          const on = active === t.id
          return (
            <button key={t.id} onClick={() => setActive(t.id)} aria-current={on ? 'page' : undefined}
              className={`tab-brick ${on ? 'tab-brick-on' : ''}`}>
              <i className={`fa-solid ${t.icon} text-[14px]`} />
              <span className="tab-brick-l">{t.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
