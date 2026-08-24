'use client'
import { useState, useEffect, useRef } from 'react'

/* ─── Backdrop + centered card (FIXED, no scroll-away) ─── */
function ModalShell({ onClose, children }) {
  const [vis, setVis] = useState(false)
  const ref = useRef(null)
  useEffect(() => { requestAnimationFrame(() => requestAnimationFrame(() => setVis(true))) }, [])
  const close = () => { setVis(false); setTimeout(onClose, 300) }
  // close on backdrop tap, not on card tap
  const onBg = (e) => { if (e.target === ref.current) close() }
  return (
    <div ref={ref} onClick={onBg}
      className={`fixed inset-0 z-[90] flex items-end sm:items-center justify-center transition-all duration-300 ${vis ? 'bg-black/70 backdrop-blur-sm' : 'bg-transparent'}`}
      style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      <div className={`relative w-full sm:max-w-[380px] max-h-[88dvh] transition-all duration-300 ${vis ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-[.97]'}`}
        style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <div className="rounded-t-2xl sm:rounded-2xl border border-white/[.06] bg-[#0a1020]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="overflow-y-auto max-h-[88dvh] overscroll-contain">{children}</div>
          {/* bottom drag handle (mobile) */}
          <div className="sm:hidden flex justify-center py-2"><div className="w-10 h-1 rounded-full bg-white/10" /></div>
        </div>
      </div>
    </div>
  )
}

export { ModalShell }

function XBtn({ onClick }) {
  return (
    <button onClick={onClick} className="w-8 h-8 rounded-lg bg-white/5 grid place-items-center text-[#7e90ad] hover:text-white hover:bg-white/10 active:scale-90 transition-all duration-150">
      <i className="fa-solid fa-xmark text-sm" />
    </button>
  )
}

/* ─── WELCOME / INTRO ─── */
export function IntroModal({ onDone, settings }) {
  const s = settings || {}
  const [entered, setEntered] = useState(false)
  useEffect(() => { setTimeout(() => setEntered(true), 100) }, [])

  const links = []
  if (s.showOwnerBtn !== false && s.ownerWhatsapp)
    links.push({ icon: 'fa-brands fa-whatsapp', label: 'Chat Developer', href: `https://wa.me/${String(s.ownerWhatsapp).replace(/\D/g, '')}`, accent: '#25D366' })
  if (s.showChannelsBtn !== false && s.channels?.length)
    s.channels.forEach(c => c.link && links.push({ icon: 'fa-solid fa-tower-broadcast', label: c.name || 'Saluran', href: c.link, accent: '#22d3ee' }))
  if (s.showClaimBtn !== false && s.claimGroups?.length)
    s.claimGroups.forEach(g => g.link && links.push({ icon: 'fa-solid fa-comments', label: g.name || 'Grup Claim', href: g.link, accent: '#34d399' }))
  if (s.showPopupBtns !== false && s.popupButtons?.length)
    s.popupButtons.forEach(b => b.link && links.push({ icon: 'fa-solid fa-link', label: b.name || 'Link', href: b.link, accent: '#3b82f6' }))

  const steps = [
    { n: '01', t: 'Upload file', d: 'Pilih video atau foto dari galeri', icon: 'fa-cloud-arrow-up', accent: '#22d3ee' },
    { n: '02', t: 'Dapat kode', d: 'Kode unik langsung muncul', icon: 'fa-hashtag', accent: '#3b82f6' },
    { n: '03', t: 'Kirim di grup', d: 'Paste kode di grup WhatsApp', icon: 'fa-paper-plane', accent: '#34d399' },
  ]

  return (
    <ModalShell>
      <div className="p-6 pb-5">
        {/* Logo + brand */}
        <div className={`text-center mb-6 transition-all duration-500 delay-100 ${entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
          <div className="relative inline-flex items-center justify-center w-16 h-16 mb-3">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] opacity-20 blur-xl" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] grid place-items-center">
              <i className="fa-brands fa-whatsapp text-white text-3xl" />
            </div>
          </div>
          <h2 className="text-xl font-bold tracking-tight">{s.siteName || 'SHIROWAHD'}</h2>
          <p className="text-[#7e90ad] text-xs mt-1">{s.siteSubtitle || 'Upload & claim media HD'}</p>
          <p className="text-[10px] text-[#7e90ad]/50 mt-2 tracking-widest font-bold">SWHDHLZ BY HILLZ</p>
        </div>

        {/* Steps */}
        <div className="space-y-2 mb-5">
          {steps.map((st, i) => (
            <div key={st.n}
              className={`flex items-center gap-3 p-3 rounded-xl bg-white/[.02] border border-white/[.04] transition-all duration-400 ${entered ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`}
              style={{ transitionTimingFunction: 'var(--ease-out)', transitionDelay: `${200 + i * 100}ms` }}>
              <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: `${st.accent}12`, border: `1px solid ${st.accent}20` }}>
                <i className={`fa-solid ${st.icon} text-xs`} style={{ color: st.accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold">{st.t}</p>
                <p className="text-[10px] text-[#7e90ad]">{st.d}</p>
              </div>
              <span className="text-[9px] font-mono font-bold tabular-nums" style={{ color: `${st.accent}80` }}>{st.n}</span>
            </div>
          ))}
        </div>

        {/* Links */}
        {links.length > 0 && (
          <div className={`space-y-1.5 mb-5 transition-all duration-400 delay-500 ${entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
            {links.map((l, i) => (
              <a key={i} href={l.href} target="_blank" rel="noreferrer"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[.05] bg-white/[.02] hover:bg-white/[.05] active:scale-[.98] transition-all duration-150 group">
                <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: `${l.accent}15` }}>
                  <i className={`${l.icon} text-[12px]`} style={{ color: l.accent }} />
                </span>
                <span className="flex-1 text-[12px] font-medium truncate">{l.label}</span>
                <i className="fa-solid fa-chevron-right text-[8px] text-[#7e90ad]/40 group-hover:text-[#7e90ad] group-hover:translate-x-0.5 transition-all duration-150" />
              </a>
            ))}
          </div>
        )}

        <button onClick={onDone}
          className={`btn-primary w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-400 delay-[600ms] ${entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
          style={{ transitionTimingFunction: 'var(--ease-out)' }}>
          Mulai Upload
        </button>
      </div>
    </ModalShell>
  )
}

/* ─── FAQ ─── */
export function FaqModal({ onClose }) {
  const [open, setOpen] = useState(0)
  const faqs = [
    { q: 'Bagaimana cara upload?', a: 'Pilih tab Video atau Foto, tap area upload, pilih file, lalu tekan upload.', icon: 'fa-cloud-arrow-up' },
    { q: 'Format file apa saja?', a: 'Video: MP4, MKV, AVI, MOV. Foto: JPG, PNG, GIF, WEBP.', icon: 'fa-file-video' },
    { q: 'Berapa lama kode berlaku?', a: 'Sesuai pengaturan server — biasanya 60 menit. Lihat timer di popup kode.', icon: 'fa-clock' },
    { q: 'Upload lambat?', a: 'Video diproses ulang agar kompatibel WhatsApp. File besar butuh waktu lebih.', icon: 'fa-gauge-high' },
    { q: 'Data saya aman?', a: 'File disimpan sementara dan terhapus otomatis setelah expired.', icon: 'fa-shield-halved' },
  ]
  return (
    <ModalShell onClose={onClose}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">FAQ</h2>
          <XBtn onClick={onClose} />
        </div>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <div key={i} className={`rounded-xl border overflow-hidden transition-colors duration-200 ${open === i ? 'bg-white/[.03] border-white/[.08]' : 'bg-transparent border-white/[.04]'}`}>
              <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <i className={`fa-solid ${f.icon} text-[11px] w-4 text-center transition-colors duration-200 ${open === i ? 'text-[#22d3ee]' : 'text-[#7e90ad]/50'}`} />
                <span className="flex-1 text-[12px] font-semibold">{f.q}</span>
                <i className={`fa-solid fa-chevron-down text-[9px] text-[#7e90ad]/40 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid transition-all duration-250 ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <p className="px-4 pb-3.5 pl-11 text-[#7e90ad] text-[11px] leading-relaxed">{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  )
}

/* ─── ABOUT ─── */
export function AboutModal({ onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg">Tentang</h2>
          <XBtn onClick={onClose} />
        </div>

        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] grid place-items-center mb-3">
            <span className="text-white font-extrabold text-xl">H</span>
          </div>
          <p className="font-bold text-base tracking-wide">SWHDHLZ</p>
          <p className="text-[#7e90ad] text-xs mt-0.5">by <span className="text-[#e8f1ff] font-semibold">HILLZ</span></p>
        </div>

        <p className="text-[#7e90ad] text-[12px] leading-relaxed text-center mb-5 px-2">
          Upload media ke grup WhatsApp lewat bot. Upload file, dapatkan kode, kirim <code className="font-mono text-[#22d3ee] bg-[#22d3ee]/8 px-1 rounded text-[10px]">.claim KODE</code> di grup.
        </p>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#34d399]/[.05] border border-[#34d399]/10 mb-4">
          <i className="fa-solid fa-shield-halved text-[#34d399] text-xs mt-0.5" />
          <p className="text-[#7e90ad] text-[11px] leading-snug">File tersimpan sementara dan terhapus otomatis.</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[{ i: 'fa-bolt', t: 'Cepat', c: '#22d3ee' }, { i: 'fa-lock', t: 'Aman', c: '#34d399' }, { i: 'fa-hand-sparkles', t: 'Mudah', c: '#3b82f6' }].map(f => (
            <div key={f.t} className="py-3 rounded-xl bg-white/[.02] border border-white/[.04] text-center">
              <i className={`fa-solid ${f.i} text-sm mb-1`} style={{ color: f.c }} />
              <p className="text-[9px] font-bold text-[#7e90ad]">{f.t}</p>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  )
}
