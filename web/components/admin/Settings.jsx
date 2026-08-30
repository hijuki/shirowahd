'use client'
import { useEffect, useState } from 'react'
import { getSettings, saveSettings, backupToGithub, getBackupHistory, getTunnelStatus } from '@/lib/admin-api'

const inputFields = [
  { key: 'siteName', label: 'Nama Situs', ph: 'ShiroWahd', icon: 'fa-globe' },
  { key: 'siteSubtitle', label: 'Subtitle', ph: 'Upload video & foto', icon: 'fa-pen' },
  { key: 'ownerWhatsapp', label: 'Nomor WhatsApp Owner', ph: '628xxx', icon: 'fa-brands fa-whatsapp' },
  { key: 'domain', label: 'Domain', ph: 'example.com', icon: 'fa-link' },
]

const numFields = [
  { key: 'maxFileSizeMB', label: 'Maks File (MB)', ph: '100', icon: 'fa-weight-hanging', suffix: 'MB', desc: '0 = tanpa batas' },
  { key: 'expireMinutes', label: 'Expire (menit)', ph: '120', icon: 'fa-hourglass-half', suffix: 'min' },
  { key: 'storageQuotaMB', label: 'Kuota Storage (MB)', ph: '5000', icon: 'fa-database', suffix: 'MB', desc: '0 = tanpa batas' },
  { key: 'rateLimit', label: 'Rate Limit (upload/jam)', ph: '0', icon: 'fa-gauge-high', desc: '0 = tanpa batas' },
  { key: 'rateCooldown', label: 'Rate Cooldown (detik)', ph: '0', icon: 'fa-clock', desc: 'Jeda antar upload' },
  { key: 'autoCleanupInterval', label: 'Auto Cleanup (menit)', ph: '30', icon: 'fa-broom', desc: 'Interval bersih-bersih file expired' },
]

const toggles = [
  { key: 'showWelcome', label: 'Welcome Popup', desc: 'Popup intro saat pertama buka', icon: 'fa-door-open', color: '#22d3ee' },
  { key: 'showOwnerBtn', label: 'Tombol Chat Developer', desc: 'Button WA owner di popup', icon: 'fa-brands fa-whatsapp', color: '#25D366' },
  { key: 'showChannelsBtn', label: 'Tombol Saluran', desc: 'Link channel di popup', icon: 'fa-tower-broadcast', color: '#22d3ee' },
  { key: 'showClaimBtn', label: 'Tombol Grup Claim', desc: 'Link grup claim di popup & kode', icon: 'fa-comments', color: '#34d399' },
  { key: 'showPopupBtns', label: 'Extra Popup Buttons', desc: 'Tombol custom tambahan', icon: 'fa-link', color: '#3b82f6' },
  { key: 'autoCleanup', label: 'Auto Cleanup', desc: 'Hapus file expired otomatis', icon: 'fa-broom', color: '#fbbf24' },
  { key: 'maintenance', label: 'Mode Maintenance', desc: 'Upload dinonaktifkan sementara', icon: 'fa-screwdriver-wrench', color: '#fb7185' },
]

const telegramToggles = [
  { key: 'telegramNotifyUpload', label: 'Notif Upload', desc: 'Kirim notifikasi saat ada upload baru' },
  { key: 'telegramNotifyClaim', label: 'Notif Claim', desc: 'Kirim notifikasi saat ada klaim file' },
  { key: 'telegramNotifyError', label: 'Notif Error', desc: 'Kirim notifikasi saat ada error' },
]

// Link list types
const linkTypes = [
  { key: 'channels', label: 'Saluran / Channel', icon: 'fa-tower-broadcast', color: '#22d3ee', phName: 'Nama saluran', phLink: 'https://whatsapp.com/channel/xxx' },
  { key: 'claimGroups', label: 'Grup Claim', icon: 'fa-comments', color: '#34d399', phName: 'Nama grup', phLink: 'https://chat.whatsapp.com/xxx' },
  { key: 'groups', label: 'Grup WhatsApp', icon: 'fa-users', color: '#3b82f6', phName: 'Nama grup', phLink: 'https://chat.whatsapp.com/xxx' },
  { key: 'popupButtons', label: 'Custom Popup Buttons', icon: 'fa-link', color: '#fb7185', phName: 'Label tombol', phLink: 'https://link-tujuan' },
]

function Toggle({ on, onChange, label, desc, icon, color }) {
  return (
    <label className="flex items-center justify-between gap-3 py-3 cursor-pointer group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div className="w-8 h-8 shrink-0 rounded-[10px] grid place-items-center" style={{ background: `${color || '#22d3ee'}12`, border: `1px solid ${color || '#22d3ee'}25` }}>
            <i className={`fa-solid ${icon} text-[11px]`} style={{ color: color || '#22d3ee' }} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{label}</p>
          {desc && <p className="text-[11px] text-[#7e90ad] mt-0.5">{desc}</p>}
        </div>
      </div>
      <button type="button" onClick={onChange}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors duration-[250ms] ${on ? 'bg-[#22d3ee]' : 'bg-white/10'}`}>
        <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-md transition-all duration-[250ms] ${on ? 'left-[22px]' : 'left-[3px]'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
      </button>
    </label>
  )
}

// Per-link card with inline toggle
function LinkCard({ item, onChange, onRemove, phName, phLink, color }) {
  return (
    <div className="rounded-[14px] bg-white/[.02] border border-white/[.06] p-3 space-y-2 group hover:border-white/[.10] transition-all duration-[150ms]">
      <div className="flex items-center gap-2">
        <input value={item.name || ''} onChange={e => onChange({ ...item, name: e.target.value })} placeholder={phName}
          className="flex-1 min-w-0 rounded-[10px] px-3 py-2 bg-white/[.04] border border-white/[.06] focus:border-[#22d3ee]/40 outline-none text-[13px] font-semibold transition-colors duration-[150ms]" />
        <button type="button" onClick={onRemove} className="w-8 h-8 shrink-0 rounded-[10px] grid place-items-center text-bad/50 hover:text-bad hover:bg-bad/10 transition-all duration-[150ms]">
          <i className="fa-solid fa-trash-can text-[10px]" />
        </button>
      </div>
      <input value={item.link || ''} onChange={e => onChange({ ...item, link: e.target.value })} placeholder={phLink}
        className="w-full rounded-[10px] px-3 py-2 bg-white/[.04] border border-white/[.06] focus:border-[#22d3ee]/40 outline-none text-[12px] font-mono text-[#7e90ad] transition-colors duration-[150ms]" />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#7e90ad]/60 font-semibold flex items-center gap-1.5">
          <span className={`w-[6px] h-[6px] rounded-full transition-colors duration-[150ms] ${item.visible !== false ? 'bg-ok' : 'bg-white/20'}`} />
          {item.visible !== false ? 'Tampil di uploader' : 'Tersembunyi'}
        </span>
        <button type="button" onClick={() => onChange({ ...item, visible: item.visible === false ? true : false })}
          className={`relative w-9 h-5 rounded-full transition-colors duration-[250ms] ${item.visible !== false ? 'bg-ok' : 'bg-white/10'}`}>
          <span className={`absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow-sm transition-all duration-[250ms] ${item.visible !== false ? 'left-[18px]' : 'left-[2px]'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
        </button>
      </div>
    </div>
  )
}

// Link list section with add button
function LinkSection({ type, data, setData }) {
  const items = data[type.key] || []
  const setItems = (newItems) => setData(p => ({ ...p, [type.key]: newItems }))
  const add = () => setItems([...items, { name: '', link: '', visible: true }])
  const update = (idx, item) => { const n = [...items]; n[idx] = item; setItems(n) }
  const remove = (idx) => setItems(items.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[9px] grid place-items-center" style={{ background: `${type.color}12`, border: `1px solid ${type.color}25` }}>
            <i className={`fa-solid ${type.icon} text-[10px]`} style={{ color: type.color }} />
          </div>
          <div>
            <p className="text-[12px] font-bold">{type.label}</p>
            <p className="text-[9px] text-[#7e90ad]">{items.length} item</p>
          </div>
        </div>
        <button type="button" onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-white/[.04] border border-white/[.06] hover:bg-white/[.08] hover:border-white/[.12] text-[11px] font-bold transition-all duration-[150ms] active:scale-[.97]">
          <i className="fa-solid fa-plus text-[9px]" style={{ color: type.color }} /> Tambah
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-4 text-center rounded-[12px] border border-dashed border-white/[.06]">
          <p className="text-[#7e90ad]/50 text-[11px]">Belum ada. Klik "Tambah" untuk menambahkan.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <LinkCard key={idx} item={item} onChange={it => update(idx, it)} onRemove={() => remove(idx)} phName={type.phName} phLink={type.phLink} color={type.color} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Settings({ toast }) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [backupBusy, setBackupBusy] = useState(false)
  const [bkHistory, setBkHistory] = useState([])
  const [tunnel, setTunnel] = useState(null)

  const loadBackupHistory = () => getBackupHistory().then(r => setBkHistory(r?.history || [])).catch(() => {})

  const doBackup = async () => {
    setBackupBusy(true)
    try {
      const r = await backupToGithub()
      toast(r.message || 'Backup berhasil!', 'success')
    } catch (e) { toast('Backup gagal: ' + e.message, 'error') }
    setBackupBusy(false)
    loadBackupHistory()
  }

  useEffect(() => {
    loadBackupHistory()
    getTunnelStatus().then(setTunnel).catch(() => {})
  }, [])

  useEffect(() => {
    getSettings().then(s => {
      if (s) {
        // Normalize link arrays: ensure each item has {name, link, visible}
        for (const t of linkTypes) {
          const arr = s[t.key]
          if (Array.isArray(arr)) {
            s[t.key] = arr.map(item => {
              if (typeof item === 'string') {
                const p = item.split(/\s+—\s+/)
                return { name: p[0] || '', link: p[1] || '', visible: true }
              }
              return { name: item.name || '', link: item.link || '', visible: item.visible !== false }
            })
          } else {
            s[t.key] = []
          }
        }
        setData(s)
      }
    }).finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setData(p => ({ ...p, [k]: v }))
  const toggle = (k) => set(k, !data[k])

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const payload = { ...data }
      // Number fields
      for (const f of numFields) {
        if (payload[f.key] != null) payload[f.key] = Number(payload[f.key]) || 0
      }
      // Link arrays already in {name, link, visible} format
      await saveSettings(payload)
      toast('Tersimpan!', 'success')
    } catch (e) { toast(e.message, 'error') }
    setBusy(false)
  }

  if (loading) return (
    <div className="space-y-6">
      <div><div className="skeleton h-7 w-40 mb-2" /><div className="skeleton h-4 w-56" /></div>
      <div className="card p-6 space-y-4">{[...Array(6)].map((_, i) => <div key={i}><div className="skeleton h-4 w-24 mb-2" /><div className="skeleton h-10 w-full" /></div>)}</div>
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl grad-text">Settings</h1>
        <p className="text-[#7e90ad] text-sm mt-1">Konfigurasi situs & fitur</p>
      </div>

      <form onSubmit={save} className="space-y-4">
        {/* Umum */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-[.15em] uppercase text-[#7e90ad]/60 flex items-center gap-2">
            <i className="fa-solid fa-gear text-[#22d3ee]" /> Umum
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inputFields.map(f => (
              <div key={f.key}>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block flex items-center gap-1.5">
                  <i className={`${f.icon.startsWith('fa-brands') ? f.icon : `fa-solid ${f.icon}`} text-[9px] text-[#22d3ee]/60`} />
                  {f.label}
                </label>
                <input type="text" value={data[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.ph}
                  className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#22d3ee]/40 outline-none text-sm transition-colors duration-[150ms]" />
              </div>
            ))}
          </div>
        </div>

        {/* Limits & Quota */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-[.15em] uppercase text-[#7e90ad]/60 flex items-center gap-2">
            <i className="fa-solid fa-sliders text-[#3b82f6]" /> Batas & Kuota
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {numFields.map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block flex items-center gap-1.5">
                  <i className={`fa-solid ${f.icon} text-[8px] text-[#3b82f6]/60`} />
                  {f.label}
                </label>
                <input type="number" value={data[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.ph}
                  className="w-full rounded-xl px-3 py-2 bg-white/[.04] border border-white/[.08] focus:border-[#3b82f6]/40 outline-none text-sm font-mono transition-colors duration-[150ms]" />
                {f.desc && <p className="text-[8px] text-[#7e90ad]/50 mt-0.5">{f.desc}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Tampilan Web Uploader */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-[.15em] uppercase text-[#7e90ad]/60 flex items-center gap-2">
            <i className="fa-solid fa-palette text-[#22d3ee]" /> Tampilan Web Uploader
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block">Judul Hero</label>
              <input type="text" value={data.heroTitle ?? ''} onChange={e => set('heroTitle', e.target.value)} placeholder="Upload Media HD"
                className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#22d3ee]/40 outline-none text-sm transition-colors duration-[150ms]" />
              <p className="text-[8px] text-[#7e90ad]/50 mt-0.5">Kosong = default "Upload Media HD"</p>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block">Highlight Text</label>
              <input type="text" value={data.heroSubtitle ?? ''} onChange={e => set('heroSubtitle', e.target.value)} placeholder="Media HD"
                className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#22d3ee]/40 outline-none text-sm transition-colors duration-[150ms]" />
              <p className="text-[8px] text-[#7e90ad]/50 mt-0.5">Bagian yang gradient warna (kosong = "Media HD")</p>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block">Deskripsi Hero</label>
            <textarea value={data.heroDesc ?? ''} onChange={e => set('heroDesc', e.target.value)} rows={2}
              placeholder="Kirim video & foto ke grup WhatsApp lewat kode klaim — cepat & mudah"
              className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#22d3ee]/40 outline-none text-sm resize-y transition-colors duration-[150ms]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block">URL Logo</label>
              <input type="text" value={data.logoUrl ?? ''} onChange={e => set('logoUrl', e.target.value)} placeholder="/logo.svg atau https://..."
                className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#22d3ee]/40 outline-none text-sm font-mono transition-colors duration-[150ms]" />
              <p className="text-[8px] text-[#7e90ad]/50 mt-0.5">Kosong = ikon WhatsApp default</p>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block">Footer Text</label>
              <input type="text" value={data.footerText ?? ''} onChange={e => set('footerText', e.target.value)} placeholder="SWHDHLZ · BY HILLZ"
                className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#22d3ee]/40 outline-none text-sm transition-colors duration-[150ms]" />
            </div>
          </div>
        </div>

        {/* Pengumuman */}
        <div className="card p-5 space-y-3">
          <h3 className="text-xs font-bold tracking-[.15em] uppercase text-[#7e90ad]/60 flex items-center gap-2">
            <i className="fa-solid fa-bullhorn text-[#fbbf24]" /> Pengumuman
          </h3>
          <textarea value={data.announcement ?? ''} onChange={e => set('announcement', e.target.value)}
            placeholder="Tulis pengumuman — muncul di halaman upload (kosongkan untuk sembunyikan)"
            rows={3} className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#fbbf24]/40 outline-none text-sm resize-y transition-colors duration-[150ms]" />
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block">Banner Text (singkat)</label>
            <input type="text" value={data.bannerText ?? ''} onChange={e => set('bannerText', e.target.value)} placeholder="Info singkat di atas upload area"
              className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#22d3ee]/40 outline-none text-sm transition-colors duration-[150ms]" />
          </div>
        </div>

        {/* Fitur Popup & Tampilan — toggles */}
        <div className="card p-5">
          <h3 className="text-xs font-bold tracking-[.15em] uppercase text-[#7e90ad]/60 mb-2 flex items-center gap-2">
            <i className="fa-solid fa-toggle-on text-[#34d399]" /> Fitur Popup & Tampilan
          </h3>
          <div className="divide-y divide-white/[.05]">
            {toggles.map(t => <Toggle key={t.key} on={data[t.key] !== false} onChange={() => toggle(t.key)} label={t.label} desc={t.desc} icon={t.icon} color={t.color} />)}
          </div>
        </div>

        {/* Link & Grup — per-item with toggle */}
        <div className="card p-5 space-y-5">
          <h3 className="text-xs font-bold tracking-[.15em] uppercase text-[#7e90ad]/60 flex items-center gap-2">
            <i className="fa-solid fa-link text-[#22d3ee]" /> Link & Grup
          </h3>
          <p className="text-[11px] text-[#7e90ad] -mt-2">Setiap link punya toggle sendiri — kontrol mana yang muncul di web uploader.</p>
          {linkTypes.map(type => (
            <LinkSection key={type.key} type={type} data={data} setData={setData} />
          ))}
        </div>

        {/* Telegram Notifications */}
        <div className="card p-5 space-y-3">
          <h3 className="text-xs font-bold tracking-[.15em] uppercase text-[#7e90ad]/60 flex items-center gap-2">
            <i className="fa-brands fa-telegram text-[#2AABEE]" /> Notifikasi Telegram
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block">Bot Token</label>
              <input type="text" value={data.telegramBotToken ?? ''} onChange={e => set('telegramBotToken', e.target.value)} placeholder="123456:ABC-DEF..."
                className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#2AABEE]/40 outline-none text-sm font-mono transition-colors duration-[150ms]" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block">Chat ID</label>
              <input type="text" value={data.telegramChatId ?? ''} onChange={e => set('telegramChatId', e.target.value)} placeholder="-1001234567890"
                className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#2AABEE]/40 outline-none text-sm font-mono transition-colors duration-[150ms]" />
            </div>
          </div>
          <div className="divide-y divide-white/[.05]">
            {telegramToggles.map(t => <Toggle key={t.key} on={!!data[t.key]} onChange={() => toggle(t.key)} label={t.label} desc={t.desc} icon="fa-bell" color="#2AABEE" />)}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto rounded-xl px-8 py-3 font-bold">
            {busy ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Menyimpan…</> : <><i className="fa-solid fa-floppy-disk mr-2" />Simpan</>}
          </button>
          <button type="button" onClick={doBackup} disabled={backupBusy}
            className="w-full sm:w-auto rounded-xl px-8 py-3 font-bold bg-[#24292e] hover:bg-[#2f363d] text-white border border-white/[.08] hover:border-white/[.15] transition-all duration-[200ms] active:scale-[.97] flex items-center justify-center gap-2">
            {backupBusy ? <><i className="fa-solid fa-spinner fa-spin" />Backup...</> : <><i className="fa-brands fa-github" />Backup ke GitHub</>}
          </button>
        </div>

        {/* Status tunnel + riwayat backup */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[14px] bg-white/[.03] border border-white/[.06] p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7e90ad]">
              <i className="fa-solid fa-cloud-arrow-up mr-2" />Cloudflare Tunnel
            </p>
            {tunnel ? (
              <div className="space-y-1 text-sm">
                <p className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${tunnel.running ? 'bg-[#34d399]' : 'bg-[#fb7185]'}`} />
                  {tunnel.running ? `Aktif (${tunnel.processes} proses)` : 'Tidak berjalan'}
                </p>
                <p className="text-xs text-[#7e90ad]">ENABLE_TUNNEL: {tunnel.enabled ? '1' : '0'} · Kredensial: {tunnel.configured ? 'lengkap' : 'belum lengkap'}</p>
                {tunnel.domain && <p className="text-xs font-mono text-[#7e90ad]">{tunnel.domain}</p>}
              </div>
            ) : <p className="text-xs text-[#7e90ad]">Memuat…</p>}
          </div>

          <div className="rounded-[14px] bg-white/[.03] border border-white/[.06] p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7e90ad]">
              <i className="fa-solid fa-clock-rotate-left mr-2" />Riwayat Backup
            </p>
            {bkHistory.length ? (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto text-xs">
                {bkHistory.slice(0, 8).map((h, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <i className={`fa-solid mt-0.5 ${h.ok ? 'fa-circle-check text-[#34d399]' : 'fa-circle-xmark text-[#fb7185]'}`} />
                    <span className="flex-1">
                      <span className="text-[#7e90ad]">{new Date(h.ts).toLocaleString('id-ID')}</span>
                      {' — '}{h.message}
                      {h.ok && h.changed ? ` (${h.changed} file)` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-[#7e90ad]">Belum ada riwayat backup.</p>}
          </div>
        </div>
      </form>
    </div>
  )
}
