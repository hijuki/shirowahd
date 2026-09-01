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
    <div onClick={onChange} className="flex items-center justify-between gap-4 py-3.5 px-4 rounded-xl bg-white/[.02] border border-white/[.05] hover:border-white/[.10] hover:bg-white/[.04] transition-all duration-150 cursor-pointer group">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {icon && (
          <div className="w-9 h-9 shrink-0 rounded-lg grid place-items-center transition-transform group-hover:scale-105" style={{ background: `${color || '#38bdf8'}15`, border: `1px solid ${color || '#38bdf8'}30` }}>
            <i className={`fa-solid ${icon} text-xs`} style={{ color: color || '#38bdf8' }} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white/90 group-hover:text-white transition-colors">{label}</p>
          {desc && <p className="text-[11px] text-[#7e90ad] mt-0.5 leading-relaxed">{desc}</p>}
        </div>
      </div>
      <button type="button" role="switch" aria-checked={!!on} aria-label={label}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200 ${on ? 'bg-[#0062FF]' : 'bg-white/10'}`}>
        <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-md transition-all duration-200 ${on ? 'left-[22px]' : 'left-[3px]'}`} />
      </button>
    </div>
  )
}

function LinkCard({ item, onChange, onRemove, phName, phLink, color }) {
  return (
    <div className="rounded-xl bg-white/[.02] border border-white/[.06] p-3.5 space-y-2.5 hover:border-white/[.12] transition-all duration-150">
      <div className="flex items-center gap-2">
        <input value={item.name || ''} onChange={e => onChange({ ...item, name: e.target.value })} placeholder={phName}
          className="flex-1 min-w-0 rounded-lg px-3 py-2 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-xs font-semibold text-white/90 placeholder:text-[#7e90ad]/50 transition-colors" />
        <button type="button" onClick={onRemove} className="w-8 h-8 shrink-0 rounded-lg grid place-items-center text-bad/60 hover:text-bad hover:bg-bad/10 transition-colors">
          <i className="fa-solid fa-trash-can text-xs" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input value={item.link || ''} onChange={e => onChange({ ...item, link: e.target.value })} placeholder={phLink}
          className="flex-1 min-w-0 rounded-lg px-3 py-2 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-xs font-mono text-[#7e90ad] placeholder:text-[#7e90ad]/40 transition-colors" />
        <button type="button" onClick={() => onChange({ ...item, visible: item.visible === false ? true : false })}
          className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all ${item.visible !== false ? 'bg-good/15 text-good border border-good/30' : 'bg-white/[.05] text-[#7e90ad] border border-white/[.08]'}`}>
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
        <span className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-2">
          <i className={`fa-solid ${type.icon} text-xs`} style={{ color: type.color }} />
          {type.label}
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[.06] text-[#7e90ad]">
            {items.length}
          </span>
        </span>
        <button type="button" onClick={add} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/[.05] hover:bg-white/[.10] text-white/90 border border-white/[.08] transition-all flex items-center gap-1.5 active:scale-95">
          <i className="fa-solid fa-plus text-[10px]" />Tambah
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-[#7e90ad]/60 italic py-2">Belum ada link ditambahkan.</p>
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
      if (res.ok) { setMsg('File terupload: ' + res.file.name); load() }
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
      load()
    } catch (e) { alert('Gagal hapus: ' + e.message) }
  }

  const applyTo = (key, url) => {
    set(key, url)
    setMsg(`Dipakai sebagai ${key === 'logoUrl' ? 'Logo' : 'Foto Hero'} — klik Simpan di bawah`)
  }

  return (
    <div className="p-5 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold tracking-wider uppercase text-white/90 flex items-center gap-2">
            <i className="fa-solid fa-images text-[#818cf8]" /> Galeri Gambar Server
          </h4>
          <p className="text-[11px] text-[#7e90ad] mt-0.5">Upload logo atau background hero langsung ke server lokal</p>
        </div>
        <label className={`px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0062FF] hover:bg-[#0052D6] text-white transition-all cursor-pointer flex items-center gap-2 ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
          <i className="fa-solid fa-cloud-arrow-up text-xs" />
          {busy ? 'Mengupload…' : 'Upload File'}
          <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
        </label>
      </div>

      {msg && <p className="text-xs text-[#38bdf8] font-medium bg-[#38bdf8]/10 px-3 py-1.5 rounded-lg border border-[#38bdf8]/20">{msg}</p>}

      {files.length === 0 ? (
        <p className="text-xs text-[#7e90ad]/60 italic py-3 text-center border border-dashed border-white/[.08] rounded-xl">Belum ada file di galeri.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map(f => {
            const isLogo = data.logoUrl === f.url
            const isHero = data.heroImageUrl === f.url
            return (
              <div key={f.name} className="group relative rounded-xl overflow-hidden bg-white/[.03] border border-white/[.08] hover:border-white/[.20] transition-all flex flex-col">
                <div className="aspect-video w-full bg-black/40 relative overflow-hidden flex items-center justify-center">
                  <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    {isLogo && <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#0062FF] text-white">LOGO</span>}
                    {isHero && <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#34d399] text-black">HERO</span>}
                  </div>
                </div>
                <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                  <p className="text-[11px] font-mono text-[#7e90ad] truncate" title={f.name}>{f.name}</p>
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/[.06]">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => applyTo('logoUrl', f.url)} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${isLogo ? 'bg-[#0062FF]/20 text-[#38bdf8] border border-[#0062FF]/40' : 'bg-white/[.06] text-white/80 hover:bg-white/[.12]'}`}>Logo</button>
                      <button type="button" onClick={() => applyTo('heroImageUrl', f.url)} className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${isHero ? 'bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/40' : 'bg-white/[.06] text-white/80 hover:bg-white/[.12]'}`}>Hero</button>
                    </div>
                    <button type="button" onClick={() => onDelete(f.name)} className="w-6 h-6 rounded text-bad/60 hover:text-bad hover:bg-bad/10 grid place-items-center text-[10px] transition-colors"><i className="fa-solid fa-trash" /></button>
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
  const toggle = (k) => setData(p => ({ ...p, [k]: !p[k] }))

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
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#0062FF] border-t-transparent animate-spin" />
        <p className="text-xs font-mono text-[#7e90ad]">Memuat konfigurasi server...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[.06]">
        <div>
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-2xl tracking-tight text-white flex items-center gap-3">
            <span>Server Settings</span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#0062FF]/15 text-[#38bdf8] border border-[#0062FF]/30">
              v3.3.0
            </span>
          </h1>
          <p className="text-xs text-[#7e90ad] mt-1">Konfigurasi jaringan, tampilan uploader, kuota media, dan keamanan</p>
        </div>

        {/* Global Save Button Desktop */}
        <div className="hidden sm:flex items-center gap-2.5">
          <button type="button" onClick={doBackup} disabled={backupBusy}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[.04] hover:bg-white/[.08] text-white/90 border border-white/[.08] hover:border-white/[.15] transition-all flex items-center gap-2 active:scale-95">
            <i className={`fa-brands fa-github ${backupBusy ? 'fa-spin' : ''}`} />
            {backupBusy ? 'Backup...' : 'Backup GitHub'}
          </button>
          <button type="button" onClick={save} disabled={busy}
            className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-[#0062FF] hover:bg-[#0052D6] text-white shadow-[0_0_24px_-4px_rgba(0,98,255,0.5)] transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
            <i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} />
            {busy ? 'Menyimpan…' : 'Simpan Semua'}
          </button>
        </div>
      </div>

      {/* Category Segmented Tabs */}
      <div className="flex gap-1.5 p-1 rounded-2xl bg-white/[.03] border border-white/[.06] overflow-x-auto no-scrollbar">
        {CATEGORIES.map(c => {
          const isActive = activeTab === c.id
          return (
            <button
              key={c.id}
              onClick={() => setActiveTab(c.id)}
              className={`flex-1 min-w-[130px] sm:min-w-0 py-3 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2.5 select-none ${isActive
                ? 'bg-[#0062FF] text-white shadow-[0_4px_16px_rgba(0,98,255,0.35)]'
                : 'text-[#7e90ad] hover:text-white hover:bg-white/[.04]'}`}
            >
              <i className={`fa-solid ${c.icon} text-xs`} style={{ color: isActive ? '#ffffff' : c.color }} />
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
            <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                    <i className="fa-solid fa-arrows-rotate text-[#38bdf8]" /> Kontrol Cepat Service (PM2)
                  </h3>
                  <p className="text-xs text-[#7e90ad] mt-0.5">Restart instan untuk reload konfigurasi port, sertifikat SSL, atau update bot</p>
                </div>
                <span className="text-[10px] font-mono text-[#7e90ad] bg-white/[.04] px-2.5 py-1 rounded-full border border-white/[.06] self-start sm:self-auto">
                  Host: 95.111.221.189
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
                  className="p-3.5 rounded-xl bg-white/[.03] hover:bg-[#38bdf8]/10 border border-white/[.06] hover:border-[#38bdf8]/30 transition-all text-left group flex items-center gap-3.5"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#38bdf8]/15 border border-[#38bdf8]/30 grid place-items-center shrink-0">
                    <i className="fa-solid fa-globe text-sm text-[#38bdf8] group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/90 group-hover:text-white">Restart Web</p>
                    <p className="text-[10px] text-[#7e90ad]">Port 80 & 8443 (HTTP/TLS)</p>
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
                  className="p-3.5 rounded-xl bg-white/[.03] hover:bg-[#34d399]/10 border border-white/[.06] hover:border-[#34d399]/30 transition-all text-left group flex items-center gap-3.5"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#34d399]/15 border border-[#34d399]/30 grid place-items-center shrink-0">
                    <i className="fa-brands fa-whatsapp text-base text-[#34d399] group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/90 group-hover:text-white">Restart Bot WA</p>
                    <p className="text-[10px] text-[#7e90ad]">Baileys WhatsApp daemon</p>
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
                  className="p-3.5 rounded-xl bg-white/[.03] hover:bg-white/[.08] border border-white/[.06] hover:border-white/[.15] transition-all text-left group flex items-center gap-3.5"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/[.08] border border-white/[.15] grid place-items-center shrink-0">
                    <i className="fa-solid fa-rotate text-sm text-white group-hover:scale-110 transition-transform" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white/90 group-hover:text-white">Restart Semua</p>
                    <p className="text-[10px] text-[#7e90ad]">Bot + Web sekaligus</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Direct Upload Bypass Card */}
            <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                      <i className="fa-solid fa-bolt text-[#38bdf8]" /> Direct Upload TLS 8443 (Bypass Cloudflare 100 MB)
                    </h3>
                  </div>
                  <p className="text-xs text-[#7e90ad] leading-relaxed max-w-2xl">
                    Cloudflare Free menolak request payload &gt;100 MB (Error 413). Jalur ini menggunakan subdomain Grey-Cloud <span className="text-[#38bdf8] font-mono">up.swhdhlz.my.id:8443</span> dengan sertifikat SSL Let's Encrypt resmi untuk upload file tanpa batas ukuran dan tanpa chunking.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={cfBusy === 'direct' || !cf?.direct?.certReady}
                  onClick={toggleDirect}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-95 disabled:opacity-40 flex items-center gap-2 ${cf?.direct?.enabled
                    ? 'bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25'
                    : 'bg-good/15 text-good border border-good/30 hover:bg-good/25'}`}
                >
                  <i className={`fa-solid ${cfBusy === 'direct' ? 'fa-spinner fa-spin' : cf?.direct?.enabled ? 'fa-power-off' : 'fa-play'}`} />
                  {cfBusy === 'direct' ? 'Memproses…' : cf?.direct?.enabled ? 'Matikan Jalur Direct' : 'Nyalakan Jalur Direct'}
                </button>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2.5 pt-2">
                <div className="px-3 py-1.5 rounded-lg bg-white/[.03] border border-white/[.06] flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cf?.direct?.enabled ? 'bg-good animate-pulse' : 'bg-[#7e90ad]'}`} />
                  <span className="text-xs font-mono text-[#7e90ad]">Setelan: <strong className="text-white">{cf?.direct?.enabled ? 'AKTIF (ON)' : 'MATI (OFF)'}</strong></span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-white/[.03] border border-white/[.06] flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cf?.direct?.listening ? 'bg-good' : 'bg-bad'}`} />
                  <span className="text-xs font-mono text-[#7e90ad]">Port 8443: <strong className="text-white">{cf?.direct?.listening ? 'OPEN (LISTEN)' : 'CLOSED'}</strong></span>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-white/[.03] border border-white/[.06] flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cf?.direct?.certReady ? 'bg-good' : 'bg-bad'}`} />
                  <span className="text-xs font-mono text-[#7e90ad]">SSL Let's Encrypt: <strong className="text-white">{cf?.direct?.certReady ? 'VALID (Ready)' : 'Missing'}</strong></span>
                </div>
              </div>
            </div>

            {/* Cloudflare DNS & Tunnel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* DNS Records */}
              <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                    <i className="fa-solid fa-cloud text-[#38bdf8]" /> DNS Cloudflare Records
                  </h3>
                  {cf?.zone && (
                    <span className="text-[10px] font-mono text-[#7e90ad] bg-white/[.04] px-2 py-0.5 rounded border border-white/[.06]">
                      {cf.zone.plan} · Limit {cf.edgeCapMB} MB
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#7e90ad]">
                  Klik tombol untuk beralih mode Proxy CDN (Shield) atau Grey-Cloud Direct (Bypass limit).
                </p>

                {!cf ? (
                  <p className="text-xs font-mono text-[#7e90ad] py-4 text-center">Memuat data DNS...</p>
                ) : !cf.ok ? (
                  <p className="text-xs text-bad bg-bad/10 p-3 rounded-xl border border-bad/20">{cf.error}</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {cf.records.map(rec => (
                      <div key={rec.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[.02] border border-white/[.05] hover:border-white/[.10] transition-all">
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold text-white/90 truncate">{rec.name}</p>
                          <p className="text-[10px] text-[#7e90ad] font-mono">{rec.type} → {rec.content}</p>
                        </div>
                        <button
                          type="button"
                          disabled={cfBusy === rec.id}
                          onClick={() => toggleProxy(rec)}
                          className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 ${rec.proxied
                            ? 'bg-[#34d399]/15 text-[#34d399] border border-[#34d399]/30 hover:bg-[#34d399]/25'
                            : 'bg-[#fbbf24]/15 text-[#fbbf24] border border-[#fbbf24]/30 hover:bg-[#fbbf24]/25'}`}
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
                <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-3">
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                    <i className="fa-solid fa-route text-[#818cf8]" /> Cloudflare Tunnel
                  </h3>
                  {tunnel ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${tunnel.running ? 'bg-good' : 'bg-bad'}`} />
                        <span className="font-semibold text-white/90">{tunnel.running ? `Aktif (${tunnel.processes} proses)` : 'Tidak berjalan'}</span>
                      </div>
                      <p className="text-[11px] text-[#7e90ad]">ENABLE_TUNNEL: <strong className="text-white font-mono">{tunnel.enabled ? '1' : '0'}</strong> · Kredensial: <strong className="text-white">{tunnel.configured ? 'Lengkap' : 'Belum lengkap'}</strong></p>
                      {tunnel.domain && <p className="text-[11px] font-mono text-[#38bdf8] bg-[#38bdf8]/10 px-2.5 py-1 rounded border border-[#38bdf8]/20">{tunnel.domain}</p>}
                    </div>
                  ) : <p className="text-xs text-[#7e90ad]">Memuat info tunnel...</p>}
                </div>

                <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                      <i className="fa-solid fa-clock-rotate-left text-[#34d399]" /> Riwayat Backup GitHub
                    </h3>
                    <button type="button" onClick={doBackup} disabled={backupBusy} className="text-xs text-[#38bdf8] hover:underline font-bold">
                      Backup Sekarang
                    </button>
                  </div>
                  {bkHistory.length ? (
                    <ul className="space-y-2 max-h-32 overflow-y-auto text-xs pr-1">
                      {bkHistory.slice(0, 5).map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-[11px] p-2 rounded-lg bg-white/[.02] border border-white/[.04]">
                          <i className={`fa-solid mt-0.5 ${h.ok ? 'fa-circle-check text-good' : 'fa-circle-xmark text-bad'}`} />
                          <div className="min-w-0 flex-1">
                            <span className="text-[#7e90ad] font-mono">{new Date(h.ts).toLocaleString('id-ID')}</span>
                            <p className="text-white/90 truncate">{h.message} {h.ok && h.changed ? `(${h.changed} file)` : ''}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-[#7e90ad]/60 italic">Belum ada riwayat backup.</p>}
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
            <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-5">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                <i className="fa-solid fa-globe text-[#818cf8]" /> Identitas Utama & Header
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Nama Situs</label>
                  <input type="text" value={data.siteName ?? ''} onChange={e => set('siteName', e.target.value)} placeholder="SHIROWAHD"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm font-semibold text-white transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Subtitle Web</label>
                  <input type="text" value={data.siteSubtitle ?? ''} onChange={e => set('siteSubtitle', e.target.value)} placeholder="Upload & claim video HD"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm text-white/90 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Domain Publik</label>
                  <input type="text" value={data.domain ?? ''} onChange={e => set('domain', e.target.value)} placeholder="swhdhlz.my.id"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm font-mono text-white/90 transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Footer Brand Text</label>
                  <input type="text" value={data.footerText ?? ''} onChange={e => set('footerText', e.target.value)} placeholder="SWHDHLZ · BY SHIRO HLZ"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm text-white/90 transition-colors" />
                </div>
              </div>
            </div>

            {/* Hero Section Form */}
            <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-5">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                <i className="fa-solid fa-wand-magic-sparkles text-[#38bdf8]" /> Bagian Hero (Halaman Depan)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Judul Hero (Title)</label>
                  <input type="text" value={data.heroTitle ?? ''} onChange={e => set('heroTitle', e.target.value)} placeholder="STORY WA"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm font-semibold text-white transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Highlight Text (Gradient)</label>
                  <input type="text" value={data.heroSubtitle ?? ''} onChange={e => set('heroSubtitle', e.target.value)} placeholder="HD"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm font-semibold text-[#38bdf8] transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Deskripsi Hero</label>
                <textarea value={data.heroDesc ?? ''} onChange={e => set('heroDesc', e.target.value)} rows={2}
                  placeholder="ALAT UNTUK MEMBUAT STATUS WA KAMU TANPA COMPRES"
                  className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm text-white/90 resize-y transition-colors" />
              </div>
            </div>

            {/* Galeri Gambar Brand */}
            <BrandGallery data={data} set={set} />

            {/* Pengumuman & Banner */}
            <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-4">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-[#fbbf24]" /> Banner & Pengumuman Publik
              </h3>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Banner Bar Singkat (Atas Upload Area)</label>
                <input type="text" value={data.bannerText ?? ''} onChange={e => set('bannerText', e.target.value)} placeholder="NEW UPDATE JIKA ADA EROR HUBUNGI ADMIN"
                  className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm text-white transition-colors" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Pengumuman Lengkap (Popup / Halaman)</label>
                <textarea value={data.announcement ?? ''} onChange={e => set('announcement', e.target.value)} rows={3}
                  placeholder="Tulis pengumuman resmi di sini (kosongkan jika tidak ada)..."
                  className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm text-white/90 resize-y transition-colors" />
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
            <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-4">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                <i className="fa-brands fa-whatsapp text-[#25D366]" /> Nomor WhatsApp Owner
              </h3>
              <div className="max-w-md">
                <input type="text" value={data.ownerWhatsapp ?? ''} onChange={e => set('ownerWhatsapp', e.target.value)} placeholder="6282262421536"
                  className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#25D366]/60 outline-none text-sm font-mono text-white transition-colors" />
                <p className="text-[11px] text-[#7e90ad] mt-1">Gunakan format internasional tanpa tanda + (contoh: 6282262421536)</p>
              </div>
            </div>

            {/* List Links Groups & Channels */}
            <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                    <i className="fa-solid fa-link text-[#38bdf8]" /> Daftar Grup, Saluran & Tombol Klaim
                  </h3>
                  <p className="text-xs text-[#7e90ad] mt-0.5">Setiap link dapat dinyalakan/dimatikan kapan saja secara mandiri</p>
                </div>
              </div>

              <div className="space-y-6 divide-y divide-white/[.06]">
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
            <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-5">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                <i className="fa-solid fa-sliders text-[#fbbf24]" /> Batasan File & Standar WhatsApp
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Maks Ukuran File (MB)</label>
                  <input type="number" value={data.maxFileSizeMB ?? ''} onChange={e => set('maxFileSizeMB', e.target.value)} placeholder="0"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm font-mono text-white transition-colors" />
                  <p className="text-[10px] text-[#7e90ad] mt-1">0 = tanpa batas maksimal</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Video Jadi Dokumen (MB)</label>
                  <input type="number" value={data.videoAsDocumentMB ?? ''} onChange={e => set('videoAsDocumentMB', e.target.value)} placeholder="180"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm font-mono text-white transition-colors" />
                  <p className="text-[10px] text-[#7e90ad] mt-1">Server WA menolak video biasa &gt;180MB; kirim sebagai dokumen agar tembus utuh.</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Batas Upload Besar (MB)</label>
                  <input type="number" value={data.largeUploadMaxMB ?? ''} onChange={e => set('largeUploadMaxMB', e.target.value)} placeholder="0"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm font-mono text-white transition-colors" />
                  <p className="text-[10px] text-[#7e90ad] mt-1">Berlaku saat mode file besar aktif</p>
                </div>
              </div>
            </div>

            {/* Retention & Cleanup */}
            <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-5">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                <i className="fa-solid fa-broom text-[#34d399]" /> Masa Aktif & Pembersihan Otomatis
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Masa Aktif File (Menit)</label>
                  <input type="number" value={data.expireMinutes ?? ''} onChange={e => set('expireMinutes', e.target.value)} placeholder="1440"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm font-mono text-white transition-colors" />
                  <p className="text-[10px] text-[#7e90ad] mt-1">1440 menit = 24 jam</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Interval Auto-Cleanup (Menit)</label>
                  <input type="number" value={data.autoCleanupInterval ?? ''} onChange={e => set('autoCleanupInterval', e.target.value)} placeholder="30"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm font-mono text-white transition-colors" />
                  <p className="text-[10px] text-[#7e90ad] mt-1">Jeda waktu cron sweep file expired</p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Kuota Storage VPS (MB)</label>
                  <input type="number" value={data.storageQuotaMB ?? ''} onChange={e => set('storageQuotaMB', e.target.value)} placeholder="5000"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#0062FF]/60 outline-none text-sm font-mono text-white transition-colors" />
                  <p className="text-[10px] text-[#7e90ad] mt-1">0 = tanpa batas kuota</p>
                </div>
              </div>

              <div className="pt-2">
                <Toggle
                  on={data.autoCleanup !== false}
                  onChange={() => toggle('autoCleanup')}
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
            <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-5">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                <i className="fa-brands fa-telegram text-[#2AABEE]" /> Notifikasi Telegram Bot
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Telegram Bot Token</label>
                  <input type="text" value={data.telegramBotToken ?? ''} onChange={e => set('telegramBotToken', e.target.value)} placeholder="123456:ABC-DEF..."
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#2AABEE]/60 outline-none text-sm font-mono text-white transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Telegram Chat ID</label>
                  <input type="text" value={data.telegramChatId ?? ''} onChange={e => set('telegramChatId', e.target.value)} placeholder="-1001234567890"
                    className="w-full rounded-xl px-4 py-3 bg-white/[.04] border border-white/[.08] focus:border-[#2AABEE]/60 outline-none text-sm font-mono text-white transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <Toggle on={!!data.telegramNotifyUpload} onChange={() => toggle('telegramNotifyUpload')} label="Notif Upload Baru" icon="fa-cloud-arrow-up" color="#2AABEE" />
                <Toggle on={!!data.telegramNotifyClaim} onChange={() => toggle('telegramNotifyClaim')} label="Notif Klaim File" icon="fa-check-double" color="#34d399" />
                <Toggle on={!!data.telegramNotifyError} onChange={() => toggle('telegramNotifyError')} label="Notif Error Server" icon="fa-triangle-exclamation" color="#fb7185" />
              </div>
            </div>

            {/* UI Feature Toggles */}
            <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-4">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
                <i className="fa-solid fa-toggle-on text-[#38bdf8]" /> Saklar Fitur Tampilan Publik
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Toggle on={data.showWelcome !== false} onChange={() => toggle('showWelcome')} label="Welcome Intro Popup" desc="Popup sambutan saat web pertama dibuka" icon="fa-door-open" color="#38bdf8" />
                <Toggle on={data.showOwnerBtn !== false} onChange={() => toggle('showOwnerBtn')} label="Tombol Chat Developer" desc="Tampilkan tombol WhatsApp owner di popup" icon="fa-brands fa-whatsapp" color="#25D366" />
                <Toggle on={data.showChannelsBtn !== false} onChange={() => toggle('showChannelsBtn')} label="Tombol Saluran WA" desc="Tampilkan link saluran di popup" icon="fa-tower-broadcast" color="#38bdf8" />
                <Toggle on={data.showClaimBtn !== false} onChange={() => toggle('showClaimBtn')} label="Tombol Grup Klaim" desc="Tampilkan link grup klaim di web & modal sukses" icon="fa-comments" color="#34d399" />
                <Toggle on={data.showPopupBtns !== false} onChange={() => toggle('showPopupBtns')} label="Extra Popup Buttons" desc="Tampilkan tombol custom tambahan di popup" icon="fa-link" color="#818cf8" />
                <Toggle on={data.allowLargeUpload !== false} onChange={() => toggle('allowLargeUpload')} label="Mode Upload Besar (>95MB)" desc="Ijinkan pengiriman file besar di web" icon="fa-cloud-arrow-up" color="#38bdf8" />
              </div>
            </div>

            {/* Mode Maintenance */}
            <div className="p-6 rounded-2xl bg-white/[.02] border border-white/[.06] space-y-3">
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-white/90 flex items-center gap-2">
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

        {/* Floating Mobile/Desktop Sticky Save Bar */}
        <div className="fixed bottom-20 inset-x-4 sm:bottom-6 sm:inset-x-auto sm:right-8 z-40 max-w-xl ml-auto anim-fade">
          <div className="p-2.5 rounded-2xl bg-[rgba(4,7,15,0.92)] backdrop-blur-2xl border border-white/[.15] shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex items-center justify-between gap-3">
            <div className="hidden sm:flex items-center gap-2 pl-3">
              <span className="w-2 h-2 rounded-full bg-[#0062FF] animate-pulse" />
              <span className="text-xs font-mono text-[#7e90ad]">Panel Pengaturan Siap Disimpan</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button type="button" onClick={doBackup} disabled={backupBusy}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/[.06] hover:bg-white/[.12] text-white/90 border border-white/[.08] transition-all flex items-center justify-center gap-2 active:scale-95">
                <i className={`fa-brands fa-github ${backupBusy ? 'fa-spin' : ''}`} />
                <span className="hidden sm:inline">Backup</span>
              </button>
              <button type="submit" disabled={busy}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-extrabold bg-[#0062FF] hover:bg-[#0052D6] text-white shadow-[0_0_20px_rgba(0,98,255,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                <i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} />
                {busy ? 'Menyimpan…' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
