'use client'
import { useTilt } from '@/lib/motion'
import WaMark from './WaMark'

/* ══════════════════════════════════════════════════════════════
   HERO — logo ekstrusi + rangka media (mendukung GIF).
   Ekstrusi sekarang 11px pada muka 104px (10.6%). Versi sebelumnya
   29px pada 118px (24.6%) dan memakan 41% lebar baris: itu yang
   terbaca "3D dipaksa". Perbandingannya, bukan tekniknya, yang salah.
   GIF dipasang lewat <img> tanpa filter/transform di elemen img itu
   sendiri — beberapa browser mobile menghentikan animasi GIF kalau
   elemennya dipromosikan jadi lapisan komposit.
   ══════════════════════════════════════════════════════════════ */

export default function Hero({ settings }) {
  const tilt = useTilt(9)
  const gif = settings?.heroGifUrl || ''
  const still = settings?.heroImageUrl || ''
  const media = gif || still
  const title = settings?.heroTitle || 'KIRIM MEDIA'
  const highlight = settings?.heroSubtitle || 'TANPA TURUN MUTU'
  const desc = settings?.heroDesc || 'Upload video atau foto, ambil kode klaim, tempel di grup WhatsApp. Bot yang mengirim filenya.'

  return (
    <header className="relative">
      {/* ── Baris atas: penanda + logo 3D ── */}
      <div className="flex items-start justify-between gap-4 pt-7 pb-5">
        <div className="min-w-0">
          {/* Badge versi dihapus atas permintaan user ("versi nya ilangin aja dh ganggu"). */}
          <p className="kicker mt-3 max-w-[190px] leading-[1.5]">
            KODE KLAIM SEKALI PAKAI · HAPUS OTOMATIS
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
          {/* Kalimat ini yang menjelaskan produk, jadi ia harus menang atas
              chip di bawahnya: 14px abu → 15px tinta penuh. `text-wrap: pretty`
              mencegah satu kata tertinggal sendiri di baris terakhir. */}
          <p className="text-[15px] leading-[1.55] text-[var(--ink)] whitespace-pre-line max-w-[40ch] [text-wrap:pretty]">
            {desc}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="chip"><i className="fa-solid fa-bolt text-[9px]" />H.264 STREAM COPY</span>
            <span className="chip"><i className="fa-solid fa-gauge-high text-[9px]" />FPS ASLI</span>
            <span className="chip">
              <span className="badge-h w-[18px] h-[18px] -ml-1 !border text-[9px]">H</span>
              BY HILLZ
            </span>
          </div>
        </div>

        {media && (
          <div className="media-frame aspect-[4/3] sm:aspect-[5/4]" data-reveal="" style={{ '--rd': '150ms' }}>
            {/* Kurung sudut, bukan kotak hijau isi — lihat catatan .corner-mark. */}
            <span className="corner-mark" data-c="tl" style={{ top: 6, left: 6 }} />
            <span className="corner-mark" data-c="tr" style={{ top: 6, right: 6 }} />
            <span className="corner-mark" data-c="bl" style={{ bottom: 6, left: 6 }} />
            <span className="corner-mark" data-c="br" style={{ bottom: 6, right: 6 }} />
            {/* Stiker "GIF" dihapus: kalau yang dipasang memang GIF, gerakannya
                sendiri sudah memberi tahu. Menempelkan katanya cuma memberi
                label teknis pada karya. */}
            <img src={media} alt={(settings?.siteName || 'SWHDHLZ') + ' — pratinjau' }
              /* GIF tidak boleh dipromosikan jadi lapisan komposit di iOS —
                 animasinya berhenti. Karena itu tidak ada filter/transform di
                 <img>; semua dekorasi ada di rangka pembungkusnya. */
              loading="eager" decoding="async" />
          </div>
        )}
      </div>
    </header>
  )
}
