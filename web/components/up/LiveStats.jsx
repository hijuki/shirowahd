'use client'
import { useEffect, useState, useRef } from 'react'
import { fmtSize } from '@/lib/up-api'
import { useCountUp } from '@/lib/motion'

/* ══════════════════════════════════════════════════════════════
   STATISTIK — bukan tiga angka telanjang.
   1. Grafik batang 24 jam (data nyata dari /api/activity/public)
   2. Sparkline byte per jam (path SVG digambar sekali)
   3. Feed aktivitas anonim (jenis file + ukuran + waktu)
   4. Gauge penyimpanan kalau admin memasang kuota

   Judul yang tampil ke pengunjung dulu "Telemetri" — istilah teknis
   yang tidak dipakai di bagian lain situs. Sekarang "Statistik".
   ══════════════════════════════════════════════════════════════ */

function timeShort(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'baru'
  if (s < 3600) return Math.floor(s / 60) + 'm'
  if (s < 86400) return Math.floor(s / 3600) + 'j'
  return Math.floor(s / 86400) + 'h'
}

const KIND = {
  video: { i: 'fa-film', l: 'VIDEO' },
  image: { i: 'fa-image', l: 'FOTO' },
  bundle: { i: 'fa-layer-group', l: 'BUNDLE' },
}

/* Sparkline: satu path dari deret byte per jam.
   Isian pakai gradien (defs) supaya bidangnya meluruh ke bawah dan garisnya
   tetap jadi subjek; titik nilai terakhir dipasang sebagai elemen DOM di luar
   SVG karena `preserveAspectRatio="none"` akan memipihkan <circle> jadi elips. */
function Spark({ series }) {
  const W = 300, H = 46
  const max = Math.max(1, ...series)
  const pts = series.map((v, i) => {
    const x = (i / Math.max(1, series.length - 1)) * W
    const y = H - (v / max) * (H - 6) - 3
    return [x, y]
  })
  const line = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ')
  const area = line + ` L${W} ${H} L0 ${H} Z`
  const last = pts[pts.length - 1] || [W, H]
  // Titik akhir diposisikan dalam PERSEN tinggi, bukan piksel viewBox — itu satu
  // -satunya cara agar dia tetap menempel di garis setelah SVG direntang.
  const topPct = (last[1] / H) * 100
  return (
    <div className="spark-wrap">
      <svg className="spark w-full h-[46px]" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="sparkFade" x1="0" y1="0" x2="0" y2="1">
            <stop className="spark-stop-a" offset="0%" />
            <stop className="spark-stop-b" offset="100%" />
          </linearGradient>
        </defs>
        <path className="spark-area" d={area} />
        <path className="spark-draw" d={line} />
      </svg>
      <span className="spark-dot" style={{ top: `${topPct}%` }} />
    </div>
  )
}

export default function LiveStats() {
  const [d, setD] = useState(null)
  const [err, setErr] = useState(false)
  const [tick, setTick] = useState(0)
  const seen = useRef(false)

  useEffect(() => {
    let alive = true
    const pull = async () => {
      try {
        const [aRes, sRes] = await Promise.all([
          fetch('/api/activity/public?_t=' + Date.now(), { cache: 'no-store' }),
          fetch('/api/stats/public?_t=' + Date.now(), { cache: 'no-store' }),
        ])
        const a = aRes.ok ? await aRes.json() : null
        const s = sRes.ok ? await sRes.json() : null
        if (!alive) return
        if (a?.ok) { setD({ ...a, direct: !!s?.directReady, today: s?.totalToday ?? a.uploadsToday }); seen.current = true }
        else if (!seen.current) setErr(true)
      } catch { if (!seen.current && alive) setErr(true) }
    }
    pull()
    const iv = setInterval(pull, 15000)
    const tv = setInterval(() => setTick(t => t + 1), 30000) // segarkan label "baru/5m"
    return () => { alive = false; clearInterval(iv); clearInterval(tv) }
  }, [])

  const today = useCountUp(d?.today ?? 0)
  const active = useCountUp(d?.totalActive ?? 0)

  if (err) return null

  if (!d) {
    // Skeleton yang MENIRU susunan aslinya: 3 angka ringkas + grafik 24 batang.
    // Dua balok abu sebelumnya tidak memberi tahu apa pun tentang isi yang akan
    // datang, jadi pergantian skeleton → data terasa seperti layout melompat.
    return (
      <section className="plate plate-seam" aria-busy="true" aria-label="Memuat statistik">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="sk sk-tile w-8 h-8 shrink-0" />
            <div className="min-w-0 space-y-1.5">
              <span className="sk sk-line block w-[84px] h-[13px]" />
              <span className="sk sk-line block w-[56px] h-[8px]" style={{ '--d': '90ms' }} />
            </div>
          </div>
          <span className="chip"><span className="dot-live" />LIVE</span>
        </div>
        <div className="rule-dash mx-4" />
        <div className="grid grid-cols-3 split-x border-b-2 border-[var(--edge)]">
          {/* Tinggi placeholder disamakan dengan sel nyata (pt-3 pb-[26px] +
              angka 34px) supaya pergantian skeleton → data tidak menggeser
              grafik di bawahnya. */}
          {[0, 1, 2].map(i => (
            <div key={i} className="px-3 pt-3 pb-[26px] space-y-1.5">
              <span className="sk sk-line block w-[40px] h-[8px]" style={{ '--d': `${i * 70}ms` }} />
              <span className="sk sk-line block w-[52px] h-[28px]" style={{ '--d': `${i * 70 + 40}ms` }} />
              <span className="sk sk-line block w-[34px] h-[8px]" style={{ '--d': `${i * 70 + 80}ms` }} />
            </div>
          ))}
        </div>
        <div className="px-4 pt-4 pb-4">
          <div className="flex items-baseline justify-between mb-2">
            <span className="kicker opacity-55">UPLOAD / JAM</span>
            <span className="sk sk-line w-[48px] h-[8px]" />
          </div>
          {/* Tinggi batang bervariasi supaya terbaca sebagai grafik yang sedang
              dimuat, bukan sebagai deretan balok seragam. */}
          <div className="bars">
            {Array.from({ length: 24 }).map((_, i) => (
              <span key={i} className="bar">
                <span className="sk block w-full rounded-[var(--r-xs)]"
                  style={{ height: `${18 + ((i * 37) % 62)}%`, '--d': `${i * 34}ms` }} />
              </span>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const peak = Math.max(1, ...d.buckets)
  const now = new Date()
  const hourLabel = h => String((now.getHours() - (23 - h) + 24) % 24).padStart(2, '0')

  return (
    <section className="plate plate-seam" id="statistik" data-reveal="">
      {/* ── Kepala ── */}
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="icon-tile !w-8 !h-8">
            <i className="fa-solid fa-chart-column text-[12px]" />
          </span>
          <div className="min-w-0">
            {/* Judul dinaikkan 15→17px dan diberi jarak huruf negatif: pada 15px
                Archivo Black, judul panel berbobot sama dengan chip LIVE di
                sebelahnya, jadi hierarkinya rata. */}
            <p className="display-m !text-[17px] !tracking-[-0.02em]">Statistik</p>
            <p className="kicker !text-[9px] mt-[3px]">24 JAM TERAKHIR</p>
          </div>
        </div>
        <span className="chip"><span className="dot-live" />LIVE</span>
      </div>

      <div className="rule-dash mx-4" />

      {/* ── Angka ringkas: 3 kolom, tetap ada tapi bukan satu-satunya ──
          Ukuran & font diatur lewat `.stat-num` / `.stat-num-word`, BUKAN
          utility Tailwind. Versi sebelumnya menulis `data
          font-[family-name:var(--font-display)]` dan font efektifnya terukur
          JetBrains Mono — `.data` ada di luar @layer sehingga menang atas
          utility. Satu kelas = satu sumber kebenaran. */}
      <div className="grid grid-cols-3 split-x border-b-2 border-[var(--edge)]">
        {[
          { k: 'HARI INI', v: today, s: 'upload', hot: today > 0 },
          { k: 'AKTIF', v: active, s: 'kode', hot: active > 0 },
          { k: 'JALUR', v: d.direct ? '100MB+' : 'STANDAR', s: d.direct ? 'aktif' : 'normal', wide: true, hot: !!d.direct },
        ].map(c => (
          <div key={c.k} className="stat-cell px-3 pt-3 pb-[26px]" data-hot={c.hot ? '1' : '0'}>
            <p className="kicker !text-[8px]">{c.k}</p>
            <p className={`mt-1.5 ${c.wide ? 'stat-num-word' : 'stat-num'}`}>{c.v}</p>
            <p className="kicker !text-[8px] !tracking-[0.1em] mt-[5px]">{c.s}</p>
          </div>
        ))}
      </div>

      {/* ── Grafik batang per jam ── */}
      <div className="px-4 pt-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="kicker">UPLOAD / JAM</span>
          <span className="kicker !text-[9px]">PUNCAK {peak}</span>
        </div>
        <div className="bars">
          {d.buckets.map((v, i) => (
            <span key={i} className={`bar ${i === 23 ? 'bar-now' : ''}`} style={{ animationDelay: i * 18 + 'ms' }}
              title={`${hourLabel(i)}:00 — ${v} upload`}>
              <span className="bar-fill" style={{ height: Math.max(v > 0 ? 12 : 0, (v / peak) * 100) + '%' }} />
            </span>
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          {[0, 6, 12, 18, 23].map(h => (
            <span key={h} className="kicker !text-[8px]">{hourLabel(h)}</span>
          ))}
        </div>
      </div>

      {/* ── Sparkline volume ── */}
      <div className="px-4 pt-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="kicker">VOLUME DATA</span>
          <span className="data text-[11px]">{fmtSize(d.bytes.reduce((a, b) => a + b, 0))}</span>
        </div>
        <div className="plate-sunk px-1 pt-1">
          <Spark series={d.bytes} />
        </div>
      </div>

      {/* Gauge PENYIMPANAN dihapus dari halaman publik.
          Alasan: itu metrik kapasitas server (dulu tampil "0 B / 100000 MB"),
          bukan informasi yang berguna bagi pengunjung, dan membocorkan ukuran
          infrastruktur. Angkanya juga menyesatkan — file dihapus otomatis, jadi
          meter selalu ~0 sementara feed menunjukkan puluhan MB. Tetap ada di
          panel admin. */}

      {/* ── Feed aktivitas ── */}
      {d.events?.length > 0 && (
        <div className="mt-4 border-t-2 border-[var(--edge)] rounded-b-[14px] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper-2)] border-b-2 border-[var(--edge)]">
            <span className="kicker">ALIRAN AKTIVITAS</span>
            <span className="kicker !text-[8px]">ANONIM</span>
          </div>
          <div className="max-h-[196px] overflow-y-auto scroll-hide">
            {d.events.map((e, i) => {
              const k = KIND[e.kind] || KIND.video
              return (
                <div key={e.t + '-' + i} className="logline" style={{ animationDelay: Math.min(i, 8) * 45 + 'ms' }}>
                  <span className="flex items-center gap-2">
                    <i className={`fa-solid ${k.i} text-[10px] opacity-70`} />
                    <span className="font-bold tracking-[0.08em] text-[9px]">{k.l}</span>
                  </span>
                  <span className="truncate opacity-70">
                    {e.ext}{e.count > 1 ? ` ×${e.count}` : ''} · {fmtSize(e.size)}
                  </span>
                  <span className="opacity-50 text-[10px]">{timeShort(e.t)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
