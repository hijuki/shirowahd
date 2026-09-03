'use client'
import { useEffect, useRef, useState } from 'react'
import { useTilt, useThemeName } from '@/lib/motion'
import WaMark from './WaMark'

/* ══════════════════════════════════════════════════════════════
   HERO — logo ekstrusi + rangka media dua-mode.

   Aset hero punya PASANGAN: terang & gelap, diatur dari admin. Kalau
   pasangan gelap kosong, aset terang dipakai di kedua mode — jadi fitur
   ini tidak memaksa admin mengisi dua-duanya.

   Pertukarannya cross-fade, bukan ganti `src` mentah: mengubah src
   membuat gambar hilang sesaat (dekode ulang) lalu muncul mengagetkan.
   Dua <img> ditumpuk, yang aktif opacity 1 — GIF pasangan sudah
   ter-dekode sehingga pertukaran tidak pernah menampilkan bingkai kosong.
   ══════════════════════════════════════════════════════════════ */

export default function Hero({ settings }) {
  const tilt = useTilt(9)
  const theme = useThemeName()
  const isDark = theme === 'dark'

  const lightSrc = settings?.heroGifUrl || settings?.heroImageUrl || ''
  const darkRaw = settings?.heroGifUrlDark || settings?.heroImageUrlDark || ''
  /* Fallback searah: gelap kosong → pakai terang. Tidak sebaliknya, karena
     terang adalah default semua pengunjung dan harus selalu terisi. */
  const darkSrc = darkRaw || lightSrc
  const punyaPasangan = !!darkRaw && darkRaw !== lightSrc
  const aktif = isDark ? darkSrc : lightSrc

  const title = settings?.heroTitle || 'KIRIM MEDIA'
  const highlight = settings?.heroSubtitle || 'TANPA TURUN MUTU'
  const desc = settings?.heroDesc || 'Upload video atau foto, ambil kode klaim, tempel di grup WhatsApp. Bot yang mengirim filenya.'

  /* Saat aset benar-benar bertukar, rangka diberi kelas pemicu sekali pakai
     supaya ada kilas halus — dibersihkan di onAnimationEnd, tidak lewat
     key={} (remount membuang <img> yang sudah ter-dekode). */
  const frameRef = useRef(null)
  const [pernah, setPernah] = useState(false)
  useEffect(() => {
    if (!pernah) { setPernah(true); return }
    const el = frameRef.current
    if (!el || !punyaPasangan) return
    el.classList.add('media-swap')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark])

  return (
    <header className="relative">
      {/* ── Baris atas: penanda + logo 3D ── */}
      <div className="flex items-start justify-between gap-4 pt-7 pb-5">
        <div className="min-w-0">
          {/* Dulu di sini "KODE KLAIM SEKALI PAKAI / HAPUS OTOMATIS" — terukur
              PERSIS sama dengan 2 dari 5 item ticker yang berjalan di navbar
              tepat di atasnya. Mengulang kalimat yang sama dua kali dalam 40px
              membuat hero terbaca berantakan. Eyebrow sekarang menyebut apa
              yang TIDAK dikatakan ticker. */}
          <p className="kicker mt-3 max-w-[190px] leading-[1.55]">
            UNTUK STATUS &amp; STORY
            <span className="block opacity-60">KUALITAS ASLI</span>
          </p>
        </div>

        <div className="stage-3d shrink-0" style={{ paddingBottom: 10 }}>
          <div className="logo3d" ref={tilt.ref} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
            <span className="logo3d-face"><WaMark className="logo3d-glyph" /></span>
            <span className="logo3d-shadow" />
          </div>
        </div>
      </div>

      {/* ── Judul ── */}
      <h1 className="display-xl" data-reveal="">
        {title}
        <br />
        <span className="mark">{highlight}</span>
      </h1>

      <div className="rule mt-5" />

      {/* ── Deskripsi + rangka media ── */}
      <div className="grid gap-4 mt-5 sm:grid-cols-[1.1fr_1fr] sm:items-start">
        <div data-reveal="" style={{ '--rd': '80ms' }}>
          <p className="text-[15px] leading-[1.55] text-[var(--ink)] whitespace-pre-line max-w-[40ch] [text-wrap:pretty]">
            {desc}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="chip"><i className="fa-solid fa-bolt text-[9px]" />H.264 STREAM COPY</span>
            <span className="chip"><i className="fa-solid fa-gauge-high text-[9px]" />FPS ASLI</span>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span className="badge-h w-[17px] h-[17px] !border text-[9px]">H</span>
            <span className="kicker !text-[9px] opacity-70">BY HILLZ</span>
          </div>
        </div>

        {aktif && (
          <div ref={frameRef}
            className="media-frame aspect-[4/3] sm:aspect-[5/4]"
            data-reveal="" style={{ '--rd': '150ms' }}
            onAnimationEnd={(e) => { if (e.animationName === 'mediaSwap') e.currentTarget.classList.remove('media-swap') }}>
            <span className="corner-mark" data-c="tl" style={{ top: 6, left: 6 }} />
            <span className="corner-mark" data-c="tr" style={{ top: 6, right: 6 }} />
            <span className="corner-mark" data-c="bl" style={{ bottom: 6, left: 6 }} />
            <span className="corner-mark" data-c="br" style={{ bottom: 6, right: 6 }} />

            {/* Dua lapis: terang & gelap. Keduanya selalu di DOM supaya sudah
                ter-dekode sebelum dibutuhkan; hanya opacity yang berubah.
                Tidak ada filter/transform di <img> — iOS menghentikan animasi
                GIF pada elemen yang dipromosikan jadi lapisan komposit. */}
            <img className="media-layer" data-on={isDark ? '0' : '1'}
              src={lightSrc} alt={(settings?.siteName || 'SWHDHLZ') + ' — pratinjau'}
              loading="eager" decoding="async" />
            {punyaPasangan && (
              <img className="media-layer" data-on={isDark ? '1' : '0'}
                src={darkSrc} alt="" aria-hidden="true"
                loading="eager" decoding="async" />
            )}
          </div>
        )}
      </div>
    </header>
  )
}
