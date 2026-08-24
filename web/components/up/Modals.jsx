'use client'
import { useState, useEffect, useRef } from 'react'

/* ═══════════════════════════════════════════════
   MODAL SHELL — Premium overlay with particles
   ═══════════════════════════════════════════════ */
function ModalShell({ onClose, children, accent = 'cyan' }) {
  const [vis, setVis] = useState(false)
  const ref = useRef(null)
  useEffect(() => { requestAnimationFrame(() => setVis(true)) }, [])
  const close = onClose ? () => { setVis(false); setTimeout(onClose, 320) } : null

  // Accent color map
  const ac = accent === 'green' ? '#34d399' : '#22d3ee'

  return (
    <div className={`fixed inset-0 z-[80] transition-all duration-[320ms] ${vis ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      {/* Solid dark backdrop */}
      <div className="absolute inset-0 bg-[#020408]/[.97]" onClick={close} />

      {/* Floating sparkle particles in backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="sparkle-dot" style={{
            left: `${10 + (i * 11) % 80}%`,
            top: `${15 + (i * 17) % 65}%`,
            animationDelay: `${i * 0.4}s`,
            '--sparkle-color': ['#22d3ee', '#3b82f6', '#34d399', '#22d3ee'][i % 4],
          }} />
        ))}
      </div>

      {/* Centered scroll wrapper */}
      <div className="absolute inset-0 z-10 overflow-y-auto modal-scroll-hide" onClick={close}>
        <div className="min-h-full flex items-center justify-center p-4 py-6">
          <div
            ref={ref}
            onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-[400px] transition-all duration-[420ms] ${vis ? 'scale-100 translate-y-0 opacity-100' : 'scale-[.88] translate-y-10 opacity-0'}`}
            style={{ transitionTimingFunction: 'var(--ease-out)' }}
          >
            {/* Outer glow */}
            <div className="absolute -inset-12 rounded-[48px] pointer-events-none" style={{
              background: `radial-gradient(ellipse at center, ${ac}15, transparent 70%)`,
              filter: 'blur(40px)',
            }} />

            {/* Card */}
            <div className="relative rounded-[22px] bg-[#0a1020] border border-white/[.08] shadow-[0_32px_80px_-12px_rgba(0,0,0,.9)] overflow-hidden">
              {/* Animated gradient border glow (top) */}
              <div className="absolute top-0 inset-x-0 h-[2px] overflow-hidden rounded-t-[22px]">
                <div className="h-full w-[200%] grad-border-sweep" />
              </div>

              {/* Side accent lines */}
              <div className="absolute top-10 bottom-10 left-0 w-px bg-gradient-to-b from-transparent via-[#3b82f6]/15 to-transparent" />
              <div className="absolute top-10 bottom-10 right-0 w-px bg-gradient-to-b from-transparent via-[#22d3ee]/15 to-transparent" />

              {/* Inner subtle grid pattern */}
              <div className="absolute inset-0 opacity-[.03] pointer-events-none" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }} />

              {/* Content */}
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
    <button onClick={onClick} className="w-8 h-8 rounded-full bg-white/[.04] border border-white/[.08] grid place-items-center text-[#7e90ad] hover:text-white hover:bg-white/[.1] hover:rotate-90 hover:border-white/20 transition-all duration-[250ms]" style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      <i className="fa-solid fa-xmark text-xs" />
    </button>
  )
}

/* ─── Premium button with shine effect ─── */
function PremiumBtn({ onClick, href, children, variant = 'primary', className = '' }) {
  const base = 'relative overflow-hidden font-bold transition-all duration-[200ms] active:scale-[.96] flex items-center justify-center gap-2'
  const styles = {
    primary: 'bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] text-white shadow-[0_4px_20px_-4px_rgba(34,211,238,.5)] hover:shadow-[0_6px_28px_-4px_rgba(34,211,238,.65)] hover:brightness-110',
    ghost: 'bg-white/[.04] border border-white/[.08] text-[#e8f1ff] hover:bg-white/[.08] hover:border-white/[.15]',
    green: 'bg-[#34d399]/[.08] border border-[#34d399]/20 text-[#34d399] hover:bg-[#34d399]/[.15] hover:border-[#34d399]/30',
    wa: 'bg-[#25D366]/[.08] border border-[#25D366]/20 text-[#7ce8a8] hover:bg-[#25D366]/[.15] hover:border-[#25D366]/30',
  }
  const Tag = href ? 'a' : 'button'
  const props = href ? { href, target: '_blank', rel: 'noreferrer' } : { onClick }
  return (
    <Tag {...props} className={`${base} ${styles[variant] || styles.ghost} ${className}`}>
      {variant === 'primary' && <span className="absolute inset-0 btn-shine-sweep pointer-events-none" />}
      {children}
    </Tag>
  )
}

/* ─── Link buttons (Welcome popup) ─── */
export function LinkButtons({ ownerWhatsapp, channels = [], claimGroups = [], groups = [] }) {
  const items = []
  if (ownerWhatsapp) items.push({ i: 'fa-brands fa-whatsapp', t: 'Chat Developer', s: 'Hubungi langsung', href: `https://wa.me/${String(ownerWhatsapp).replace(/[^0-9]/g, '')}`, c: '#25D366', feat: true })
  channels.slice(0, 2).forEach(ch => items.push({ i: 'fa-solid fa-tower-broadcast', t: ch.name || 'Saluran', s: 'Saluran resmi', href: ch.link, c: '#22d3ee' }))
  claimGroups.slice(0, 2).forEach(g => items.push({ i: 'fa-solid fa-comments', t: g.name || 'Grup Claim', s: 'Klaim file di sini', href: g.link, c: '#34d399' }))
  if (!items.length) return null
  return (
    <div className={`grid gap-2 ${items.length === 1 ? '' : items.length <= 4 && items.length % 2 === 0 ? 'grid-cols-2' : ''}`}>
      {items.map((it, idx) => (
        <a key={it.t + it.href} href={it.href} target="_blank" rel="noreferrer"
          className={`link-btn-premium flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 border group ${it.feat ? 'col-span-full' : ''}`}
          style={{ background: `${it.c}0a`, borderColor: `${it.c}20`, animationDelay: `${idx * 80}ms` }}>
          <span className="w-9 h-9 shrink-0 rounded-[11px] grid place-items-center relative overflow-hidden" style={{ background: `${it.c}15`, border: `1px solid ${it.c}30` }}>
            <i className={`${it.i} text-[14px]`} style={{ color: it.c }} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block font-bold text-[12px] truncate">{it.t}</span>
            <span className="block text-[#7e90ad] text-[9px]">{it.s}</span>
          </span>
          <i className="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-30 group-hover:opacity-80 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-[200ms]" style={{ color: it.c }} />
        </a>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════
   WELCOME / INTRO
   ═══════════════════════════════════════ */
export function IntroModal({ onDone, settings }) {
  const [step, setStep] = useState(-1)
  useEffect(() => {
    const ts = [250, 450, 650].map((d, i) => setTimeout(() => setStep(i), d))
    return () => ts.forEach(clearTimeout)
  }, [])
  const steps = [
    { i: 'fa-cloud-arrow-up', t: 'Upload file', d: 'Pilih video atau foto dari galeri kamu.', c: '#22d3ee' },
    { i: 'fa-key', t: 'Dapat kode unik', d: 'Kode seperti .claim A1B2C3 langsung tersedia.', c: '#3b82f6' },
    { i: 'fa-paper-plane', t: 'Kirim di grup', d: 'Paste kode di grup WhatsApp — bot kirim filenya.', c: '#34d399' },
  ]
  return (
    <ModalShell>
      {/* Brand header */}
      <div className="text-center mb-5">
        <div className="relative inline-block mb-4">
          <div className="absolute -inset-4 rounded-full bg-[#25D366]/10 blur-xl animate-pulse pointer-events-none" />
          <div className="absolute -inset-3 rounded-[24px] border-ring-spin pointer-events-none" />
          <div className="relative w-[64px] h-[64px] rounded-[20px] bg-gradient-to-br from-[#25D366] via-[#1fae55] to-[#0e7a5f] grid place-items-center shadow-[0_0_50px_-6px_rgba(37,211,102,.5)] floaty">
            <span className="absolute inset-[1px] rounded-[19px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <i className="fa-brands fa-whatsapp text-white text-[28px] drop-shadow-[0_2px_10px_rgba(0,0,0,.4)]" />
          </div>
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-[21px] tracking-tight leading-none">
          {settings?.siteName || 'SHIROWAHD'}
        </h2>
        <p className="text-[#7e90ad] text-[10px] mt-1.5 tracking-wide">Upload media HD ke grup WhatsApp</p>

        <div className="mt-3 inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white/[.03] border border-white/[.06]">
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] grid place-items-center text-[8px] font-extrabold text-white">H</span>
          <span className="text-[9px] tracking-wider"><span className="text-[#7e90ad] font-semibold">SWHDHLZ</span> <span className="text-[#7e90ad]/40">BY</span> <span className="grad-text font-extrabold">HILLZ</span></span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2 mb-5">
        {steps.map((s, idx) => (
          <div key={s.t}
            className={`flex items-center gap-3 p-3 rounded-[14px] border transition-all duration-[450ms] ${idx <= step ? 'bg-white/[.03] border-white/[.07] translate-x-0 opacity-100' : 'bg-transparent border-transparent translate-x-4 opacity-0'}`}
            style={{ transitionTimingFunction: 'var(--ease-out)', transitionDelay: `${idx * 60}ms` }}>
            <div className="w-9 h-9 shrink-0 rounded-[11px] grid place-items-center" style={{ background: `${s.c}12`, border: `1px solid ${s.c}28` }}>
              <i className={`fa-solid ${s.i} text-[13px]`} style={{ color: s.c }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[11px]">{s.t}</p>
              <p className="text-[#7e90ad] text-[9px] leading-snug mt-0.5">{s.d}</p>
            </div>
            <span className="w-5 h-5 shrink-0 rounded-full grid place-items-center text-[9px] font-extrabold" style={{ background: `${s.c}12`, color: s.c }}>{idx + 1}</span>
          </div>
        ))}
      </div>

      {/* Contacts */}
      {(settings?.ownerWhatsapp || settings?.channels?.length || settings?.claimGroups?.length) ? (
        <>
          <p className="text-[8px] font-extrabold tracking-[.18em] uppercase text-[#7e90ad]/60 mb-2 flex items-center gap-2">
            <span className="flex-1 h-px bg-white/[.06]" />Terhubung<span className="flex-1 h-px bg-white/[.06]" />
          </p>
          <div className="mb-5 stagger">
            <LinkButtons ownerWhatsapp={settings?.ownerWhatsapp} channels={settings?.channels} claimGroups={settings?.claimGroups} groups={settings?.groups} />
          </div>
        </>
      ) : null}

      <PremiumBtn onClick={onDone} variant="primary" className="w-full py-3.5 rounded-[14px] text-[13px]">
        Mulai Upload <i className="fa-solid fa-arrow-right ml-1.5 group-hover:translate-x-1 transition-transform" />
      </PremiumBtn>
      <p className="text-center text-[#7e90ad]/25 text-[8px] mt-3 tracking-wide">© {new Date().getFullYear()} SWHDHLZ · BY HILLZ</p>
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
        {/* Dev card */}
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
