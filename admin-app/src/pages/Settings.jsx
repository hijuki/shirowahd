import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../api'

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
  { key: 'groups', label: 'Grup WhatsApp', placeholder: 'JID grup, pisahkan koma' },
  { key: 'channels', label: 'Channels', placeholder: 'Channel ID, pisahkan koma' },
  { key: 'claimGroups', label: 'Claim Groups', placeholder: 'JID grup klaim, pisahkan koma' },
]

export default function Settings() {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    getSettings().then(s => {
      if (s) {
        // convert arrays to comma-sep text for textareas
        for (const f of textareaFields) {
          if (Array.isArray(s[f.key])) s[f.key] = s[f.key].join(', ')
        }
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
        if (typeof payload[f.key] === 'string') {
          payload[f.key] = payload[f.key].split(',').map(s => s.trim()).filter(Boolean)
        }
      }
      if (payload.maxFileSizeMB != null) payload.maxFileSizeMB = Number(payload.maxFileSizeMB)
      if (payload.expireMinutes != null) payload.expireMinutes = Number(payload.expireMinutes)
      await saveSettings(payload)
      notify('Pengaturan tersimpan!')
    } catch (e) { notify(`Error: ${e.message}`) }
    setBusy(false)
  }

  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl md:text-3xl grad-text">Settings</h1>
        <p className="text-muted text-sm mt-1">Konfigurasi situs & bot</p>
      </div>
      {loading ? <p className="text-muted text-sm">Memuat pengaturan…</p> : (
        <form onSubmit={save} className="glass p-6 md:p-8 space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            {fields.map(f => (
              <div key={f.key}>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">{f.label}</label>
                <input
                  type={f.type}
                  value={data[f.key] ?? ''}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full rounded-xl px-4 py-3 bg-white/5 border border-line focus:border-brand2 outline-none transition-colors text-sm"
                />
              </div>
            ))}
          </div>
          <div className="divider-glow" />
          <div className="space-y-5">
            {textareaFields.map(f => (
              <div key={f.key}>
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">{f.label}</label>
                <textarea
                  value={data[f.key] ?? ''}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  className="w-full rounded-xl px-4 py-3 bg-white/5 border border-line focus:border-brand2 outline-none transition-colors text-sm resize-y"
                />
              </div>
            ))}
          </div>
          <button type="submit" disabled={busy} className="btn-glow rounded-xl px-6 py-3 font-display font-bold disabled:opacity-60">
            {busy ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Menyimpan…</> : <><i className="fa-solid fa-floppy-disk mr-2" />Simpan Pengaturan</>}
          </button>
        </form>
      )}
      {toast && <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 toast-card rounded-xl px-5 py-3 text-sm anim-pop z-50"><i className="fa-solid fa-circle-check text-emerald-300 mr-2" />{toast}</div>}
    </div>
  )
}
