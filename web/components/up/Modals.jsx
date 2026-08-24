'use client'
import { useState, useEffect } from 'react'

function ModalShell({ onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade">
      <div className="absolute inset-0 bg-[#04070f]/85 backdrop-blur-sm" onClick={onClose} />
      <div className={`glass anim-pop rounded-[24px] p-6 relative z-10 w-full ${wide ? 'max-w-md' : 'max-w-[380px]'}`}>
        {/* Top shimmer line */}
        <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#22d3ee]/50 to-transparent" />
        {children}
      </div>
    </div>
  )
}

export { ModalShell }

export function IntroModal({ onDone }) {
  const steps = [
    { i: 'fa-cloud-arrow-up', t: 'Upload file', d: 'Pilih video atau foto dari galeri.', c: '#22d3ee' },
    { i: 'fa-key', t: 'Dapat kode unik', d: 'Kode seperti .claim A1B2C3 siap digunakan.', c: '#3b82f6' },
    { i: 'fa-comments', t: 'Kirim di grup', d: 'Paste kode di grup WhatsApp — bot kirim filenya.', c: '#34d399' },
  ]
  return (
    <ModalShell>
      <div className="text-center mb-6">
        <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#25D366] to-[#0e7a5f] mb-4 shadow-[0_0_50px_-8px_rgba(37,211,102,.6)] hero-glow">
          <span className="absolute inset-[1px] rounded-[19px] bg-[#04070f]/40 backdrop-blur-sm" />
          <i className="fa-brands fa-whatsapp text-white text-2xl relative z-10" />
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-xl grad-text">Selamat Datang!</h2>
        <p className="text-[#7e90ad] text-[11px] mt-1.5 leading-relaxed max-w-[260px] mx-auto">Upload media HD ke grup WhatsApp — 3 langkah mudah</p>
      </div>
      <div className="space-y-2.5 mb-6 stagger">
        {steps.map((s, idx) => (
          <div key={s.t} className="flex items-center gap-3.5 p-3.5 rounded-[16px] bg-white/[.03] border border-white/[.06] hover:border-white/[.12] transition-all duration-[150ms]">
            <div className="w-10 h-10 shrink-0 rounded-[12px] grid place-items-center" style={{ background: `${s.c}12`, border: `1px solid ${s.c}30` }}>
              <span className="font-[family-name:var(--font-display)] text-[13px] font-extrabold" style={{ color: s.c }}>{idx + 1}</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[12px]">{s.t}</p>
              <p className="text-[#7e90ad] text-[10px] leading-snug mt-0.5">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onDone}
        className="btn-primary w-full py-3.5 rounded-[14px] font-bold text-sm tracking-wide"
      >
        Mulai Upload <i className="fa-solid fa-arrow-right ml-1.5" />
      </button>
    </ModalShell>
  )
}

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
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg grad-text">FAQ</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-[10px] bg-white/5 border border-white/[.07] grid place-items-center text-[#7e90ad] hover:text-[#e8f1ff] hover:bg-white/10 transition-all duration-[150ms]">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {faqs.map((f, i) => (
          <div key={f.q} className="rounded-[14px] bg-white/[.03] border border-white/[.06] overflow-hidden">
            <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left">
              <span className="font-semibold text-[12px]">{f.q}</span>
              <i className={`fa-solid fa-chevron-down text-[#7e90ad] text-[10px] transition-transform duration-[250ms] ${open === i ? 'rotate-180' : ''}`} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
            </button>
            <div className={`grid transition-all duration-[250ms] ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
              <div className="overflow-hidden">
                <p className="px-4 pb-3.5 text-[#7e90ad] text-[11px] leading-relaxed">{f.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  )
}

export function AboutModal({ onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg grad-text">Tentang</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-[10px] bg-white/5 border border-white/[.07] grid place-items-center text-[#7e90ad] hover:text-[#e8f1ff] hover:bg-white/10 transition-all duration-[150ms]">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
      <div className="space-y-3 text-[12px] leading-relaxed">
        <div className="flex items-center gap-3.5 p-3.5 rounded-[16px] bg-gradient-to-r from-[#25D366]/10 to-transparent border border-white/[.06]">
          <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-[#25D366] to-[#128C7E] grid place-items-center shadow-[0_0_24px_rgba(37,211,102,.35)]">
            <i className="fa-brands fa-whatsapp text-white text-lg" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] font-bold tracking-wide">SHIROWAHD</p>
            <p className="text-[#7e90ad] text-[10px]">Upload & claim video HD</p>
          </div>
        </div>
        <p className="text-[#7e90ad]">
          Upload media ke grup WhatsApp via bot. Upload file, dapatkan kode unik, lalu kirim <code className="font-mono text-[#22d3ee]">.claim KODE</code> di grup.
        </p>
        <p className="text-[#7e90ad] text-[10px]">
          File tersimpan sementara lalu terhapus otomatis dari server.
        </p>
      </div>
    </ModalShell>
  )
}
