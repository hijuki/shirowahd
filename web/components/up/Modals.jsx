'use client'
import { useState, useEffect, useRef } from 'react'

/* ═══════════════════════════════════════════════
   MODAL SHELL — flat paper sheet on ink overlay
   ═══════════════════════════════════════════════ */
function ModalShell({ onClose, children }) {
  const [vis, setVis] = useState(false)
  const ref = useRef(null)
  useEffect(() => { requestAnimationFrame(() => setVis(true)) }, [])
  const close = onClose ? () => { setVis(false); setTimeout(onClose, 220) } : null

  return (
    <div className={`fixed inset-0 z-[80] transition-all duration-[220ms] ${vis ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      <div className="absolute inset-0 bg-[var(--t-overlay)]" onClick={close} />

      <div className="absolute inset-0 z-10 overflow-y-auto modal-scroll-hide" onClick={close}>
        <div className="min-h-full flex items-center justify-center p-4 py-6">
          <div
            ref={ref}
            onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-[400px] transition-all duration-[260ms] ${vis ? 'scale-100 translate-y-0' : 'scale-[.97] translate-y-3'}`}
            style={{ transitionTimingFunction: 'var(--ease-out)' }}
          >
            {/* Hard offset shadow — print look */}
            <div className="absolute inset-0 translate-x-[5px] translate-y-[5px] bg-[var(--t-hard)] pointer-events-none" />

            {/* Sheet */}
            <div className="relative rounded-[4px] bg-[var(--t-surface)] border border-[var(--t-line-strong)] overflow-hidden">
              {/* Top ink bar */}
              <div className="h-[3px] bg-[var(--t-ink)]" />
              <div className="p-5">{children}</div>
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
      className="w-8 h-8 rounded-[3px] border border-[var(--t-line)] grid place-items-center text-[var(--t-muted)] hover:text-[var(--t-bad)] hover:border-[var(--t-bad)] active:scale-90 transition-all duration-[140ms]">
      <i className="fa-solid fa-xmark text-xs" />
    </button>
  )
}

/* ─── Link buttons ─── */
export function LinkButtons({ ownerWhatsapp, channels = [], claimGroups = [], popupButtons = [], settings = {} }) {
  const items = []
  if (ownerWhatsapp && settings.showOwnerBtn !== false) items.push({ i: 'fa-brands fa-whatsapp', t: 'Chat Developer', s: 'Hubungi langsung', href: `https://wa.me/${String(ownerWhatsapp).replace(/[^0-9]/g, '')}`, feat: true })
  if (settings.showChannelsBtn !== false) channels.slice(0, 2).forEach(ch => items.push({ i: 'fa-solid fa-tower-broadcast', t: ch.name || 'Saluran', s: 'Saluran resmi', href: ch.link }))
  if (settings.showClaimBtn !== false) claimGroups.slice(0, 2).forEach(g => items.push({ i: 'fa-solid fa-comments', t: g.name || 'Grup Claim', s: 'Klaim file di sini', href: g.link }))
  if (settings.showPopupBtns !== false) popupButtons.filter(b => b.link).slice(0, 3).forEach(b => items.push({ i: 'fa-solid fa-link', t: b.name || 'Link', s: 'Buka link', href: b.link }))
  if (!items.length) return null
  return (
    <div className={`grid gap-1.5 ${items.length === 1 ? '' : items.length <= 4 && items.length % 2 === 0 ? 'grid-cols-2' : ''}`}>
      {items.map(it => (
        <a key={it.t + it.href} href={it.href} target="_blank" rel="noreferrer"
          className={`link-btn-premium flex items-center gap-2.5 rounded-[3px] px-3 py-2.5 border border-[var(--t-line)] bg-[var(--t-surface2)] group hover:border-[var(--t-ink)] ${it.feat ? 'col-span-full' : ''}`}>
          <span className="w-8 h-8 shrink-0 rounded-[3px] grid place-items-center bg-[var(--t-surface)] border border-[var(--t-line)]">
            <i className={`${it.i} text-[13px]`} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block font-bold text-[12px] truncate">{it.t}</span>
            <span className="block font-mono text-[9px] text-[var(--t-muted)]">{it.s}</span>
          </span>
          <i className="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-30 group-hover:opacity-80 transition-opacity duration-[140ms]" />
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
    const t2 = setTimeout(() => setPhase(2), 320)
    return () => [t1, t2].forEach(clearTimeout)
  }, [])

  const steps = [
    { n: '01', i: 'fa-arrow-up-from-bracket', t: 'Upload file', d: 'Pilih video atau foto dari galeri kamu.' },
    { n: '02', i: 'fa-ticket', t: 'Dapat kode unik', d: 'Kode seperti .claim A1B2C3 langsung tersedia.' },
    { n: '03', i: 'fa-paper-plane', t: 'Kirim di grup', d: 'Paste kode di grup WhatsApp — bot kirim filenya.' },
  ]

  return (
    <ModalShell>
      <div className={`transition-all duration-[300ms] ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
        {/* Head */}
        <div className="flex items-start justify-between pb-3">
          <div>
            <p className="field-label">SELAMAT DATANG DI</p>
            <h2 className="text-[22px] font-black tracking-tight leading-none mt-1">
              {settings?.siteName || 'SHIROWAHD'}<span className="text-[var(--t-accent)]">.</span>
            </h2>
            <p className="font-mono text-[10px] text-[var(--t-muted)] mt-1">Upload media HD ke grup WhatsApp</p>
          </div>
          <div className="stamp !w-[46px] !h-[46px] shrink-0">
            <span className="text-[15px] leading-none">受</span>
          </div>
        </div>

        {/* Dev credit line */}
        <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-[.14em] text-[var(--t-muted)] uppercase">
          <span className="w-4 h-4 rounded-[2px] bg-[var(--t-ink)] text-[var(--t-bg)] grid place-items-center text-[8px] font-bold">H</span>
          SWHDHLZ · BY <span className="text-[var(--t-accent)] font-bold">HILLZ</span>
        </div>

        <div className="perf-dot my-3" />

        {/* Steps */}
        <div className="space-y-1.5 mb-4">
          {steps.map((s, idx) => (
            <div key={s.n}
              className={`flex items-center gap-3 p-2.5 rounded-[3px] border transition-all duration-[300ms] ${phase >= 2 ? 'border-[var(--t-line)] bg-[var(--t-surface2)] opacity-100 translate-x-0' : 'border-transparent opacity-0 translate-x-3'}`}
              style={{ transitionDelay: `${idx * 90}ms`, transitionTimingFunction: 'var(--ease-out)' }}>
              <span className="font-mono text-[11px] font-bold text-[var(--t-accent)] w-6">{s.n}</span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[12px]">{s.t}</p>
                <p className="text-[var(--t-muted)] text-[10px] leading-snug mt-0.5">{s.d}</p>
              </div>
              <i className={`fa-solid ${s.i} text-[12px] text-[var(--t-muted)]`} />
            </div>
          ))}
        </div>

        {/* Contacts */}
        {(settings?.ownerWhatsapp || settings?.channels?.length || settings?.claimGroups?.length || settings?.popupButtons?.length) ? (
          <>
            <div className="perf-dot mb-3" />
            <p className="field-label mb-2">Terhubung</p>
            <div className="mb-4">
              <LinkButtons ownerWhatsapp={settings?.ownerWhatsapp} channels={settings?.channels} claimGroups={settings?.claimGroups} popupButtons={settings?.popupButtons} settings={settings} />
            </div>
          </>
        ) : null}

        <button onClick={onDone} className="btn-primary w-full py-3 rounded-[3px] font-mono text-[12px] flex items-center justify-center gap-2">
          MULAI UPLOAD <i className="fa-solid fa-arrow-right text-[10px]" />
        </button>

        <p className="text-center font-mono text-[8px] text-[var(--t-muted)] mt-3 tracking-[.14em]">© {new Date().getFullYear()} SWHDHLZ</p>
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
    { q: 'Bagaimana cara upload?', a: 'Pilih tab Video atau Foto, drag & drop atau tap area upload, pilih file, lalu tekan tombol upload.' },
    { q: 'Format apa yang didukung?', a: 'Video: MP4, MKV, AVI, MOV (otomatis dikonversi ke MP4 H.264). Foto: JPG, PNG, GIF, WEBP.' },
    { q: 'Berapa lama kode berlaku?', a: 'Tergantung pengaturan server (default 60 menit). Timer countdown terlihat di popup sukses.' },
    { q: 'Kenapa upload lambat?', a: 'File video dikonversi otomatis di server agar kompatibel WhatsApp. File besar butuh waktu lebih.' },
    { q: 'Apakah data saya aman?', a: 'File disimpan sementara dan terhapus otomatis setelah kedaluwarsa.' },
  ]
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="field-label">BANTUAN</p>
          <h2 className="text-[19px] font-black tracking-tight leading-none mt-0.5">FAQ<span className="text-[var(--t-accent)]">.</span></h2>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      <div className="perf-dot mb-3" />

      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-0.5 modal-scroll-hide">
        {faqs.map((f, i) => (
          <div key={f.q} className={`rounded-[3px] border overflow-hidden transition-colors duration-[180ms] ${open === i ? 'bg-[var(--t-surface2)] border-[var(--t-line-strong)]' : 'bg-transparent border-[var(--t-line)]'}`}>
            <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
              <span className="font-mono text-[10px] font-bold text-[var(--t-accent)] w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <span className="font-semibold text-[12px] flex-1">{f.q}</span>
              <i className={`fa-solid fa-chevron-down text-[9px] text-[var(--t-muted)] transition-transform duration-[200ms] ${open === i ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-[220ms] ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
              <div className="overflow-hidden"><p className="px-3 pb-3 pl-[42px] text-[var(--t-muted)] text-[11px] leading-relaxed">{f.a}</p></div>
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
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="field-label">INFORMASI</p>
          <h2 className="text-[19px] font-black tracking-tight leading-none mt-0.5">Tentang<span className="text-[var(--t-accent)]">.</span></h2>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      <div className="perf-dot mb-4" />

      <div className="space-y-3">
        {/* Brand block */}
        <div className="rounded-[3px] border border-[var(--t-line)] bg-[var(--t-surface2)] p-4 text-center">
          <div className="w-12 h-12 mx-auto mb-2 rounded-[3px] bg-[var(--t-ink)] text-[var(--t-bg)] grid place-items-center">
            <span className="font-black text-lg leading-none">H</span>
          </div>
          <p className="font-black text-[14px] tracking-[.18em]">SWHDHLZ</p>
          <p className="font-mono text-[9px] tracking-[.14em] text-[var(--t-muted)] mt-1">DEVELOPED BY <span className="text-[var(--t-accent)] font-bold">HILLZ</span></p>
        </div>

        <p className="text-[var(--t-muted)] text-[12px] leading-relaxed text-center px-1">
          Upload media ke grup WhatsApp via bot. Upload file, dapatkan kode unik, lalu kirim{' '}
          <code className="font-mono text-[var(--t-accent)] bg-[var(--t-accent)]/8 border border-[var(--t-accent)]/20 px-1.5 py-0.5 rounded-[2px] text-[10px]">.claim KODE</code> di grup.
        </p>

        <div className="flex items-center gap-2 p-2.5 rounded-[3px] border border-dashed border-[var(--t-line-strong)]">
          <i className="fa-solid fa-shield-halved text-[11px] text-[var(--t-ok)]" />
          <p className="text-[var(--t-muted)] text-[10px] leading-snug">File tersimpan sementara — terhapus otomatis setelah expired.</p>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[{ i: 'fa-bolt', t: 'CEPAT' }, { i: 'fa-lock', t: 'AMAN' }, { i: 'fa-hand-pointer', t: 'MUDAH' }].map(f => (
            <div key={f.t} className="flex flex-col items-center gap-1.5 py-2.5 rounded-[3px] border border-[var(--t-line)] bg-[var(--t-surface2)]">
              <i className={`fa-solid ${f.i} text-[11px] text-[var(--t-ink)]`} />
              <span className="font-mono text-[8px] font-bold tracking-[.14em] text-[var(--t-muted)]">{f.t}</span>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  )
}
