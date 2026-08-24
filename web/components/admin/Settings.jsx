'use client'
import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '@/lib/admin-api'

const fields = [
  { key: 'siteName', label: 'Nama Situs', placeholder: 'ShiroWahd', type: 'text' },
  { key: 'siteSubtitle', label: 'Subtitle', placeholder: 'Upload video & foto', type: 'text' },
  { key: 'bannerText', label: 'Banner Text', placeholder: 'Info / pengumuman', type: 'text' },
  { key: 'ownerWhatsapp', label: 'WhatsApp Owner', placeholder: '628xxx', type: 'text' },
  { key: 'maxFileSizeMB', label: 'Maks Ukuran File (MB)', placeholder: '100', type: 'number' },
  { key: 'expireMinutes', label: 'Masa Kedaluwarsa (menit)', placeholder: '120', type: 'number' },
  { key: 'domain', label: 'Domain', placeholder: 'example.com', type: 'text' },
]

const textareaFields = [
  { key: 'groups', label: 'Grup WhatsApp', placeholder: 'Nama — https://chat.whatsapp.com/xxx (satu per baris)' },
  { key: 'channels', label: 'Channels', placeholder: 'Nama — https://whatsapp.com/channel/xxx (satu per baris)' },
  { key: 'claimGroups', label: 'Claim Groups', placeholder: 'Nama — https://chat.whatsapp.com/xxx (satu per baris)' },
  { key: 'popupButtons', label: 'Popup Buttons (Welcome & Kode)', placeholder: 'Label — https://link (satu per baris)\nContoh: Grup Claim — https://chat.whatsapp.com/xxx' },
]

// server menyimpan {name, link}[] — tampilkan sebagai "Nama — link" per baris
const fmtList = (v) => {
  if (!Array.isArray(v)) return v ?? ''
  return v.map(x => {
    if (typeof x === 'string') return x
    return [x.name, x.link].filter(Boolean).join(' — ')
  }).join('\n')
}
const parseList = (str) => String(str || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean).map(s => {
  const parts = s.split(/\s+—\s+/)
  return parts.length >= 2 ? { name: parts[0], link: parts.slice(1).join(' — ') } : { name: s }
})

export default function Settings({ toast }) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getSettings().then(s => {
      if (s) {
        for (const f of textareaFields) s[f.key] = fmtList(s[f.key])
        setData(s)
      }
    }).finally(() => setLoading(false))
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const payload = { ...data }
      for (const f of textareaFields) {
        payload[f.key] = parseList(payload[f.key])
      }
      if (payload.maxFileSizeMB != null) payload.maxFileSizeMB = Number(payload.maxFileSizeMB)
      if (payload.expireMinutes != null) payload.expireMinutes = Number(payload.expireMinutes)
      await saveSettings(payload)
      toast('Pengaturan tersimpan!', 'success')
    } catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-3xl grad-text">Settings</h1>
        <p className="text-[#7e90ad] text-sm mt-1">Konfigurasi situs &amp; bot</p>
      </div>
      {loading ? (
        <div className="card p-6 md:p-8 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">{[...Array(7)].map((_, i) => <div key={i}><div className="skeleton h-4 w-24 mb-2" /><div className="skeleton h-10 w-full" /></div>)}</div>
          <div className="space-y-5">{[...Array(3)].map((_, i) => <div key={i}><div className="skeleton h-4 w-32 mb-2" /><div className="skeleton h-20 w-full" /></div>)}</div>
        </div>
      ) : (
        <form onSubmit={save} className="card p-6 md:p-8 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            {fields.map(f => (
              <div key={f.key}>
                <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">{f.label}</label>
                <input
                  type={f.type}
                  value={data[f.key] ?? ''}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full rounded-[12px] px-4 py-3 bg-white/5 border border-white/[.07] focus:border-[#22d3ee]/50 outline-none transition-colors duration-[150ms] text-sm"
                />
              </div>
            ))}
          </div>
          <div className="divider-glow" />
          <div className="space-y-5">
            {textareaFields.map(f => (
              <div key={f.key}>
                <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">{f.label}</label>
                <textarea
                  value={data[f.key] ?? ''}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  className="w-full rounded-[12px] px-4 py-3 bg-white/5 border border-white/[.07] focus:border-[#22d3ee]/50 outline-none transition-colors duration-[150ms] text-sm resize-y"
                />
              </div>
            ))}
          </div>
          <button type="submit" disabled={busy} className="btn-primary rounded-[12px] px-6 py-3 font-[family-name:var(--font-display)] font-bold">
            {busy ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Menyimpan…</> : <><i className="fa-solid fa-floppy-disk mr-2" />Simpan Pengaturan</>}
          </button>
        </form>
      )}
    </div>
  )
}
