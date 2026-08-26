'use client'
import { useState, useEffect, useRef } from 'react'

/* ═══════════════════════════════════════════════
   MODAL SHELL — Pro glass sheet with spring entrance
   ═══════════════════════════════════════════════ */
function ModalShell({ onClose, children }) {
  const [vis, setVis] = useState(false)
  const ref = useRef(null)
  useEffect(() => { requestAnimationFrame(() => setVis(true)) }, [])
  const close = onClose ? () => { setVis(false); setTimeout(onClose, 250) } : null

  return (
    <div className={`fixed inset-0 z-[80] transition-all duration-[250ms] ${vis ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ transitionTimingFunction: 'var(--ease-smooth)' }}>
      <div className="absolute inset-0 modal-backdrop-blur" style={{ animation: 'none' }} onClick={close} />

      <div className="absolute inset-0 z-10 overflow-y-auto modal-scroll-hide" onClick={close}>
        <div className="min-h-full flex items-center justify-center p-4 py-6">
          <div
            ref={ref}
            onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-[420px] transition-all duration-[350ms] ${vis ? 'scale-100 translate-y-0 opacity-100' : 'scale-[.92] translate-y-6 opacity-0'}`}
            style={{ transitionTimingFunction: 'var(--ease-spring)' }}
          >
            <div className="modal-sheet overflow-hidden" style={{ animation: 'none' }}>
              {/* Accent top bar */}
              <div className="h-[3px] bg-gradient-to-r from-[var(--t-accent)] to-[var(--t-accent-2)]" />
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
      className="w-8 h-8 rounded-xl border border-[var(--t-line)] bg-[var(--t-surface2)] grid place-items-center text-[var(--t-muted)] hover:text-[var(--t-bad)] hover:border-[var(--t-bad)] hover:bg-[var(--t-bad)]/10 hover:rotate-90 active:scale-75 transition-all duration-200">
      <i className="fa-solid fa-xmark text-xs" />
    </button>
  )
}

/* ─── Link buttons ─── */
export function LinkButtons({ ownerWhatsapp, channels = [], claimGroups = [], popupButtons = [], settings = {} }) {
  const items = []
  if (ownerWhatsapp && settings.showOwnerBtn !== false) items.push({ i: 'fa-brands fa-whatsapp', t: 'Chat Developer', s: 'Hubungi langsung', href: `https://wa.me/${String(ownerWhatsapp).replace(/[^0-9]/g, '')}`, feat: true, color: 'var(--t-wa)' })
  if (settings.showChannelsBtn !== false) channels.slice(0, 2).forEach(ch => items.push({ i: 'fa-solid fa-tower-broadcast', t: ch.name || 'Saluran', s: 'Saluran resmi', href: ch.link, color: 'var(--t-accent-2)' }))
  if (settings.showClaimBtn !== false) claimGroups.slice(0, 2).forEach(g => items.push({ i: 'fa-solid fa-comments', t: g.name || 'Grup Claim', s: 'Klaim file di sini', href: g.link, color: 'var(--t-ok)' }))
  if (settings.showPopupBtns !== false) popupButtons.filter(b => b.link).slice(0, 3).forEach(b => items.push({ i: 'fa-solid fa-link', t: b.name || 'Link', s: 'Buka link', href: b.link, color: 'var(--t-muted)' }))
  if (!items.length) return null
  return (
    <div className={`grid gap-2 ${items.length === 1 ? '' : items.length <= 4 && items.length % 2 === 0 ? 'grid-cols-2' : ''}`}>
      {items.map(it => (
        <a key={it.t + it.href} href={it.href} target="_blank" rel="noreferrer"
          className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 border border-[var(--t-line)] bg-[var(--t-surface2)] group hover:border-[var(--t-line-strong)] hover:-translate-y-0.5 hover:shadow-sm active:scale-[.98] transition-all duration-200 ${it.feat ? 'col-span-full' : ''}`}>
          <span className="w-9 h-9 shrink-0 rounded-xl grid place-items-center shadow-sm" style={{ background: `color-mix(in srgb, ${it.color} 12%, var(--t-surface))`, color: it.color }}>
            <i className={`${it.i} text-[14px]`} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block font-bold text-[12px] truncate">{it.t}</span>
            <span className="block font-mono text-[9px] text-[var(--t-muted)]">{it.s}</span>
          </span>
          <i className="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-20 group-hover:opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
        </a>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════
   WELCOME / INTRO — Spring animated
   ═══════════════════════════════════════ */
export function IntroModal({ onDone, settings }) {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 150)
    const t2 = setTimeout(() => setPhase(2), 400)
    return () => [t1, t2].forEach(clearTimeout)
  }, [])

  const steps = [
    { n: '01', i: 'fa-cloud-arrow-up', t: 'Upload file', d: 'Pilih video atau foto dari galeri kamu.', color: 'var(--t-accent)' },
    { n: '02', i: 'fa-ticket', t: 'Dapat kode unik', d: 'Kode seperti .claim A1B2C3 langsung tersedia.', color: 'var(--t-accent-2)' },
    { n: '03', i: 'fa-paper-plane', t: 'Kirim di grup', d: 'Paste kode di grup WhatsApp — bot kirim filenya.', color: 'var(--t-ok)' },
  ]

  return (
    <ModalShell>
      <div className={`transition-all duration-300 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} style={{ transitionTimingFunction: 'var(--ease-smooth)' }}>
        {/* Head */}
        <div className="flex items-start justify-between pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--t-accent)]/10 text-[var(--t-accent)] mb-2">
              <i className="fa-solid fa-sparkles text-[8px]" />
              <span className="font-mono text-[9px] font-bold tracking-wider">SELAMAT DATANG</span>
            </div>
            <h2 className="text-[24px] font-black tracking-tight leading-none">
              {settings?.siteName || 'SHIROWAHD'}<span className="text-[var(--t-accent)]">.</span>
            </h2>
            <p className="font-mono text-[11px] text-[var(--t-muted)] mt-1.5">Upload media HD ke grup WhatsApp</p>
          </div>
          <div className="stamp shrink-0 anim-stamp" style={{ animationDelay: '400ms' }}>
            <span className="text-[18px] leading-none">受</span>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2 mb-5">
          {steps.map((s, idx) => (
            <div key={s.n}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${phase >= 2 ? 'border-[var(--t-line)] bg-[var(--t-surface2)]/60 opacity-100 translate-x-0' : 'border-transparent opacity-0 translate-x-4'}`}
              style={{ transitionDelay: `${idx * 100}ms`, transitionTimingFunction: 'var(--ease-spring)' }}>
              <span className="w-9 h-9 shrink-0 rounded-xl grid place-items-center shadow-sm" style={{ background: `color-mix(in srgb, ${s.color} 12%, var(--t-surface))`, color: s.color }}>
                <i className={`fa-solid ${s.i} text-[13px]`} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-[var(--t-accent)]">{s.n}</span>
                  <p className="font-bold text-[12px]">{s.t}</p>
                </div>
                <p className="text-[var(--t-muted)] text-[10px] leading-snug mt-0.5">{s.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Contacts */}
        {(settings?.ownerWhatsapp || settings?.channels?.length || settings?.claimGroups?.length || settings?.popupButtons?.length) ? (
          <>
            <div className="perforated-line mb-3" />
            <p className="field-label mb-2">TERHUBUNG</p>
            <div className="mb-4">
              <LinkButtons ownerWhatsapp={settings?.ownerWhatsapp} channels={settings?.channels} claimGroups={settings?.claimGroups} popupButtons={settings?.popupButtons} settings={settings} />
            </div>
          </>
        ) : null}

        <button onClick={onDone} className="btn-primary w-full py-3.5 text-[13px] tracking-wide">
          MULAI UPLOAD <i className="fa-solid fa-arrow-right text-[10px] ml-1" />
        </button>

        <p className="text-center font-mono text-[9px] text-[var(--t-muted)] mt-4 tracking-wider">© {new Date().getFullYear()} SWHDHLZ · BY HILLZ</p>
      </div>
    </ModalShell>
  )
}

/* ═══════════════════════════════════════
   FAQ — Accordion with smooth expand
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
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--t-accent-2)]/10 text-[var(--t-accent-2)] mb-1.5">
            <i className="fa-solid fa-circle-question text-[8px]" />
            <span className="font-mono text-[9px] font-bold tracking-wider">BANTUAN</span>
          </div>
          <h2 className="text-[20px] font-black tracking-tight leading-none">Pertanyaan Umum</h2>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-0.5 modal-scroll-hide">
        {faqs.map((f, i) => (
          <div key={f.q} className={`rounded-xl border overflow-hidden transition-all duration-200 ${open === i ? 'bg-[var(--t-surface2)] border-[var(--t-line-strong)] shadow-sm' : 'bg-transparent border-[var(--t-line)] hover:border-[var(--t-line-strong)]'}`}>
            <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left group">
              <span className="w-7 h-7 shrink-0 rounded-lg grid place-items-center text-[10px] font-mono font-bold transition-all duration-200"
                style={{ background: open === i ? 'color-mix(in srgb, var(--t-accent) 15%, transparent)' : 'var(--t-surface2)', color: open === i ? 'var(--t-accent)' : 'var(--t-muted)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-semibold text-[12px] flex-1">{f.q}</span>
              <i className={`fa-solid fa-chevron-down text-[9px] text-[var(--t-muted)] transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-250 ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} style={{ transitionTimingFunction: 'var(--ease-smooth)' }}>
              <div className="overflow-hidden"><p className="px-3.5 pb-3.5 pl-[52px] text-[var(--t-muted)] text-[11px] leading-relaxed">{f.a}</p></div>
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
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--t-ok)]/10 text-[var(--t-ok)] mb-1.5">
            <i className="fa-solid fa-circle-info text-[8px]" />
            <span className="font-mono text-[9px] font-bold tracking-wider">INFORMASI</span>
          </div>
          <h2 className="text-[20px] font-black tracking-tight leading-none">Tentang Shirowahd</h2>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      <div className="space-y-4">
        {/* Brand card */}
        <div className="rounded-2xl border border-[var(--t-line)] bg-[var(--t-surface2)] p-5 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[var(--t-ink)] to-[var(--t-surface3)] text-white grid place-items-center shadow-lg">
            <span className="font-black text-xl leading-none">H</span>
          </div>
          <p className="font-black text-[16px] tracking-wider">SHIROWAHD</p>
          <p className="font-mono text-[10px] tracking-wider text-[var(--t-muted)] mt-1">DEVELOPED BY <span className="text-[var(--t-accent)] font-bold">HILLZ</span></p>
        </div>

        <p className="text-[var(--t-muted)] text-[12px] leading-relaxed text-center px-2">
          Upload media ke grup WhatsApp via bot. Upload file, dapatkan kode unik, lalu kirim{' '}
          <code className="font-mono text-[var(--t-accent)] bg-[var(--t-accent)]/8 border border-[var(--t-accent)]/20 px-1.5 py-0.5 rounded-md text-[10px] font-bold">.claim KODE</code> di grup.
        </p>

        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-[var(--t-line-strong)] bg-[var(--t-surface2)]/40">
          <i className="fa-solid fa-shield-halved text-[13px] text-[var(--t-ok)]" />
          <p className="text-[var(--t-muted)] text-[11px] leading-snug">File tersimpan sementara — terhapus otomatis setelah expired.</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[{ i: 'fa-bolt', t: 'CEPAT', color: 'var(--t-warn)' }, { i: 'fa-lock', t: 'AMAN', color: 'var(--t-ok)' }, { i: 'fa-hand-pointer', t: 'MUDAH', color: 'var(--t-accent-2)' }].map(f => (
            <div key={f.t} className="flex flex-col items-center gap-2 py-3 rounded-xl border border-[var(--t-line)] bg-[var(--t-surface2)] hover:-translate-y-1 hover:shadow-sm transition-all duration-200">
              <div className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: `color-mix(in srgb, ${f.color} 12%, transparent)`, color: f.color }}>
                <i className={`fa-solid ${f.i} text-[13px]`} />
              </div>
              <span className="font-mono text-[9px] font-bold tracking-wider text-[var(--t-muted)]">{f.t}</span>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  )
}
