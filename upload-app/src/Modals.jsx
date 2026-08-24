import { useState, useRef, useEffect } from 'react'
import { useSettings } from './SettingsContext'

function ModalShell({ onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade">
      <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`glass anim-pop rounded-3xl p-6 relative z-10 w-full ${wide ? 'max-w-md' : 'max-w-[400px]'}`}>{children}</div>
    </div>
  )
}

export function IntroModal({ onDone }) {
  const steps = [
    { i: 'fa-cloud-arrow-up', t: 'Upload file', d: 'Pilih video atau foto dari galeri. Bisa banyak sekaligus.' },
    { i: 'fa-key', t: 'Dapatkan kode', d: 'Setelah upload selesai, kamu dapat kode unik seperti .claim A1B2C3.' },
    { i: 'fa-comments', t: '.claim di grup', d: 'Kirim kode itu di grup WhatsApp — bot langsung kirim filenya ke grup.' },
  ]
  return (
    <ModalShell>
      <div className="text-center mb-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand2 to-brand grid place-items-center shadow-[0_0_40px_rgba(22,119,255,.4)]">
          <i className="fa-solid fa-wand-magic-sparkles text-white text-xl" />
        </div>
        <h2 className="font-display font-bold text-xl mt-4 grad-text">Selamat Datang!</h2>
        <p className="text-muted text-xs mt-1">3 langkah mudah untuk kirim media HD ke grup</p>
      </div>
      <div className="space-y-3 mb-6">
        {steps.map((s, idx) => (
          <div key={s.t} className="flex gap-3 p-3 rounded-2xl bg-white/[.03] border border-white/5">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-brand/15 border border-line2/50 grid place-items-center">
              <i className={`fa-solid ${s.i} text-cyan text-sm`} />
            </div>
            <div>
              <p className="font-bold text-[13px]">
                <span className="text-cyan mr-1.5">{idx + 1}.</span>
                {s.t}
              </p>
              <p className="text-muted text-[11px] leading-relaxed mt-0.5">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onDone}
        className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand2 to-brand hover:brightness-110 active:scale-[.98] transition shadow-[0_10px_30px_rgba(20,100,255,.35)]"
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
        <h2 className="font-display font-bold text-lg grad-text">FAQ</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 border border-line grid place-items-center text-muted hover:text-ink transition">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {faqs.map((f, i) => (
          <div key={f.q} className="rounded-xl bg-white/[.03] border border-white/5 overflow-hidden">
            <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
              <span className="font-semibold text-[12.5px]">{f.q}</span>
              <i className={`fa-solid fa-chevron-down text-muted text-[10px] transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-300 ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden">
                <p className="px-4 pb-3.5 text-muted text-[11.5px] leading-relaxed">{f.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  )
}

export function AboutModal({ onClose }) {
  const { settings } = useSettings()
  return (
    <ModalShell onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-lg grad-text">Tentang</h2>
        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 border border-line grid place-items-center text-muted hover:text-ink transition">
          <i className="fa-solid fa-xmark" />
        </button>
      </div>
      <div className="space-y-3 text-[12.5px] leading-relaxed">
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-brand/10 to-transparent border border-line">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] grid place-items-center shadow-[0_0_24px_rgba(37,211,102,.35)]">
            <i className="fa-brands fa-whatsapp text-white" />
          </div>
          <div>
            <p className="font-display font-bold">{settings?.siteName || 'SHIROWAHD'}</p>
            <p className="text-muted text-[11px]">{settings?.siteSubtitle || 'Upload & claim video HD'}</p>
          </div>
        </div>
        <p className="text-muted">
          Platform upload media ke grup WhatsApp via bot. Upload file, dapatkan kode unik, lalu kirim <code className="font-mono text-cyan">.claim KODE</code> di grup — bot langsung mengirimkan file.
        </p>
        <p className="text-muted text-[11px]">
          File tersimpan sementara ({settings?.expireMinutes || 60} menit) lalu terhapus otomatis dari server.
        </p>
      </div>
    </ModalShell>
  )
}

export function SuccessModal({ result, expireMinutes, onClose }) {
  const [copied, setCopied] = useState('')
  const [left, setLeft] = useState(expireMinutes * 60000)
  useEffect(() => {
    const t = setInterval(() => setLeft(l => Math.max(0, l - 1000)), 1000)
    return () => clearInterval(t)
  }, [])
  const codes = result.codes?.length ? result.codes : [{ code: result.code, name: '' }]
  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText('.claim ' + code)
    } catch {
      // ponytail: clipboard API blocked on plain http; fallback execCommand
      const ta = document.createElement('textarea')
      ta.value = '.claim ' + code
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(code)
    setTimeout(() => setCopied(''), 1600)
  }
  const waText = encodeURIComponent(
    `Halo! Saya baru saja upload file.\n\nKode klaim: .claim ${codes[0].code}\n\nSilakan gunakan kode ini untuk mengklaim file.`
  )
  // no backdrop close — user must see the code
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 anim-fade">
      <div className="absolute inset-0 bg-[#020617]/85 backdrop-blur-sm" />
      <div className="glass anim-pop rounded-3xl p-6 relative z-10 w-full max-w-[400px] max-h-[92vh] overflow-y-auto">
      <div className="text-center mb-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-ok/10 border border-ok/30 grid place-items-center shadow-[0_0_44px_rgba(52,211,153,.35)]">
          <i className="fa-solid fa-check text-ok text-2xl" />
        </div>
        <h2 className="font-display font-bold text-xl mt-3 grad-text">Upload Berhasil!</h2>
        <p className="text-muted text-xs mt-1">
          {result.bundle ? `${result.count} foto dalam 1 bundle` : 'File siap diklaim'} — kode berlaku {expireMinutes} menit
        </p>
      </div>

      {codes.map(({ code, name }) => (
        <div key={code} className="rounded-2xl bg-[#04101f]/80 border border-line2/60 p-4 mb-3 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
          {name && <p className="text-muted text-[10px] truncate mb-1.5">{name}</p>}
          <p className="font-mono font-bold text-2xl tracking-wider text-cyan drop-shadow-[0_0_12px_rgba(59,200,255,.45)] select-all">.claim {code}</p>
        </div>
      ))}

      <div className="flex items-center justify-center gap-2 mb-5 text-muted font-mono text-[11px]">
        <i className="fa-solid fa-hourglass-half" />
        <span>kedaluwarsa dalam</span>
        <span className={`px-2 py-0.5 rounded-md border font-bold ${left < 5 * 60000 ? 'border-bad/40 text-bad' : 'border-line2/60 text-cyan'}`}>
          {String(Math.floor(left / 60000)).padStart(2, '0')}:{String(Math.floor(left / 1000) % 60).padStart(2, '0')}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => copy(codes[0].code)}
          className="py-2.5 rounded-xl bg-white/5 border border-line text-[11px] font-bold text-ink hover:bg-white/10 active:scale-95 transition flex flex-col items-center gap-1"
        >
          <i className={`fa-solid ${copied ? 'fa-check text-ok' : 'fa-copy'} text-base`} />
          {copied ? 'Tersalin!' : 'Salin'}
        </button>
        <a
          href={`https://wa.me/?text=${waText}`}
          target="_blank"
          rel="noreferrer"
          className="py-2.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[11px] font-bold text-[#7ce8a8] hover:bg-[#25D366]/20 active:scale-95 transition flex flex-col items-center gap-1"
        >
          <i className="fa-brands fa-whatsapp text-base" />
          Bagikan
        </a>
        <button
          onClick={() => copy(codes[0].code)}
          className="py-2.5 rounded-xl bg-white/5 border border-line text-[11px] font-bold text-ink hover:bg-white/10 active:scale-95 transition flex flex-col items-center gap-1"
        >
          <i className="fa-solid fa-link text-base" />
          Link
        </button>
      </div>

      <button onClick={onClose} className="w-full mt-3 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand2 to-brand hover:brightness-110 active:scale-[.98] transition shadow-[0_10px_30px_rgba(20,100,255,.35)]">
        Selesai <i className="fa-solid fa-arrow-right ml-1" />
      </button>
      </div>
    </div>
  )
}
