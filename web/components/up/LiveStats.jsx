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
  const W = 300, H = 52
  const max = Math.max(1, ...series)
  const pts = series.map((v, i) => {
    const x = (i / Math.max(1, series.length - 1)) * W
    const y = H - (v / max) * (H - 8) - 4
    return [x, y]
  })
  
  // Smooth Bezier Curve Path
  let line = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const xMid = ((pts[i][0] + pts[i + 1][0]) / 2).toFixed(1)
    const yMid = ((pts[i][1] + pts[i + 1][1]) / 2).toFixed(1)
    const cpX1 = ((xMid + pts[i][0]) / 2).toFixed(1)
    const cpX2 = ((xMid + pts[i + 1][0]) / 2).toFixed(1)
    line += ` Q ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)} ${xMid} ${yMid}`
  }
  const lastPt = pts[pts.length - 1]
  line += ` L ${lastPt[0].toFixed(1)} ${lastPt[1].toFixed(1)}`

  const area = line + ` L${W} ${H} L0 ${H} Z`
  const topPct = (lastPt[1] / H) * 100

  return (
    <div className="spark-wrap relative overflow-hidden rounded-[8px] bg-gradient-to-b from-transparent to-[var(--accent)]/[0.04]">
      <svg className="spark w-full h-[52px]" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="sparkNeon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkNeon)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="spark-dot shadow-[0_0_8px_var(--accent)]" style={{ top: `${topPct}%`, backgroundColor: 'var(--accent)' }} />
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

      {/* ── Angka ringkas: 3 kolom dengan kontras cerah & aksen dinamis ── */}
      <div className="grid grid-cols-3 split-x border-b-2 border-[var(--edge)] bg-[var(--paper-2)]">
        {[
          { k: 'HARI INI', v: today, s: 'upload', hot: today > 0, col: 'var(--accent)', icon: 'fa-bolt' },
          { k: 'AKTIF', v: active, s: 'kode', hot: active > 0, col: 'var(--volt)', icon: 'fa-circle-check' },
          { k: 'JALUR', v: d.direct ? '100MB+' : 'STANDAR', s: d.direct ? 'cepat' : 'stabil', wide: true, hot: !!d.direct, col: '#ffb020', icon: 'fa-network-wired' },
        ].map(c => (
          <div key={c.k} className="stat-cell px-3 pt-3 pb-[22px] flex flex-col justify-between" data-hot={c.hot ? '1' : '0'}>
            <div className="flex items-center justify-between">
              <p className="kicker !text-[8px]">{c.k}</p>
              {c.hot && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-ping" />}
            </div>
            <p className={`mt-1 font-bold ${c.wide ? 'stat-num-word' : 'stat-num'} ${c.hot ? '!text-[var(--accent)]' : 'text-[var(--ink)]'}`}>
              {c.v}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`kicker !text-[8px] !tracking-[0.1em] font-mono ${c.hot ? '!text-[var(--accent)]' : '!text-[var(--ink-2)]'}`}>
                {c.s}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Grafik batang per jam: Neobrutalism bars dengan border & neon accents ── */}
      <div className="px-4 pt-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="kicker font-bold text-[var(--ink)] flex items-center gap-1.5">
            <i className="fa-solid fa-chart-column text-[10px] text-[var(--accent)]" />
            UPLOAD / JAM
          </span>
          <span className="kicker !text-[9px] font-mono px-2 py-0.5 rounded bg-[var(--paper-2)] border border-[var(--edge)]">
            PUNCAK: <strong className="text-[var(--accent)]">{peak}</strong>
          </span>
        </div>
        <div className="bars border-b-2 border-[var(--edge)] pb-1">
          {d.buckets.map((v, i) => {
            const isNow = i === 23
            const pct = Math.max(v > 0 ? 15 : 6, (v / peak) * 100)
            return (
              <span key={i} className={`bar border border-[var(--edge)] rounded-t-[4px] relative overflow-hidden ${isNow ? 'bg-[var(--accent)]/10 ring-1 ring-[var(--accent)]' : 'bg-[var(--sunk)]'}`}
                title={`${hourLabel(i)}:00 — ${v} upload`}>
                <span
                  className={`bar-fill transition-all duration-300 rounded-t-[3px] ${isNow ? '!bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]' : v > 0 ? '!bg-[var(--ink)]' : '!bg-transparent'}`}
                  style={{ height: `${pct}%` }}
                >
                  {v > 0 && <span className="absolute top-0 inset-x-0 h-1 bg-white/40 rounded-t-[2px]" />}
                </span>
              </span>
            )
          })}
        </div>
        <div className="flex justify-between mt-2">
          {[0, 6, 12, 18, 23].map(h => (
            <span key={h} className={`kicker !text-[8px] font-mono ${h === 23 ? '!text-[var(--accent)] font-bold' : ''}`}>
              {hourLabel(h)}:00
            </span>
          ))}
        </div>
      </div>

      {/* ── Sparkline volume: Smooth Bezier Glow & Neon ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="kicker font-bold text-[var(--ink)] flex items-center gap-1.5">
            <i className="fa-solid fa-wave-square text-[10px] text-[var(--volt)]" />
            VOLUME DATA
          </span>
          <span className="data text-xs font-mono font-bold text-[var(--accent)] bg-[var(--paper-2)] px-2 py-0.5 rounded border border-[var(--edge)]">
            {fmtSize(d.bytes.reduce((a, b) => a + b, 0))}
          </span>
        </div>
        <div className="plate-sunk p-1 border-2 border-[var(--edge)] rounded-[var(--r-soft)] shadow-inner">
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
        <div className="mt-3 border-t-2 border-[var(--edge)] rounded-b-[14px] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper-2)] border-b-2 border-[var(--edge)]">
            <span className="kicker font-bold text-[var(--ink)] flex items-center gap-1.5">
              <i className="fa-solid fa-list-check text-[10px] text-[var(--accent)]" />
              ALIRAN AKTIVITAS
            </span>
            <span className="kicker !text-[8px] font-mono px-2 py-0.5 rounded bg-[var(--sunk)] border border-[var(--edge)]">
              REALTIME
            </span>
          </div>
          <div className="max-h-[220px] overflow-y-auto scroll-hide divide-y divide-[var(--edge)]/20">
            {d.events.map((e, i) => {
              const k = KIND[e.kind] || KIND.video
              return (
                <div key={e.t + '-' + i} className="flex items-center justify-between px-3 py-2 bg-[var(--paper)] hover:bg-[var(--sunk)] transition-colors text-xs font-mono">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded grid place-items-center bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30 shrink-0">
                      <i className={`fa-solid ${k.i} text-[10px]`} />
                    </span>
                    <span className="font-bold text-[var(--ink)] truncate max-w-[120px] sm:max-w-[180px]">
                      {e.ext}{e.count > 1 ? ` ×${e.count}` : ''}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--volt)]/10 text-[var(--volt)] font-bold shrink-0">
                      {fmtSize(e.size)}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--ink-2)] shrink-0 font-mono">
                    {timeShort(e.t)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
