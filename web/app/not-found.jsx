/* ══════════════════════════════════════════════════════════════
   404 — halaman tidak ditemukan.

   Sebelumnya berkas ini tidak ada, jadi Next.js memakai halaman bawaannya:
   teks hitam "404 | This page could not be found" di atas putih, font sistem,
   berbahasa Inggris, tanpa satu pun token desain situs ini.

   Semua yang dipakai di sini milik sistem yang sudah ada — `.plate`, `.btn`,
   `.rule`, `.kicker`, `.bg-wa`, `.badge-h`, `--r`, `--edge` — supaya halaman
   galat tidak jadi pulau desain sendiri. Tidak ada nilai warna/radius/bayangan
   yang ditulis ulang di berkas ini.

   Server component (tanpa 'use client'): halaman ini tidak butuh state, dan
   `output: 'export'` merendernya jadi `404.html` statis yang lalu disajikan
   oleh `web-uploader.js` untuk semua jalur nyasar ber-Accept text/html.
   Mode terang/gelap sudah diurus THEME_BOOT di layout.jsx sebelum paint.
   ══════════════════════════════════════════════════════════════ */
import WaMark from '@/components/up/WaMark'

export const metadata = {
  title: 'Halaman tidak ada — SHIROWAHD',
}

export default function NotFound() {
  return (
    <>
      {/* Lapisan latar yang sama dengan halaman utama (`app/page.jsx`).
          Tanpa ini, 404 muncul di atas warna body kosong sementara halaman
          lain punya kertas bertitik + grain + vignette — pindah halaman jadi
          terasa seperti pindah situs. Ketiganya `position: fixed` dan
          `pointer-events: none`, jadi tidak menambah tinggi dokumen. */}
      <div className="bg-field" />
      <div className="bg-grain" />
      <div className="bg-vignette" />

      {/* min-h-dvh + justify-center: plate duduk di tengah tinggi layar, bukan
          menempel di atas dengan 356px ruang kosong menggantung di bawahnya
          (angka terukur pada viewport 1440x900 sebelum perubahan ini). */}
      <div className="relative z-10 min-h-dvh flex flex-col justify-center">
        {/* `max-w-[720px]` ditulis persis seperti di `app/page.jsx` supaya
            kolomnya identik dengan halaman utama. Catatan hasil ukur: nilai
            itu KALAH dari `.wrap { max-width: 1080px }` — utility Tailwind
            berada di layer, aturan `.wrap` tidak, jadi yang menang 1080px.
            Perilakunya sama di halaman utama (terukur sama-sama 1080px), jadi
            dibiarkan konsisten daripada memaksa 404 jadi satu-satunya halaman
            berkolom 720px. */}
        <main className="wrap px-4 py-10 md:py-16 max-w-[720px]">
          <div className="plate p-6 md:p-10 relative overflow-hidden">
            {/* Angka raksasa sebagai latar, bukan teks yang dibaca ulang oleh
                pembaca layar — judul di bawah sudah menyebut 404 sekali.
                `overflow-hidden` di plate yang memotong luberannya. */}
            <span
              aria-hidden
              className="pointer-events-none select-none absolute -top-6 -right-2 md:-top-10 md:right-2
                         font-[family-name:var(--font-display)] leading-none
                         text-[38vw] md:text-[220px] text-[var(--ink)] opacity-[0.055]"
            >
              404
            </span>

            <div className="relative">
              {/* `.kicker` — kelas eyebrow yang sudah dipakai di seluruh situs
                  (mono 10px, tracking 0.22em, --ink-2). Sebelumnya baris ini
                  saya tulis manual dengan font/tracking/warna sendiri: sama
                  secara visual, tapi jadi salinan token yang bisa melenceng
                  kalau nilai aslinya berubah. */}
              <p className="kicker">Galat 404</p>

              <h1 className="font-[family-name:var(--font-display)] leading-[0.92] mt-2
                             text-[clamp(34px,11vw,68px)]">
                HALAMAN INI
                <br />
                <span className="text-[var(--acid)]">TIDAK ADA</span>
              </h1>

              <p className="text-[var(--ink-2)] mt-4 max-w-[52ch] text-sm md:text-base">
                Tautannya mungkin sudah kedaluwarsa, atau alamatnya salah ketik.
                Kode klaim upload memang punya masa berlaku — kalau kode kamu
                sudah lewat batas, mintakan yang baru dengan mengunggah ulang.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 mt-7">
                <a href="/" className="btn btn-primary no-underline">
                  <i className="fa-solid fa-arrow-left mr-2" aria-hidden />
                  Balik ke halaman utama
                </a>
                <a href="/#upload" className="btn btn-quiet no-underline">
                  <i className="fa-solid fa-cloud-arrow-up mr-2" aria-hidden />
                  Upload media
                </a>
              </div>

              {/* Baris bawah memakai plat WhatsApp yang sama dengan
                  hero/navbar — satu logo, satu sumber (WaMark), bukan ikon
                  font yang kurus. Badge H ikut hadir karena pasangan "logo WA
                  + badge H" adalah tanda tangan situs ini; halaman galat tidak
                  dikecualikan.
                  `.rule` = pemisah 2px yang sudah ada di globals.css.
                  Percobaan pertama saya menulis `.hair`, kelas yang tidak
                  pernah ada, jadi pemisahnya tak akan tampak sama sekali. */}
              <div className="rule mt-8 mb-5" />
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="bg-wa grid place-items-center w-9 h-9 shrink-0">
                  <WaMark className="w-[19px] h-[19px] fill-white relative z-[1]" />
                </span>
                <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--ink-2)]">
                  Media tetap dikirim lewat bot WhatsApp
                </span>
                <span className="flex items-center gap-2 ml-auto">
                  <span className="badge-h w-[17px] h-[17px] !border text-[9px]">H</span>
                  <span className="kicker !text-[9px]">BY HILLZ</span>
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
