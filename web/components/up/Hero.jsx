'use client'
import { useTilt } from '@/lib/motion'

/* ══════════════════════════════════════════════════════════════
   HERO — logo 3D ekstrusi (tumpukan lapisan translateZ, jadi
   ketebalannya nyata saat diputar) + rangka media untuk GIF.
   GIF dipasang lewat <img>, TANPA filter/transform di elemen img
   itu sendiri: beberapa browser mobile menghentikan animasi GIF
   kalau elemennya jadi lapisan komposit.
   ══════════════════════════════════════════════════════════════ */

function WaGlyph() {
  /* Glyph WhatsApp RESMI — satu path tunggal dari Simple Icons (fill-rule
     evenodd bikin gelembung solid dengan handset di-knock-out, persis mark
     aslinya). Versi lama pakai 2 path outline sehingga terbaca sebagai
     line-art, bukan logo solid. JANGAN diganti gambar tangan. */
  return (
    <svg viewBox="0 0 24 24" className="logo3d-glyph" aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}


export default function Hero({ settings }) {
  const tilt = useTilt(16)
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

        <div className="stage-3d shrink-0" style={{ paddingBottom: 18 }}>
          <div className="logo3d" ref={tilt.ref} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
            <span className="logo3d-face"><WaGlyph /></span>
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
          <p className="text-[14px] leading-[1.6] text-[var(--ink-2)] whitespace-pre-line max-w-[42ch]">
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
            <span className="corner-mark" style={{ top: -2, left: -2 }} />
            <span className="corner-mark" style={{ top: -2, right: -2 }} />
            <span className="corner-mark" style={{ bottom: -2, left: -2 }} />
            <span className="corner-mark" style={{ bottom: -2, right: -2 }} />
            <img src={media} alt={(settings?.siteName || 'SWHDHLZ') + ' — pratinjau' } />
            {gif && (
              <span className="absolute bottom-2 left-2 z-[2] sticker sticker-flat !text-[8px] !py-[2px]">
                GIF
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
