'use client'
import { useEffect, useState } from 'react'

export default function Navbar({ settings, onFaq, onAbout }) {
  const [theme, setTheme] = useState('dark')
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
    <nav className="sticky top-3 z-40">
      <div
        className="flex items-center justify-between gap-2 px-3 py-2.5"
        style={{ background: 'var(--t-nav)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: 'var(--t-card-border)', borderRadius: 16, boxShadow: 'var(--sh-md)' }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 shrink-0 grid place-items-center anim-float" style={{ border: '2.5px solid var(--t-hard)', borderRadius: 12, background: 'var(--t-accent)', boxShadow: 'var(--sh-xs)' }}>
            {/* Logo bolt mark */}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M13 2 L5 13.5 H10.5 L9.5 22 L19 9.5 H12.8 Z" fill="#131311" stroke="#131311" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="leading-none min-w-0">
            <div className="font-display text-[15px] text-[var(--t-ink)] truncate">
              SHIRO<span style={{ color: 'var(--t-pop)' }}>WAHD</span>
            </div>
            <div className="font-mono text-[8px] font-bold text-[var(--t-muted)] tracking-[0.22em] uppercase mt-1">
              HD Media Gateway
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {[
            { fn: onFaq, icon: 'fa-circle-question', label: 'FAQ' },
            { fn: onAbout, icon: 'fa-circle-info', label: 'Tentang' },
          ].map(b => (
            <button key={b.label} onClick={b.fn} aria-label={b.label}
              className="w-9 h-9 grid place-items-center text-[var(--t-muted)] hover:text-[#131311] hover:bg-[var(--t-accent)] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_var(--t-hard)] active:translate-y-0 active:shadow-none transition-all duration-150"
              style={{ border: '2px solid var(--t-hard)', borderRadius: 11, background: 'var(--t-surface)' }}>
              <i className={`fa-solid ${b.icon} text-[14px]`} />
            </button>
          ))}
          <button onClick={toggleTheme} aria-label="Ganti tema"
            className="w-9 h-9 grid place-items-center hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
            style={{ border: '2px solid var(--t-hard)', borderRadius: 11, background: theme === 'light' ? 'var(--t-pop)' : 'var(--t-surface)', color: theme === 'light' ? '#fff' : 'var(--t-muted)', boxShadow: 'var(--sh-xs)' }}>
            <i key={theme} className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'} text-[14px] anim-pop-spring`} />
          </button>
        </div>
      </div>
    </nav>
  )
}
