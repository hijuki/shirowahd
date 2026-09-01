'use client'

export default function Navbar({ settings, onFaq, onAbout }) {
  const brandLogo = settings?.logoUrl || null
  const siteName = settings?.siteName || 'STATUSHD'
  const siteSubtitle = settings?.siteSubtitle || 'HD Uploader'

  return (
    <nav className="w-full mb-8 pt-2">
      <div className="relative flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)]">
        
        {/* Brand Identity */}
        <div className="flex items-center gap-3">
          {brandLogo ? (
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/[0.05] border border-white/[0.1] p-0.5 shrink-0 shadow-sm">
              <img src={brandLogo} alt={siteName} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C4A] grid place-items-center shrink-0 shadow-[0_4px_14px_rgba(37,211,102,0.35)]">
              <i className="fa-brands fa-whatsapp text-white text-lg" />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-[family-name:var(--font-display)] font-extrabold text-[15px] text-white tracking-tight truncate">
                {siteName}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[9px] font-extrabold text-sky-400 uppercase tracking-wider">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">{siteSubtitle}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onFaq}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08] grid place-items-center transition-colors"
            title="Bantuan & FAQ"
          >
            <i className="fa-regular fa-circle-question text-sm" />
          </button>

          <button
            onClick={onAbout}
            className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08] grid place-items-center transition-colors"
            title="Tentang Mesin"
          >
            <i className="fa-solid fa-circle-info text-sm" />
          </button>

          <a
            href="/admin"
            className="h-9 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08] flex items-center gap-1.5 text-xs font-bold transition-colors ml-1"
          >
            <i className="fa-solid fa-lock text-[10px] text-sky-400" />
            <span>Admin</span>
          </a>
        </div>
      </div>
    </nav>
  )
}
