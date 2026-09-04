'use client'
import { useEffect, useState } from 'react'
import { getBots, saveBot, deleteBot, pairExtraBot, stopExtraBot, getPairState } from '@/lib/admin-api'

/**
 * Kartu Multi-Bot — beberapa nomor WA hidup bareng, tiap nomor bisa dimatikan
 * dan diberi ROLE yang benar-benar membatasi kategori perintah.
 *
 * Role di sini bukan label kosmetik: gerbangnya ada di `src/handler.js` satu
 * langkah sebelum plugin dijalankan, memakai `plugin.config.category`. Daftar
 * kategori diambil dari folder `plugins/` yang nyata, dikirim server lewat
 * `/admin/api/bots`.
 *
 * Bot utama tidak bisa dihapus (itu sesi induk di `storage/session`); yang bisa
 * dilakukan padanya hanya ganti role dan on/off.
 */
export default function Bots({ toast }) {
  const [data, setData] = useState(null)
  const [pair, setPair] = useState(null)
  const [busy, setBusy] = useState(false)
  const [nomorBaru, setNomorBaru] = useState('')
  const [labelBaru, setLabelBaru] = useState('')
  const [roleBaru, setRoleBaru] = useState('full')

  const muat = async () => {
    try { setData(await getBots()) } catch (e) { setData({ ok: false, error: e.message }) }
    try { setPair(await getPairState()) } catch { }
  }
  useEffect(() => {
    muat()
    const iv = setInterval(muat, 5000)
    return () => clearInterval(iv)
  }, [])

  const bots = data?.bots ? Object.values(data.bots) : []
  const roles = data?.roles || {}

  const ubah = async (bot, patch) => {
    setBusy(true)
    try {
      await saveBot({ id: bot.id, ...patch })
      toast('Tersimpan', 'success')
      muat()
    } catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  const tambah = async () => {
    const n = nomorBaru.replace(/\D/g, '')
    if (n.length < 10) return toast('Nomor minimal 10 digit', 'warn')
    setBusy(true)
    try {
      await pairExtraBot(n, labelBaru.trim() || n, roleBaru)
      toast('Pairing dimulai — kode akan muncul di bawah', 'success')
      setNomorBaru(''); setLabelBaru('')
      setTimeout(muat, 2000)
    } catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  const hapus = async (bot) => {
    if (!confirm(`Hapus bot ${bot.label}? Sesinya diputus.`)) return
    setBusy(true)
    try {
      await stopExtraBot(bot.nomor).catch(() => { })
      await deleteBot(bot.id)
      toast('Bot dihapus', 'success')
      muat()
    } catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  if (data && data.ok === false) {
    return (
      <div className="card p-6 md:p-8">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base mb-2">
          <i className="fa-solid fa-robot text-[var(--volt)] mr-2" />Bot Aktif
        </h2>
        <p className="text-[var(--ink-2)] text-sm">
          Bot utama belum jalan, jadi daftar bot belum bisa dibaca. Tautkan nomor di kartu Pairing dulu.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-6 md:p-8 space-y-5">
      <div>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base">
          <i className="fa-solid fa-robot text-[var(--volt)] mr-2" />Bot Aktif
        </h2>
        <p className="text-[var(--ink-2)] text-sm mt-1">
          Beberapa nomor bisa jalan bersamaan. Role membatasi kategori perintah yang boleh dipakai —
          bukan sekadar label.
        </p>
      </div>

      <div className="space-y-3">
        {bots.map(b => {
          const st = pair?.tambahan?.[b.nomor]
          const hidupUtama = b.utama && pair?.terhubung
          const hidupSub = st?.tahap === 'tersambung'
          const hidup = b.utama ? hidupUtama : hidupSub
          return (
            <div key={b.id} className="rounded-[14px] p-4 bg-[var(--paper-2)] border border-[var(--edge)] space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-[8px] h-[8px] rounded-full shrink-0"
                  style={{ background: hidup ? '#34d399' : '#7e90ad', animation: hidup ? 'pulseDot 1.7s infinite' : 'none' }} />
                <b className="text-sm">{b.label}</b>
                <span className="font-mono text-xs text-[var(--ink-2)]">
                  {b.utama ? (b.nomorAktif || b.nomor || 'belum ditautkan') : b.nomor}
                </span>
                {b.utama && <span className="chip px-2 py-0.5 text-[10px] bg-[var(--volt)]/15 text-[var(--volt)]">UTAMA</span>}
                {!b.aktif && <span className="chip px-2 py-0.5 text-[10px] bg-bad/15 text-bad">DIMATIKAN</span>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-[var(--ink-2)]" htmlFor={`role-${b.id}`}>Role</label>
                <select id={`role-${b.id}`} value={b.role} disabled={busy}
                  onChange={e => ubah(b, { role: e.target.value })}
                  className="min-h-10 rounded-[10px] px-3 py-2 bg-[var(--paper)] border border-[var(--edge)] text-sm outline-none">
                  {Object.entries(roles).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
                </select>

                <button onClick={() => ubah(b, { aktif: !b.aktif })} disabled={busy}
                  className={`min-h-10 rounded-[10px] px-3 py-2 text-sm border transition-all duration-[150ms] active:scale-[.97] ${b.aktif
                    ? 'bg-[var(--paper)] border-[var(--edge)]'
                    : 'bg-emerald-500/[.08] border-emerald-500/25 text-emerald-300 font-bold'}`}>
                  <i className={`fa-solid fa-power-off mr-1.5`} />{b.aktif ? 'Matikan' : 'Nyalakan'}
                </button>

                {!b.utama && (
                  <button onClick={() => hapus(b)} disabled={busy}
                    className="min-h-10 rounded-[10px] px-3 py-2 bg-bad/[.08] border border-bad/25 text-bad text-sm transition-all duration-[150ms] active:scale-[.97]">
                    <i className="fa-solid fa-trash mr-1.5" />Hapus
                  </button>
                )}
              </div>

              <p className="text-[var(--ink-2)] text-xs">
                {roles[b.role]?.kategori === null
                  ? 'Semua kategori perintah aktif.'
                  : `Kategori aktif: ${(roles[b.role]?.kategori || []).join(', ') || '—'}`}
              </p>

              {/* Kode pairing bot tambahan tampil di barisnya sendiri */}
              {!b.utama && st?.tahap === 'kode-siap' && st.kode && (
                <div className="rounded-[12px] p-3 bg-[var(--paper)] border border-[var(--volt)]/30 text-center">
                  <p className="text-[10px] font-bold tracking-[.2em] uppercase text-[var(--ink-2)]">Kode Pairing</p>
                  <p className="font-mono font-bold tabular-nums select-all text-2xl" style={{ color: 'var(--volt)', letterSpacing: '.08em' }}>
                    {st.kodeRapi || st.kode}
                  </p>
                  <p className="text-[var(--ink-2)] text-xs mt-1">Masukkan di HP nomor {b.nomor}</p>
                </div>
              )}
              {!b.utama && st?.tahap === 'diminta' && (
                <p className="text-xs text-[var(--ink-2)]"><i className="fa-solid fa-spinner fa-spin mr-1.5" />Meminta kode…</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Tambah bot */}
      <div className="rounded-[14px] p-4 bg-[var(--paper-2)] border border-dashed border-[var(--edge)] space-y-3">
        <p className="text-sm font-bold"><i className="fa-solid fa-plus mr-1.5 text-[var(--volt)]" />Tambah nomor bot</p>
        <div className="grid gap-2 md:grid-cols-3">
          <input value={nomorBaru} onChange={e => setNomorBaru(e.target.value.replace(/\D/g, ''))}
            placeholder="628xxxxxxxxxx" inputMode="numeric" aria-label="Nomor bot tambahan"
            className="min-h-11 rounded-[12px] px-4 py-2.5 bg-[var(--paper)] border border-[var(--edge)] outline-none text-sm font-mono" />
          <input value={labelBaru} onChange={e => setLabelBaru(e.target.value)}
            placeholder="Nama (mis. Bot Claim)" aria-label="Nama bot tambahan"
            className="min-h-11 rounded-[12px] px-4 py-2.5 bg-[var(--paper)] border border-[var(--edge)] outline-none text-sm" />
          <select value={roleBaru} onChange={e => setRoleBaru(e.target.value)} aria-label="Role bot tambahan"
            className="min-h-11 rounded-[12px] px-4 py-2.5 bg-[var(--paper)] border border-[var(--edge)] outline-none text-sm">
            {Object.entries(roles).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
          </select>
        </div>
        <button onClick={tambah} disabled={busy || nomorBaru.replace(/\D/g, '').length < 10}
          className="btn-primary min-h-11 rounded-[12px] px-5 py-2.5 text-sm font-bold disabled:opacity-50">
          <i className="fa-solid fa-link mr-1.5" />Tautkan &amp; Jalankan
        </button>
        <p className="text-[var(--ink-2)] text-xs">
          Bot tambahan memakai plugin &amp; database yang sama, jadi tidak perlu deploy ulang.
          Bot utama harus tersambung dulu.
        </p>
      </div>
    </div>
  )
}
