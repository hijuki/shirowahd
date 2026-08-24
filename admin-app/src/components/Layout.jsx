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
      <aside className="hidden md:flex flex-col w-56 shrink-0 fixed inset-y-0 left-0 z-30 bg-[rgba(8,10,32,.85)] backdrop-blur-2xl border-r border-line">
        <div className="p-6 flex items-center gap-3">
          <div className="icon-tile w-10 h-10"><i className="fa-solid fa-shield-halved text-lg text-indigo-300" /></div>
          <span className="font-display font-bold text-lg grad-text">Admin</span>
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-3">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${active === t.id ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30' : 'text-muted hover:bg-white/5 hover:text-ink border border-transparent'}`}>
              <i className={`fa-solid ${t.icon} w-5 text-center`} />{t.label}
            </button>
          ))}
        </nav>
        <div className="p-3">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted hover:bg-rose-500/10 hover:text-rose-300 transition-all w-full">
            <i className="fa-solid fa-right-from-bracket w-5 text-center" />Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-56 relative z-10 pb-24 md:pb-8">
        {/* Top bar mobile */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-20 bg-[rgba(3,0,20,.8)] backdrop-blur-xl border-b border-line">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-shield-halved text-indigo-300" />
            <span className="font-display font-bold grad-text">Admin</span>
          </div>
          <button onClick={logout} className="text-muted hover:text-rose-300 transition-colors text-sm"><i className="fa-solid fa-right-from-bracket" /></button>
        </header>

        <div className="p-4 md:p-8 max-w-6xl mx-auto anim-emerge">
          {children}
        </div>
      </main>

      {/* Bottom bar mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 nav-pill rounded-t-2xl flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)}
            className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all text-xs ${active === t.id ? 'text-indigo-300 bg-indigo-500/15' : 'text-muted'}`}>
            <i className={`fa-solid ${t.icon} text-lg`} />{t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
