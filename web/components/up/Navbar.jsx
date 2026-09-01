'use client'
import { useState, useEffect } from 'react'

export default function Navbar({ settings, onFaq, onAbout }) {
  const btnStyle =
    'w-9 h-9 rounded-[12px] bg-white/[0.03] border border-white/[0.08] grid place-items-center text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition-all active:scale-95'

  const [theme, setTheme] = useState('dark')
  useEffect(() => {
    const saved = localStorage.getItem('sw_theme') || 'dark'
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('sw_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <nav className="sticky top-3 z-40 mb-6 rounded-[20px] bg-[#060A14]/85 backdrop-blur-xl border border-white/[0.08] px-4 py-3 flex items-center justify-between shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)]">
      {/* Brand Identity */}
      <div className="flex items-center gap-3 min-w-0">
        {settings?.logoUrl ? (
          <div className="relative w-9 h-9 shrink-0 rounded-[12px] overflow-hidden bg-[#080e1c] border border-white/[0.08]">
            <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
          </div>
        ) : (
          <div className="relative w-9 h-9 shrink-0 rounded-[12px] bg-gradient-to-br from-[#25D366] via-[#1fae55] to-[#0e7a5f] grid place-items-center shadow-[0_4px_16px_-4px_rgba(37,211,102,0.4)] border border-white/20">
            <i className="fa-brands fa-whatsapp text-white text-[16px] drop-shadow" />
          </div>
        )}
        <div className="min-w-0 leading-tight">
          <p className="font-[family-name:var(--font-display)] font-extrabold text-[14px] text-white tracking-tight truncate">
            {settings?.siteName || 'SHIROWAHD'}
          </p>
          <p className="text-slate-400 text-[8px] font-extrabold tracking-[0.16em] uppercase truncate mt-0.5">
            {settings?.siteSubtitle || 'SWHDHLZ · BY HILLZ'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          className={btnStyle}
        >
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-xs`} />
        </button>

        <button onClick={onFaq} title="Bantuan / FAQ" className={btnStyle}>
          <i className="fa-solid fa-circle-question text-xs" />
        </button>

        <button onClick={onAbout} title="Tentang Platform" className={btnStyle}>
          <i className="fa-solid fa-circle-info text-xs" />
        </button>

        <a
          href="/admin"
          title="Panel Admin"
          className="w-9 h-9 rounded-[12px] bg-emerald-500/10 border border-emerald-500/25 grid place-items-center text-emerald-400 hover:text-white hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all active:scale-95"
        >
          <i className="fa-solid fa-user-shield text-xs" />
        </a>
      </div>
    </nav>
  )
}
