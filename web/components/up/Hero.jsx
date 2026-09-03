'use client'
import { useEffect, useRef, useState } from 'react'
import { useThemeName } from '@/lib/motion'

/* ══════════════════════════════════════════════════════════════
   HERO — baris meta + judul + rangka media dua-mode.

   Aset hero punya PASANGAN: terang & gelap, diatur dari admin. Kalau
   pasangan gelap kosong, aset terang dipakai di kedua mode — jadi fitur
   ini tidak memaksa admin mengisi dua-duanya.

   Pertukarannya cross-fade, bukan ganti `src` mentah: mengubah src
   membuat gambar hilang sesaat (dekode ulang) lalu muncul mengagetkan.
   Dua <img> ditumpuk, yang aktif opacity 1 — GIF pasangan sudah
   ter-dekode sehingga pertukaran tidak pernah menampilkan bingkai kosong.
   ══════════════════════════════════════════════════════════════ */

export default function Hero({ settings }) {
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

  /* Sel kanan baris meta membawa ANGKA NYATA dari settings, bukan hiasan.
     Sebelumnya di sini ada plat WhatsApp 72px — dan itu mark hijau KETIGA
     di layar (tile navbar 36px pada y=13, plat ini pada y=119, tombol chat
     di sudut bawah). Simbol yang sama tiga kali membuatnya berhenti
     menandakan apa pun; yang dua sudah cukup. */
  const maxMB = Number(settings?.maxFileSizeMB || 0)
  const sisiPanjang = Number(settings?.maxVideoLongSide || 0)
  const spesifikasi = [
    maxMB > 0 ? `MAKS ${maxMB}MB` : 'UKURAN BEBAS',
    sisiPanjang > 0 ? `HINGGA ${sisiPanjang}px` : 'RESOLUSI ASLI',
  ]

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
      {/* ── Baris meta ──
          Dulu: penanda di kiri (berakhir x=180) dan plat logo di kanan
          (mulai x=296) — 116px kosong di antaranya, 29.7% lebar layar,
          dengan puncak yang tidak sejajar (beda 12.5px). Dua benda di ujung
          berlawanan tanpa apa pun yang menghubungkan terbaca sebagai dua
          yatim, bukan satu baris.

          Sekarang garis putus-putus MENGISI jaraknya: celah yang sama
          berubah dari kelalaian menjadi interval yang terukur, dan kedua
          sel duduk di garis yang sama. */}
      <div className="flex items-start gap-3 pt-7 pb-4">
        <p className="kicker shrink-0 leading-[1.55]">
          UNTUK STATUS &amp; STORY
          <span className="block opacity-60">KUALITAS ASLI</span>
        </p>

        <span className="rule-dash flex-1 mt-[7px]" aria-hidden="true" />

        <p className="kicker data shrink-0 text-right leading-[1.55]">
          {spesifikasi[0]}
          <span className="block opacity-60">{spesifikasi[1]}</span>
        </p>
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
            {/* Lapisan terang hanya boleh dimatikan kalau ADA lapisan gelap yang
                menggantikannya. Tanpa penjaga `punyaPasangan`, mode gelap tanpa
                aset pasangan membuat satu-satunya lapisan ber-opacity 0 dan
                hero jadi kotak kosong. */}
            <img className="media-layer" data-on={(isDark && punyaPasangan) ? '0' : '1'}
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
