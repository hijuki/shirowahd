'use client'
import { useState, useEffect } from 'react'

export default function Navbar({ settings, onFaq, onAbout }) {
  const btn = 'relative w-9 h-9 rounded-[12px] grid place-items-center border transition-all duration-[200ms] active:scale-90 group overflow-hidden'
  const logoUrl = settings?.logoUrl || ''

  const [theme, setTheme] = useState('dark')
  useEffect(() => {
    const saved = localStorage.getItem('sw_theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    // transisi halus: kelas sementara, dibuang habis animasi
    document.documentElement.classList.add('theme-anim')
    setTimeout(() => document.documentElement.classList.remove('theme-anim'), 600)
    setTheme(next)
    localStorage.setItem('sw_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <nav className="nav-pill sticky top-3 z-40 relative rounded-[18px] px-4 py-3 flex items-center justify-between mb-6 anim-slide-down overflow-hidden">
      {/* Top subtle glow line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#22d3ee]/40 to-transparent pointer-events-none" />
      {/* One-shot light sweep */}
      <div className="nav-sheen" />
      {/* Bottom edge accent */}
      <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#3b82f6]/20 to-transparent pointer-events-none" />

      {/* Brand */}
      <div className="flex items-center gap-2.5 min-w-0 relative z-10">
        {logoUrl ? (
          <div className="relative w-9 h-9 shrink-0 rounded-[12px] overflow-hidden bg-[#080e1c] border border-white/[.08] shadow-[0_4px_16px_-4px_rgba(34,211,238,.3)] group">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
            <span className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ) : (
          <div className="relative w-9 h-9 shrink-0 rounded-[12px] bg-gradient-to-br from-[#25D366] via-[#1fae55] to-[#0e7a5f] grid place-items-center shadow-[0_4px_16px_-4px_rgba(37,211,102,.5)] group">
            <span className="absolute inset-[1px] rounded-[11px] bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            <i className="fa-brands fa-whatsapp text-white text-[16px] relative drop-shadow-[0_2px_4px_rgba(0,0,0,.3)]" />
          </div>
        )}
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1.5">
            <p className="font-[family-name:var(--font-display)] font-extrabold text-[14px] tracking-tight truncate grad-text">
              {settings?.siteName || 'SHIROWAHD'}
            </p>
            <span className="px-1.5 py-[1px] rounded-[5px] text-[7px] font-black uppercase tracking-wider leading-none bg-[#22d3ee]/10 border border-[#22d3ee]/25 text-[#22d3ee] self-center">v3.8</span>
          </div>
          <p className="text-[var(--t-muted)] text-[8px] font-bold tracking-[.14em] uppercase truncate mt-0.5">
            {settings?.siteSubtitle || 'SWHDHLZ · BY HILLZ'}
          </p>
        </div>
      </div>

      {/* Quick actions with hover shine */}
      <div className="flex items-center gap-2 relative z-10">
        {/* Theme toggle */}
        <button onClick={toggleTheme} title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          className={`${btn} bg-white/[.03] border-white/[.07] text-[var(--t-muted)] hover:text-[#fbbf24] hover:border-[#fbbf24]/30 hover:bg-[#fbbf24]/[.08]`}>
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-[12px] transition-transform duration-[250ms] ${theme === 'light' ? 'rotate-[360deg]' : ''}`} />
          <span className="absolute inset-0 bg-gradient-to-b from-white/[.06] to-transparent pointer-events-none" />
        </button>
        <button onClick={onFaq} title="FAQ" className={`${btn} bg-white/[.03] border-white/[.07] text-[var(--t-muted)] hover:text-[#22d3ee] hover:border-[#22d3ee]/30 hover:bg-[#22d3ee]/[.08]`}>
          <i className="fa-solid fa-circle-question text-[12px]" />
          <span className="absolute inset-0 bg-gradient-to-b from-white/[.06] to-transparent pointer-events-none" />
        </button>
        <button onClick={onAbout} title="Tentang" className={`${btn} bg-white/[.03] border-white/[.07] text-[var(--t-muted)] hover:text-[#3b82f6] hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/[.08]`}>
          <i className="fa-solid fa-circle-info text-[12px]" />
          <span className="absolute inset-0 bg-gradient-to-b from-white/[.06] to-transparent pointer-events-none" />
        </button>
        <a href="/admin" title="Admin" className={`${btn} bg-[#34d399]/[.06] border-[#34d399]/20 text-[#34d399] hover:text-white hover:border-[#34d399]/40 hover:bg-[#34d399]/20 shadow-[0_0_12px_-3px_rgba(52,211,153,.2)]`}>
          <i className="fa-solid fa-user-shield text-[11px]" />
          <span className="absolute inset-0 bg-gradient-to-b from-white/[.08] to-transparent pointer-events-none" />
        </a>
      </div>
    </nav>
  )
}
