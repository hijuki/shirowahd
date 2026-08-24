'use client'
import { useState, useEffect } from 'react'

function ModalShell({ onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade">
      <div className="absolute inset-0 bg-[#04070f]/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`glass anim-pop rounded-[20px] p-6 relative z-10 w-full ${wide ? 'max-w-md' : 'max-w-[400px]'}`}>{children}</div>
    </div>
  )
}

export { ModalShell }

export function IntroModal({ onDone }) {
  const steps = [
    { i: 'fa-cloud-arrow-up', t: 'Upload file', d: 'Pilih video atau foto dari galeri. Bisa banyak sekaligus.' },
    { i: 'fa-key', t: 'Dapatkan kode', d: 'Setelah upload selesai, kamu dapat kode unik seperti .claim A1B2C3.' },
    { i: 'fa-comments', t: '.claim di grup', d: 'Kirim kode itu di grup WhatsApp — bot langsung kirim filenya ke grup.' },
  ]
  return (
    <ModalShell>
      <div className="text-center mb-5">
        <div className="w-14 h-14 mx-auto rounded-[20px] bg-gradient-to-br from-[#22d3ee] to-[#3b82f6] grid place-items-center shadow-[0_0_40px_rgba(34,211,238,.35)]">
          <i className="fa-solid fa-wand-magic-sparkles text-white text-xl" />
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-xl mt-4 grad-text">Selamat Datang!</h2>
        <p className="text-[#7e90ad] text-xs mt-1">3 langkah mudah untuk kirim media HD ke grup</p>
      </div>
      <div className="space-y-3 mb-6">
        {steps.map((s, idx) => (
          <div key={s.t} className="flex gap-3 p-3 rounded-[16px] bg-white/[.04] border border-white/[.07]">
            <div className="w-9 h-9 shrink-0 rounded-[12px] bg-[#3b82f6]/15 border border-[#3b82f6]/30 grid place-items-center">
              <i className={`fa-solid ${s.i} text-[#22d3ee] text-sm`} />
            </div>
            <div>
              <p className="font-bold text-[13px]">
                <span className="text-[#22d3ee] mr-1.5">{idx + 1}.</span>
                {s.t}
              </p>
              <p className="text-[#7e90ad] text-[11px] leading-relaxed mt-0.5">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onDone}
        className="btn-primary w-full py-3 rounded-[12px] font-bold text-sm"
      >
        Mengerti, Mulai Upload <i className="fa-solid fa-arrow-right ml-1" />
      </button>
    </ModalShell>
  )
}

export function FaqModal({ onClose }) {
  const [open, setOpen] = useState(0)
  const faqs = [
    { q: 'Bagaimana cara upload?', a: 'Buka tab Video atau Foto, drag & drop atau tap area upload, pilih file, lalu tekan tombol upload. Progress akan terlihat per file.' },
    { q: 'Format apa yang didukung?', a: 'Video: MP4, MKV, AVI, MOV (otomatis dikonversi ke MP4 H.264 agar kompatibel WhatsApp). Foto: JPG, PNG, GIF, WEBP.' },
    { q: 'Berapa lama kode berlaku?', a: 'Tergantung pengaturan server (default 60 menit). Timer countdown terlihat di popup sukses setelah upload.' },
    { q: 'Kenapa upload lambat?', a: 'File video dikonversi otomatis di server untuk kompatibilitas WA, jadi butuh waktu ekstra terutama untuk file besar.' },
    { q: 'Apakah data saya aman?', a: 'File hanya disimpan sementara dan terhapus otomatis setelah kedaluwarsa.' },
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
              <span className="font-semibold text-[12.5px]">{f.q}</span>
              <i className={`fa-solid fa-chevron-down text-[#7e90ad] text-[10px] transition-transform duration-[250ms] ${open === i ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-[250ms] ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <p className="px-4 pb-3.5 text-[#7e90ad] text-[11.5px] leading-relaxed">{f.a}</p>
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
      <div className="space-y-3 text-[12.5px] leading-relaxed">
        <div className="flex items-center gap-3 p-3.5 rounded-[16px] bg-gradient-to-r from-[#3b82f6]/10 to-transparent border border-white/[.07]">
          <div className="w-10 h-10 rounded-[12px] bg-gradient-to-br from-[#25D366] to-[#128C7E] grid place-items-center shadow-[0_0_24px_rgba(37,211,102,.35)]">
            <i className="fa-brands fa-whatsapp text-white" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] font-bold">SHIROWAHD</p>
            <p className="text-[#7e90ad] text-[11px]">Upload & claim video HD</p>
          </div>
        </div>
        <p className="text-[#7e90ad]">
          Platform upload media ke grup WhatsApp via bot. Upload file, dapatkan kode unik, lalu kirim <code className="font-mono text-[#22d3ee]">.claim KODE</code> di grup — bot langsung mengirimkan file.
        </p>
        <p className="text-[#7e90ad] text-[11px]">
          File tersimpan sementara (60 menit default) lalu terhapus otomatis dari server.
        </p>
      </div>
    </ModalShell>
  )
}
