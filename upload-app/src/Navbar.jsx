import { useState, useRef, useEffect } from 'react'
import { useSettings } from './SettingsContext'

export default function Navbar({ onFaq, onAbout }) {
  const { settings } = useSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [])
  const items = [
    { icon: 'fa-user-shield', label: 'Admin Panel', href: '/admin' },
    { icon: 'fa-circle-question', label: 'FAQ', action: onFaq },
    { icon: 'fa-circle-info', label: 'About', action: onAbout },
  ]
  return (
    <nav className="nav-pill rounded-2xl px-4 py-3 flex items-center justify-between mb-7 mt-4">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#25D366] to-[#0e7a5f] grid place-items-center shadow-[0_8px_24px_-6px_rgba(37,211,102,.55)]">
          <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
          <i className="fa-brands fa-whatsapp text-white text-lg relative" />
        </div>
        <div>
          <p className="font-display font-bold text-[16px] tracking-tight leading-none">{settings?.siteName || 'SHIROWAHD'}</p>
          <p className="text-muted text-[10px] font-medium mt-1">{settings?.siteSubtitle || 'Upload & claim video HD'}</p>
        </div>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="w-9 h-9 rounded-xl border border-line bg-white/[.03] text-ink hover:bg-brand/15 hover:border-line2 transition flex items-center justify-center"
        >
          <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars-staggered'} text-[13px]`} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 glass rounded-2xl p-2 z-50 anim-pop">
            {items.map(it =>
              it.href ? (
                <a key={it.label} href={it.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-ink/90 hover:bg-brand/15 transition">
                  <span className="icon-tile w-7 h-7 !rounded-lg"><i className={`fa-solid ${it.icon} text-cyan text-[11px]`} /></span>
                  {it.label}
                  <i className="fa-solid fa-arrow-up-right-from-square ml-auto text-muted text-[9px]" />
                </a>
              ) : (
                <button
                  key={it.label}
                  onClick={() => { setMenuOpen(false); it.action() }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-semibold text-ink/90 hover:bg-brand/15 transition"
                >
                  <span className="icon-tile w-7 h-7 !rounded-lg"><i className={`fa-solid ${it.icon} text-cyan text-[11px]`} /></span>
                  {it.label}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
