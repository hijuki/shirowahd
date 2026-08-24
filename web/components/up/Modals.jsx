'use client'
import { useState, useEffect } from 'react'

function ModalShell({ onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade">
      <div className="absolute inset-0 bg-[#04070f]/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`glass anim-pop rounded-[20px] p-6 relative z-10 w-full ${wide ? 'max-w-md' : 'max-w-[380px]'}`}>{children}</div>
    </div>
  )
}

export { ModalShell }

export function IntroModal({ onDone }) {
  const steps = [
    { i: 'fa-cloud-arrow-up', t: 'Upload file', d: 'Pilih video atau foto dari galeri.' },
    { i: 'fa-key', t: 'Dapat kode unik', d: 'Kode seperti .claim A1B2C3 siap digunakan.' },
    { i: 'fa-comments', t: 'Kirim di grup', d: 'Paste kode di grup WhatsApp — bot kirim filenya.' },
  ]
  return (
    <ModalShell>
      <div className="text-center mb-5">
        <div className="w-14 h-14 mx-auto rounded-[18px] bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] grid place-items-center shadow-[0_0_36px_rgba(34,211,238,.3)]">
          <i className="fa-brands fa-whatsapp text-white text-2xl" />
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-xl mt-4 grad-text">Selamat Datang!</h2>
        <p className="text-[#7e90ad] text-[11px] mt-1 leading-relaxed">Upload media HD ke grup WhatsApp — 3 langkah mudah</p>
      </div>
      <div className="space-y-2 mb-5">
        {steps.map((s, idx) => (
          <div key={s.t} className="flex items-center gap-3 p-3 rounded-[14px] bg-white/[.04] border border-white/[.06]">
            <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] text-white text-[10px] font-extrabold grid place-items-center shadow-[0_0_10px_rgba(34,211,238,.3)]">
              {idx + 1}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-[12px]">{s.t}</p>
              <p className="text-[#7e90ad] text-[10px] leading-snug">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onDone}
        className="btn-primary w-full py-3 rounded-[12px] font-bold text-sm"
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg grad-text">FAQ</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-[10px] bg-white/5 border border-white/[.07] grid place-items-center text-[#7e90ad] hover:text-[#e8f1ff] transition-all duration-[150ms]">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {faqs.map((f, i) => (
          <div key={f.q} className="rounded-[12px] bg-white/[.04] border border-white/[.07] overflow-hidden">
            <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
              <span className="font-semibold text-[12px]">{f.q}</span>
              <i className={`fa-solid fa-chevron-down text-[#7e90ad] text-[10px] transition-transform duration-[250ms] ${open === i ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-[250ms] ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg grad-text">Tentang</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-[10px] bg-white/5 border border-white/[.07] grid place-items-center text-[#7e90ad] hover:text-[#e8f1ff] transition-all duration-[150ms]">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
      <div className="space-y-3 text-[12px] leading-relaxed">
        <div className="flex items-center gap-3 p-3 rounded-[14px] bg-gradient-to-r from-[#25D366]/10 to-transparent border border-white/[.07]">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#25D366] to-[#128C7E] grid place-items-center shadow-[0_0_20px_rgba(37,211,102,.3)]">
            <i className="fa-brands fa-whatsapp text-white" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] font-bold">SHIROWAHD</p>
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
