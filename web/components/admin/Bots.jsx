'use client'
import { useEffect, useState } from 'react'
import { getBots, saveBot, deleteBot, pairExtraBot, stopExtraBot, getPairState, saveBotRole, deleteBotRole } from '@/lib/admin-api'

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

  // Editor role kustom: backend sudah punya /bots/role/save & /bots/role/delete
  // (validasi kategori ada di hillz-bot-registry.js), tapi panel belum punya
  // jalan masuknya — jadi role kustom hanya bisa dibuat lewat curl. Ini UI-nya.
  const [roleForm, setRoleForm] = useState(null) // { id, label, deskripsi, kategori: [] }

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
  const kategoriTersedia = data?.kategori || []

  const ubah = async (bot, patch) => {
    setBusy(true)
    try {
      await saveBot({ id: bot.id, ...patch })
      toast('Tersimpan', 'success')
      muat()
    } catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  const simpanRole = async () => {
    const f = roleForm
    const id = (f?.id || '').replace(/[^a-z0-9_-]/gi, '').toLowerCase()
    if (!id) return toast('ID role wajib (huruf/angka/-/_)', 'warn')
    if (roles[id]?.bawaan) return toast('Role bawaan tidak bisa ditimpa', 'warn')
    if (!f.kategori.length) return toast('Pilih minimal satu kategori', 'warn')
    setBusy(true)
    try {
      await saveBotRole({ id, label: f.label.trim() || id, deskripsi: f.deskripsi.trim(), kategori: f.kategori })
      toast(`Role "${id}" disimpan`, 'success')
      setRoleForm(null)
      muat()
    } catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  const hapusRole = async (id) => {
    if (roles[id]?.bawaan) return toast('Role bawaan tidak bisa dihapus', 'warn')
    // Bot yang memakai role ini dikembalikan ke `full` oleh backend, jadi tidak
    // ada bot yang menunjuk role hantu dan diam-diam kehilangan semua perintah.
    if (!confirm(`Hapus role "${id}"? Bot yang memakainya kembali ke Full Bot.`)) return
    setBusy(true)
    try {
      await deleteBotRole(id)
      toast(`Role "${id}" dihapus`, 'success')
      if (roleBaru === id) setRoleBaru('full')
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
            <div key={b.id} className="rounded-[var(--r)] p-4 bg-[var(--paper-2)] border border-[var(--edge)] space-y-3">
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
                  className="min-h-10 rounded-[var(--r-soft)] px-3 py-2 bg-[var(--paper)] border border-[var(--edge)] text-sm outline-none">
                  {Object.entries(roles).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
                </select>

                <button onClick={() => ubah(b, { aktif: !b.aktif })} disabled={busy} aria-busy={busy}
                  role="switch" aria-checked={!!b.aktif} type="button"
                  className={`btn min-h-10 !text-[12px] gap-1.5 ${b.aktif
                    ? 'btn-quiet'
                    : 'btn-quiet !bg-[color-mix(in_srgb,var(--good)_10%,var(--paper))] !border-[color-mix(in_srgb,var(--good)_28%,var(--edge))] !text-[var(--good)] font-bold'}`}>
                  <i className={`fa-solid fa-power-off`} />{b.aktif ? 'Matikan' : 'Nyalakan'}
                </button>

                {!b.utama && (
                  <button onClick={() => hapus(b)} disabled={busy} aria-busy={busy}
                    className="btn btn-danger">
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
                <div className="rounded-[var(--r-soft)] p-3 bg-[var(--paper)] border border-[var(--volt)]/30 text-center">
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
      <div className="rounded-[var(--r)] p-4 bg-[var(--paper-2)] border border-dashed border-[var(--edge)] space-y-3">
        <p className="text-sm font-bold"><i className="fa-solid fa-plus mr-1.5 text-[var(--volt)]" />Tambah nomor bot</p>
        <div className="grid gap-2 md:grid-cols-3">
          <input value={nomorBaru} onChange={e => setNomorBaru(e.target.value.replace(/\D/g, ''))}
            placeholder="628xxxxxxxxxx" inputMode="numeric" aria-label="Nomor bot tambahan"
            className="min-h-11 rounded-[var(--r-soft)] px-4 py-2.5 bg-[var(--paper)] border border-[var(--edge)] outline-none text-sm font-mono" />
          <input value={labelBaru} onChange={e => setLabelBaru(e.target.value)}
            placeholder="Nama (mis. Bot Claim)" aria-label="Nama bot tambahan"
            className="min-h-11 rounded-[var(--r-soft)] px-4 py-2.5 bg-[var(--paper)] border border-[var(--edge)] outline-none text-sm" />
          <select value={roleBaru} onChange={e => setRoleBaru(e.target.value)} aria-label="Role bot tambahan"
            className="min-h-11 rounded-[var(--r-soft)] px-4 py-2.5 bg-[var(--paper)] border border-[var(--edge)] outline-none text-sm">
            {Object.entries(roles).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
          </select>
        </div>
        <button onClick={tambah} disabled={busy || nomorBaru.replace(/\D/g, '').length < 10} aria-busy={busy}
          className="btn btn-primary min-h-11 text-sm disabled:opacity-50">
          <i className="fa-solid fa-link mr-1.5" />Tautkan &amp; Jalankan
        </button>
        <p className="text-[var(--ink-2)] text-xs">
          Bot tambahan memakai plugin &amp; database yang sama, jadi tidak perlu deploy ulang.
          Bot utama harus tersambung dulu.
        </p>
      </div>

      {/* Role kustom: bikin role sendiri dari kategori plugin yang benar-benar ada */}
      <div className="rounded-[var(--r)] p-4 bg-[var(--paper-2)] border border-[var(--edge)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold">
            <i className="fa-solid fa-user-shield mr-1.5 text-[var(--volt)]" />Role Kustom
          </p>
          {!roleForm && (
            <button onClick={() => setRoleForm({ id: '', label: '', deskripsi: '', kategori: [] })} disabled={busy} aria-busy={busy}
              className="btn btn-quiet">
              <i className="fa-solid fa-plus mr-1.5" />Buat Role
            </button>
          )}
        </div>

        {/* Daftar role: bawaan tidak bisa diubah/dihapus (dikunci di backend juga) */}
        <div className="space-y-2">
          {Object.entries(roles).map(([id, r]) => (
            <div key={id} className="flex flex-wrap items-center gap-2 rounded-[var(--r-soft)] px-3 py-2 bg-[var(--paper)] border border-[var(--edge)]">
              <b className="text-sm">{r.label}</b>
              <span className="font-mono text-[11px] text-[var(--ink-2)]">{id}</span>
              {r.bawaan
                ? <span className="chip px-2 py-0.5 text-[10px] bg-[var(--sunk)] text-[var(--ink-2)]">BAWAAN</span>
                : (
                  <span className="flex gap-2 ml-auto">
                    <button onClick={() => setRoleForm({ id, label: r.label, deskripsi: r.deskripsi || '', kategori: r.kategori || [] })}
                      disabled={busy} aria-busy={busy} aria-label={`Ubah role ${r.label}`}
                      className="btn btn-quiet min-h-9 text-xs">
                      <i className="fa-solid fa-pen mr-1" />Ubah
                    </button>
                    <button onClick={() => hapusRole(id)} disabled={busy} aria-busy={busy} aria-label={`Hapus role ${r.label}`}
                      className="btn btn-danger min-h-9 text-xs">
                      <i className="fa-solid fa-trash mr-1" />Hapus
                    </button>
                  </span>
                )}
              <p className="basis-full text-[11px] text-[var(--ink-2)]">
                {r.kategori === null ? 'Semua kategori.' : `${(r.kategori || []).length} kategori: ${(r.kategori || []).join(', ') || '—'}`}
              </p>
            </div>
          ))}
        </div>

        {roleForm && (
          <div className="rounded-[var(--r-soft)] p-3 bg-[var(--paper)] border border-[var(--volt)]/30 space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <input value={roleForm.id} onChange={e => setRoleForm({ ...roleForm, id: e.target.value })}
                placeholder="id-role (mis. downloader)" aria-label="ID role"
                className="min-h-11 rounded-[var(--r-soft)] px-4 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] outline-none text-sm font-mono" />
              <input value={roleForm.label} onChange={e => setRoleForm({ ...roleForm, label: e.target.value })}
                placeholder="Nama tampil (mis. Bot Downloader)" aria-label="Label role"
                className="min-h-11 rounded-[var(--r-soft)] px-4 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] outline-none text-sm" />
            </div>
            <input value={roleForm.deskripsi} onChange={e => setRoleForm({ ...roleForm, deskripsi: e.target.value })}
              placeholder="Keterangan singkat" aria-label="Deskripsi role"
              className="w-full min-h-11 rounded-[var(--r-soft)] px-4 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] outline-none text-sm" />

            <div>
              <p className="text-xs text-[var(--ink-2)] mb-2">
                Kategori aktif ({roleForm.kategori.length}/{kategoriTersedia.length}) — diambil dari folder <code>plugins/</code> yang nyata
              </p>
              <div className="flex flex-wrap gap-1.5">
                {kategoriTersedia.map(k => {
                  const aktif = roleForm.kategori.includes(k)
                  return (
                    <button key={k} type="button" aria-pressed={aktif}
                      onClick={() => setRoleForm({
                        ...roleForm,
                        kategori: aktif ? roleForm.kategori.filter(x => x !== k) : [...roleForm.kategori, k],
                      })}
                      className={`seg-btn min-h-9 !text-[11px] ${aktif
                        ? 'seg-btn-on !text-[var(--volt)] !border-[color-mix(in_srgb,var(--volt)_40%,transparent)]'
                        : ''}`}>
                      {k}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={simpanRole} disabled={busy} aria-busy={busy}
                className="btn btn-primary min-h-11 text-sm disabled:opacity-50">
                <i className="fa-solid fa-floppy-disk mr-1.5" />Simpan Role
              </button>
              <button onClick={() => setRoleForm(null)} disabled={busy} aria-busy={busy}
                className="btn btn-quiet min-h-11">
                Batal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
