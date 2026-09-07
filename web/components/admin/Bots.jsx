'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  getBots,
  saveBot,
  deleteBot,
  pairExtraBot,
  stopExtraBot,
  getPairState,
  saveBotRole,
  deleteBotRole
} from '@/lib/admin-api'

/**
 * PRESET CEPAT ROLE KUSTOM
 * Membantu admin menyusun role dengan kombinasi kategori populer dalam 1 klik.
 */
const PRESETS = [
  {
    name: '🎯 Claim & Media Store',
    desc: 'Fokus klaim video HD, uploader, convert & download media',
    kategori: ['claim', 'store', 'main', 'info', 'cek', 'media', 'download', 'search', 'convert', 'tools'],
  },
  {
    name: '🛡️ Moderasi & Pengelola Grup',
    desc: 'Manajemen grup, anti-link, welcome, tools tanpa game/rpg',
    kategori: ['group', 'main', 'info', 'cek', 'user', 'tools', 'utility'],
  },
  {
    name: '🎮 Games, RPG & Fun',
    desc: 'Hiburan, mini game tebak-tebakan, RPG, sticker & canvas',
    kategori: ['game', 'rpg', 'fun', 'sticker', 'canvas', 'random', 'main', 'clan'],
  },
  {
    name: '📥 Downloader & Stalker',
    desc: 'Khusus unduh TikTok, IG, YT, Spotify & pencarian data',
    kategori: ['download', 'search', 'media', 'convert', 'stalker', 'main', 'info'],
  },
  {
    name: '🤖 AI & Smart Assistant',
    desc: 'Fitur kecerdasan buatan, scraper AI, tools & pencarian',
    kategori: ['ai', 'tools', 'search', 'main', 'info', 'utility'],
  },
]

export default function Bots({ toast }) {
  const [data, setData] = useState(null)
  const [pair, setPair] = useState(null)
  const [busy, setBusy] = useState(false)
  const [nomorBaru, setNomorBaru] = useState('')
  const [labelBaru, setLabelBaru] = useState('')
  const [roleBaru, setRoleBaru] = useState('full')

  // State Modal Editor Role Kustom
  const [roleForm, setRoleForm] = useState(null) // { id, label, deskripsi, kategori: [] }
  const [katSearch, setKatSearch] = useState('')

  const muat = async () => {
    try {
      const res = await getBots()
      setData(res)
    } catch (e) {
      setData({ ok: false, error: e.message })
    }
    try {
      const p = await getPairState()
      setPair(p)
    } catch {}
  }

  useEffect(() => {
    muat()
    const iv = setInterval(muat, 5000)
    return () => clearInterval(iv)
  }, [])

  const bots = data?.bots ? Object.values(data.bots) : []
  const roles = data?.roles || {}
  const kategoriTersedia = data?.kategori || []

  // Filter kategori di modal form
  const kategoriTerfilter = useMemo(() => {
    if (!katSearch.trim()) return kategoriTersedia
    const q = katSearch.toLowerCase()
    return kategoriTersedia.filter(k => k.toLowerCase().includes(q))
  }, [kategoriTersedia, katSearch])

  const ubah = async (bot, patch) => {
    setBusy(true)
    try {
      await saveBot({ id: bot.id, ...patch })
      toast('Konfigurasi bot tersimpan', 'success')
      muat()
    } catch (e) {
      toast(`Gagal mengubah bot: ${e.message}`, 'error')
    }
    setBusy(false)
  }

  const simpanRole = async () => {
    const f = roleForm
    if (!f) return
    const id = (f.id || '').replace(/[^a-z0-9_-]/gi, '').toLowerCase().trim()
    if (!id) return toast('ID role wajib diisi (hanya huruf, angka, - dan _)', 'warn')
    if (roles[id]?.bawaan) return toast('Role bawaan sistem tidak bisa ditimpa', 'warn')
    if (!f.kategori || !f.kategori.length) return toast('Pilih minimal satu kategori plugin', 'warn')

    setBusy(true)
    try {
      await saveBotRole({
        id,
        label: f.label.trim() || id,
        deskripsi: f.deskripsi.trim(),
        kategori: f.kategori,
      })
      toast(`Role "${f.label.trim() || id}" berhasil disimpan!`, 'success')
      setRoleForm(null)
      setKatSearch('')
      muat()
    } catch (e) {
      toast(`Gagal menyimpan role: ${e.message}`, 'error')
    }
    setBusy(false)
  }

  const hapusRole = async (id) => {
    if (roles[id]?.bawaan) return toast('Role bawaan tidak bisa dihapus', 'warn')
    if (!confirm(`Hapus role "${roles[id]?.label || id}"?\nSemua bot yang memakai role ini akan otomatis dialihkan ke "Full Bot".`)) return

    setBusy(true)
    try {
      await deleteBotRole(id)
      toast(`Role "${id}" berhasil dihapus`, 'success')
      if (roleBaru === id) setRoleBaru('full')
      muat()
    } catch (e) {
      toast(`Gagal menghapus role: ${e.message}`, 'error')
    }
    setBusy(false)
  }

  const tambah = async () => {
    const n = nomorBaru.replace(/\D/g, '')
    if (n.length < 10) return toast('Nomor telepon minimal 10 digit angka', 'warn')
    setBusy(true)
    try {
      await pairExtraBot(n, labelBaru.trim() || n, roleBaru)
      toast('Proses pairing dimulai! Kode akan muncul di kartu bot di bawah.', 'success')
      setNomorBaru('')
      setLabelBaru('')
      setTimeout(muat, 2000)
    } catch (e) {
      toast(`Gagal memulai pairing: ${e.message}`, 'error')
    }
    setBusy(false)
  }

  const hapus = async (bot) => {
    if (!confirm(`Hapus sub-bot "${bot.label}" (${bot.nomor})?\nSesi WhatsApp nomor ini akan diputus.`)) return
    setBusy(true)
    try {
      await stopExtraBot(bot.nomor).catch(() => {})
      await deleteBot(bot.id)
      toast(`Bot "${bot.label}" berhasil dihapus`, 'success')
      muat()
    } catch (e) {
      toast(`Gagal menghapus bot: ${e.message}`, 'error')
    }
    setBusy(false)
  }

  const pilihSemuaKategori = () => {
    if (!roleForm) return
    setRoleForm({ ...roleForm, kategori: [...kategoriTersedia] })
  }

  const kosongkanKategori = () => {
    if (!roleForm) return
    setRoleForm({ ...roleForm, kategori: [] })
  }

  const terapkanPreset = (preset) => {
    if (!roleForm) return
    const valid = preset.kategori.filter(k => kategoriTersedia.includes(k))
    setRoleForm({
      ...roleForm,
      label: roleForm.label || preset.name.replace(/^[^\w\s]+/, '').trim(),
      deskripsi: roleForm.deskripsi || preset.desc,
      kategori: Array.from(new Set([...roleForm.kategori, ...valid])),
    })
    toast(`Preset "${preset.name}" diterapkan`, 'success')
  }

  if (data && data.ok === false) {
    return (
      <div className="card p-6 md:p-8 space-y-3">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base flex items-center gap-2">
          <i className="fa-solid fa-robot text-[var(--volt)]" /> Multi-Bot &amp; Role Manager
        </h2>
        <div className="rounded-[var(--r)] p-4 bg-bad/[.07] border border-bad/30 text-sm text-[var(--ink-2)]">
          <p className="font-semibold text-bad mb-1">Bot Utama Belum Terhubung</p>
          <p>Daftar bot dan role hanya dapat diakses saat bot utama WhatsApp dalam status aktif/tersambung.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── CARD 1: DAFTAR BOT AKTIF ────────────────────────────────────────── */}
      <div className="card p-6 md:p-8 space-y-5 border-2 border-[var(--edge)]">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--edge)]">
          <div>
            <h2 className="font-[family-name:var(--font-display)] font-extrabold text-lg flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[var(--volt)]/15 flex items-center justify-center text-[var(--volt)] text-sm shadow-sm">
                <i className="fa-solid fa-robot" />
              </span>
              <span>Daftar Bot Terdaftar</span>
              <span className="chip text-[11px] font-bold px-2 py-0.5 bg-[var(--paper-2)] border border-[var(--edge)]">
                {bots.length} NOMOR
              </span>
            </h2>
            <p className="text-[var(--ink-2)] text-xs sm:text-sm mt-1">
              Jalankan beberapa nomor WhatsApp sekaligus. Role mengontrol akses kategori perintah secara ketat pada kernel bot.
            </p>
          </div>
        </div>

        {/* List Bot Item */}
        <div className="grid gap-3.5">
          {bots.map(b => {
            const st = pair?.tambahan?.[b.nomor]
            const hidupUtama = b.utama && pair?.terhubung
            const hidupSub = st?.tahap === 'tersambung'
            const hidup = b.utama ? hidupUtama : hidupSub
            const roleInfo = roles[b.role] || { label: b.role, kategori: null }

            return (
              <div
                key={b.id}
                className={`rounded-[var(--r)] p-4 sm:p-5 transition-all duration-200 border ${
                  hidup
                    ? 'bg-[var(--paper-2)] border-[var(--edge)] hover:border-[var(--volt)]/40 shadow-sm'
                    : 'bg-[var(--paper)] border-[var(--edge)] opacity-85'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{
                        background: hidup ? '#10b981' : '#64748b',
                        boxShadow: hidup ? '0 0 10px #10b981' : 'none',
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-[var(--ink)] truncate">{b.label}</span>
                        {b.utama && (
                          <span className="chip px-2 py-0.5 text-[10px] font-extrabold bg-[var(--volt)]/20 text-[var(--volt)] border border-[var(--volt)]/40">
                            ⭐ UTAMA
                          </span>
                        )}
                        {!b.aktif && (
                          <span className="chip px-2 py-0.5 text-[10px] font-bold bg-bad/15 text-bad border border-bad/30">
                            DIMATIKAN
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-[var(--ink-2)] mt-0.5">
                        {b.utama ? (b.nomorAktif || b.nomor || 'Sesi Induk Server') : (b.nomor || 'Belum ditautkan')}
                      </p>
                    </div>
                  </div>

                  {/* Role Badge Status */}
                  <div className="flex items-center gap-2">
                    <span className="chip px-2.5 py-1 text-xs font-semibold bg-[var(--paper)] border border-[var(--edge)] text-[var(--ink)]">
                      <i className="fa-solid fa-shield-halved mr-1.5 text-[var(--volt)] text-[10px]" />
                      {roleInfo.label}
                    </span>
                  </div>
                </div>

                {/* Kontrol Bot: Ganti Role & Power Switch */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--edge)]/60 bg-[var(--paper)]/50 rounded-lg p-3">
                  <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
                    <label className="text-xs font-bold text-[var(--ink-2)] flex items-center gap-1.5 shrink-0" htmlFor={`role-${b.id}`}>
                      <i className="fa-solid fa-sliders text-[11px]" /> Role:
                    </label>
                    <select
                      id={`role-${b.id}`}
                      value={b.role}
                      disabled={busy}
                      onChange={e => ubah(b, { role: e.target.value })}
                      className="min-h-10 flex-1 rounded-[var(--r-soft)] px-3 py-1.5 bg-[var(--paper)] border border-[var(--edge)] text-xs sm:text-sm font-semibold outline-none focus:border-[var(--volt)] transition-colors cursor-pointer"
                    >
                      {Object.entries(roles).map(([id, r]) => (
                        <option key={id} value={id}>
                          {r.label} {r.bawaan ? '(Bawaan)' : '(Kustom)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => ubah(b, { aktif: !b.aktif })}
                      disabled={busy}
                      aria-busy={busy}
                      type="button"
                      className={`btn min-h-10 text-xs font-bold px-3.5 gap-1.5 transition-all ${
                        b.aktif
                          ? 'btn-quiet hover:bg-bad/15 hover:text-bad'
                          : '!bg-good/20 !border-good/50 !text-good font-extrabold shadow-sm'
                      }`}
                    >
                      <i className="fa-solid fa-power-off" />
                      {b.aktif ? 'Matikan' : 'Nyalakan'}
                    </button>

                    {!b.utama && (
                      <button
                        onClick={() => hapus(b)}
                        disabled={busy}
                        aria-busy={busy}
                        className="btn btn-danger min-h-10 text-xs px-3"
                        title="Hapus Sub-Bot"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Deskripsi Kategori Perintah */}
                <div className="mt-2.5 text-[11px] sm:text-xs text-[var(--ink-2)] flex items-start gap-1.5">
                  <i className="fa-solid fa-info-circle text-[11px] mt-0.5 text-[var(--volt)] shrink-0" />
                  <span>
                    {roleInfo.kategori === null ? (
                      <span className="text-[var(--good)] font-semibold">Semua kategori perintah aktif (Akses Penuh).</span>
                    ) : (
                      <>
                        <span className="font-semibold text-[var(--ink)]">Kategori aktif ({roleInfo.kategori.length}):</span>{' '}
                        {roleInfo.kategori.length ? (
                          <span className="font-mono text-[10px]">{roleInfo.kategori.join(', ')}</span>
                        ) : (
                          <span className="text-bad">Tidak ada kategori yang diizinkan (Terkunci)</span>
                        )}
                      </>
                    )}
                  </span>
                </div>

                {/* Status Pairing Real-time */}
                {!b.utama && st?.tahap === 'kode-siap' && st.kode && (
                  <div className="mt-3 rounded-[var(--r)] p-4 bg-[var(--paper)] border-2 border-[var(--volt)]/50 text-center shadow-lg animate-pulse">
                    <p className="text-[10px] font-extrabold tracking-[.25em] uppercase text-[var(--volt)]">
                      KODE PAIRING WHATSAPP
                    </p>
                    <p className="font-mono font-black tabular-nums select-all text-3xl sm:text-4xl my-1 text-[var(--volt)] tracking-widest">
                      {st.kodeRapi || st.kode}
                    </p>
                    <p className="text-[var(--ink-2)] text-xs">
                      Buka WhatsApp di HP nomor <b>{b.nomor}</b> ➔ Perangkat Tertaut ➔ Tautkan dengan Nomor Telepon.
                    </p>
                  </div>
                )}
                {!b.utama && st?.tahap === 'diminta' && (
                  <div className="mt-2.5 p-2 rounded bg-[var(--paper)] border border-[var(--edge)] text-xs text-[var(--ink-2)] flex items-center justify-center gap-2">
                    <i className="fa-solid fa-circle-notch fa-spin text-[var(--volt)]" />
                    <span>Menghubungi server WhatsApp untuk membuat kode pairing…</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Form Tambah Bot Baru */}
        <div className="rounded-[var(--r)] p-4 sm:p-5 bg-[var(--paper-2)]/80 border-2 border-dashed border-[var(--edge)] space-y-3.5 mt-4">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--volt)]/20 text-[var(--volt)] flex items-center justify-center text-xs">
              <i className="fa-solid fa-plus" />
            </span>
            <p className="text-sm font-bold text-[var(--ink)]">Tambah Nomor Bot Baru (Sub-Bot)</p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-[var(--ink-2)] mb-1 block">Nomor WhatsApp</label>
              <input
                value={nomorBaru}
                onChange={e => setNomorBaru(e.target.value.replace(/\D/g, ''))}
                placeholder="628xxxxxxxxxx"
                inputMode="numeric"
                aria-label="Nomor bot tambahan"
                className="w-full min-h-11 rounded-[var(--r-soft)] px-3.5 py-2 bg-[var(--paper)] border border-[var(--edge)] outline-none text-sm font-mono focus:border-[var(--volt)] transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-[var(--ink-2)] mb-1 block">Label / Nama Panggilan</label>
              <input
                value={labelBaru}
                onChange={e => setLabelBaru(e.target.value)}
                placeholder="Contoh: Bot Downloader"
                aria-label="Nama bot tambahan"
                className="w-full min-h-11 rounded-[var(--r-soft)] px-3.5 py-2 bg-[var(--paper)] border border-[var(--edge)] outline-none text-sm focus:border-[var(--volt)] transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-[var(--ink-2)] mb-1 block">Pilih Role Akses</label>
              <select
                value={roleBaru}
                onChange={e => setRoleBaru(e.target.value)}
                aria-label="Role bot tambahan"
                className="w-full min-h-11 rounded-[var(--r-soft)] px-3 py-2 bg-[var(--paper)] border border-[var(--edge)] outline-none text-sm font-semibold focus:border-[var(--volt)] transition-colors cursor-pointer"
              >
                {Object.entries(roles).map(([id, r]) => (
                  <option key={id} value={id}>
                    {r.label} {r.bawaan ? '(Bawaan)' : '(Kustom)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={tambah}
              disabled={busy || nomorBaru.replace(/\D/g, '').length < 10}
              aria-busy={busy}
              className="btn btn-primary min-h-11 text-xs sm:text-sm font-bold gap-2 px-5 disabled:opacity-50"
            >
              <i className="fa-solid fa-qrcode" />
              Minta Kode Pairing &amp; Tautkan
            </button>
            <p className="text-[var(--ink-2)] text-[11px]">
              *Sub-bot berbagi memory, database, dan plugin yang sama tanpa overhead deploy ulang.
            </p>
          </div>
        </div>
      </div>

      {/* ── CARD 2: ROLE COSTUME & PERMISSION SYSTEM ───────────────────────── */}
      <div className="card p-6 md:p-8 space-y-6 border-2 border-[var(--edge)]">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--edge)]">
          <div>
            <h2 className="font-[family-name:var(--font-display)] font-extrabold text-lg flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[var(--volt)]/15 flex items-center justify-center text-[var(--volt)] text-sm shadow-sm">
                <i className="fa-solid fa-user-shield" />
              </span>
              <span>Role Kustom &amp; Akses Perintah</span>
              <span className="chip text-[11px] font-bold px-2 py-0.5 bg-[var(--paper-2)] border border-[var(--edge)]">
                {Object.keys(roles).length} ROLE TERSEDIA
              </span>
            </h2>
            <p className="text-[var(--ink-2)] text-xs sm:text-sm mt-1">
              Buat profil peran kustom dengan memilih folder kategori plugin nyata di server. Gerbang validasi aktif di tingkat kernel eksekusi.
            </p>
          </div>

          {!roleForm && (
            <button
              onClick={() => {
                setRoleForm({ id: '', label: '', deskripsi: '', kategori: [] })
                setKatSearch('')
              }}
              disabled={busy}
              aria-busy={busy}
              className="btn btn-primary min-h-10 text-xs sm:text-sm font-bold gap-2 px-4 shadow-sm"
            >
              <i className="fa-solid fa-plus" />
              Buat Role Baru
            </button>
          )}
        </div>

        {/* Modal / Inline Editor Form */}
        {roleForm && (
          <div className="rounded-[var(--r)] p-5 sm:p-6 bg-[var(--paper-2)] border-2 border-[var(--volt)]/50 shadow-xl space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--edge)]">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-md bg-[var(--volt)] text-[#06180d] flex items-center justify-center text-xs font-black">
                  <i className="fa-solid fa-pen-ruler" />
                </span>
                <p className="text-sm sm:text-base font-extrabold text-[var(--ink)]">
                  {roleForm.id && roles[roleForm.id] ? `Ubah Role: ${roleForm.label}` : 'Desain Role Kustom Baru'}
                </p>
              </div>
              <button
                onClick={() => {
                  setRoleForm(null)
                  setKatSearch('')
                }}
                className="btn btn-quiet min-h-8 text-xs px-2.5"
                title="Batal"
              >
                <i className="fa-solid fa-xmark mr-1" /> Tutup
              </button>
            </div>

            {/* Presets Bar */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-2)]">
                ⚡ PRESET CEPAT (Klik untuk menerapkan):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => terapkanPreset(p)}
                    className="chip !px-2.5 !py-1 text-[11px] font-semibold bg-[var(--paper)] hover:bg-[var(--volt)]/15 hover:border-[var(--volt)]/50 text-[var(--ink)] cursor-pointer transition-all active:scale-95"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form Fields */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--ink-2)] mb-1 block">
                  ID Role (System Key)
                </label>
                <input
                  value={roleForm.id}
                  disabled={roles[roleForm.id]?.bawaan}
                  onChange={e =>
                    setRoleForm({
                      ...roleForm,
                      id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                    })
                  }
                  placeholder="mis. bot-moderator"
                  aria-label="ID role"
                  className="w-full min-h-11 rounded-[var(--r-soft)] px-3.5 py-2 bg-[var(--paper)] border border-[var(--edge)] outline-none text-sm font-mono focus:border-[var(--volt)] transition-colors"
                />
                <span className="text-[10px] text-[var(--ink-2)] mt-0.5 block">
                  Hanya huruf kecil, angka, tanda hubung (-) dan garis bawah (_).
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[var(--ink-2)] mb-1 block">
                  Label Tampilan (Nama Role)
                </label>
                <input
                  value={roleForm.label}
                  onChange={e => setRoleForm({ ...roleForm, label: e.target.value })}
                  placeholder="mis. Bot Moderator & Claim"
                  aria-label="Label role"
                  className="w-full min-h-11 rounded-[var(--r-soft)] px-3.5 py-2 bg-[var(--paper)] border border-[var(--edge)] outline-none text-sm font-semibold focus:border-[var(--volt)] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-[var(--ink-2)] mb-1 block">
                Deskripsi Singkat Fungsi Role
              </label>
              <input
                value={roleForm.deskripsi}
                onChange={e => setRoleForm({ ...roleForm, deskripsi: e.target.value })}
                placeholder="mis. Hanya melayani claim video HD dan moderasi grup tanpa game."
                aria-label="Deskripsi role"
                className="w-full min-h-11 rounded-[var(--r-soft)] px-3.5 py-2 bg-[var(--paper)] border border-[var(--edge)] outline-none text-xs sm:text-sm focus:border-[var(--volt)] transition-colors"
              />
            </div>

            {/* Pemilihan Kategori Interaktif */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--ink)]">
                    Kategori Plugin yang Diizinkan:
                  </span>
                  <span className="chip text-[10px] font-extrabold px-2 py-0.5 bg-[var(--volt)]/20 text-[var(--volt)]">
                    {roleForm.kategori.length} / {kategoriTersedia.length} DIPILIH
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={pilihSemuaKategori}
                    className="btn btn-quiet !min-h-8 !text-[11px] !px-2.5 font-bold"
                  >
                    <i className="fa-solid fa-check-double mr-1" /> Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={kosongkanKategori}
                    className="btn btn-quiet !min-h-8 !text-[11px] !px-2.5 font-bold text-bad"
                  >
                    <i className="fa-solid fa-eraser mr-1" /> Hapus Semua
                  </button>
                </div>
              </div>

              {/* Pencarian Kategori */}
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--ink-2)]" />
                <input
                  value={katSearch}
                  onChange={e => setKatSearch(e.target.value)}
                  placeholder="Cari kategori plugin (mis. download, claim, group)..."
                  className="w-full min-h-9 rounded-[var(--r-soft)] pl-8 pr-3 py-1.5 bg-[var(--paper)] border border-[var(--edge)] outline-none text-xs focus:border-[var(--volt)] transition-colors"
                />
              </div>

              {/* Grid Chips Kategori */}
              <div className="p-3.5 rounded-[var(--r)] bg-[var(--paper)] border border-[var(--edge)] max-h-56 overflow-y-auto">
                <div className="flex flex-wrap gap-1.5">
                  {kategoriTerfilter.map(k => {
                    const aktif = roleForm.kategori.includes(k)
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setRoleForm({
                            ...roleForm,
                            kategori: aktif
                              ? roleForm.kategori.filter(x => x !== k)
                              : [...roleForm.kategori, k],
                          })
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all duration-150 flex items-center gap-1.5 ${
                          aktif
                            ? 'bg-[var(--volt)] text-[#06180d] shadow-sm scale-100'
                            : 'bg-[var(--paper-2)] text-[var(--ink-2)] hover:text-[var(--ink)] border border-[var(--edge)] hover:border-[var(--ink-2)]'
                        }`}
                      >
                        <i className={`fa-solid ${aktif ? 'fa-square-check' : 'fa-square text-[var(--ink-2)]/40'} text-[11px]`} />
                        <span>{k}</span>
                      </button>
                    )
                  })}
                </div>
                {!kategoriTerfilter.length && (
                  <p className="text-center text-xs text-[var(--ink-2)] py-4">
                    Tidak ditemukan kategori dengan kata kunci "{katSearch}"
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-[var(--edge)]">
              <button
                type="button"
                onClick={() => {
                  setRoleForm(null)
                  setKatSearch('')
                }}
                disabled={busy}
                className="btn btn-quiet min-h-11 px-4 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={simpanRole}
                disabled={busy}
                aria-busy={busy}
                className="btn btn-primary min-h-11 px-6 text-xs sm:text-sm font-extrabold gap-2 shadow-md"
              >
                <i className="fa-solid fa-floppy-disk" />
                Simpan &amp; Terapkan Role
              </button>
            </div>
          </div>
        )}

        {/* ── ROLE CARDS GRID ────────────────────────────────────────────────── */}
        <div className="grid gap-3.5 md:grid-cols-2">
          {Object.entries(roles).map(([id, r]) => {
            const isFull = r.kategori === null
            const countKat = r.kategori ? r.kategori.length : kategoriTersedia.length
            const isCustom = !r.bawaan

            return (
              <div
                key={id}
                className={`rounded-[var(--r)] p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                  isCustom
                    ? 'bg-[var(--paper-2)] border-[var(--volt)]/30 hover:border-[var(--volt)] shadow-sm'
                    : 'bg-[var(--paper)] border-[var(--edge)]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm sm:text-base text-[var(--ink)]">
                          {r.label}
                        </span>
                        {r.bawaan ? (
                          <span className="chip px-2 py-0.5 text-[9px] font-extrabold bg-[var(--paper-2)] text-[var(--ink-2)] border border-[var(--edge)]">
                            🔒 BAWAAN
                          </span>
                        ) : (
                          <span className="chip px-2 py-0.5 text-[9px] font-extrabold bg-[var(--volt)]/20 text-[var(--volt)] border border-[var(--volt)]/40">
                            ✨ KUSTOM
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-[var(--ink-2)] block mt-0.5">
                        ID: <b>{id}</b>
                      </span>
                    </div>

                    {/* Action Buttons for Custom Roles */}
                    {isCustom && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setRoleForm({
                              id,
                              label: r.label,
                              deskripsi: r.deskripsi || '',
                              kategori: r.kategori || [],
                            })
                            setKatSearch('')
                          }}
                          disabled={busy}
                          title="Ubah Role Ini"
                          className="btn btn-quiet !min-h-8 !px-2.5 text-xs font-bold"
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          onClick={() => hapusRole(id)}
                          disabled={busy}
                          title="Hapus Role"
                          className="btn btn-danger !min-h-8 !px-2.5 text-xs font-bold"
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[var(--ink-2)] line-clamp-2 mb-3">
                    {r.deskripsi || 'Tidak ada deskripsi.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[var(--edge)]/60">
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="font-bold text-[var(--ink)] flex items-center gap-1">
                      <i className="fa-solid fa-layer-group text-[var(--volt)] text-[10px]" />
                      Akses Kategori:
                    </span>
                    <span className="font-mono font-bold text-[var(--volt)]">
                      {isFull ? 'ALL UNLIMITED' : `${countKat} Kategori`}
                    </span>
                  </div>

                  {isFull ? (
                    <div className="px-2.5 py-1.5 rounded bg-good/10 border border-good/20 text-good text-[11px] font-semibold flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-check text-[11px]" />
                      <span>Bebas menjalankan semua 830+ plugin tanpa pembatasan.</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-[var(--paper-2)]/60 rounded border border-[var(--edge)]">
                      {(r.kategori || []).map((k, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--paper)] text-[var(--ink)] border border-[var(--edge)]"
                        >
                          {k}
                        </span>
                      ))}
                      {!r.kategori?.length && (
                        <span className="text-[10px] text-bad italic">Tidak ada kategori yang dipilih</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
