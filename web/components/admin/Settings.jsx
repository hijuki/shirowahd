'use client'
import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '@/lib/admin-api'

const inputFields = [
  { key: 'siteName', label: 'Nama Situs', ph: 'ShiroWahd' },
  { key: 'siteSubtitle', label: 'Subtitle', ph: 'Upload video & foto' },
  { key: 'ownerWhatsapp', label: 'Nomor WhatsApp Owner', ph: '628xxx' },
  { key: 'maxFileSizeMB', label: 'Maks File (MB)', ph: '100', num: true },
  { key: 'expireMinutes', label: 'Expire (menit)', ph: '120', num: true },
  { key: 'domain', label: 'Domain', ph: 'example.com' },
]

const listFields = [
  { key: 'groups', label: 'Grup WhatsApp', ph: 'Nama — https://chat.whatsapp.com/xxx' },
  { key: 'channels', label: 'Saluran / Channel', ph: 'Nama — https://whatsapp.com/channel/xxx' },
  { key: 'claimGroups', label: 'Grup Claim', ph: 'Nama — https://chat.whatsapp.com/xxx' },
  { key: 'popupButtons', label: 'Popup Buttons (extra)', ph: 'Label — https://link' },
]

const toggles = [
  { key: 'showWelcome', label: 'Tampilkan Welcome Popup', desc: 'Popup intro muncul saat pertama buka' },
  { key: 'showOwnerBtn', label: 'Tombol Chat Developer', desc: 'Button WA owner di popup' },
  { key: 'showChannelsBtn', label: 'Tombol Saluran', desc: 'Link channel di popup' },
  { key: 'showClaimBtn', label: 'Tombol Grup Claim', desc: 'Link grup claim di popup + kode' },
  { key: 'showPopupBtns', label: 'Extra Popup Buttons', desc: 'Tombol custom tambahan' },
  { key: 'autoCleanup', label: 'Auto Cleanup', desc: 'Hapus file expired otomatis' },
  { key: 'maintenance', label: 'Mode Maintenance', desc: 'Upload dinonaktifkan sementara' },
]

const fmtList = (v) => {
  if (!Array.isArray(v)) return v ?? ''
  return v.map(x => typeof x === 'string' ? x : [x.name, x.link].filter(Boolean).join(' — ')).join('\n')
}
const parseList = (str) => String(str || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean).map(s => {
  const p = s.split(/\s+—\s+/)
  return p.length >= 2 ? { name: p[0], link: p.slice(1).join(' — ') } : { name: s }
})

function Toggle({ on, onChange, label, desc }) {
  return (
    <label className="flex items-center justify-between gap-3 py-3 cursor-pointer group">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold">{label}</p>
        {desc && <p className="text-[11px] text-[#7e90ad] mt-0.5">{desc}</p>}
      </div>
      <button type="button" onClick={onChange}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors duration-[250ms] ${on ? 'bg-[#22d3ee]' : 'bg-white/10'}`}>
        <span className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-md transition-all duration-[250ms] ${on ? 'left-[22px]' : 'left-[3px]'}`} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
      </button>
    </label>
  )
}

export default function Settings({ toast }) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getSettings().then(s => {
      if (s) {
        for (const f of listFields) s[f.key] = fmtList(s[f.key])
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
      for (const f of listFields) payload[f.key] = parseList(payload[f.key])
      if (payload.maxFileSizeMB != null) payload.maxFileSizeMB = Number(payload.maxFileSizeMB)
      if (payload.expireMinutes != null) payload.expireMinutes = Number(payload.expireMinutes)
      if (payload.autoCleanupInterval != null) payload.autoCleanupInterval = Number(payload.autoCleanupInterval)
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
          <h3 className="text-xs font-bold tracking-[.15em] uppercase text-[#7e90ad]/60">Umum</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inputFields.map(f => (
              <div key={f.key}>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block">{f.label}</label>
                <input type={f.num ? 'number' : 'text'} value={data[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.ph}
                  className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#22d3ee]/40 outline-none text-sm transition-colors duration-[150ms]" />
              </div>
            ))}
          </div>
        </div>

        {/* Pengumuman */}
        <div className="card p-5 space-y-3">
          <h3 className="text-xs font-bold tracking-[.15em] uppercase text-[#7e90ad]/60 flex items-center gap-2">
            <i className="fa-solid fa-bullhorn text-[#fbbf24]" /> Pengumuman
          </h3>
          <textarea value={data.announcement ?? ''} onChange={e => set('announcement', e.target.value)}
            placeholder="Tulis pengumuman di sini — muncul di halaman upload (kosongkan untuk sembunyikan)"
            rows={3} className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#fbbf24]/40 outline-none text-sm resize-y transition-colors duration-[150ms]" />
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block">Banner Text (singkat)</label>
            <input type="text" value={data.bannerText ?? ''} onChange={e => set('bannerText', e.target.value)} placeholder="Info singkat di atas upload area"
              className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#22d3ee]/40 outline-none text-sm transition-colors duration-[150ms]" />
          </div>
        </div>

        {/* Toggles */}
        <div className="card p-5">
          <h3 className="text-xs font-bold tracking-[.15em] uppercase text-[#7e90ad]/60 mb-2">Fitur Popup & Tampilan</h3>
          <div className="divide-y divide-white/[.05]">
            {toggles.map(t => <Toggle key={t.key} on={data[t.key] !== false} onChange={() => toggle(t.key)} label={t.label} desc={t.desc} />)}
          </div>
        </div>

        {/* Link lists */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold tracking-[.15em] uppercase text-[#7e90ad]/60">Grup & Saluran</h3>
          {listFields.map(f => (
            <div key={f.key}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#7e90ad] mb-1 block">{f.label}</label>
              <textarea value={data[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.ph} rows={3}
                className="w-full rounded-xl px-3.5 py-2.5 bg-white/[.04] border border-white/[.08] focus:border-[#22d3ee]/40 outline-none text-sm resize-y transition-colors duration-[150ms]" />
            </div>
          ))}
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full sm:w-auto rounded-xl px-8 py-3 font-bold">
          {busy ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Menyimpan…</> : <><i className="fa-solid fa-floppy-disk mr-2" />Simpan</>}
        </button>
      </form>
    </div>
  )
}
