'use client'
import { useState, useEffect } from 'react'

export default function Navbar({ settings, onFaq, onAbout }) {
  const btn = 'w-8 h-8 rounded-[3px] grid place-items-center border transition-all duration-[150ms] active:scale-90'
  const btnIdle = `${btn} border-transparent text-[var(--t-muted)] hover:border-[var(--t-line-strong)] hover:bg-[var(--t-surface2)] hover:text-[var(--t-ink)]`
  const logoUrl = settings?.logoUrl || ''

  const [theme, setTheme] = useState('light')
  useEffect(() => {
    const saved = localStorage.getItem('sw_theme') || 'light'
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
    <nav className="sticky top-2 z-40 nav-pill px-3 py-2 flex items-center justify-between anim-slide-down">
      {/* Brand */}
      <div className="flex items-center gap-2 min-w-0">
        {logoUrl ? (
          <div className="w-8 h-8 shrink-0 rounded-[3px] overflow-hidden border border-[var(--t-line-strong)] bg-[var(--t-surface2)] p-0.5">
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="w-8 h-8 shrink-0 rounded-[3px] bg-[var(--t-ink)] text-[var(--t-bg)] grid place-items-center">
            <i className="fa-brands fa-whatsapp text-[15px]" />
          </div>
        )}
        <div className="min-w-0 leading-none">
          <p className="font-black text-[13px] tracking-tight truncate text-[var(--t-ink)]">{settings?.siteName || 'SHIROWAHD'}</p>
          <p className="font-mono text-[8px] font-semibold tracking-[.18em] uppercase truncate text-[var(--t-muted)] mt-0.5">
            {settings?.siteSubtitle || 'MEDIA · TANPA KOMPRESI'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button onClick={toggleTheme} title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'} className={btnIdle}>
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-[12px]`} />
        </button>
        <button onClick={onFaq} title="FAQ" className={btnIdle}>
          <i className="fa-solid fa-circle-question text-[12px]" />
        </button>
        <button onClick={onAbout} title="Tentang" className={btnIdle}>
          <i className="fa-solid fa-circle-info text-[12px]" />
        </button>
        <a href="/admin" title="Admin" className={btnIdle}>
          <i className="fa-solid fa-user-shield text-[11px]" />
        </a>
      </div>
    </nav>
  )
}
