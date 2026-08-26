'use client'
import { useState, useEffect, useRef } from 'react'

/* ═══════════════════════════════════════════════
   MODAL SHELL — Premium overlay with particles
   ═══════════════════════════════════════════════ */
function ModalShell({ onClose, children, accent = 'cyan' }) {
  const [vis, setVis] = useState(false)
  const ref = useRef(null)
  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setVis(true))) }, [])
  const close = onClose ? () => { setVis(false); setTimeout(onClose, 460) } : null
  const ac = accent === 'green' ? '#34d399' : '#22d3ee'

  return (
    <div className={`fixed inset-0 z-[80] transition-opacity duration-[480ms] ${vis ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      <div className="absolute inset-0 bg-[#020408]/[.97]" onClick={close} />

      {/* Floating sparkle particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="sparkle-dot" style={{
            left: `${8 + (i * 7.5) % 84}%`,
            top: `${10 + (i * 13) % 75}%`,
            animationDelay: `${i * 0.35}s`,
            animationDuration: `${2.5 + (i % 3) * 0.8}s`,
            '--sparkle-color': ['#22d3ee', '#3b82f6', '#34d399', '#22d3ee', '#3b82f6'][i % 5],
          }} />
        ))}
      </div>

      {/* Floating orbs in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[200px] h-[200px] rounded-full bg-[#22d3ee]/[.04] blur-[80px] orb-float" style={{ top: '10%', left: '15%' }} />
        <div className="absolute w-[160px] h-[160px] rounded-full bg-[#3b82f6]/[.05] blur-[60px] orb-float-2" style={{ top: '60%', right: '10%' }} />
      </div>

      <div className="absolute inset-0 z-10 overflow-y-auto modal-scroll-hide" onClick={close}>
        <div className="min-h-full flex items-center justify-center p-4 py-6">
          <div
            ref={ref}
            onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-[400px] transition-all duration-[560ms] will-change-transform ${vis ? 'scale-100 translate-y-0 opacity-100 blur-0' : 'scale-[.93] translate-y-7 opacity-0 blur-sm'}`}
            style={{ transitionTimingFunction: 'var(--ease-out)' }}
          >
            {/* Outer glow halo */}
            <div className="absolute -inset-16 rounded-[60px] pointer-events-none" style={{
              background: `radial-gradient(ellipse at center, ${ac}12, transparent 70%)`,
              filter: 'blur(50px)',
            }} />

            {/* Card */}
            <div className="relative rounded-[22px] bg-[#0a1020] border border-white/[.08] shadow-[0_32px_80px_-12px_rgba(0,0,0,.9)] overflow-hidden">
              {/* Animated gradient border glow (top) */}
              <div className="absolute top-0 inset-x-0 h-[2px] overflow-hidden rounded-t-[22px]">
                <div className="h-full w-[200%] grad-border-sweep" />
              </div>

              {/* Bottom edge glow */}
              <div className="absolute bottom-0 inset-x-0 h-px overflow-hidden rounded-b-[22px]">
                <div className="h-full w-[200%] grad-border-sweep" style={{ animationDelay: '1.5s' }} />
              </div>

              {/* Side accent lines */}
              <div className="absolute top-8 bottom-8 left-0 w-px bg-gradient-to-b from-transparent via-[#3b82f6]/15 to-transparent" />
              <div className="absolute top-8 bottom-8 right-0 w-px bg-gradient-to-b from-transparent via-[#22d3ee]/15 to-transparent" />

              {/* Corner accent dots */}
              <div className="absolute top-3 left-3 w-1 h-1 rounded-full bg-[#22d3ee]/30" />
              <div className="absolute top-3 right-3 w-1 h-1 rounded-full bg-[#3b82f6]/30" />
              <div className="absolute bottom-3 left-3 w-1 h-1 rounded-full bg-[#3b82f6]/20" />
              <div className="absolute bottom-3 right-3 w-1 h-1 rounded-full bg-[#22d3ee]/20" />

              {/* Inner grid pattern */}
              <div className="absolute inset-0 opacity-[.025] pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }} />

              <div className="relative p-5">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { ModalShell }

/* ─── Close button ─── */
function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} className="w-8 h-8 rounded-full bg-white/[.04] border border-white/[.08] grid place-items-center text-[var(--t-muted)] hover:text-white hover:bg-white/[.1] hover:rotate-90 hover:border-white/20 transition-all duration-[250ms]" style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      <i className="fa-solid fa-xmark text-xs" />
    </button>
  )
}

/* ─── Link buttons ─── */
export function LinkButtons({ ownerWhatsapp, channels = [], claimGroups = [], popupButtons = [], settings = {} }) {
  const items = []
  if (ownerWhatsapp && settings.showOwnerBtn !== false) items.push({ i: 'fa-brands fa-whatsapp', t: 'Chat Developer', s: 'Hubungi langsung', href: `https://wa.me/${String(ownerWhatsapp).replace(/[^0-9]/g, '')}`, c: '#25D366', feat: true })
  if (settings.showChannelsBtn !== false) channels.slice(0, 2).forEach(ch => items.push({ i: 'fa-solid fa-tower-broadcast', t: ch.name || 'Saluran', s: 'Saluran resmi', href: ch.link, c: '#22d3ee' }))
  if (settings.showClaimBtn !== false) claimGroups.slice(0, 2).forEach(g => items.push({ i: 'fa-solid fa-comments', t: g.name || 'Grup Claim', s: 'Klaim file di sini', href: g.link, c: '#34d399' }))
  if (settings.showPopupBtns !== false) popupButtons.filter(b => b.link).slice(0, 3).forEach(b => items.push({ i: 'fa-solid fa-link', t: b.name || 'Link', s: 'Buka link', href: b.link, c: '#3b82f6' }))
  if (!items.length) return null
  return (
    <div className={`grid gap-2 ${items.length === 1 ? '' : items.length <= 4 && items.length % 2 === 0 ? 'grid-cols-2' : ''}`}>
      {items.map((it, idx) => (
        <a key={it.t + it.href} href={it.href} target="_blank" rel="noreferrer"
          className={`link-btn-premium flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 border group ${it.feat ? 'col-span-full' : ''}`}
          style={{ background: `${it.c}0a`, borderColor: `${it.c}20`, animationDelay: `${idx * 80}ms` }}>
          <span className="w-9 h-9 shrink-0 rounded-[11px] grid place-items-center relative overflow-hidden" style={{ background: `${it.c}15`, border: `1px solid ${it.c}30` }}>
            <i className={`${it.i} text-[14px]`} style={{ color: it.c }} />
            {/* Icon inner shimmer */}
            <span className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block font-bold text-[12px] truncate">{it.t}</span>
            <span className="block text-[var(--t-muted)] text-[10px]">{it.s}</span>
          </span>
          <i className="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-30 group-hover:opacity-80 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-[200ms]" style={{ color: it.c }} />
        </a>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════
   WELCOME / INTRO — Premium animated
   ═══════════════════════════════════════ */
export function IntroModal({ onDone, settings }) {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 150)   // logo appears
    const t2 = setTimeout(() => setPhase(2), 500)   // title + badge
    const t3 = setTimeout(() => setPhase(3), 800)   // steps start
    const t4 = setTimeout(() => setPhase(4), 1400)  // contacts + button
    return () => [t1, t2, t3, t4].forEach(clearTimeout)
  }, [])

  const steps = [
    { i: 'fa-cloud-arrow-up', t: 'Upload file', d: 'Pilih video atau foto dari galeri kamu.', c: '#22d3ee' },
    { i: 'fa-key', t: 'Dapat kode unik', d: 'Kode seperti .claim A1B2C3 langsung tersedia.', c: '#3b82f6' },
    { i: 'fa-paper-plane', t: 'Kirim di grup', d: 'Paste kode di grup WhatsApp — bot kirim filenya.', c: '#34d399' },
  ]

  return (
    <ModalShell>
      {/* ── Confetti on welcome ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px]">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="confetti-particle" style={{
            '--x': `${8 + Math.random() * 84}%`,
            '--delay': `${0.2 + i * 0.15}s`,
            '--color': ['#22d3ee', '#3b82f6', '#34d399', '#fbbf24', '#22d3ee'][i % 5],
            '--drift': `${-30 + Math.random() * 60}px`,
          }} />
        ))}
      </div>

      {/* ── Brand header ── */}
      <div className="text-center mb-5 relative">
        {/* Logo with burst effect */}
        <div className={`relative inline-block mb-4 transition-all duration-[600ms] ${phase >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
          {/* Burst rings */}
          <div className={`absolute -inset-6 rounded-full transition-all duration-[800ms] ${phase >= 1 ? 'success-ring-1' : 'opacity-0 scale-0'}`} style={{ borderColor: 'rgba(37,211,102,.3)' }} />
          <div className={`absolute -inset-10 rounded-full transition-all duration-[1000ms] ${phase >= 1 ? 'success-ring-2' : 'opacity-0 scale-0'}`} style={{ borderColor: 'rgba(37,211,102,.15)' }} />

          <div className="absolute -inset-5 rounded-full bg-[#25D366]/12 blur-xl success-halo pointer-events-none" />
          <div className="absolute -inset-3 rounded-[24px] border-ring-spin pointer-events-none" />
          <div className="relative w-[68px] h-[68px] rounded-[22px] bg-gradient-to-br from-[#25D366] via-[#1fae55] to-[#0e7a5f] grid place-items-center shadow-[0_0_50px_-6px_rgba(37,211,102,.5)] floaty">
            <span className="absolute inset-[1px] rounded-[21px] bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
            <i className="fa-brands fa-whatsapp text-white text-[30px] drop-shadow-[0_2px_10px_rgba(0,0,0,.4)]" />
          </div>

          {/* Sparkles around logo */}
          {phase >= 1 && [...Array(5)].map((_, i) => (
            <div key={i} className="absolute w-1 h-1 rounded-full check-sparkle" style={{
              top: '50%', left: '50%',
              '--angle': `${i * 72}deg`,
              '--dist': `${32 + (i % 2) * 10}px`,
              '--color': ['#25D366', '#22d3ee', '#3b82f6', '#34d399', '#25D366'][i],
              animationDelay: `${200 + i * 100}ms`,
            }} />
          ))}
        </div>

        {/* Title */}
        <div className={`transition-all duration-[500ms] ${phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-tight leading-none grad-text">
            {settings?.siteName || 'SHIROWAHD'}
          </h2>
          <p className="text-[#7e90ad] text-[10px] mt-1.5 tracking-wide">Upload media HD ke grup WhatsApp</p>
        </div>

        {/* Badge */}
        <div className={`mt-3 transition-all duration-[400ms] delay-100 ${phase >= 2 ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
          <span className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white/[.03] border border-white/[.06]">
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] grid place-items-center text-[8px] font-extrabold text-white">H</span>
            <span className="text-[9px] tracking-wider"><span className="text-[#7e90ad] font-semibold">SWHDHLZ</span> <span className="text-[#7e90ad]/40">BY</span> <span className="grad-text font-extrabold">HILLZ</span></span>
          </span>
        </div>
      </div>

      {/* ── Steps with staggered reveal ── */}
      <div className="space-y-2 mb-5">
        {steps.map((s, idx) => (
          <div key={s.t}
            className={`flex items-center gap-3 p-3 rounded-[14px] border transition-all duration-[500ms] ${phase >= 3 ? 'bg-white/[.03] border-white/[.07] translate-x-0 opacity-100' : 'bg-transparent border-transparent translate-x-6 opacity-0'}`}
            style={{ transitionTimingFunction: 'var(--ease-out)', transitionDelay: `${idx * 120}ms` }}>
            <div className="w-10 h-10 shrink-0 rounded-[12px] grid place-items-center relative overflow-hidden group" style={{ background: `${s.c}12`, border: `1px solid ${s.c}28` }}>
              <i className={`fa-solid ${s.i} text-[14px] relative z-10`} style={{ color: s.c }} />
              {/* Icon pulse ring */}
              <div className="absolute inset-0 rounded-[12px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ boxShadow: `inset 0 0 20px ${s.c}20` }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[12px]">{s.t}</p>
              <p className="text-[#7e90ad] text-[9px] leading-snug mt-0.5">{s.d}</p>
            </div>
            <span className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-[9px] font-extrabold border" style={{ background: `${s.c}10`, color: s.c, borderColor: `${s.c}25` }}>{idx + 1}</span>
          </div>
        ))}
      </div>

      {/* ── Contacts ── */}
      <div className={`transition-all duration-[500ms] ${phase >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        {(settings?.ownerWhatsapp || settings?.channels?.length || settings?.claimGroups?.length || settings?.popupButtons?.length) ? (
          <>
            <p className="text-[8px] font-extrabold tracking-[.18em] uppercase text-[#7e90ad]/60 mb-2 flex items-center gap-2">
              <span className="flex-1 h-px bg-white/[.06]" />Terhubung<span className="flex-1 h-px bg-white/[.06]" />
            </p>
            <div className="mb-5">
              <LinkButtons ownerWhatsapp={settings?.ownerWhatsapp} channels={settings?.channels} claimGroups={settings?.claimGroups} popupButtons={settings?.popupButtons} settings={settings} />
            </div>
          </>
        ) : null}

        {/* Premium CTA button */}
        <button onClick={onDone}
          className="relative overflow-hidden w-full py-3.5 rounded-[14px] bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] text-white font-bold text-[13px] shadow-[0_4px_24px_-4px_rgba(34,211,238,.5)] hover:shadow-[0_8px_32px_-4px_rgba(34,211,238,.65)] hover:brightness-110 active:scale-[.97] transition-all duration-[200ms] group">
          <span className="absolute inset-0 btn-shine-sweep pointer-events-none" />
          <span className="relative flex items-center justify-center gap-2">
            <i className="fa-solid fa-rocket text-[11px] group-hover:-translate-y-0.5 transition-transform duration-200" />
            Mulai Upload
            <i className="fa-solid fa-arrow-right text-[11px] group-hover:translate-x-1 transition-transform duration-200" />
          </span>
        </button>

        <p className="text-center text-[#7e90ad]/20 text-[8px] mt-3 tracking-wide">© {new Date().getFullYear()} SWHDHLZ · BY HILLZ</p>
      </div>
    </ModalShell>
  )
}

/* ═══════════════════════════════════════
   FAQ
   ═══════════════════════════════════════ */
export function FaqModal({ onClose }) {
  const [open, setOpen] = useState(0)
  const faqs = [
    { q: 'Bagaimana cara upload?', a: 'Pilih tab Video atau Foto, drag & drop atau tap area upload, pilih file, lalu tekan tombol upload.', i: 'fa-cloud-arrow-up' },
    { q: 'Format apa yang didukung?', a: 'Video: MP4, MKV, AVI, MOV (otomatis dikonversi ke MP4 H.264). Foto: JPG, PNG, GIF, WEBP.', i: 'fa-file-video' },
    { q: 'Berapa lama kode berlaku?', a: 'Tergantung pengaturan server (default 60 menit). Timer countdown terlihat di popup sukses.', i: 'fa-hourglass-half' },
    { q: 'Kenapa upload lambat?', a: 'File video dikonversi otomatis di server agar kompatibel WhatsApp. File besar butuh waktu lebih.', i: 'fa-gauge-high' },
    { q: 'Apakah data saya aman?', a: 'File disimpan sementara dan terhapus otomatis setelah kedaluwarsa.', i: 'fa-shield-halved' },
  ]
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#22d3ee]/15 to-[#3b82f6]/5 border border-[#22d3ee]/20 grid place-items-center">
            <i className="fa-solid fa-circle-question text-[#22d3ee] text-[13px]" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[17px] grad-text">FAQ</h2>
        </div>
        <CloseBtn onClick={onClose} />
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'none' }}>
        {faqs.map((f, i) => (
          <div key={f.q} className={`rounded-[14px] border overflow-hidden transition-all duration-[250ms] ${open === i ? 'bg-white/[.04] border-white/[.1]' : 'bg-white/[.015] border-white/[.05]'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
            <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left">
              <div className={`w-6 h-6 shrink-0 rounded-[7px] grid place-items-center border transition-all duration-[250ms] ${open === i ? 'bg-[#22d3ee]/15 border-[#22d3ee]/25' : 'bg-white/[.03] border-white/[.06]'}`}>
                <i className={`fa-solid ${f.i} text-[9px] ${open === i ? 'text-[#22d3ee]' : 'text-[#7e90ad]'} transition-colors duration-[250ms]`} />
              </div>
              <span className="font-semibold text-[11px] flex-1">{f.q}</span>
              <i className={`fa-solid fa-chevron-down text-[8px] transition-transform duration-[250ms] ${open === i ? 'rotate-180 text-[#22d3ee]' : 'text-[#7e90ad]'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
            </button>
            <div className={`grid transition-all duration-[250ms] ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
              <div className="overflow-hidden"><p className="px-3.5 pb-3 pl-12 text-[#7e90ad] text-[10px] leading-relaxed">{f.a}</p></div>
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  )
}

/* ═══════════════════════════════════════
   ABOUT
   ═══════════════════════════════════════ */
export function AboutModal({ onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#3b82f6]/15 to-[#22d3ee]/5 border border-[#3b82f6]/20 grid place-items-center">
            <i className="fa-solid fa-circle-info text-[#3b82f6] text-[13px]" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-[17px] grad-text">Tentang</h2>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      <div className="space-y-3">
        <div className="relative rounded-[16px] p-4 overflow-hidden border border-white/[.06] text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[#22d3ee]/[.06] via-transparent to-[#3b82f6]/[.06]" />
          <div className="relative">
            <div className="relative w-14 h-14 mx-auto mb-2.5">
              <div className="absolute -inset-2 rounded-full bg-[#22d3ee]/12 blur-lg" />
              <div className="relative w-full h-full rounded-[16px] bg-gradient-to-br from-[#22d3ee] via-[#3b82f6] to-[#34d399] grid place-items-center shadow-[0_0_32px_-4px_rgba(34,211,238,.4)]">
                <span className="absolute inset-[1px] rounded-[15px] bg-gradient-to-b from-white/20 to-transparent" />
                <span className="font-[family-name:var(--font-display)] font-extrabold text-lg text-white relative">H</span>
              </div>
            </div>
            <p className="font-[family-name:var(--font-display)] font-extrabold text-[14px] tracking-widest grad-text">SWHDHLZ</p>
            <p className="text-[#7e90ad] text-[9px] tracking-wide mt-0.5">Developed by <span className="text-[#e8f1ff] font-semibold">HILLZ</span></p>
          </div>
        </div>

        <p className="text-[#7e90ad] text-[11px] leading-relaxed text-center px-1">
          Upload media ke grup WhatsApp via bot. Upload file, dapatkan kode unik, lalu kirim <code className="font-mono text-[#22d3ee] bg-[#22d3ee]/8 px-1.5 py-0.5 rounded-[4px] text-[9px]">.claim KODE</code> di grup.
        </p>

        <div className="flex items-center gap-2 p-2.5 rounded-[10px] bg-[#34d399]/[.05] border border-[#34d399]/12">
          <i className="fa-solid fa-shield-halved text-[#34d399] text-[10px]" />
          <p className="text-[#7e90ad] text-[9px] leading-snug">File tersimpan sementara — terhapus otomatis setelah expired.</p>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[{ i: 'fa-bolt', t: 'Cepat', c: '#22d3ee' }, { i: 'fa-lock', t: 'Aman', c: '#34d399' }, { i: 'fa-wand-magic-sparkles', t: 'Mudah', c: '#3b82f6' }].map(f => (
            <div key={f.t} className="flex flex-col items-center gap-1 py-2.5 rounded-[10px] bg-white/[.02] border border-white/[.04]">
              <i className={`fa-solid ${f.i} text-[10px]`} style={{ color: f.c }} />
              <span className="text-[8px] font-bold text-[#7e90ad]">{f.t}</span>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  )
}
