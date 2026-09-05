'use client'
import { useEffect, useMemo, useState } from 'react'
import { getVideos, deleteVideo, extendVideo, cleanupExpired, cleanupOrphans, getUploadLog } from '@/lib/admin-api'

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

export default function Files({ toast }) {
  const [videos, setVideos] = useState([])
  const [log, setLog] = useState([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

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
    try { await fn(...args); toast(okMsg, 'success'); await load() } catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  const delOne = (code) => { if (confirm(`Hapus file ${code}?`)) act(deleteVideo, 'File dihapus', code) }
  const extOne = (code) => act(extendVideo, 'Masa aktif diperpanjang +1 jam', code)

  const doCleanOrphans = async () => {
    if (!confirm('Hapus file orphan (ada di disk, tidak tercatat di index)?')) return
    setBusy(true)
    try {
      const r = await cleanupOrphans()
      const mb = ((r?.freed || 0) / 1048576).toFixed(1)
      toast(r?.deleted ? `${r.deleted} file orphan dihapus, ${mb} MB dibebaskan` : 'Tidak ada file orphan', 'success')
      await load()
    } catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  const bulkDelete = () => {
    if (!selected.size) return
    if (!confirm(`Hapus ${selected.size} file terpilih?`)) return
    setBusy(true)
    Promise.allSettled([...selected].map(c => deleteVideo(c)))
      .then(() => { toast(`${selected.size} file dihapus`, 'success'); setSelected(new Set()); load() })
      .finally(() => setBusy(false))
  }
  const bulkExtend = () => {
    if (!selected.size) return
    setBusy(true)
    Promise.allSettled([...selected].map(c => extendVideo(c)))
      .then(() => { toast(`${selected.size} file diperpanjang`, 'success'); setSelected(new Set()); load() })
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
          <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-3xl grad-text">Files</h1>
          <p className="text-[var(--ink-2)] text-sm mt-1">{videos.length} file tersimpan</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => confirm('Hapus semua file kedaluwarsa?') && act(cleanupExpired, 'Cleanup selesai')}
            disabled={busy} aria-busy={busy} className="btn-primary text-sm">
            <i className="fa-solid fa-broom mr-2" />Bersihkan Kedaluwarsa
          </button>
          <button onClick={doCleanOrphans}
            disabled={busy} aria-busy={busy} title="Hapus file di disk yang tidak tercatat di index (sisa index reset)"
            className="btn btn-quiet">
            <i className="fa-solid fa-ghost mr-2" />Hapus File Orphan
          </button>
        </div>
      </div>

      {/* Search + bulk actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-2)] text-sm" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama atau kode…"
            className="w-full rounded-[var(--r-soft)] pl-10 pr-4 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm transition-colors duration-[150ms]" />
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2 anim-fade">
            <span className="text-xs text-[var(--ink-2)] self-center mr-1">{selected.size} dipilih</span>
            <button onClick={bulkExtend} disabled={busy} aria-busy={busy} className="btn btn-quiet bg-[#22d3ee]/15 text-[var(--volt)] hover:bg-[#22d3ee]/25"><i className="fa-solid fa-clock-rotate-left mr-1.5" />+1 Jam</button>
            <button onClick={bulkDelete} disabled={busy} aria-busy={busy} className="btn btn-danger"><i className="fa-solid fa-trash mr-1.5" />Hapus</button>
          </div>
        )}
      </div>

      {/* Files table */}
      <div className="card overflow-hidden">
        {loading ? (
          /* Meniru baris berkas: ikon jenis + nama + ukuran + aksi. Lima balok
             seragam sebelumnya tidak menunjukkan bahwa ini sebuah daftar. */
          <div className="divide-y-2 divide-[var(--edge)]" aria-busy="true" aria-label="Memuat daftar berkas">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="sk sk-tile w-9 h-9 shrink-0" style={{ '--d': `${i * 80}ms` }} />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <span className="sk sk-line block h-[11px]"
                    style={{ width: `${52 + ((i * 13) % 34)}%`, '--d': `${i * 80 + 40}ms` }} />
                  <span className="sk sk-line block w-[74px] h-[8px]" style={{ '--d': `${i * 80 + 80}ms` }} />
                </div>
                <span className="sk sk-line w-[54px] h-[10px] shrink-0" style={{ '--d': `${i * 80 + 120}ms` }} />
                <span className="sk sk-tile w-8 h-8 shrink-0" style={{ '--d': `${i * 80 + 160}ms` }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <i className={`fa-solid ${q ? 'fa-magnifying-glass' : 'fa-folder-open'} text-4xl text-[var(--ink-3)] mb-3`} />
            <p className="text-[var(--ink-2)] text-sm">Tidak ada file{q ? ' yang cocok' : ''}.</p>
          </div>
        ) : (
          <>
            {/* desktop table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-[var(--ink-2)] text-xs uppercase tracking-wider border-b border-[var(--edge)]">
                  <th className="px-4 py-3 w-10"><input type="checkbox" aria-label="Pilih semua file" checked={allSelected} onChange={e => e.target.checked ? setSelected(new Set(filtered.map(v => v.code))) : setSelected(new Set())} /></th>
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
                  <tr key={v.code} className="border-b border-[var(--edge)] hover:bg-[var(--paper-2)] transition-colors duration-[150ms]">
                    <td className="px-4 py-3"><input type="checkbox" aria-label={`Pilih ${v.code}`} checked={selected.has(v.code)} onChange={() => toggleSel(v.code)} /></td>
                    <td className="px-4 py-3 max-w-[220px] truncate font-medium" title={v.name}>{v.name}</td>
                    <td className="px-4 py-3 font-mono text-[var(--volt)]">{v.code}</td>
                    <td className="px-4 py-3">{fmtBytes(v.size)}</td>
                    <td className="px-4 py-3"><span className={`chip px-2.5 py-1 text-[11px] ${v.type === 'video' ? 'bg-[#3b82f6]/15 text-[#93c5fd]' : 'bg-emerald-500/15 text-emerald-300'}`}>{v.type}</span></td>
                    <td className="px-4 py-3">{remainingLabel(v)}</td>
                    <td className="px-4 py-3 text-[var(--ink-2)]">{fmtTime(v.ts || v.timestamp)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => extOne(v.code)} disabled={busy} aria-busy={busy} title="Perpanjang 1 jam" aria-label={`Perpanjang ${v.code} 1 jam`} className="btn btn-icon btn-quiet !text-[var(--volt)] mr-1.5"><i className="fa-solid fa-clock-rotate-left" /></button>
                      <button onClick={() => delOne(v.code)} disabled={busy} aria-busy={busy} title="Hapus" aria-label={`Hapus ${v.code}`} className="btn btn-icon btn-danger"><i className="fa-solid fa-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* mobile cards */}
            <div className="md:hidden divide-y divide-[var(--edge)]">
              {filtered.map(v => (
                <div key={v.code} className="p-4 flex gap-3 items-start">
                  {/* Kotak centang bawaan 13x13px tidak bisa dipencet akurat di HP. */}
                  {/* Padding TIDAK berlaku di input[type=checkbox] (appearance bawaan browser
                      mengabaikannya), jadi area sentuh 40px dibuat lewat <label> pembungkus. */}
                  <label aria-label={`Pilih ${v.code}`} className="shrink-0 -m-2.5 p-2.5 cursor-pointer inline-flex items-start">
                    <input type="checkbox" checked={selected.has(v.code)} onChange={() => toggleSel(v.code)} className="mt-1 w-5 h-5 accent-[#22d3ee]" />
                  </label>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{v.name}</p>
                    <p className="text-xs text-[var(--ink-2)] mt-0.5 font-mono text-[var(--volt)]">{v.code} · {fmtBytes(v.size)} · {v.type}</p>
                    <p className="text-xs text-[var(--ink-2)] mt-0.5"><i className="fa-solid fa-clock mr-1" />Sisa {remainingLabel(v)} · {fmtTime(v.ts || v.timestamp)}</p>
                    <div className="mt-2 flex gap-2">
                      {/* min-h-10 (40px): tinggi 30px membuat tombol Hapus mudah tersalah-pencet. */}
                      <button onClick={() => extOne(v.code)} disabled={busy} aria-busy={busy} className="btn btn-quiet text-xs bg-[#22d3ee]/15 text-[var(--volt)]"><i className="fa-solid fa-clock-rotate-left mr-1" />+1 Jam</button>
                      <button onClick={() => delOne(v.code)} disabled={busy} aria-busy={busy} className="btn btn-danger text-xs"><i className="fa-solid fa-trash mr-1" />Hapus</button>
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
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg mb-3"><i className="fa-solid fa-clock-rotate-left text-[var(--volt)] mr-2" />Log Upload</h2>
        <div className="card max-h-96 overflow-y-auto">
          {!log.length ? (
            <div className="p-12 text-center">
              <i className="fa-solid fa-scroll text-4xl text-[var(--ink-3)] mb-3" />
              <p className="text-[var(--ink-2)] text-sm">Belum ada log.</p>
            </div>
          ) : log.map((l, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 text-sm border-b border-[var(--edge)] last:border-0 hover:bg-[var(--paper-2)] transition-colors duration-[150ms]">
              <i className={`fa-solid ${l.type === 'video' ? 'fa-film text-[var(--volt)]' : 'fa-image text-emerald-300'} shrink-0`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.filename}</p>
                <p className="text-xs text-[var(--ink-2)]">{fmtTime(l.ts || l.timestamp)} · IP {l.ip} · {fmtBytes(l.size)}</p>
              </div>
              <span className="font-mono text-xs text-[var(--volt)] shrink-0">{l.code}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
