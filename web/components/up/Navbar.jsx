'use client'

export default function Navbar({ settings, onFaq, onAbout }) {
  return (
    <nav className="flex items-center justify-between py-3 mb-4 anim-entrance">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#25D366] to-[#128C7E] grid place-items-center shrink-0">
          <i className="fa-brands fa-whatsapp text-white text-sm" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate leading-tight">{settings?.siteName || 'SHIROWAHD'}</p>
          <p className="text-[8px] text-[#7e90ad]/50 font-bold tracking-[.12em] uppercase">SWHDHLZ</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {[
          { fn: onFaq, i: 'fa-circle-question', t: 'FAQ' },
          { fn: onAbout, i: 'fa-circle-info', t: 'About' },
        ].map(b => (
          <button key={b.t} onClick={b.fn} title={b.t}
            className="w-8 h-8 rounded-lg grid place-items-center text-[#7e90ad]/50 hover:text-[#7e90ad] hover:bg-white/[.04] active:scale-90 transition-all duration-150">
            <i className={`fa-solid ${b.i} text-sm`} />
          </button>
        ))}
        <a href="/admin" title="Admin"
          className="w-8 h-8 rounded-lg grid place-items-center text-[#7e90ad]/50 hover:text-[#7e90ad] hover:bg-white/[.04] active:scale-90 transition-all duration-150">
          <i className="fa-solid fa-gear text-sm" />
        </a>
      </div>
    </nav>
  )
}
