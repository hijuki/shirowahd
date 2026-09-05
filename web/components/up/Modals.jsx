'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

/* ══════════════════════════════════════════════════════════════
   SHEET — pengganti "modal card" lama.
   Portal ke <body> (z-999) supaya tidak pernah tertutup elemen
   lain di mobile. Masuk: naik + skala + rotasi mikro (ease-snap).
   Keluar: dipendekkan, tanpa hentakan.
   ══════════════════════════════════════════════════════════════ */
export function Sheet({ onClose, title, kicker, children, foot, wide = false }) {
  const [out, setOut] = useState(false)
  const busy = useRef(false)
  const [host, setHost] = useState(null)

  useEffect(() => { setHost(document.body) }, [])

  const close = useCallback(() => {
    if (busy.current || !onClose) return
    busy.current = true
    setOut(true)
    setTimeout(onClose, 250)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [close])

  if (!host) return null

  return createPortal(
    <div className="sheet-overlay" data-out={out ? '1' : '0'} onClick={close}>
      <div className="absolute inset-0 overflow-y-auto scroll-hide">
        <div className="min-h-full flex p-3 py-5">
          <div className={`sheet m-auto w-full ${wide ? 'max-w-[560px]' : 'max-w-[440px]'}`}
            data-out={out ? '1' : '0'}
            onClick={e => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label={title || 'Dialog'}>
            <div className="sheet-head">
              <span className="min-w-0">
                {/* JANGAN tambah opacity-* di sini. `.kicker` sudah memakai
                    --ink-2 (#5d5d64 = 6.53:1 di atas putih) — itu SUDAH warna
                    teredup. Menumpuk opacity-70 mengalikan peredupan jadi
                    3.26:1, di bawah 4.5:1 yang dibutuhkan teks 8px. */}
                {kicker && <span className="block kicker !text-[8px]">{kicker}</span>}
                <span className="block font-[family-name:var(--font-display)] text-[15px] uppercase leading-none mt-[3px] truncate">
                  {title}
                </span>
              </span>
              <button onClick={close} aria-label="Tutup"
                className="w-9 h-9 shrink-0 grid place-items-center border-2 border-current/45 rounded-[var(--r-soft)] hover:border-current hover:bg-current/10 transition-colors">
                <i className="fa-solid fa-xmark text-[12px]" />
              </button>
            </div>
            <div className="p-4">{children}</div>
            {foot && <div className="px-4 pb-4">{foot}</div>}
          </div>
        </div>
      </div>
    </div>,
    host
  )
}

/* Kompat: beberapa komponen lama meng-import ModalShell. */
export function ModalShell({ onClose, children }) {
  return <Sheet onClose={onClose} title="SHIROWAHD">{children}</Sheet>
}

/* ─── Tombol link resmi: baris plat, bukan kartu warna-warni ─── */
export function LinkButtons({ channels = [], claimGroups = [], popupButtons = [], ownerWhatsapp, settings = {} }) {
  const items = []
  if (settings.showChannelsBtn !== false) channels.slice(0, 2).forEach(ch => items.push({ i: 'fa-tower-broadcast', t: ch.name || 'Saluran', s: 'SALURAN RESMI', href: ch.link }))
  if (settings.showClaimBtn !== false) claimGroups.slice(0, 2).forEach(g => items.push({ i: 'fa-comments', t: g.name || 'Grup Claim', s: 'KLAIM DI SINI', href: g.link }))
  if (settings.showPopupBtns !== false) popupButtons.filter(b => b.link).slice(0, 3).forEach(b => items.push({ i: 'fa-link', t: b.name || 'Link', s: 'BUKA LINK', href: b.link }))
  if (settings.showOwnerBtn !== false && ownerWhatsapp) {
    items.push({ i: 'fa-headset', t: 'Chat Developer', s: 'BANTUAN LANGSUNG', href: 'https://wa.me/' + String(ownerWhatsapp).replace(/[^0-9]/g, ''), wa: true })
  }
  if (!items.length) return null

  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <a key={it.t + it.href} href={it.href} target="_blank" rel="noreferrer"
          className="ticket !py-2.5 hover:translate-x-[3px] transition-transform"
          style={{ animationDelay: i * 70 + 'ms' }}>
          <span className="ticket-notch" />
          <span className={`icon-tile !w-9 !h-9 shrink-0 ${it.wa ? '!bg-wa' : ''}`}>
            <i className={`fa-solid ${it.i} text-[11px] ${it.wa ? 'text-[#06180d]' : ''}`} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold text-[12px] truncate">{it.t}</span>
            <span className="kicker !text-[8px] block mt-[2px]">{it.s}</span>
          </span>
          <i className="fa-solid fa-arrow-right text-[10px] opacity-45 shrink-0" />
        </a>
      ))}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   WELCOME — bertahap (stagger), logo WA hijau + badge H (brand,
   wajib ada). Transisi masuk pakai clip-path + rise, bukan slide.
   ══════════════════════════════════════════════════════════════ */
export function IntroModal({ onDone, onStart, settings }) {
  const [p, setP] = useState(0)
  useEffect(() => {
    const t = [
      setTimeout(() => setP(1), 120),
      setTimeout(() => setP(2), 420),
      setTimeout(() => setP(3), 700),
      setTimeout(() => setP(4), 1080),
    ]
    return () => t.forEach(clearTimeout)
  }, [])

  const steps = [
    { n: '01', i: 'fa-cloud-arrow-up', t: 'Upload', d: 'Pilih video atau foto dari perangkat.' },
    { n: '02', i: 'fa-key', t: 'Ambil kode', d: 'Kode singkat, contoh: .claim A7' },
    { n: '03', i: 'fa-paper-plane', t: 'Kirim di grup', d: 'Tempel kodenya — bot yang kirim filenya.' },
  ]

  const st = n => ({
    opacity: p >= n ? 1 : 0,
    transform: p >= n ? 'none' : 'translate3d(0,18px,0)',
    filter: p >= n ? 'blur(0)' : 'blur(5px)',
    transition: 'opacity 560ms var(--ease), transform 560ms var(--ease), filter 480ms var(--ease)',
  })

  return (
    <Sheet onClose={onDone} title={settings?.welcomeTitle || settings?.siteName || 'SHIROWAHD'} kicker="SELAMAT DATANG">
      {/* Brand: logo WA hijau + badge H — identitas, jangan diganti */}
      <div className="flex items-center gap-3" style={st(1)}>
        <span className="relative w-[58px] h-[58px] shrink-0 grid place-items-center border-[3px] border-[var(--edge)] bg-wa stack-shadow">
          {settings?.logoUrl
            ? <img src={settings.logoUrl} alt="" className="w-full h-full object-contain p-1" />
            : <i className="fa-brands fa-whatsapp text-[26px] text-[#06180d]" />}
          <span className="stamp-ring" />
        </span>
        <div className="min-w-0">
          <p className="display-m !text-[19px]">{settings?.siteName || 'SHIROWAHD'}</p>
          <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-[3px] border-2 border-[var(--edge)] rounded-[var(--r-pill)] bg-[var(--paper-2)]">
            <span className="badge-h w-[16px] h-[16px] !border text-[8px]">H</span>
            <span className="kicker !text-[8px]">SWHDHLZ · BY HILLZ</span>
          </span>
        </div>
      </div>

      <p className="text-[13px] leading-[1.6] text-[var(--ink-2)] mt-4" style={st(2)}>
        {settings?.welcomeText || 'Upload media ke grup WhatsApp lewat bot. Tanpa turun mutu, tanpa aplikasi tambahan.'}
      </p>

      <div className="rule-dash my-4" style={st(2)} />

      <div className="space-y-1.5">
        {steps.map((s, i) => (
          <div key={s.n} className="ticket !py-2.5"
            style={{
              opacity: p >= 3 ? 1 : 0,
              transform: p >= 3 ? 'none' : 'translate3d(-14px,0,0)',
              transition: `opacity 520ms var(--ease) ${i * 110}ms, transform 520ms var(--ease-snap) ${i * 110}ms`,
              animation: 'none',
            }}>
            <span className="ticket-notch" />
            <span className="icon-tile !w-9 !h-9 shrink-0"><i className={`fa-solid ${s.i} text-[11px]`} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-[12px]">{s.t}</span>
              <span className="block text-[11px] leading-snug text-[var(--ink-2)] mt-[1px]">{s.d}</span>
            </span>
            <span className="font-[family-name:var(--font-display)] text-[15px] opacity-25 shrink-0">{s.n}</span>
          </div>
        ))}
      </div>

      <div style={st(4)} className="mt-4">
        {/* CTA mengantar ke panel upload, bukan sekadar menutup popup. */}
        <button onClick={onStart || onDone} className="btn btn-primary w-full">
          <span className="btn-cap"><i className="fa-solid fa-arrow-right text-[10px]" /></span>
          {settings?.welcomeCta || 'MULAI UPLOAD'}
        </button>

        {(settings?.channels?.length || settings?.claimGroups?.length || settings?.popupButtons?.length || settings?.ownerWhatsapp) ? (
          <>
            <div className="flex items-center gap-2.5 mt-5 mb-2.5">
              <span className="flex-1 rule-dash" />
              <span className="kicker !text-[8px]">LINK RESMI</span>
              <span className="flex-1 rule-dash" />
            </div>
            <LinkButtons channels={settings?.channels} claimGroups={settings?.claimGroups}
              popupButtons={settings?.popupButtons} ownerWhatsapp={settings?.ownerWhatsapp} settings={settings} />
          </>
        ) : null}
      </div>
    </Sheet>
  )
}

/* ══════════════════════════════════════════════════════════════
   FAQ — accordion plat; jawaban dibuka dengan grid-rows (tinggi
   nyata, tidak ada lompatan).
   ══════════════════════════════════════════════════════════════ */
export function FaqModal({ onClose, settings }) {
  const [open, setOpen] = useState(0)
  const m = Number(settings?.expireMinutes) || 60
  const expText = m >= 1440
    ? (m / 1440 % 1 === 0 ? (m / 1440) + ' hari' : (m / 60).toFixed(0) + ' jam')
    : m >= 60 ? (m / 60 % 1 === 0 ? (m / 60) + ' jam' : m + ' menit') : m + ' menit'

  const faqs = [
    { q: 'Bagaimana cara upload?', a: 'Pilih tab Video atau Foto, tap area upload (atau drag & drop di desktop), pilih file, lalu tekan tombol upload.', i: 'fa-cloud-arrow-up' },
    { q: 'Format apa yang didukung?', a: 'Video: MP4, MOV, MKV, AVI, WEBM, M4V, 3GP, FLV, TS, WMV. Foto: JPG, PNG, GIF, WEBP, HEIC, AVIF, BMP, TIFF. Video H.264 dikirim apa adanya tanpa dikompres; format lain dikonversi dulu ke H.264 agar bisa diputar di semua HP.', i: 'fa-file-video' },
    { q: 'Berapa lama kode berlaku?', a: 'Sesuai pengaturan admin, saat ini ' + expText + '. Hitungan waktunya kelihatan di popup setelah upload berhasil.', i: 'fa-hourglass-half' },
    { q: 'Kenapa upload lambat?', a: 'Paling berpengaruh: kecepatan internet kamu. Di server, video H.264 hanya dirapikan wadahnya (cepat); format lain harus dikonversi dulu sehingga lebih lama.', i: 'fa-gauge-high' },
    { q: 'Bisa upload di atas 100 MB?', a: 'Bisa. Admin dapat menyalakan jalur langsung yang tidak lewat batas 100 MB. Kalau jalur itu mati, batas standar berlaku.', i: 'fa-boxes-stacked' },
    { q: 'Kenapa unduhan di WhatsApp kadang gagal?', a: 'Biasanya karena file bukan H.264 standar. Server merapikan video ke H.264 8-bit dan menaruh indeks di awal file, supaya penerima bisa langsung memutar tanpa menunggu penuh.', i: 'fa-circle-down' },
    { q: 'Apakah data saya aman?', a: 'File disimpan sementara lalu terhapus otomatis setelah kedaluwarsa atau setelah diklaim sekali.', i: 'fa-shield-halved' },
  ]

  return (
    <Sheet onClose={onClose} title="FAQ" kicker="PERTANYAAN UMUM">
      <div className="space-y-1.5 max-h-[62vh] overflow-y-auto scroll-hide">
        {faqs.map((f, i) => (
          <div key={f.q} className={`border-2 border-[var(--edge)] transition-[background-color] duration-200 ${open === i ? 'bg-[var(--paper-2)]' : 'bg-transparent'}`}>
            <button onClick={() => setOpen(open === i ? -1 : i)}
              className="w-full flex items-center gap-2.5 px-3 py-3 text-left"
              aria-expanded={open === i}>
              <span className={`w-7 h-7 shrink-0 grid place-items-center border-2 border-[var(--edge)] transition-colors duration-200 ${open === i ? 'bg-[var(--accent)] text-[#06180d]' : ''}`}>
                <i className={`fa-solid ${f.i} text-[9px]`} />
              </span>
              <span className="flex-1 font-bold text-[12px] leading-snug">{f.q}</span>
              <i className={`fa-solid fa-plus text-[10px] shrink-0 transition-transform duration-300 ${open === i ? 'rotate-45' : ''}`} />
            </button>
            <div className={`grid transition-[grid-template-rows] duration-300 ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              style={{ transitionTimingFunction: 'var(--ease)' }}>
              <div className="overflow-hidden">
                <p className="px-3 pb-3 pl-[52px] text-[11px] leading-[1.65] text-[var(--ink-2)]">{f.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  )
}

/* ══════════════════════════════════════════════════════════════
   TENTANG
   ══════════════════════════════════════════════════════════════ */
export function AboutModal({ onClose, settings }) {
  return (
    <Sheet onClose={onClose} title="Tentang" kicker="INFORMASI">
      <div className="plate-sunk p-4 text-center">
        <span className="badge-h inline-grid! w-14 h-14 !border-[3px] !rounded-[var(--r-soft)] stack-shadow">
          <span className="text-[22px] leading-none relative z-[2]">H</span>
        </span>
        <p className="display-m !text-[18px] mt-3">SWHDHLZ</p>
        <p className="kicker mt-1.5">DEVELOPED BY HILLZ</p>
      </div>

      <p className="text-[12px] leading-[1.65] text-[var(--ink-2)] mt-4">
        Upload media ke grup WhatsApp via bot. Upload file, dapatkan kode klaim, lalu kirim{' '}
        <code className="inline-block align-middle font-[family-name:var(--font-mono)] text-[11px] leading-[15px] px-1.5 py-[2px] rounded-[var(--r-xs)] border-2 border-[var(--edge)] bg-[var(--accent)] text-[#06180d]">.claim KODE</code>{' '}
        di grup.
      </p>

      <div className="grid grid-cols-3 gap-1.5 mt-4">
        {[
          { i: 'fa-bolt', t: 'CEPAT' },
          { i: 'fa-lock', t: 'AMAN' },
          { i: 'fa-hand-sparkles', t: 'MUDAH' },
        ].map(f => (
          <div key={f.t} className="flex flex-col items-center gap-1.5 py-3 rounded-[var(--r-soft)] border-2 border-[var(--edge)] bg-[var(--paper-2)]">
            <i className={`fa-solid ${f.i} text-[12px]`} />
            <span className="kicker !text-[8px]">{f.t}</span>
          </div>
        ))}
      </div>

      <div className="ticket !py-2.5 mt-4">
        <span className="ticket-notch" />
        <i className="fa-solid fa-shield-halved text-[11px] shrink-0" />
        <span className="text-[11px] leading-snug">File tersimpan sementara — terhapus otomatis setelah kedaluwarsa.</span>
      </div>

      {settings?.footerText && (
        <p className="kicker !text-[8px] text-center mt-4">{settings.footerText}</p>
      )}
    </Sheet>
  )
}
