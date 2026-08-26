'use client'
import { useEffect, useState } from 'react'
import Logo from './Logo'

export default function Navbar({ settings, onFaq, onAbout }) {
  const [theme, setTheme] = useState('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const cur = document.documentElement.getAttribute('data-theme')
    if (cur) setTheme(cur)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('shd-theme', next)
  }

  return (
    <nav className="sticky top-0 z-40 -mx-4 px-4" style={{ background: 'var(--t-surface)', borderBottom: '2px solid var(--t-hard)' }}>
      <div className="flex items-center justify-between gap-2 py-2.5 max-w-[480px] mx-auto">
        {/* Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <Logo size={22} />
          <div className="font-display text-[16px] leading-none truncate">
            <span style={{ color: 'var(--t-accent-2)', WebkitTextStroke: '.5px var(--t-hard)', paintOrder: 'stroke' }}>SHIRO</span>
            <span style={{ color: 'var(--t-ink)' }}>WAHD</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {[
            { fn: onFaq, icon: 'fa-circle-question', label: 'FAQ' },
            { fn: onAbout, icon: 'fa-circle-info', label: 'Tentang' },
          ].map(b => (
            <button key={b.label} onClick={b.fn} aria-label={b.label}
              className="w-8 h-8 grid place-items-center hover:bg-[var(--t-accent)] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--t-hard)] active:translate-y-0 active:shadow-none transition-all duration-150"
              style={{ border: '2px solid var(--t-hard)', borderRadius: 9, background: 'var(--t-surface)' }}>
              <i className={`fa-solid ${b.icon} text-[13px]`} />
            </button>
          ))}
          <button onClick={toggleTheme} aria-label="Ganti tema"
            className="w-8 h-8 grid place-items-center hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
            style={{ border: '2px solid var(--t-hard)', borderRadius: 9, background: 'var(--t-accent)', boxShadow: '2px 2px 0 var(--t-hard)' }}>
            <i key={theme} className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'} text-[13px]`} style={{ color: '#111111' }} />
          </button>
        </div>
      </div>
    </nav>
  )
}
