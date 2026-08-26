'use client'
import { useEffect, useState } from 'react'

export default function Navbar({ settings, onFaq, onAbout }) {
  const [theme, setTheme] = useState('light')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('shd-theme') : null
    if (saved) {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('shd-theme', next)
  }

  useEffect(() => {
    const cur = document.documentElement.getAttribute('data-theme')
    if (cur) setTheme(cur)
  }, [])

  return (
    <nav className={`sticky top-3 z-40 transition-all duration-300 ${scrolled ? 'scale-[1.02]' : ''}`}>
      <div className="card px-4 py-2.5 flex items-center justify-between shadow-md" style={{ background: 'var(--t-nav)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--t-accent)] flex items-center justify-center shadow-md brand-shine">
            <i className="fa-solid fa-bolt text-white text-[13px]" />
          </div>
          <div className="leading-none">
            <div className="text-[14px] font-black tracking-tight text-[var(--t-ink)]">
              SHIRO<span className="text-[var(--t-accent)]">WAHD</span>
            </div>
            <div className="font-mono text-[8px] text-[var(--t-muted)] tracking-[0.18em] uppercase mt-0.5">
              HD Media Gateway
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onFaq}
            className="w-9 h-9 rounded-xl border border-[var(--t-line)] bg-[var(--t-surface)] text-[var(--t-muted)] hover:text-[var(--t-ink)] hover:border-[var(--t-ink)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center shadow-sm"
            aria-label="FAQ"
          >
            <i className="fa-solid fa-circle-question text-[15px]" />
          </button>
          <button
            onClick={onAbout}
            className="w-9 h-9 rounded-xl border border-[var(--t-line)] bg-[var(--t-surface)] text-[var(--t-muted)] hover:text-[var(--t-ink)] hover:border-[var(--t-ink)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center shadow-sm"
            aria-label="Tentang"
          >
            <i className="fa-solid fa-circle-info text-[15px]" />
          </button>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl border border-[var(--t-line)] bg-[var(--t-surface)] text-[var(--t-muted)] hover:text-[var(--t-ink)] hover:border-[var(--t-ink)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center shadow-sm overflow-hidden"
            aria-label="Ganti tema"
          >
            <i key={theme} className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'} text-[15px] anim-pop-spring`} />
          </button>
        </div>
      </div>
    </nav>
  )
}
