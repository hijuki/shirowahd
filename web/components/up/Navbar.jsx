'use client'
import { useState, useRef, useEffect } from 'react'

export default function Navbar({ settings, onFaq, onAbout }) {
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
    <nav className="nav-pill rounded-[20px] px-4 py-3 flex items-center justify-between mb-7 mt-4 anim-entrance">
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#25D366] to-[#0e7a5f] grid place-items-center shadow-[0_8px_24px_-6px_rgba(37,211,102,.55)]">
          <span className="absolute inset-0 rounded-[12px] bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
          <i className="fa-brands fa-whatsapp text-white text-lg relative" />
        </div>
        <div>
          <p className="font-[family-name:var(--font-display)] font-bold text-[16px] tracking-tight leading-none">{settings?.siteName || 'SHIROWAHD'}</p>
          <p className="text-[#7e90ad] text-[10px] font-medium mt-1">{settings?.siteSubtitle || 'Upload & claim video HD'}</p>
        </div>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="w-9 h-9 rounded-[12px] border border-white/[.07] bg-white/[.04] text-[#e8f1ff] hover:bg-[#3b82f6]/15 hover:border-[#3b82f6]/30 transition-all duration-[150ms] flex items-center justify-center"
          style={{ transitionTimingFunction: 'var(--ease-out)' }}
        >
          <i className={`fa-solid ${menuOpen ? 'fa-xmark' : 'fa-bars-staggered'} text-[13px]`} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 glass rounded-[20px] p-2 z-50 anim-pop">
            {items.map(it =>
              it.href ? (
                <a key={it.label} href={it.href} className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[12px] font-semibold text-[#e8f1ff]/90 hover:bg-[#3b82f6]/12 transition-all duration-[150ms]">
                  <span className="icon-tile w-7 h-7 !rounded-[8px]"><i className={`fa-solid ${it.icon} text-[#22d3ee] text-[11px]`} /></span>
                  {it.label}
                  <i className="fa-solid fa-arrow-up-right-from-square ml-auto text-[#7e90ad] text-[9px]" />
                </a>
              ) : (
                <button
                  key={it.label}
                  onClick={() => { setMenuOpen(false); it.action() }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-[12px] font-semibold text-[#e8f1ff]/90 hover:bg-[#3b82f6]/12 transition-all duration-[150ms]"
                >
                  <span className="icon-tile w-7 h-7 !rounded-[8px]"><i className={`fa-solid ${it.icon} text-[#22d3ee] text-[11px]`} /></span>
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
