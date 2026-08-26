'use client'
import { useState, useEffect } from 'react'

export default function Navbar({ settings, onFaq, onAbout }) {
  const btn = 'w-9 h-9 rounded-full grid place-items-center border transition-all duration-[200ms] active:scale-90'
  const logoUrl = settings?.logoUrl || ''

  const [theme, setTheme] = useState('dark')
  useEffect(() => {
    const saved = localStorage.getItem('sw_theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('sw_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <nav className="sticky top-3 z-40 nav-pill nav-3d rounded-[18px] px-3 py-2.5 flex items-center justify-between mb-6 anim-slide-down">
      {/* Brand */}
      <div className="flex items-center gap-2.5 min-w-0">
        {logoUrl ? (
          <div className="w-9 h-9 shrink-0 rounded-[11px] overflow-hidden bg-[#080e1c] border border-white/[.08] shadow-[0_4px_16px_-4px_rgba(34,211,238,.3)]">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="relative w-9 h-9 shrink-0 rounded-[11px] bg-gradient-to-br from-[#25D366] via-[#1fae55] to-[#0e7a5f] grid place-items-center shadow-[0_4px_16px_-4px_rgba(37,211,102,.5)]">
            <span className="absolute inset-[1px] rounded-[10px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <i className="fa-brands fa-whatsapp text-white text-[15px] relative" />
          </div>
        )}
        <div className="min-w-0 leading-tight">
          <p className="font-[family-name:var(--font-display)] font-bold text-[14px] tracking-tight truncate">{settings?.siteName || 'SHIROWAHD'}</p>
          <p className="text-[var(--t-muted)] text-[8px] font-bold tracking-[.15em] uppercase truncate">{settings?.siteSubtitle || 'SWHDHLZ · BY HILLZ'}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <button onClick={toggleTheme} title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          className={`${btn} bg-white/[.04] border-white/[.08] text-[var(--t-muted)] hover:text-[#fbbf24] hover:border-[#fbbf24]/30 hover:bg-[#fbbf24]/[.08]`}>
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-[13px] transition-transform duration-[250ms] ${theme === 'light' ? 'rotate-[360deg]' : ''}`} />
        </button>
        <button onClick={onFaq} title="FAQ" className={`${btn} bg-white/[.04] border-white/[.08] text-[var(--t-muted)] hover:text-[#22d3ee] hover:border-[#22d3ee]/30 hover:bg-[#22d3ee]/[.08]`}>
          <i className="fa-solid fa-circle-question text-[13px]" />
        </button>
        <button onClick={onAbout} title="Tentang" className={`${btn} bg-white/[.04] border-white/[.08] text-[var(--t-muted)] hover:text-[#3b82f6] hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/[.08]`}>
          <i className="fa-solid fa-circle-info text-[13px]" />
        </button>
        <a href="/admin" title="Admin" className={`${btn} bg-white/[.04] border-white/[.08] text-[var(--t-muted)] hover:text-[#34d399] hover:border-[#34d399]/30 hover:bg-[#34d399]/[.08]`}>
          <i className="fa-solid fa-user-shield text-[12px]" />
        </a>
      </div>
    </nav>
  )
}
