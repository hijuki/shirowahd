'use client'

/* ═══════════════════════════════════════════════════════════════
   METALLIC 3D CHAINS — High-Detail Chrome/Obsidian Industrial Links
   ═══════════════════════════════════════════════════════════════ */

function ChainLink({ orientation = 'vertical', index = 0 }) {
  const isVertical = orientation === 'vertical'

  return (
    <div
      className="relative flex items-center justify-center my-[-7px] transform-gpu will-change-transform"
      style={{
        zIndex: isVertical ? 2 : 1,
      }}
    >
      <svg
        width={isVertical ? "26" : "18"}
        height="36"
        viewBox="0 0 26 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_4px_10px_rgba(0,0,0,0.85)]"
      >
        <defs>
          {/* Chrome / Titanium Gradient */}
          <linearGradient id={`chainGrad-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="25%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="75%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Specular Inner Glint */}
          <linearGradient id={`chainGlint-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="40%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.4)" />
          </linearGradient>
        </defs>

        {/* Outer Ring */}
        <rect
          x="3"
          y="3"
          width={isVertical ? "20" : "12"}
          height="30"
          rx={isVertical ? "10" : "6"}
          stroke={`url(#chainGrad-${index})`}
          strokeWidth="4.5"
          fill="none"
        />

        {/* Inner Highlight Reflection */}
        <rect
          x="3"
          y="3"
          width={isVertical ? "20" : "12"}
          height="30"
          rx={isVertical ? "10" : "6"}
          stroke={`url(#chainGlint-${index})`}
          strokeWidth="1.5"
          fill="none"
        />

        {/* Steel Rivet / Joiner Notch */}
        {isVertical && (
          <circle cx="13" cy="18" r="1.5" fill="#e2e8f0" opacity="0.6" />
        )}
      </svg>
    </div>
  )
}

export default function MetallicChains() {
  const linkCount = 28 // Panjang rantai vertikal

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden md:block">
      {/* Rantai Kiri */}
      <div className="absolute -top-6 left-6 lg:left-14 flex flex-col items-center chain-sway-left opacity-75 hover:opacity-100 transition-opacity">
        {/* Anchor Bracket Atas */}
        <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-slate-600 shadow-[0_6px_16px_rgba(0,0,0,0.9)] grid place-items-center mb-[-4px] z-10">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-500 shadow-inner" />
        </div>
        {[...Array(linkCount)].map((_, i) => (
          <ChainLink key={`left-${i}`} orientation={i % 2 === 0 ? 'vertical' : 'horizontal'} index={i} />
        ))}
      </div>

      {/* Rantai Kanan */}
      <div className="absolute -top-6 right-6 lg:right-14 flex flex-col items-center chain-sway-right opacity-75 hover:opacity-100 transition-opacity">
        {/* Anchor Bracket Atas */}
        <div className="w-9 h-9 rounded-lg bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-slate-600 shadow-[0_6px_16px_rgba(0,0,0,0.9)] grid place-items-center mb-[-4px] z-10">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-900 border border-slate-500 shadow-inner" />
        </div>
        {[...Array(linkCount)].map((_, i) => (
          <ChainLink key={`right-${i}`} orientation={i % 2 === 0 ? 'vertical' : 'horizontal'} index={i + 100} />
        ))}
      </div>
    </div>
  )
}
