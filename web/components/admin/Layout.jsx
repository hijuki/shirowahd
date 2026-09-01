'use client'

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
  { id: 'files', label: 'Media Files', icon: 'fa-folder-open' },
  { id: 'settings', label: 'Pengaturan', icon: 'fa-sliders' },
  { id: 'security', label: 'Keamanan', icon: 'fa-shield-halved' },
  { id: 'bot', label: 'Bot WhatsApp', icon: 'fa-robot' },
]

export default function Layout({ active, setActive, children }) {
  const logout = () => {
    localStorage.removeItem('admin_token')
    window.location.reload()
  }

  return (
    <div className="min-h-dvh flex flex-col md:flex-row relative bg-[#04070F] text-white selection:bg-[#0062FF]/30 selection:text-white">
      {/* Background Layers */}
      <div className="bg-aurora" /><div className="bg-grid" /><div className="bg-noise" />

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 fixed inset-y-0 left-0 z-30 bg-[rgba(6,10,20,0.85)] backdrop-blur-2xl border-r border-white/[.07]">
        {/* Brand Header */}
        <div className="p-6 pb-5 flex items-center justify-between border-b border-white/[.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#0062FF] to-[#0047BA] p-[1px] shadow-[0_0_20px_rgba(0,98,255,0.3)]">
              <div className="w-full h-full rounded-xl bg-[#060A14] flex items-center justify-center">
                <i className="fa-solid fa-shield-halved text-sm text-[#38bdf8]" />
              </div>
            </div>
            <div>
              <span className="font-[family-name:var(--font-display)] font-extrabold text-base tracking-tight text-white block">
                SWHD ADMIN
              </span>
              <span className="text-[10px] font-mono text-[#7e90ad] block">
                SHIRO HLZ Console
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 flex flex-col gap-1.5 p-4 overflow-y-auto">
          <div className="px-3 pb-2 pt-1 text-[10px] font-extrabold uppercase tracking-widest text-[#7e90ad]/60 font-mono">
            Navigation Menu
          </div>
          {tabs.map(t => {
            const isActive = active === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-bold text-left transition-all duration-200 ${isActive
                  ? 'bg-[#0062FF] text-white shadow-[0_4px_20px_rgba(0,98,255,0.35)]'
                  : 'text-[#7e90ad] hover:text-white hover:bg-white/[.04]'}`}
              >
                <i className={`fa-solid ${t.icon} w-4 text-center text-sm ${isActive ? 'text-white' : 'text-[#7e90ad]'}`} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Host & Profile Footer */}
        <div className="p-4 border-t border-white/[.06] space-y-3 bg-white/[.01]">
          <div className="p-3 rounded-xl bg-white/[.02] border border-white/[.04] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-good animate-pulse" />
              <span className="text-[11px] font-mono text-white/90 font-semibold">95.111.221.189</span>
            </div>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#0062FF]/20 text-[#38bdf8] border border-[#0062FF]/30">
              SSH 443
            </span>
          </div>

          <button
            onClick={logout}
            className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#7e90ad] hover:text-bad hover:bg-bad/10 border border-transparent hover:border-bad/20 transition-all duration-150 w-full"
          >
            <i className="fa-solid fa-arrow-right-from-bracket text-xs" />
            <span>Keluar Sesi (Logout)</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 relative z-10 pb-24 md:pb-12 min-h-dvh flex flex-col">
        {/* Top Bar Mobile */}
        <header className="md:hidden flex items-center justify-between px-5 py-3.5 sticky top-0 z-30 bg-[rgba(4,7,15,0.88)] backdrop-blur-2xl border-b border-white/[.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0062FF] flex items-center justify-center">
              <i className="fa-solid fa-shield-halved text-xs text-white" />
            </div>
            <span className="font-[family-name:var(--font-display)] font-extrabold text-sm tracking-tight text-white">
              SWHD ADMIN
            </span>
          </div>
          <button
            onClick={logout}
            aria-label="Logout"
            className="w-10 h-10 rounded-xl bg-white/[.04] border border-white/[.08] text-[#7e90ad] hover:text-bad flex items-center justify-center text-xs transition-colors"
          >
            <i className="fa-solid fa-arrow-right-from-bracket" />
          </button>
        </header>

        {/* Content Container */}
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto flex-1 anim-entrance">
          {children}
        </div>
      </main>

      {/* Bottom Bar Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[rgba(6,10,20,0.92)] backdrop-blur-2xl border-t border-white/[.08] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-around">
        {tabs.map(t => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all duration-150 text-[10px] font-bold ${isActive
                ? 'text-[#38bdf8] bg-[#0062FF]/15'
                : 'text-[#7e90ad] hover:text-white'}`}
            >
              <i className={`fa-solid ${t.icon} text-base`} />
              <span className="truncate max-w-[64px]">{t.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
