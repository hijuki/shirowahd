import { useEffect, useMemo, useState } from 'react'
import { getVideos, deleteVideo, extendVideo, cleanupExpired, getUploadLog } from '../api'

const fmtBytes = (b) => {
  if (!b && b !== 0) return '—'
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++ }
  return `${b.toFixed(i ? 1 : 0)} ${u[i]}`
}
const fmtTime = (ts) => {
  if (!ts) return '—'
  const d = new Date(typeof ts === 'number' ? ts : Number(ts) || ts)
  if (isNaN(d)) return String(ts)
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function Files() {
  const [videos, setVideos] = useState([])
  const [log, setLog] = useState([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const load = async () => {
    try {
      const [v, l] = await Promise.all([getVideos(), getUploadLog()])
      setVideos(Array.isArray(v) ? v : []); setLog(Array.isArray(l) ? l : [])
    } catch { } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() =>
    videos.filter(v => !q || (v.name || '').toLowerCase().includes(q.toLowerCase()) || (v.code || '').toLowerCase().includes(q.toLowerCase())),
    [videos, q])

  const act = async (fn, okMsg, ...args) => {
    setBusy(true)
    try { await fn(...args); notify(okMsg); await load() } catch (e) { notify(`Error: ${e.message}`) }
    setBusy(false)
  }

  const delOne = (code) => { if (confirm(`Hapus file ${code}?`)) act(deleteVideo, 'File dihapus', code) }
  const extOne = (code) => act(extendVideo, 'Masa aktif diperpanjang +1 jam', code)

  const bulkDelete = () => {
    if (!selected.size) return
    if (!confirm(`Hapus ${selected.size} file terpilih?`)) return
    setBusy(true)
    Promise.allSettled([...selected].map(c => deleteVideo(c)))
      .then(() => { notify(`${selected.size} file dihapus`); setSelected(new Set()); load() })
      .finally(() => setBusy(false))
  }
  const bulkExtend = () => {
    if (!selected.size) return
    setBusy(true)
    Promise.allSettled([...selected].map(c => extendVideo(c)))
      .then(() => { notify(`${selected.size} file diperpanjang`); setSelected(new Set()); load() })
      .finally(() => setBusy(false))
  }

  const toggleSel = (code) => setSelected(prev => {
    const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n
  })
  const allSelected = filtered.length > 0 && filtered.every(v => selected.has(v.code))

  const remainingLabel = (v) => {
    if (v.remaining == null) return '—'
    if (typeof v.remaining === 'number') {
      const m = Math.round(v.remaining / 60000)
      return m >= 60 ? `${Math.floor(m / 60)}j ${m % 60}m` : `${m}m`
    }
    return String(v.remaining)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl grad-text">Files</h1>
          <p className="text-muted text-sm mt-1">{videos.length} file tersimpan</p>
        </div>
        <button onClick={() => confirm('Hapus semua file kedaluwarsa?') && act(cleanupExpired, 'Cleanup selesai')}
          disabled={busy} className="btn-glow rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50">
          <i className="fa-solid fa-broom mr-2" />Bersihkan Kedaluwarsa
        </button>
      </div>

      {/* Search + bulk actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama atau kode…"
            className="w-full rounded-xl pl-10 pr-4 py-2.5 bg-white/5 border border-line focus:border-brand2 outline-none text-sm" />
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2 anim-fade">
            <span className="text-xs text-muted self-center mr-1">{selected.size} dipilih</span>
            <button onClick={bulkExtend} disabled={busy} className="rounded-xl px-3 py-2.5 text-sm bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/25 transition-colors"><i className="fa-solid fa-clock-rotate-left mr-1.5" />+1 Jam</button>
            <button onClick={bulkDelete} disabled={busy} className="rounded-xl px-3 py-2.5 text-sm bg-rose-500/15 border border-rose-500/30 text-rose-200 hover:bg-rose-500/25 transition-colors"><i className="fa-solid fa-trash mr-1.5" />Hapus</button>
          </div>
        )}
      </div>

      {/* Files table */}
      <div className="glass overflow-hidden">
        {loading ? <p className="text-muted text-sm p-6">Memuat…</p> : filtered.length === 0 ? (
          <p className="text-muted text-sm p-6 text-center">Tidak ada file{q ? ' yang cocok' : ''}.</p>
        ) : (
          <>
            {/* desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-muted text-xs uppercase tracking-wider border-b border-line">
                  <th className="px-4 py-3 w-10"><input type="checkbox" checked={allSelected} onChange={e => e.target.checked ? setSelected(new Set(filtered.map(v => v.code))) : setSelected(new Set())} /></th>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">Kode</th>
                  <th className="px-4 py-3 text-left">Ukuran</th>
                  <th className="px-4 py-3 text-left">Tipe</th>
                  <th className="px-4 py-3 text-left">Sisa Waktu</th>
                  <th className="px-4 py-3 text-left">Waktu Upload</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.code} className="border-b border-line/50 hover:bg-white/[.03] transition-colors">
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.has(v.code)} onChange={() => toggleSel(v.code)} /></td>
                    <td className="px-4 py-3 max-w-[220px] truncate font-medium" title={v.name}>{v.name}</td>
                    <td className="px-4 py-3 font-mono text-indigo-300">{v.code}</td>
                    <td className="px-4 py-3">{fmtBytes(v.size)}</td>
                    <td className="px-4 py-3"><span className={`chip px-2.5 py-1 text-[11px] ${v.type === 'video' ? 'bg-violet-500/15 text-violet-300' : 'bg-pink-500/15 text-pink-300'}`}>{v.type}</span></td>
                    <td className="px-4 py-3">{remainingLabel(v)}</td>
                    <td className="px-4 py-3 text-muted">{fmtTime(v.timestamp)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => extOne(v.code)} disabled={busy} title="Perpanjang 1 jam" className="text-cyan-300 hover:text-cyan-200 px-2 transition-colors"><i className="fa-solid fa-clock-rotate-left" /></button>
                      <button onClick={() => delOne(v.code)} disabled={busy} title="Hapus" className="text-rose-400 hover:text-rose-300 px-2 transition-colors"><i className="fa-solid fa-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* mobile cards */}
            <div className="md:hidden divide-y divide-line/50">
              {filtered.map(v => (
                <div key={v.code} className="p-4 flex gap-3 items-start">
                  <input type="checkbox" checked={selected.has(v.code)} onChange={() => toggleSel(v.code)} className="mt-1" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{v.name}</p>
                    <p className="text-xs text-muted mt-0.5 font-mono text-indigo-300">{v.code} · {fmtBytes(v.size)} · {v.type}</p>
                    <p className="text-xs text-muted mt-0.5"><i className="fa-solid fa-clock mr-1" />Sisa {remainingLabel(v)} · {fmtTime(v.timestamp)}</p>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => extOne(v.code)} disabled={busy} className="text-xs rounded-lg px-2.5 py-1.5 bg-cyan-500/15 text-cyan-200 border border-cyan-500/30"><i className="fa-solid fa-clock-rotate-left mr-1" />+1 Jam</button>
                      <button onClick={() => delOne(v.code)} disabled={busy} className="text-xs rounded-lg px-2.5 py-1.5 bg-rose-500/15 text-rose-200 border border-rose-500/30"><i className="fa-solid fa-trash mr-1" />Hapus</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Upload log */}
      <div>
        <h2 className="font-display font-bold text-lg mb-3"><i className="fa-solid fa-clock-rotate-left text-indigo-300 mr-2" />Log Upload</h2>
        <div className="glass max-h-96 overflow-y-auto">
          {!log.length ? <p className="text-muted text-sm p-6 text-center">Belum ada log.</p> : log.map((l, i) => (
            <div key={i} className="hist-item flex items-center gap-3 px-4 py-3 text-sm border-b border-line/40 last:border-0">
              <i className={`fa-solid ${l.type === 'video' ? 'fa-film text-violet-300' : 'fa-image text-pink-300'} shrink-0`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.filename}</p>
                <p className="text-xs text-muted">{fmtTime(l.timestamp)} · IP {l.ip} · {fmtBytes(l.size)}</p>
              </div>
              <span className="font-mono text-xs text-indigo-300 shrink-0">{l.code}</span>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 toast-card rounded-xl px-5 py-3 text-sm anim-pop z-50">
          <i className="fa-solid fa-circle-check text-emerald-300 mr-2" />{toast}
        </div>
      )}
    </div>
  )
}
