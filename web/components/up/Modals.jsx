'use client'
import { useState, useEffect, useRef } from 'react'

/* ═══════════════════════════════════════════════
   MODAL SHELL — Brutal sheet, spring entrance
   ═══════════════════════════════════════════════ */
function ModalShell({ onClose, children }) {
  const [vis, setVis] = useState(false)
  const ref = useRef(null)
  useEffect(() => { requestAnimationFrame(() => setVis(true)) }, [])
  const close = onClose ? () => { setVis(false); setTimeout(onClose, 220) } : null

  return (
    <div className={`fixed inset-0 z-[80] transition-all duration-200 ${vis ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ transitionTimingFunction: 'var(--ease-smooth)' }}>
      <div className="absolute inset-0 modal-backdrop-blur" onClick={close} />

      <div className="absolute inset-0 z-10 overflow-y-auto modal-scroll-hide" onClick={close}>
        <div className="min-h-full flex items-center justify-center p-4 py-6">
          <div
            ref={ref}
            onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-[420px] transition-all duration-300 ${vis ? 'scale-100 translate-y-0 opacity-100' : 'scale-[.9] translate-y-8 opacity-0'}`}
            style={{ transitionTimingFunction: 'var(--ease-spring)' }}
          >
            <div className="modal-sheet overflow-hidden">
              {/* Accent top bar */}
              <div className="h-[6px]" style={{ background: 'repeating-linear-gradient(-45deg, var(--t-accent) 0 12px, var(--t-hard) 12px 14px, var(--t-pop) 14px 26px, var(--t-hard) 26px 28px)' }} />
              <div className="p-6">{children}</div>
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
    <button onClick={onClick} aria-label="Tutup"
      className="w-9 h-9 grid place-items-center text-[var(--t-muted)] hover:text-white hover:bg-[var(--t-bad)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all duration-150"
      style={{ border: '2.5px solid var(--t-hard)', borderRadius: 11, background: 'var(--t-surface)', boxShadow: 'var(--sh-xs)' }}>
      <i className="fa-solid fa-xmark text-sm" />
    </button>
  )
}

/* ─── Link buttons ─── */
export function LinkButtons({ ownerWhatsapp, channels = [], claimGroups = [], popupButtons = [], settings = {} }) {
  const items = []
  if (ownerWhatsapp && settings.showOwnerBtn !== false) items.push({ i: 'fa-brands fa-whatsapp', t: 'Chat Developer', s: 'Hubungi langsung', href: `https://wa.me/${String(ownerWhatsapp).replace(/[^0-9]/g, '')}`, feat: true, bg: 'var(--t-wa)', tc: '#fff' })
  if (settings.showChannelsBtn !== false) channels.slice(0, 2).forEach(ch => items.push({ i: 'fa-solid fa-tower-broadcast', t: ch.name || 'Saluran', s: 'Saluran resmi', href: ch.link, bg: 'var(--t-accent-2)', tc: '#fff' }))
  if (settings.showClaimBtn !== false) claimGroups.slice(0, 2).forEach(g => items.push({ i: 'fa-solid fa-comments', t: g.name || 'Grup Claim', s: 'Klaim file di sini', href: g.link, bg: 'var(--t-ok)', tc: '#fff' }))
  if (settings.showPopupBtns !== false) popupButtons.filter(b => b.link).slice(0, 3).forEach(b => items.push({ i: 'fa-solid fa-link', t: b.name || 'Link', s: 'Buka link', href: b.link, bg: 'var(--t-accent)', tc: '#131311' }))
  if (!items.length) return null
  return (
    <div className={`grid gap-2.5 ${items.length === 1 ? '' : items.length <= 4 && items.length % 2 === 0 ? 'grid-cols-2' : ''}`}>
      {items.map(it => (
        <a key={it.t + it.href} href={it.href} target="_blank" rel="noreferrer"
          className={`flex items-center gap-2.5 px-3 py-2.5 hist-item group active:translate-x-0.5 active:translate-y-0.5 active:!shadow-none ${it.feat ? 'col-span-full' : ''}`}
          style={{ background: 'var(--t-surface)', border: '2.5px solid var(--t-hard)', borderRadius: 13, boxShadow: 'var(--sh-xs)' }}>
          <span className="w-9 h-9 shrink-0 grid place-items-center" style={{ background: it.bg, color: it.tc, border: '2px solid var(--t-hard)', borderRadius: 10 }}>
            <i className={`${it.i} text-[14px]`} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block font-extrabold text-[12px] truncate">{it.t}</span>
            <span className="block font-mono text-[9px] font-bold text-[var(--t-muted)]">{it.s}</span>
          </span>
          <i className="fa-solid fa-arrow-up-right-from-square text-[10px] opacity-30 group-hover:opacity-100 transition-opacity" />
        </a>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════
   WELCOME / INTRO
   ═══════════════════════════════════════ */
export function IntroModal({ onDone, settings }) {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 120)
    const t2 = setTimeout(() => setPhase(2), 350)
    return () => [t1, t2].forEach(clearTimeout)
  }, [])

  const steps = [
    { n: '01', i: 'fa-cloud-arrow-up', t: 'Upload file', d: 'Pilih video atau foto dari galeri kamu.', bg: 'var(--t-accent)', tc: '#131311' },
    { n: '02', i: 'fa-ticket', t: 'Dapat kode unik', d: 'Kode seperti .claim A1B2C3 langsung tersedia.', bg: 'var(--t-pop)', tc: '#fff' },
    { n: '03', i: 'fa-paper-plane', t: 'Kirim di grup', d: 'Paste kode di grup WhatsApp — bot kirim filenya.', bg: 'var(--t-accent-2)', tc: '#fff' },
  ]

  return (
    <ModalShell>
      <div className={`transition-all duration-300 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} style={{ transitionTimingFunction: 'var(--ease-smooth)' }}>
        {/* Head */}
        <div className="flex items-start justify-between pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-2 wobble"
              style={{ background: 'var(--t-accent)', border: '2px solid var(--t-hard)', borderRadius: 99, boxShadow: 'var(--sh-xs)' }}>
              <i className="fa-solid fa-star text-[8px]" />
              <span className="font-mono text-[9px] font-bold tracking-wider" style={{ color: '#131311' }}>SELAMAT DATANG</span>
            </div>
            <h2 className="font-display text-[24px] leading-none">
              {(settings?.siteName || 'SHIROWAHD').toUpperCase()}<span style={{ color: 'var(--t-pop)' }}>.</span>
            </h2>
            <p className="font-mono text-[11px] font-bold text-[var(--t-muted)] mt-1.5">Upload media HD ke grup WhatsApp</p>
          </div>
          <div className="stamp shrink-0 anim-stamp">
            <span className="text-[18px] leading-none">受</span>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2.5 mb-5">
          {steps.map((s, idx) => (
            <div key={s.n}
              className={`flex items-center gap-3 p-3 transition-all duration-300 ${phase >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
              style={{ transitionDelay: `${idx * 90}ms`, transitionTimingFunction: 'var(--ease-spring)', background: 'var(--t-surface2)', border: '2.5px solid var(--t-hard)', borderRadius: 13, boxShadow: 'var(--sh-xs)' }}>
              <span className="w-10 h-10 shrink-0 grid place-items-center anim-float" style={{ animationDelay: `${idx * 200}ms`, background: s.bg, color: s.tc, border: '2px solid var(--t-hard)', borderRadius: 11, boxShadow: 'var(--sh-xs)' }}>
                <i className={`fa-solid ${s.i} text-[15px]`} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold px-1.5" style={{ background: '#131311', color: 'var(--t-accent)', borderRadius: 5 }}>{s.n}</span>
                  <p className="font-extrabold text-[12.5px]">{s.t}</p>
                </div>
                <p className="text-[var(--t-muted)] text-[10.5px] leading-snug mt-0.5 font-medium">{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Contacts */}
        {(settings?.ownerWhatsapp || settings?.channels?.length || settings?.claimGroups?.length || settings?.popupButtons?.length) ? (
          <>
            <p className="field-label mb-2">TERHUBUNG</p>
            <div className="mb-4">
              <LinkButtons ownerWhatsapp={settings?.ownerWhatsapp} channels={settings?.channels} claimGroups={settings?.claimGroups} popupButtons={settings?.popupButtons} settings={settings} />
            </div>
          </>
        ) : null}

        <button onClick={onDone} className="btn-primary w-full py-4 text-[14px]">
          MULAI UPLOAD <i className="fa-solid fa-arrow-right text-[12px]" />
        </button>

        <p className="text-center font-mono text-[9px] font-bold text-[var(--t-muted)] mt-4 tracking-widest">© {new Date().getFullYear()} SWHDHLZ · BY HILLZ</p>
      </div>
    </ModalShell>
  )
}

/* ═══════════════════════════════════════
   FAQ — Accordion
   ═══════════════════════════════════════ */
export function FaqModal({ onClose }) {
  const [open, setOpen] = useState(0)
  const faqs = [
    { q: 'Bagaimana cara upload?', a: 'Pilih tab Video atau Foto, drag & drop atau tap area upload, pilih file, lalu tekan tombol upload.' },
    { q: 'Format apa yang didukung?', a: 'Video: MP4, MKV, AVI, MOV (otomatis dikonversi ke MP4 H.264). Foto: JPG, PNG, GIF, WEBP.' },
    { q: 'Berapa lama kode berlaku?', a: 'Tergantung pengaturan server (default 60 menit). Timer countdown terlihat di popup sukses.' },
    { q: 'Kenapa upload lambat?', a: 'File video dikonversi otomatis di server agar kompatibel WhatsApp. File besar butuh waktu lebih.' },
    { q: 'Apakah data saya aman?', a: 'File disimpan sementara dan terhapus otomatis setelah kedaluwarsa.' },
  ]
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-1.5"
            style={{ background: 'var(--t-pop)', border: '2px solid var(--t-hard)', borderRadius: 99, boxShadow: 'var(--sh-xs)' }}>
            <i className="fa-solid fa-circle-question text-[8px] text-white" />
            <span className="font-mono text-[9px] font-bold tracking-wider text-white">BANTUAN</span>
          </div>
          <h2 className="font-display text-[20px] leading-none">FAQ</h2>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-0.5 modal-scroll-hide">
        {faqs.map((f, i) => (
          <div key={f.q} className="overflow-hidden transition-all duration-200"
            style={{ background: open === i ? 'var(--t-accent)' : 'var(--t-surface2)', border: '2.5px solid var(--t-hard)', borderRadius: 13, boxShadow: open === i ? 'var(--sh-sm)' : 'none' }}>
            <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left group">
              <span className="w-7 h-7 shrink-0 grid place-items-center text-[10px] font-mono font-bold"
                style={{ background: open === i ? '#131311' : 'var(--t-surface)', color: open === i ? 'var(--t-accent)' : 'var(--t-muted)', border: '2px solid var(--t-hard)', borderRadius: 8 }}>
                {i + 1}
              </span>
              <span className="font-extrabold text-[12.5px] flex-1">{f.q}</span>
              <i className={`fa-solid fa-chevron-down text-[11px] transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-250 ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} style={{ transitionTimingFunction: 'var(--ease-smooth)' }}>
              <div className="overflow-hidden"><p className="px-3.5 pb-3.5 pl-[54px] text-[#131311] text-[11px] leading-relaxed font-semibold">{f.a}</p></div>
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
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-1.5"
            style={{ background: 'var(--t-ok)', border: '2px solid var(--t-hard)', borderRadius: 99, boxShadow: 'var(--sh-xs)' }}>
            <i className="fa-solid fa-circle-info text-[8px] text-white" />
            <span className="font-mono text-[9px] font-bold tracking-wider text-white">INFORMASI</span>
          </div>
          <h2 className="font-display text-[20px] leading-none">TENTANG</h2>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      <div className="space-y-4">
        {/* Brand card */}
        <div className="p-5 text-center" style={{ background: 'var(--t-accent)', border: '2.5px solid var(--t-hard)', borderRadius: 16, boxShadow: 'var(--sh-md)' }}>
          <div className="w-16 h-16 mx-auto mb-3 grid place-items-center anim-float" style={{ background: '#131311', border: '2.5px solid #131311', outline: '2.5px solid #131311', borderRadius: 18, boxShadow: '3px 3px 0 rgba(19,19,17,.35)' }}>
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
              <path d="M13 2 L5 13.5 H10.5 L9.5 22 L19 9.5 H12.8 Z" fill="#ffc700" stroke="#ffc700" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="font-display text-[17px]" style={{ color: '#131311' }}>SHIROWAHD</p>
          <p className="font-mono text-[10px] font-bold tracking-wider mt-1" style={{ color: '#131311' }}>DEVELOPED BY HILLZ</p>
        </div>

        <p className="text-[var(--t-muted)] text-[12px] leading-relaxed text-center px-2 font-medium">
          Upload media ke grup WhatsApp via bot. Upload file, dapatkan kode unik, lalu kirim{' '}
          <code className="font-mono font-bold px-1.5 py-0.5 text-[10px]" style={{ background: 'var(--t-surface2)', border: '2px solid var(--t-hard)', borderRadius: 6, color: 'var(--t-pop)' }}>.claim KODE</code> di grup.
        </p>

        <div className="flex items-center gap-2.5 p-3" style={{ border: '2px dashed var(--t-hard)', borderRadius: 12, background: 'var(--t-surface2)' }}>
          <span className="w-7 h-7 grid place-items-center shrink-0" style={{ background: 'var(--t-ok)', border: '2px solid var(--t-hard)', borderRadius: 8, color: '#fff' }}>
            <i className="fa-solid fa-shield-halved text-[12px]" />
          </span>
          <p className="text-[var(--t-muted)] text-[11px] leading-snug font-medium">File tersimpan sementara — terhapus otomatis setelah expired.</p>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {[{ i: 'fa-bolt', t: 'CEPAT', bg: 'var(--t-accent)', tc: '#131311' }, { i: 'fa-lock', t: 'AMAN', bg: 'var(--t-ok)', tc: '#fff' }, { i: 'fa-hand-pointer', t: 'MUDAH', bg: 'var(--t-pop)', tc: '#fff' }].map(f => (
            <div key={f.t} className="flex flex-col items-center gap-2 py-3 hover-lift" style={{ background: f.bg, border: '2.5px solid var(--t-hard)', borderRadius: 13, boxShadow: 'var(--sh-xs)' }}>
              <i className={`fa-solid ${f.i} text-[15px]`} style={{ color: f.tc }} />
              <span className="font-display text-[9px]" style={{ color: f.tc }}>{f.t}</span>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  )
}
