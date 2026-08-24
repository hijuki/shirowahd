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
    <nav className="h-[72px] flex items-center justify-between border-b border-white/[.06] mb-6">
      <div className="flex items-center gap-3">
        <div className="relative w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#25D366] to-[#128C7E] grid place-items-center shadow-[0_0_28px_rgba(37,211,102,.35)]">
          <span className="absolute inset-0 rounded-[10px] bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          <i className="fa-brands fa-whatsapp text-white relative" />
        </div>
        <div>
          <p className="font-display font-bold text-[17px] tracking-tight leading-none">{settings?.siteName || 'SHIROWAHD'}</p>
          <p className="text-muted text-[10px] font-medium mt-1">{settings?.siteSubtitle || 'Upload & claim video HD'}</p>
        </div>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="px-3.5 py-2 rounded-[10px] border border-[rgba(75,163,255,.22)] bg-[rgba(8,23,53,.55)] text-[11px] font-bold text-[#d5e7ff] hover:bg-[rgba(18,53,98,.7)] transition flex items-center gap-1.5"
        >
          <i className="fa-solid fa-bars" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-44 glass rounded-xl p-1.5 z-50 anim-pop">
            {items.map(it =>
              it.href ? (
                <a key={it.label} href={it.href} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-semibold text-ink/90 hover:bg-brand/15 transition">
                  <i className={`fa-solid ${it.icon} text-cyan text-xs w-4`} />
                  {it.label}
                  <i className="fa-solid fa-arrow-up-right-from-square ml-auto text-muted text-[9px]" />
                </a>
              ) : (
                <button
                  key={it.label}
                  onClick={() => { setMenuOpen(false); it.action() }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-semibold text-ink/90 hover:bg-brand/15 transition"
                >
                  <i className={`fa-solid ${it.icon} text-cyan text-xs w-4`} />
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
