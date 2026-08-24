'use client'
import { useState, useEffect } from 'react'

function ModalShell({ onClose, children, wide }) {
  const [vis, setVis] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVis(true)) }, [])
  const close = () => { setVis(false); setTimeout(onClose, 280) }
  return (
    <div className={`fixed inset-0 z-[80] flex items-center justify-center p-4 transition-opacity duration-[280ms] ${vis ? 'opacity-100' : 'opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      <div className="absolute inset-0 bg-[#020510]/90 backdrop-blur-md" onClick={close} />
      <div className={`relative z-10 w-full ${wide ? 'max-w-md' : 'max-w-[400px]'} transition-all duration-[350ms] ${vis ? 'scale-100 translate-y-0 opacity-100' : 'scale-[.92] translate-y-6 opacity-0'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
        <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-b from-[#22d3ee]/[.08] via-[#3b82f6]/[.05] to-transparent blur-2xl pointer-events-none" />
        <div className="relative rounded-[24px] border border-white/[.08] bg-[#080e1c]/85 backdrop-blur-2xl shadow-[0_32px_80px_-16px_rgba(0,0,0,.8)] overflow-hidden max-h-[90dvh] overflow-y-auto">
          <div className="absolute top-0 inset-x-0 h-px">
            <div className="h-full bg-gradient-to-r from-transparent via-[#22d3ee]/60 to-transparent modal-shimmer" />
          </div>
          <div className="absolute top-8 bottom-8 left-0 w-px bg-gradient-to-b from-transparent via-[#3b82f6]/20 to-transparent" />
          <div className="absolute top-8 bottom-8 right-0 w-px bg-gradient-to-b from-transparent via-[#22d3ee]/20 to-transparent" />
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

export { ModalShell }

/* ---------- Shared close btn ---------- */
function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} className="w-8 h-8 rounded-full bg-white/5 border border-white/[.08] grid place-items-center text-[#7e90ad] hover:text-[#e8f1ff] hover:bg-white/10 hover:rotate-90 transition-all duration-[250ms]" style={{ transitionTimingFunction: 'var(--ease-out)' }}>
      <i className="fa-solid fa-xmark text-xs" />
    </button>
  )
}

/* ---------- Link buttons used in Welcome popup ---------- */
export function LinkButtons({ ownerWhatsapp, channels = [], claimGroups = [], groups = [] }) {
  const items = []
  if (ownerWhatsapp) items.push({ i: 'fa-brands fa-whatsapp', t: 'Chat Developer', s: 'Hubungi langsung', href: `https://wa.me/${String(ownerWhatsapp).replace(/[^0-9]/g, '')}`, c: '#25D366', feat: true })
  channels.slice(0, 2).forEach(ch => items.push({ i: 'fa-solid fa-tower-broadcast', t: ch.name || 'Saluran', s: 'Saluran resmi', href: ch.link, c: '#22d3ee' }))
  claimGroups.slice(0, 2).forEach(g => items.push({ i: 'fa-solid fa-comments', t: g.name || 'Grup Claim', s: 'Klaim file di sini', href: g.link, c: '#34d399' }))
  if (!items.length) return null
  return (
    <div className={`grid gap-2 ${items.length === 1 ? '' : items.length <= 4 && items.length % 2 === 0 ? 'grid-cols-2' : ''}`}>
      {items.map(it => (
        <a key={it.t + it.href} href={it.href} target="_blank" rel="noreferrer"
          className={`contact-btn flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 border group ${it.feat ? 'col-span-full' : ''}`}
          style={{ background: `${it.c}0c`, borderColor: `${it.c}28` }}>
          <span className="w-9 h-9 shrink-0 rounded-[11px] grid place-items-center relative overflow-hidden" style={{ background: `${it.c}18`, border: `1px solid ${it.c}35` }}>
            <i className={`${it.i} text-[14px]`} style={{ color: it.c }} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block font-bold text-[12px] truncate">{it.t}</span>
            <span className="block text-[#7e90ad] text-[9px]">{it.s}</span>
          </span>
          <i className="fa-solid fa-arrow-up-right-from-square text-[9px] opacity-50 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-[150ms]" style={{ color: it.c }} />
        </a>
      ))}
    </div>
  )
}

/* ================= WELCOME / INTRO ================= */
export function IntroModal({ onDone, settings }) {
  const [step, setStep] = useState(-1)
  useEffect(() => {
    const ts = [200, 380, 560].map((d, i) => setTimeout(() => setStep(i), d))
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
          <div className="absolute -inset-4 rounded-full bg-[#25D366]/12 blur-xl animate-pulse pointer-events-none" />
          <div className="relative w-[68px] h-[68px] rounded-[22px] bg-gradient-to-br from-[#25D366] via-[#1fae55] to-[#0e7a5f] grid place-items-center shadow-[0_0_60px_-6px_rgba(37,211,102,.55)] floaty">
            <span className="absolute inset-[1px] rounded-[21px] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <i className="fa-brands fa-whatsapp text-white text-[30px] drop-shadow-[0_2px_12px_rgba(0,0,0,.4)]" />
          </div>
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-[22px] tracking-tight leading-none">
          {settings?.siteName || 'SHIROWAHD'}
        </h2>
        <p className="text-[#7e90ad] text-[10px] mt-1.5 tracking-wide">Upload media HD ke grup WhatsApp</p>

        {/* Developer credit */}
        <div className="mt-4 inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white/[.04] border border-white/[.08]">
          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] grid place-items-center text-[9px] font-extrabold text-white">H</span>
          <span className="text-[10px] tracking-wider"><span className="text-[#7e90ad] font-semibold">SWHDHLZ</span> <span className="text-[#7e90ad]/50">BY</span> <span className="grad-text font-extrabold">HILLZ</span></span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2 mb-5">
        {steps.map((s, idx) => (
          <div key={s.t}
            className={`flex items-center gap-3.5 p-3 rounded-[16px] border transition-all duration-[450ms] ${idx <= step ? 'bg-white/[.03] border-white/[.07] translate-x-0 opacity-100' : 'bg-transparent border-transparent translate-x-4 opacity-0'}`}
            style={{ transitionTimingFunction: 'var(--ease-out)', transitionDelay: `${idx * 80}ms` }}>
            <div className="w-10 h-10 shrink-0 rounded-[13px] grid place-items-center" style={{ background: `${s.c}12`, border: `1px solid ${s.c}30` }}>
              <i className={`fa-solid ${s.i} text-[14px]`} style={{ color: s.c }} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[12px]">{s.t}</p>
              <p className="text-[#7e90ad] text-[10px] leading-snug mt-0.5">{s.d}</p>
            </div>
            <span className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-[10px] font-extrabold" style={{ background: `${s.c}15`, color: s.c }}>{idx + 1}</span>
          </div>
        ))}
      </div>

      {/* Contacts */}
      {(settings?.ownerWhatsapp || settings?.channels?.length || settings?.claimGroups?.length) ? (
        <>
          <p className="text-[9px] font-extrabold tracking-[.18em] uppercase text-[#7e90ad]/70 mb-2 flex items-center gap-2">
            <span className="flex-1 h-px bg-white/[.06]" />Terhubung<span className="flex-1 h-px bg-white/[.06]" />
          </p>
          <div className="mb-5 stagger">
            <LinkButtons ownerWhatsapp={settings?.ownerWhatsapp} channels={settings?.channels} claimGroups={settings?.claimGroups} groups={settings?.groups} />
          </div>
        </>
      ) : null}

      <button onClick={onDone} className="btn-primary w-full py-4 rounded-[16px] font-bold text-[14px] tracking-wide group">
        Mulai Upload
        <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform duration-[150ms]" />
      </button>
      <p className="text-center text-[#7e90ad]/35 text-[9px] mt-3 tracking-wide">© {new Date().getFullYear()} SWHDHLZ · BY HILLZ</p>
    </ModalShell>
  )
}

/* ================= FAQ ================= */
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
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#22d3ee]/15 to-[#3b82f6]/5 border border-[#22d3ee]/20 grid place-items-center">
            <i className="fa-solid fa-circle-question text-[#22d3ee] text-sm" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-lg grad-text">FAQ</h2>
        </div>
        <CloseBtn onClick={onClose} />
      </div>
      <div className="space-y-2.5 max-h-[58vh] overflow-y-auto pr-1">
        {faqs.map((f, i) => (
          <div key={f.q} className={`rounded-[16px] border overflow-hidden transition-all duration-[250ms] ${open === i ? 'bg-white/[.05] border-white/[.10]' : 'bg-white/[.02] border-white/[.05]'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
            <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
              <div className={`w-7 h-7 shrink-0 rounded-[8px] grid place-items-center border transition-all duration-[250ms] ${open === i ? 'bg-[#22d3ee]/15 border-[#22d3ee]/25' : 'bg-white/[.04] border-white/[.06]'}`}>
                <i className={`fa-solid ${f.i} text-[10px] transition-colors duration-[250ms] ${open === i ? 'text-[#22d3ee]' : 'text-[#7e90ad]'}`} />
              </div>
              <span className="font-semibold text-[12px] flex-1">{f.q}</span>
              <i className={`fa-solid fa-chevron-down text-[9px] transition-transform duration-[250ms] ${open === i ? 'rotate-180 text-[#22d3ee]' : 'text-[#7e90ad]'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
            </button>
            <div className={`grid transition-all duration-[250ms] ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
              <div className="overflow-hidden"><p className="px-4 pb-4 pl-14 text-[#7e90ad] text-[11px] leading-relaxed">{f.a}</p></div>
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  )
}

/* ================= ABOUT ================= */
export function AboutModal({ onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#3b82f6]/15 to-[#22d3ee]/5 border border-[#3b82f6]/20 grid place-items-center">
            <i className="fa-solid fa-circle-info text-[#3b82f6] text-sm" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-lg grad-text">Tentang</h2>
        </div>
        <CloseBtn onClick={onClose} />
      </div>

      <div className="space-y-4">
        {/* Dev card */}
        <div className="relative rounded-[18px] p-5 overflow-hidden border border-white/[.07] text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[#22d3ee]/[.08] via-transparent to-[#3b82f6]/[.08]" />
          <div className="relative">
            <div className="relative w-16 h-16 mx-auto mb-3">
              <div className="absolute -inset-2 rounded-full bg-[#22d3ee]/15 blur-lg" />
              <div className="relative w-full h-full rounded-[18px] bg-gradient-to-br from-[#22d3ee] via-[#3b82f6] to-[#34d399] grid place-items-center shadow-[0_0_36px_-4px_rgba(34,211,238,.45)]">
                <span className="absolute inset-[1px] rounded-[17px] bg-gradient-to-b from-white/20 to-transparent" />
                <span className="font-[family-name:var(--font-display)] font-extrabold text-xl text-white relative">H</span>
              </div>
            </div>
            <p className="font-[family-name:var(--font-display)] font-extrabold text-[15px] tracking-widest grad-text">SWHDHLZ</p>
            <p className="text-[#7e90ad] text-[10px] tracking-wide mt-0.5">Developed by <span className="text-[#e8f1ff] font-semibold">HILLZ</span></p>
          </div>
        </div>

        <p className="text-[#7e90ad] text-[12px] leading-relaxed text-center px-2">
          Upload media ke grup WhatsApp via bot. Upload file, dapatkan kode unik, lalu kirim <code className="font-mono text-[#22d3ee] bg-[#22d3ee]/10 px-1.5 py-0.5 rounded-[5px] text-[10px]">.claim KODE</code> di grup.
        </p>

        <div className="flex items-center gap-2.5 p-3 rounded-[12px] bg-[#34d399]/[.06] border border-[#34d399]/15">
          <i className="fa-solid fa-shield-halved text-[#34d399] text-xs" />
          <p className="text-[#7e90ad] text-[10px] leading-snug">File tersimpan sementara — terhapus otomatis setelah expired.</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[{ i: 'fa-bolt', t: 'Cepat', c: '#22d3ee' }, { i: 'fa-lock', t: 'Aman', c: '#34d399' }, { i: 'fa-wand-magic-sparkles', t: 'Mudah', c: '#3b82f6' }].map(f => (
            <div key={f.t} className="flex flex-col items-center gap-1.5 py-3 rounded-[12px] bg-white/[.02] border border-white/[.05]">
              <i className={`fa-solid ${f.i} text-xs`} style={{ color: f.c }} />
              <span className="text-[9px] font-bold text-[#7e90ad]">{f.t}</span>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  )
}
