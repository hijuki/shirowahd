'use client'
import { useEffect, useState } from 'react'
import {
  getSettings, saveSettings, backupToGithub, getBackupHistory,
  getTunnelStatus, getGallery, uploadGalleryFile, deleteGalleryFile,
  getCfDns, setCfProxy, setDirectUpload,
  restartBot, restartWeb, restartAll
} from '@/lib/admin-api'

const CATEGORIES = [
  { id: 'network', label: 'Jalur & Layanan', icon: 'fa-network-wired', color: '#38bdf8' },
  { id: 'branding', label: 'Tampilan & Brand', icon: 'fa-palette', color: '#818cf8' },
  { id: 'links', label: 'Grup & Saluran WA', icon: 'fa-comments', color: '#34d399' },
  { id: 'storage', label: 'Media & Storage', icon: 'fa-database', color: '#fbbf24' },
  { id: 'security', label: 'Keamanan & Notif', icon: 'fa-shield-halved', color: '#fb7185' },
]

const linkTypes = [
  { key: 'channels', label: 'Saluran / Channel WA', icon: 'fa-tower-broadcast', color: '#38bdf8', phName: 'Nama Saluran', phLink: 'https://whatsapp.com/channel/...' },
  { key: 'claimGroups', label: 'Grup Klaim Video', icon: 'fa-comments', color: '#34d399', phName: 'Nama Grup Klaim', phLink: 'https://chat.whatsapp.com/...' },
  { key: 'groups', label: 'Grup Komunitas WA', icon: 'fa-users', color: '#818cf8', phName: 'Nama Grup', phLink: 'https://chat.whatsapp.com/...' },
  { key: 'popupButtons', label: 'Custom Popup Buttons', icon: 'fa-link', color: '#f43f5e', phName: 'Label Tombol', phLink: 'https://...' },
]

function Toggle({ on, onChange, label, desc, icon, color }) {
  return (
    <div onClick={onChange} className="flex items-center justify-between gap-4 py-3.5 px-4 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] hover:border-[var(--edge)] hover:bg-[var(--paper-2)] transition-all duration-150 cursor-pointer group">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {icon && (
          /* Satu perlakuan untuk semua tile: netral tenggelam + ikon tinta.
             Warna pastel per-baris (biru/hijau/ungu acak) tidak menandakan
             apa pun — ia hanya membuat daftar terlihat seperti tempelan. */
          <div className="w-9 h-9 shrink-0 rounded-[var(--r-xs)] grid place-items-center bg-[var(--sunk)] border border-[color-mix(in_srgb,var(--edge)_18%,transparent)] transition-transform group-hover:scale-105">
            <i className={`fa-solid ${icon} text-xs text-[var(--ink-2)]`} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--ink)] group-hover:text-[var(--ink)] transition-colors">{label}</p>
          {desc && <p className="text-[11px] text-[var(--ink-2)] mt-0.5 leading-relaxed">{desc}</p>}
        </div>
      </div>
      {/* Track MATI wajib beda dari latar barisnya. Sebelumnya keduanya
          `--paper-2`, jadi tracknya lenyap dan yang tersisa hanya bulatan putih
          menggantung — terbaca rusak, bukan mati. Sekarang: track tenggelam
          (`--sunk`) + garis tepi, knob memakai warna tinta saat mati sehingga
          statusnya terbaca dari bentuk DAN warna, bukan warna saja. */}
      <button type="button" role="switch" aria-checked={!!on} aria-label={label}
        className={`relative w-11 h-6 rounded-full shrink-0 border transition-colors duration-200 ${on
          ? 'bg-[var(--accent)] border-[var(--accent)]'
          : 'bg-[var(--sunk)] border-[color-mix(in_srgb,var(--edge)_28%,transparent)]'}`}>
        <span className={`absolute top-[2px] w-[18px] h-[18px] rounded-full transition-all duration-200 ${on
          ? 'left-[23px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
          : 'left-[2px] bg-[var(--ink-3)]'}`} />
      </button>
    </div>
  )
}

function LinkCard({ item, onChange, onRemove, phName, phLink, color }) {
  return (
    <div className="rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] p-3.5 space-y-2.5 hover:border-[var(--edge)] transition-all duration-150">
      <div className="flex items-center gap-2">
        <input value={item.name || ''} onChange={e => onChange({ ...item, name: e.target.value })} placeholder={phName}
          className="flex-1 min-w-0 rounded-[var(--r-soft)] px-3 py-2 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-xs font-semibold text-[var(--ink)] placeholder:text-[var(--ink-3)] transition-colors" />
        <button type="button" onClick={onRemove} className="btn btn-danger shrink-0 rounded-[var(--r-xs)] text-bad/60 hover:text-bad">
          <i className="fa-solid fa-trash-can text-xs" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input value={item.link || ''} onChange={e => onChange({ ...item, link: e.target.value })} placeholder={phLink}
          className="flex-1 min-w-0 rounded-[var(--r-soft)] px-3 py-2 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-xs font-mono text-[var(--ink-2)] placeholder:text-[var(--ink-3)] transition-colors" />
        <button type="button" onClick={() => onChange({ ...item, visible: item.visible === false ? true : false })}
          className={`shrink-0 px-2.5 py-1.5 rounded-[var(--r-soft)] text-[10px] font-extrabold uppercase tracking-wider transition-all ${item.visible !== false ? 'bg-good/15 text-good border border-good/30' : 'bg-[var(--paper-2)] text-[var(--ink-2)] border border-[var(--edge)]'}`}>
          {item.visible !== false ? 'Aktif' : 'Off'}
        </button>
      </div>
    </div>
  )
}

function LinkSection({ type, data, setData }) {
  const items = data[type.key] || []
  const setItems = (newItems) => setData(p => ({ ...p, [type.key]: newItems }))
  const add = () => setItems([...items, { name: '', link: '', visible: true }])
  const update = (idx, item) => { const n = [...items]; n[idx] = item; setItems(n) }
  const remove = (idx) => setItems(items.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink)] flex items-center gap-2">
          <i className={`fa-solid ${type.icon} text-xs`} style={{ color: type.color }} />
          {type.label}
          <span className="px-2 py-0.5 rounded-[var(--r-soft)] text-[10px] font-mono bg-[var(--paper-2)] text-[var(--ink-2)]">
            {items.length}
          </span>
        </span>
        <button type="button" onClick={add} className="btn btn-quiet rounded-[var(--r-soft)] text-xs text-[var(--ink)] gap-1.5 active:scale-95">
          <i className="fa-solid fa-plus text-[10px]" />Tambah
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--ink-2)] italic py-2">Belum ada link ditambahkan.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {items.map((item, idx) => (
            <LinkCard key={idx} item={item} onChange={v => update(idx, v)} onRemove={() => remove(idx)} phName={type.phName} phLink={type.phLink} color={type.color} />
          ))}
        </div>
      )}
    </div>
  )
}

function BrandGallery({ data, set }) {
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => getGallery().then(r => setFiles(r?.files || [])).catch(() => {})
  useEffect(() => { load() }, [])

  const onUpload = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setBusy(true); setMsg('')
    try {
      const res = await uploadGalleryFile(f)
      /* Backend membalas { ok, url, name } — TIDAK ada objek `file`.
         Kode lama membaca res.file.name, jadi setiap upload logo hero
         memunculkan "Cannot read properties of undefined (reading 'name')"
         padahal filenya sebenarnya BERHASIL tersimpan. */
      if (res.ok) { setMsg('File terupload: ' + (res.name || res.url || 'OK')); load() }
      else { setMsg('Gagal: ' + (res.error || 'unknown')) }
    } catch (err) { setMsg('Error: ' + err.message) }
    finally { setBusy(false); e.target.value = '' }
  }

  const onDelete = async (name) => {
    if (!confirm('Hapus file ' + name + ' dari galeri?')) return
    try {
      await deleteGalleryFile(name)
      if (data.logoUrl?.includes(name)) set('logoUrl', '')
      if (data.heroImageUrl?.includes(name)) set('heroImageUrl', '')
      if (data.heroGifUrl?.includes(name)) set('heroGifUrl', '')
      /* Pasangan gelap ikut dibersihkan, kalau tidak hero mode gelap akan
         menunjuk file yang sudah tidak ada (gambar rusak). */
      if (data.heroImageUrlDark?.includes(name)) set('heroImageUrlDark', '')
      if (data.heroGifUrlDark?.includes(name)) set('heroGifUrlDark', '')
      load()
    } catch (e) { alert('Gagal hapus: ' + e.message) }
  }

  const LABEL = {
    logoUrl: 'Logo', heroImageUrl: 'Foto Hero', heroGifUrl: 'GIF Hero',
    heroImageUrlDark: 'Foto Hero (gelap)', heroGifUrlDark: 'GIF Hero (gelap)',
  }
  const applyTo = (key, url) => {
    set(key, url)
    setMsg(`Dipakai sebagai ${LABEL[key] || key} — klik Simpan di bawah`)
  }
  /* Satu tombol per MODE, bukan per jenis file. Admin tidak perlu tahu bahwa
     GIF dan foto disimpan di field berbeda — sistem yang memilih field
     berdasarkan ekstensi. Yang dipilih admin cuma: aset ini untuk mode mana. */
  const pasangMode = (f, mode) => {
    const gif = /\.gif$/i.test(f.name)
    const key = mode === 'dark'
      ? (gif ? 'heroGifUrlDark' : 'heroImageUrlDark')
      : (gif ? 'heroGifUrl' : 'heroImageUrl')
    applyTo(key, f.url)
  }

  return (
    <div className="plate plate-flat p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
            <i className="fa-solid fa-images text-[var(--volt)]" /> Galeri Gambar Server
          </h4>
          <p className="text-[11px] text-[var(--ink-2)] mt-0.5">Upload logo atau background hero langsung ke server lokal</p>
        </div>
        <label className={`px-3.5 py-1.5 rounded-[var(--r-soft)] text-xs font-bold bg-[var(--accent)] hover:bg-[var(--acid)] text-[#06180d] transition-all cursor-pointer flex items-center gap-2 ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
          <i className="fa-solid fa-cloud-arrow-up text-xs" />
          {busy ? 'Mengupload…' : 'Upload File'}
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
        </label>
      </div>

      {msg && <p className="text-xs text-[var(--volt)] font-medium bg-[var(--paper-2)] px-3 py-1.5 rounded-[var(--r-soft)] border border-[var(--edge)]">{msg}</p>}

      {files.length === 0 ? (
        <p className="text-xs text-[var(--ink-2)] italic py-3 text-center border border-dashed border-[var(--edge)] rounded-[var(--r-soft)]">Belum ada file di galeri.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map(f => {
            const isLogo = data.logoUrl === f.url
            /* Aset hero kini punya PASANGAN mode. Satu file bisa jadi aset
               terang, gelap, atau dua-duanya — jadi statusnya dua boolean,
               bukan satu badge "HERO". */
            const isTerang = data.heroImageUrl === f.url || data.heroGifUrl === f.url
            const isGelap = data.heroImageUrlDark === f.url || data.heroGifUrlDark === f.url
            return (
              <div key={f.name} className="group relative rounded-[var(--r-soft)] overflow-hidden bg-[var(--paper-2)] border border-[var(--edge)] hover:border-[var(--edge)] transition-all flex flex-col">
                <div className="aspect-video w-full bg-black/40 relative overflow-hidden flex items-center justify-center">
                  <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    {isLogo && <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-[var(--accent)] text-[#06180d] border border-[var(--edge)]">LOGO</span>}
                    {isTerang && <span className="px-1.5 py-0.5 rounded-[var(--r-xs)] text-[9px] font-extrabold bg-[var(--paper)] text-[var(--ink)] border border-[var(--edge)]">TERANG</span>}
                    {isGelap && <span className="px-1.5 py-0.5 rounded-[var(--r-xs)] text-[9px] font-extrabold bg-[#111318] text-[#e7e9ee] border border-[var(--edge)]">GELAP</span>}
                  </div>
                </div>
                <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                  <p className="text-[11px] font-mono text-[var(--ink-2)] truncate" title={f.name}>{f.name}</p>
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-[var(--edge)]">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => applyTo('logoUrl', f.url)}
                        aria-pressed={!!isLogo} className={`seg-btn ${isLogo ? 'seg-btn-on' : ''}`}>Logo</button>
                      {/* Dua tombol MODE, bukan "Hero" + "GIF". Jenis file dipilih
                          sistem dari ekstensi; admin cuma menentukan aset ini
                          tampil di mode terang atau gelap. */}
                      <button type="button" onClick={() => pasangMode(f, 'light')} title="Pakai sebagai hero mode terang"
                        aria-pressed={!!isTerang} className={`seg-btn ${isTerang ? 'seg-btn-on' : ''}`}>
                        <i className="fa-solid fa-sun text-[9px] mr-1" />Terang</button>
                      <button type="button" onClick={() => pasangMode(f, 'dark')} title="Pakai sebagai hero mode gelap"
                        aria-pressed={!!isGelap} className={`seg-btn ${isGelap ? 'seg-btn-on' : ''}`}>
                        <i className="fa-solid fa-moon text-[9px] mr-1" />Gelap</button>
                    </div>
                    <button type="button" onClick={() => onDelete(f.name)} aria-label={`Hapus ${f.name}`} className="btn btn-icon btn-danger !w-8 !h-8 !min-w-8 !text-[10px]"><i className="fa-solid fa-trash" /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Settings({ toast }) {
  const [activeTab, setActiveTab] = useState('network')
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [backupBusy, setBackupBusy] = useState(false)
  const [bkHistory, setBkHistory] = useState([])
  const [tunnel, setTunnel] = useState(null)
  const [cf, setCf] = useState(null)
  const [cfBusy, setCfBusy] = useState('')

  const loadBackupHistory = () => getBackupHistory().then(r => setBkHistory(r?.history || [])).catch(() => {})
  const loadCf = () => getCfDns().then(setCf).catch(() => setCf({ ok: false, error: 'Gagal memuat info Cloudflare' }))

  const toggleProxy = async (rec) => {
    setCfBusy(rec.id)
    try {
      const r = await setCfProxy(rec.id, !rec.proxied)
      if (r.ok) {
        toast(`Proxy ${rec.name} diubah jadi ${!rec.proxied ? 'ON' : 'OFF'}`, 'success')
        loadCf()
      } else {
        toast('Gagal ubah proxy: ' + (r.error || 'unknown'), 'error')
      }
    } catch (e) { toast('Error: ' + e.message, 'error') }
    finally { setCfBusy('') }
  }

  const toggleDirect = async () => {
    setCfBusy('direct')
    try {
      const mau = !cf?.direct?.enabled
      const r = await setDirectUpload(mau)
      if (r.ok) {
        toast(r.note || (mau ? 'Jalur langsung diaktifkan' : 'Jalur langsung dimatikan'), 'success')
        loadCf()
      } else {
        toast('Gagal: ' + (r.error || 'unknown'), 'error')
      }
    } catch (e) { toast('Error: ' + e.message, 'error') }
    finally { setCfBusy('') }
  }

  const doBackup = async () => {
    setBackupBusy(true)
    try {
      const r = await backupToGithub()
      if (r.ok) {
        toast(`Backup berhasil (${r.changed} file diperbarui)`, 'success')
        loadBackupHistory()
      } else {
        toast('Backup gagal: ' + (r.error || 'unknown'), 'error')
      }
    } catch (e) { toast('Error: ' + e.message, 'error') }
    finally { setBackupBusy(false) }
  }

  useEffect(() => {
    getSettings()
      .then(s => {
        for (const t of linkTypes) {
          const arr = s[t.key]
          if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'string') {
            s[t.key] = arr.map(item => {
              const p = item.split(/\s+—\s+/)
              return { name: p[0] || '', link: p[1] || '', visible: true }
            })
          }
        }
        setData(s)
      })
      .catch(e => toast('Gagal memuat settings: ' + e.message, 'error'))
      .finally(() => setLoading(false))

    loadBackupHistory()
    getTunnelStatus().then(setTunnel).catch(() => {})
    loadCf()
  }, [])

  const set = (k, v) => setData(p => ({ ...p, [k]: v }))
  // Toggle sadar-default: kunci yang tampil ON saat masih `undefined`
  // (dirender `!== false`) harus jadi `false` di klik pertama, bukan `true`.
  const toggle = (k, defaultOn = false) => setData(p => {
    const cur = p[k] === undefined ? defaultOn : p[k] !== false
    return { ...p, [k]: !cur }
  })

  const save = async (e) => {
    if (e) e.preventDefault()
    setBusy(true)
    try {
      const res = await saveSettings(data)
      if (res.ok) {
        toast('Pengaturan berhasil disimpan!', 'success')
        loadCf()
      } else {
        toast('Gagal menyimpan: ' + (res.error || 'unknown'), 'error')
      }
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    // Meniru bentuk halaman Setelan: kepala + beberapa baris kartu berisi
    // label kiri dan kontrol kanan. Tiga balok generik sebelumnya tidak
    // memberi petunjuk apa pun tentang apa yang sedang dimuat.
    return (
      <div className="space-y-4 max-w-5xl mx-auto" aria-busy="true" aria-label="Memuat konfigurasi">
        <div className="flex items-end justify-between gap-3 pb-4 border-b-[3px] border-[var(--edge)]">
          <div className="space-y-2">
            <span className="sk sk-line block w-[132px] h-[19px]" />
            <span className="sk sk-line block w-[190px] h-[9px]" style={{ '--d': '80ms' }} />
          </div>
          <span className="sk sk-tile block w-[104px] h-[38px]" style={{ '--d': '150ms' }} />
        </div>
        {[0, 1, 2].map(g => (
          <div key={g} className="card p-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="sk sk-tile w-8 h-8 shrink-0" style={{ '--d': `${g * 110}ms` }} />
              <span className="sk sk-line w-[118px] h-[13px]" style={{ '--d': `${g * 110 + 50}ms` }} />
            </div>
            {[0, 1].map(r => (
              <div key={r} className="flex items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <span className="sk sk-line block w-[46%] h-[11px]" style={{ '--d': `${g * 110 + r * 70 + 90}ms` }} />
                  <span className="sk sk-line block w-[66%] h-[8px]" style={{ '--d': `${g * 110 + r * 70 + 130}ms` }} />
                </div>
                <span className="sk sk-tile w-[52px] h-[28px] shrink-0" style={{ '--d': `${g * 110 + r * 70 + 170}ms` }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Kepala */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b-[3px] border-[var(--edge)]">
        <div>
          <span className="kicker">PANEL KONFIGURASI</span>
          <h1 className="display-l !text-[30px] mt-1.5">PENGATURAN</h1>
          <p className="text-[12px] text-[var(--ink-2)] mt-1.5">Jaringan, tampilan uploader, kuota media, dan keamanan.</p>
        </div>
        <span className="chip shrink-0"><span className="dot-live" /> KONFIG AKTIF</span>
      </div>

      {/* Category Segmented Tabs */}
      <div className="seg-rail">
        {CATEGORIES.map(c => {
          const on = activeTab === c.id
          return (
            <button key={c.id} type="button" onClick={() => setActiveTab(c.id)}
              aria-current={on ? 'true' : undefined}
              className={`seg-tab ${on ? 'seg-tab-on' : ''}`}>
              <i className={`fa-solid ${c.icon} text-[11px]`} />
              <span className="whitespace-nowrap">{c.label}</span>
            </button>
          )
        })}
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* =================================================================== */}
        {/* TAB 1: JALUR & LAYANAN (NETWORK & SERVICES) */}
        {/* =================================================================== */}
        {activeTab === 'network' && (
          <div className="space-y-6 anim-fade">
            {/* Quick Restart Service Card */}
            <div className="plate plate-flat p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                    <i className="fa-solid fa-arrows-rotate text-[var(--volt)]" /> Kontrol Cepat Service (PM2)
                  </h3>
                  <p className="text-xs text-[var(--ink-2)] mt-0.5">Restart instan untuk reload konfigurasi port, sertifikat SSL, atau update bot</p>
                </div>
                <span className="text-[10px] font-mono text-[var(--ink-2)] bg-[var(--paper-2)] px-2.5 py-1 rounded-[var(--r-soft)] border border-[var(--edge)] self-start sm:self-auto">
                  PM2 · web + main
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      toast('Sedang me-restart Web Uploader...', 'info')
                      await restartWeb()
                      setTimeout(() => { toast('Web Uploader berhasil di-restart!', 'success'); loadCf() }, 1500)
                    } catch (e) { toast('Gagal restart web: ' + e.message, 'error') }
                  }}
                  className="btn btn-quiet rounded-[var(--r-soft)] text-left group gap-3.5"
                >
                  <div className="w-10 h-10 rounded-[var(--r-xs)] bg-[var(--paper-2)] border border-[var(--edge)] grid place-items-center shrink-0">
                    <i className="fa-solid fa-globe text-sm text-[var(--volt)] group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--ink)] group-hover:text-[var(--ink)]">Restart Web</p>
                    <p className="text-[10px] text-[var(--ink-2)]">Port 80 & 8443 (HTTP/TLS)</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      toast('Sedang me-restart Bot WhatsApp...', 'info')
                      await restartBot()
                      toast('Bot WhatsApp berhasil di-restart!', 'success')
                    } catch (e) { toast('Gagal restart bot: ' + e.message, 'error') }
                  }}
                  className="btn btn-quiet rounded-[var(--r-soft)] text-left group gap-3.5"
                >
                  <div className="w-10 h-10 rounded-[var(--r-xs)] bg-[var(--paper-2)] border border-[var(--edge)] grid place-items-center shrink-0">
                    <i className="fa-brands fa-whatsapp text-base text-[var(--acid)] group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--ink)] group-hover:text-[var(--ink)]">Restart Bot WA</p>
                    <p className="text-[10px] text-[var(--ink-2)]">Baileys WhatsApp daemon</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      toast('Sedang me-restart SEMUA service...', 'info')
                      await restartAll()
                      setTimeout(() => { toast('Semua service berhasil di-restart!', 'success'); loadCf() }, 2000)
                    } catch (e) { toast('Gagal restart: ' + e.message, 'error') }
                  }}
                  className="btn btn-quiet rounded-[var(--r-soft)] text-left group gap-3.5"
                >
                  <div className="w-10 h-10 rounded-[var(--r-xs)] bg-[var(--paper-2)] border border-[var(--edge)] grid place-items-center shrink-0">
                    <i className="fa-solid fa-rotate text-sm text-[var(--ink)] group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--ink)] group-hover:text-[var(--ink)]">Restart Semua</p>
                    <p className="text-[10px] text-[var(--ink-2)]">Bot + Web sekaligus</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Direct Upload Bypass Card */}
            <div className="plate plate-flat p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                      <i className="fa-solid fa-bolt text-[var(--volt)]" /> Direct Upload TLS 8443 (Bypass Cloudflare 100 MB)
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--ink-2)] leading-relaxed max-w-2xl">
                    Cloudflare Free menolak request payload &gt;100 MB (Error 413). Jalur ini menggunakan subdomain Grey-Cloud <span className="text-[var(--volt)] font-mono">up.swhdhlz.my.id:8443</span> dengan sertifikat SSL Let's Encrypt resmi untuk upload file tanpa batas ukuran dan tanpa chunking.
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={!!cf?.direct?.enabled}
                  disabled={cfBusy === 'direct' || !cf?.direct?.certReady}
                  aria-busy={cfBusy === 'direct'}
                  onClick={toggleDirect}
                  className={`btn min-h-10 shrink-0 !text-[11px] font-extrabold gap-2 ${cf?.direct?.enabled
                    ? 'btn-danger'
                    : 'btn-quiet !text-[var(--good)] !border-[color-mix(in_srgb,var(--good)_30%,transparent)]'}`}
                >
                  <i className={`fa-solid ${cfBusy === 'direct' ? 'fa-spinner fa-spin' : cf?.direct?.enabled ? 'fa-power-off' : 'fa-play'}`} />
                  {cfBusy === 'direct' ? 'Memproses…' : cf?.direct?.enabled ? 'Matikan Jalur Direct' : 'Nyalakan Jalur Direct'}
                </button>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                <div className="px-3 py-1.5 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cf?.direct?.enabled ? 'bg-good animate-pulse' : 'bg-[#7e90ad]'}`} />
                  <span className="text-xs font-mono text-[var(--ink-2)]">Setelan: <strong className="text-[var(--ink)]">{cf?.direct?.enabled ? 'AKTIF (ON)' : 'MATI (OFF)'}</strong></span>
                </div>
                <div className="px-3 py-1.5 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cf?.direct?.listening ? 'bg-good' : 'bg-bad'}`} />
                  <span className="text-xs font-mono text-[var(--ink-2)]">Port 8443: <strong className="text-[var(--ink)]">{cf?.direct?.listening ? 'OPEN (LISTEN)' : 'CLOSED'}</strong></span>
                </div>
                <div className="px-3 py-1.5 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cf?.direct?.certReady ? 'bg-good' : 'bg-bad'}`} />
                  <span className="text-xs font-mono text-[var(--ink-2)]">SSL Let's Encrypt: <strong className="text-[var(--ink)]">{cf?.direct?.certReady ? 'VALID (Ready)' : 'Missing'}</strong></span>
                </div>
              </div>
            </div>

            {/* Cloudflare DNS & Tunnel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* DNS Records */}
              <div className="plate plate-flat p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                    <i className="fa-solid fa-cloud text-[var(--volt)]" /> DNS Cloudflare Records
                  </h3>
                  {cf?.zone && (
                    <span className="text-[10px] font-mono text-[var(--ink-2)] bg-[var(--paper-2)] px-2 py-0.5 rounded border border-[var(--edge)]">
                      {cf.zone.plan} · Limit {cf.edgeCapMB} MB
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--ink-2)]">
                  Klik tombol untuk beralih mode Proxy CDN (Shield) atau Grey-Cloud Direct (Bypass limit).
                </p>

                {!cf ? (
                  <p className="text-xs font-mono text-[var(--ink-2)] py-4 text-center">Memuat data DNS...</p>
                ) : !cf.ok ? (
                  <p className="text-xs text-bad bg-bad/10 p-3 rounded-[var(--r-soft)] border border-bad/20">{cf.error}</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {cf.records.map(rec => (
                      <div key={rec.id} className="flex items-center justify-between gap-3 p-3 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] hover:border-[var(--edge)] transition-all">
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold text-[var(--ink)] truncate">{rec.name}</p>
                          <p className="text-[10px] text-[var(--ink-2)] font-mono">{rec.type} → {rec.content}</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!!rec.proxied}
                          aria-label={`Proxy Cloudflare untuk ${rec.name}`}
                          disabled={cfBusy === rec.id}
                          aria-busy={cfBusy === rec.id}
                          onClick={() => toggleProxy(rec)}
                          className={`btn min-h-9 shrink-0 !text-[10px] font-extrabold uppercase tracking-wider gap-1.5 ${rec.proxied
                            ? 'btn-quiet !text-[var(--acid)]'
                            : 'btn-warn'}`}
                        >
                          <i className={`fa-solid ${rec.proxied ? 'fa-shield-halved' : 'fa-bolt'}`} />
                          {cfBusy === rec.id ? '…' : rec.proxied ? 'Proxy ON' : 'Direct (Grey)'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tunnel & Riwayat Backup */}
              <div className="space-y-6">
                <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] space-y-3">
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                    <i className="fa-solid fa-route text-[var(--volt)]" /> Cloudflare Tunnel
                  </h3>
                  {tunnel ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${tunnel.running ? 'bg-good' : 'bg-bad'}`} />
                        <span className="font-semibold text-[var(--ink)]">{tunnel.running ? `Aktif (${tunnel.processes} proses)` : 'Tidak berjalan'}</span>
                      </div>
                      <p className="text-[11px] text-[var(--ink-2)]">ENABLE_TUNNEL: <strong className="text-[var(--ink)] font-mono">{tunnel.enabled ? '1' : '0'}</strong> · Kredensial: <strong className="text-[var(--ink)]">{tunnel.configured ? 'Lengkap' : 'Belum lengkap'}</strong></p>
                      {tunnel.domain && <p className="text-[11px] font-mono text-[var(--volt)] bg-[var(--paper-2)] px-2.5 py-1 rounded border border-[var(--edge)]">{tunnel.domain}</p>}
                    </div>
                  ) : <p className="text-xs text-[var(--ink-2)]">Memuat info tunnel...</p>}
                </div>

                <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                      <i className="fa-solid fa-clock-rotate-left text-[var(--acid)]" /> Riwayat Backup GitHub
                    </h3>
                    <button type="button" onClick={doBackup} disabled={backupBusy} className="text-xs text-[var(--volt)] hover:underline font-bold">
                      Backup Sekarang
                    </button>
                  </div>
                  {bkHistory.length ? (
                    <ul className="space-y-2 max-h-32 overflow-y-auto text-xs pr-1">
                      {bkHistory.slice(0, 5).map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] p-2 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)]">
                          <i className={`fa-solid mt-0.5 ${h.ok ? 'fa-circle-check text-good' : 'fa-circle-xmark text-bad'}`} />
                          <div className="min-w-0 flex-1">
                            <span className="text-[var(--ink-2)] font-mono">{new Date(h.ts).toLocaleString('id-ID')}</span>
                            <p className="text-[var(--ink)] truncate">{h.message} {h.ok && h.changed ? `(${h.changed} file)` : ''}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-[var(--ink-2)] italic">Belum ada riwayat backup.</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: TAMPILAN & BRAND (APPEARANCE & BRANDING) */}
        {/* =================================================================== */}
        {activeTab === 'branding' && (
          <div className="space-y-6 anim-fade">
            {/* Identity Form */}
            <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] space-y-5">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-solid fa-globe text-[var(--volt)]" /> Identitas Utama & Header
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Nama Situs</label>
                  <input type="text" value={data.siteName ?? ''} onChange={e => set('siteName', e.target.value)} placeholder="SHIROWAHD"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-semibold text-[var(--ink)] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Subtitle Web</label>
                  <input type="text" value={data.siteSubtitle ?? ''} onChange={e => set('siteSubtitle', e.target.value)} placeholder="Upload & claim video HD"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm text-[var(--ink)] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Domain Publik</label>
                  <input type="text" value={data.domain ?? ''} onChange={e => set('domain', e.target.value)} placeholder="swhdhlz.my.id"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-mono text-[var(--ink)] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Footer Brand Text</label>
                  <input type="text" value={data.footerText ?? ''} onChange={e => set('footerText', e.target.value)} placeholder="SWHDHLZ · BY SHIRO HLZ"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm text-[var(--ink)] transition-colors" />
                </div>
              </div>
            </div>

            {/* Hero Section Form */}
            <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] space-y-5">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles text-[var(--volt)]" /> Bagian Hero (Halaman Depan)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Judul Hero (Title)</label>
                  <input type="text" value={data.heroTitle ?? ''} onChange={e => set('heroTitle', e.target.value)} placeholder="STORY WA"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-semibold text-[var(--ink)] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Highlight Text (Gradient)</label>
                  <input type="text" value={data.heroSubtitle ?? ''} onChange={e => set('heroSubtitle', e.target.value)} placeholder="HD"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-semibold text-[var(--volt)] transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Deskripsi Hero</label>
                <textarea value={data.heroDesc ?? ''} onChange={e => set('heroDesc', e.target.value)} rows={2}
                  placeholder="ALAT UNTUK MEMBUAT STATUS WA KAMU TANPA COMPRES"
                  className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm text-[var(--ink)] resize-y transition-colors" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">
                  URL GIF Hero <span className="text-[var(--acid)]">(animasi — prioritas di atas gambar statis)</span>
                </label>
                <input type="text" value={data.heroGifUrl ?? ''} onChange={e => set('heroGifUrl', e.target.value)}
                  placeholder="/brand/hero.gif atau https://..."
                  className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-mono text-[var(--ink)] transition-colors" />
                <p className="text-[11px] text-[var(--ink-2)] mt-1">
                  Upload GIF di Galeri Brand lalu tekan tombol <b>GIF</b>. Kalau kosong, hero pakai <code className="font-mono">heroImageUrl</code>.
                </p>
                {data.heroGifUrl && (
                  <div className="mt-3 flex items-center gap-3 p-2 rounded-[var(--r-soft)] bg-black/30 border border-[var(--edge)]">
                    <img src={data.heroGifUrl} alt="" className="w-20 h-16 object-cover rounded-[var(--r-soft)] border border-[var(--edge)]" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-[var(--ink)]">Pratinjau GIF aktif</p>
                      <button type="button" onClick={() => set('heroGifUrl', '')}
                        className="btn btn-danger mt-1 rounded text-[10px]">HAPUS</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mode Tampilan & Komposisi Halaman */}
            <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] space-y-5">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-solid fa-circle-half-stroke text-[var(--volt)]" /> Mode Tampilan & Komposisi Halaman
              </h3>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Mode Default Pengunjung Baru</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: 'system', l: 'Ikut Perangkat', i: 'fa-desktop' },
                    { v: 'light', l: 'Terang', i: 'fa-sun' },
                    { v: 'dark', l: 'Gelap', i: 'fa-moon' },
                  ].map(o => {
                    const on = (data.themeDefault || 'light') === o.v
                    return (
                      <button key={o.v} type="button" onClick={() => set('themeDefault', o.v)}
                        aria-pressed={!!on} className={`seg-btn seg-btn-lg ${on ? 'seg-btn-on' : ''}`}>
                        <i className={`fa-solid ${o.i} text-[11px]`} />{o.l}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-[var(--ink-2)] mt-1.5">Pengunjung yang sudah pernah memilih mode sendiri tidak akan ditimpa.</p>
              </div>

              <div className="space-y-2">
                <Toggle on={data.showSteps !== false} onChange={() => toggle('showSteps', true)} label="Kartu 3 Langkah" desc="Blok Upload → Ambil Kode → Kirim di bawah hero" icon="fa-list-ol" color="#38bdf8" />
                <Toggle on={data.showStats !== false} onChange={() => toggle('showStats', true)} label="Panel Statistik Visual" desc="Grafik aktivitas 14 hari + log aktivitas langsung" icon="fa-chart-column" color="#34d399" />
                <Toggle on={data.showHistory !== false} onChange={() => toggle('showHistory', true)} label="Riwayat Upload Perangkat" desc="Daftar kode klaim milik pengunjung (tersimpan lokal)" icon="fa-clock-rotate-left" color="#fbbf24" />
                <Toggle on={data.showTicker !== false} onChange={() => toggle('showTicker', true)} label="Pita Teks Berjalan" desc="Marquee di bawah navbar & antar seksi (kecepatannya ikut scroll)" icon="fa-bars-staggered" color="#a78bfa" />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Isi Pita Berjalan</label>
                <input type="text" value={data.tickerText ?? ''} onChange={e => set('tickerText', e.target.value)}
                  placeholder="TANPA KOMPRESI · HINGGA 1440P · FPS ASLI · HAPUS OTOMATIS"
                  className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm text-[var(--ink)] transition-colors" />
                <p className="text-[11px] text-[var(--ink-2)] mt-1">Pisahkan antar item dengan tanda <b>·</b> (titik tengah).</p>
              </div>
            </div>

            {/* Popup Sambutan */}
            <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] space-y-5">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-solid fa-door-open text-[var(--volt)]" /> Isi Popup Sambutan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Judul Popup</label>
                  <input type="text" value={data.welcomeTitle ?? ''} onChange={e => set('welcomeTitle', e.target.value)}
                    placeholder="Kosong = pakai Nama Situs"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-semibold text-[var(--ink)] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Label Tombol Utama</label>
                  <input type="text" value={data.welcomeCta ?? ''} onChange={e => set('welcomeCta', e.target.value)}
                    placeholder="MULAI UPLOAD"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-semibold text-[var(--ink)] transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Teks Sambutan</label>
                <textarea value={data.welcomeText ?? ''} onChange={e => set('welcomeText', e.target.value)} rows={2}
                  placeholder="Upload media ke grup WhatsApp lewat bot. Tanpa turun mutu, tanpa aplikasi tambahan."
                  className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm text-[var(--ink)] resize-y transition-colors" />
                <p className="text-[11px] text-[var(--ink-2)] mt-1">Saklar on/off popup ini ada di tab <b>Keamanan &amp; Notif</b>.</p>
              </div>
            </div>

            {/* Galeri Gambar Brand */}
            <BrandGallery data={data} set={set} />

            {/* Pengumuman & Banner */}
            <div className="plate plate-flat p-5 space-y-4">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-[var(--ink)]" /> Banner & Pengumuman Publik
              </h3>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Banner Bar Singkat (Atas Upload Area)</label>
                <input type="text" value={data.bannerText ?? ''} onChange={e => set('bannerText', e.target.value)} placeholder="NEW UPDATE JIKA ADA EROR HUBUNGI ADMIN"
                  className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm text-[var(--ink)] transition-colors" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Pengumuman Lengkap (Popup / Halaman)</label>
                <textarea value={data.announcement ?? ''} onChange={e => set('announcement', e.target.value)} rows={3}
                  placeholder="Tulis pengumuman resmi di sini (kosongkan jika tidak ada)..."
                  className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm text-[var(--ink)] resize-y transition-colors" />
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: GRUP & SALURAN WA (WHATSAPP LINKS) */}
        {/* =================================================================== */}
        {activeTab === 'links' && (
          <div className="space-y-6 anim-fade">
            {/* Owner WA Field */}
            <div className="plate plate-flat p-5 space-y-4">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-brands fa-whatsapp text-[#25D366]" /> Nomor WhatsApp Owner
              </h3>
              <div className="max-w-md">
                <input type="text" value={data.ownerWhatsapp ?? ''} onChange={e => set('ownerWhatsapp', e.target.value)} placeholder="6282262421536"
                  className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[#25D366]/60 outline-none text-sm font-mono text-[var(--ink)] transition-colors" />
                <p className="text-[11px] text-[var(--ink-2)] mt-1">Gunakan format internasional tanpa tanda + (contoh: 6282262421536)</p>
              </div>
            </div>

            {/* List Links Groups & Channels */}
            <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                    <i className="fa-solid fa-link text-[var(--volt)]" /> Daftar Grup, Saluran & Tombol Klaim
                  </h3>
                  <p className="text-xs text-[var(--ink-2)] mt-0.5">Setiap link dapat dinyalakan/dimatikan kapan saja secara mandiri</p>
                </div>
              </div>

              <div className="space-y-6 divide-y divide-[var(--edge)]">
                {linkTypes.map(type => (
                  <div key={type.key} className="pt-6 first:pt-0">
                    <LinkSection type={type} data={data} setData={setData} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: MEDIA & STORAGE (LIMITS & ENCODING) */}
        {/* =================================================================== */}
        {activeTab === 'storage' && (
          <div className="space-y-6 anim-fade">
            {/* Upload Limits & Rules */}
            <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] space-y-5">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-solid fa-sliders text-[var(--ink)]" /> Batasan File & Standar WhatsApp
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Maks Ukuran File (MB)</label>
                  <input type="number" value={data.maxFileSizeMB ?? ''} onChange={e => set('maxFileSizeMB', e.target.value)} placeholder="0"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-mono text-[var(--ink)] transition-colors" />
                  <p className="text-[10px] text-[var(--ink-2)] mt-1">0 = tanpa batas maksimal</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Video Jadi Dokumen (MB)</label>
                  <input type="number" value={data.videoAsDocumentMB ?? ''} onChange={e => set('videoAsDocumentMB', e.target.value)} placeholder="180"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-mono text-[var(--ink)] transition-colors" />
                  <p className="text-[10px] text-[var(--ink-2)] mt-1">Server WA menolak video biasa &gt;180MB; kirim sebagai dokumen agar tembus utuh.</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Batas Upload Besar (MB)</label>
                  <input type="number" value={data.largeUploadMaxMB ?? ''} onChange={e => set('largeUploadMaxMB', e.target.value)} placeholder="0"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-mono text-[var(--ink)] transition-colors" />
                  <p className="text-[10px] text-[var(--ink-2)] mt-1">Berlaku saat mode file besar aktif</p>
                </div>
              </div>
            </div>

            {/* Retention & Cleanup */}
            <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] space-y-5">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-solid fa-broom text-[var(--acid)]" /> Masa Aktif & Pembersihan Otomatis
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Masa Aktif File (Menit)</label>
                  <input type="number" value={data.expireMinutes ?? ''} onChange={e => set('expireMinutes', e.target.value)} placeholder="1440"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-mono text-[var(--ink)] transition-colors" />
                  <p className="text-[10px] text-[var(--ink-2)] mt-1">1440 menit = 24 jam</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Interval Auto-Cleanup (Menit)</label>
                  <input type="number" value={data.autoCleanupInterval ?? ''} onChange={e => set('autoCleanupInterval', e.target.value)} placeholder="30"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-mono text-[var(--ink)] transition-colors" />
                  <p className="text-[10px] text-[var(--ink-2)] mt-1">Jeda waktu cron sweep file expired</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Kuota Storage VPS (MB)</label>
                  <input type="number" value={data.storageQuotaMB ?? ''} onChange={e => set('storageQuotaMB', e.target.value)} placeholder="5000"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-mono text-[var(--ink)] transition-colors" />
                  <p className="text-[10px] text-[var(--ink-2)] mt-1">0 = tanpa batas kuota</p>
                </div>
              </div>

              <div className="pt-2">
                <Toggle
                  on={data.autoCleanup !== false}
                  onChange={() => toggle('autoCleanup', true)}
                  label="Aktifkan Auto Cleanup Otomatis"
                  desc="Hapus berkas video/foto yang sudah melewati batas waktu kadaluarsa secara otomatis di latar belakang"
                  icon="fa-broom"
                  color="#34d399"
                />
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: KEAMANAN & NOTIFIKASI (SECURITY & NOTIFICATIONS) */}
        {/* =================================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-6 anim-fade">
            {/* Telegram Notifications */}
            <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] space-y-5">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-brands fa-telegram text-[#2AABEE]" /> Notifikasi Telegram Bot
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Telegram Bot Token</label>
                  <input type="text" value={data.telegramBotToken ?? ''} onChange={e => set('telegramBotToken', e.target.value)} placeholder="123456:ABC-DEF..."
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[#2AABEE]/60 outline-none text-sm font-mono text-[var(--ink)] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Telegram Chat ID</label>
                  <input type="text" value={data.telegramChatId ?? ''} onChange={e => set('telegramChatId', e.target.value)} placeholder="-1001234567890"
                    className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[#2AABEE]/60 outline-none text-sm font-mono text-[var(--ink)] transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <Toggle on={!!data.telegramNotifyUpload} onChange={() => toggle('telegramNotifyUpload')} label="Notif Upload Baru" icon="fa-cloud-arrow-up" color="#2AABEE" />
                <Toggle on={!!data.telegramNotifyClaim} onChange={() => toggle('telegramNotifyClaim')} label="Notif Klaim File" icon="fa-check-double" color="#34d399" />
                <Toggle on={!!data.telegramNotifyError} onChange={() => toggle('telegramNotifyError')} label="Notif Error Server" icon="fa-triangle-exclamation" color="#fb7185" />
              </div>
            </div>

            {/* UI Feature Toggles */}
            <div className="plate plate-flat p-5 space-y-4">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-solid fa-toggle-on text-[var(--volt)]" /> Saklar Fitur Tampilan Publik
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Toggle on={data.showWelcome !== false} onChange={() => toggle('showWelcome', true)} label="Popup Sambutan" desc="Popup sambutan saat web pertama dibuka" icon="fa-door-open" color="#38bdf8" />
                <Toggle on={data.showOwnerBtn !== false} onChange={() => toggle('showOwnerBtn', true)} label="Tombol Chat Developer" desc="Tampilkan tombol WhatsApp owner di popup" icon="fa-brands fa-whatsapp" color="#25D366" />
                <Toggle on={data.showChannelsBtn !== false} onChange={() => toggle('showChannelsBtn', true)} label="Tombol Saluran WA" desc="Tampilkan link saluran di popup" icon="fa-tower-broadcast" color="#38bdf8" />
                <Toggle on={data.showClaimBtn !== false} onChange={() => toggle('showClaimBtn', true)} label="Tombol Grup Klaim" desc="Tampilkan link grup klaim di web & modal sukses" icon="fa-comments" color="#34d399" />
                <Toggle on={data.showPopupBtns !== false} onChange={() => toggle('showPopupBtns', true)} label="Tombol Tambahan Popup" desc="Tampilkan tombol custom tambahan di popup" icon="fa-link" color="#818cf8" />
                <Toggle on={data.allowLargeUpload !== false} onChange={() => toggle('allowLargeUpload', true)} label="Mode Upload Besar (>95MB)" desc="Izinkan pengiriman file besar di web" icon="fa-cloud-arrow-up" color="#38bdf8" />
              </div>
            </div>

            {/* Mode Maintenance */}
            <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] space-y-3">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-solid fa-screwdriver-wrench text-[#fb7185]" /> Mode Pemeliharaan (Maintenance)
              </h3>
              <Toggle
                on={!!data.maintenance}
                onChange={() => toggle('maintenance')}
                label="Nyalakan Mode Maintenance"
                desc="Saat aktif, upload dinonaktifkan sementara dan halaman web menampilkan pesan pemeliharaan server"
                icon="fa-screwdriver-wrench"
                color="#fb7185"
              />
            </div>
          </div>
        )}

        {/* In-Flow Save Action Card (Bottom of Form) */}
        <div className="p-5 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="w-9 h-9 rounded-[var(--r-xs)] bg-[var(--paper-2)] border border-[var(--edge)] grid place-items-center">
              <i className="fa-solid fa-floppy-disk text-xs text-[var(--volt)]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--ink)]">Simpan Konfigurasi</p>
              <p className="text-[11px] text-[var(--ink-2)]">Pastikan semua setelan sudah sesuai sebelum menyimpan</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button type="button" onClick={doBackup} disabled={backupBusy}
              className="btn btn-quiet rounded-[var(--r-soft)] text-xs text-[var(--ink)] gap-2 active:scale-95">
              <i className={`fa-brands fa-github ${backupBusy ? 'fa-spin' : ''}`} />
              <span>Backup GitHub</span>
            </button>
            <button type="submit" disabled={busy} aria-busy={busy}
              className="btn btn-primary flex-1 sm:flex-initial">
              <i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} />
              {busy ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
