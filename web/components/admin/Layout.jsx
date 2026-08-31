'use client'

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
  { id: 'files', label: 'Files', icon: 'fa-folder-open' },
  { id: 'settings', label: 'Settings', icon: 'fa-gear' },
  { id: 'security', label: 'Security', icon: 'fa-shield-halved' },
  { id: 'bot', label: 'Bot', icon: 'fa-robot' },
]

export default function Layout({ active, setActive, children }) {
  const logout = () => { localStorage.removeItem('admin_token'); window.location.reload() }

  return (
    <div className="min-h-dvh flex flex-col md:flex-row relative">
      <div className="bg-aurora" /><div className="bg-grid" /><div className="bg-noise" />

      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 fixed inset-y-0 left-0 z-30 bg-[rgba(4,7,15,.9)] backdrop-blur-2xl border-r border-white/[.07]">
        <div className="p-6 flex items-center gap-3">
          <div className="icon-tile w-10 h-10"><i className="fa-solid fa-shield-halved text-lg text-[#67e8f9]" /></div>
          <span className="font-[family-name:var(--font-display)] font-bold text-lg grad-text">Admin</span>
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-3">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)}
              className={`sidebar-btn flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium text-left ${active === t.id ? 'active' : ''}`}>
              <i className={`fa-solid ${t.icon} w-5 text-center`} />{t.label}
            </button>
          ))}
        </nav>
        <div className="p-3">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium text-[#7e90ad] hover:bg-bad/10 hover:text-bad transition-all duration-[150ms] w-full">
            <i className="fa-solid fa-right-from-bracket w-5 text-center" />Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-56 relative z-10 pb-24 md:pb-8">
        {/* Top bar mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-20 bg-[rgba(4,7,15,.85)] backdrop-blur-xl border-b border-white/[.07]">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-[#67e8f9]" />
            <span className="font-[family-name:var(--font-display)] font-bold grad-text">Admin</span>
          </div>
          {/* Target sentuh 44px: ikon 14x20px terlalu kecil untuk jempol di HP. */}
          <button onClick={logout} aria-label="Keluar dari admin" className="text-[#7e90ad] hover:text-bad transition-all duration-[150ms] text-sm min-w-11 min-h-11 flex items-center justify-center -mr-2"><i className="fa-solid fa-right-from-bracket" /></button>
        </header>

        <div className="p-4 md:p-8 max-w-6xl mx-auto anim-entrance">
          {children}
        </div>
      </main>

      {/* Bottom bar mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 nav-pill rounded-t-[16px] flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)}
            className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-[12px] transition-all duration-[150ms] text-xs ${active === t.id ? 'text-[#22d3ee] bg-[#22d3ee]/12' : 'text-[#7e90ad]'}`}>
            <i className={`fa-solid ${t.icon} text-lg`} />{t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
