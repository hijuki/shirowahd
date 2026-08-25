'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadFiles, fmtSize, saveHistory } from '@/lib/up-api'
import SuccessModal from './SuccessModal'

const VIDEO_EXTS = ['mp4', 'mkv', 'avi', 'mov']
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const VIDEO_ACCEPT = VIDEO_EXTS.map(e => `.${e}`).join(',')
const IMAGE_ACCEPT = IMAGE_EXTS.map(e => `.${e}`).join(',')
const TAG_COLORS = {
  mp4: '#2d59a8', mkv: '#2d59a8', avi: '#96690a', mov: '#2e7d4f',
  jpg: '#b3342e', jpeg: '#b3342e', png: '#2e7d4f', gif: '#96690a', webp: '#2d59a8',
}

export default function UploadPanel({ settings, onToast: toast }) {
  const [tab, setTab] = useState('video')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ pct: 0, loaded: 0, total: 0, speed: 0 })
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [thumbs, setThumbs] = useState({})
  const abortRef = useRef(null)

  const accept = tab === 'video' ? VIDEO_ACCEPT : IMAGE_ACCEPT
  const exts = tab === 'video' ? VIDEO_EXTS.map(e => e.toUpperCase()) : ['JPG', 'PNG', 'GIF', 'WEBP']
  const field = tab === 'video' ? 'video' : 'image'
  const isImg = tab === 'image'

  useEffect(() => {
    if (!isImg) return
    const newThumbs = {}
    files.forEach(f => {
      if (!thumbs[f.name + f.size]) newThumbs[f.name + f.size] = URL.createObjectURL(f)
    })
    if (Object.keys(newThumbs).length) setThumbs(t => ({ ...t, ...newThumbs }))
    return () => { Object.values(newThumbs).forEach(URL.revokeObjectURL) }
  }, [files, isImg])

  const addFiles = useCallback((newFiles) => {
    const arr = Array.from(newFiles)
    const validExts = tab === 'video' ? VIDEO_EXTS : IMAGE_EXTS
    const valid = arr.filter(f => validExts.includes(f.name.split('.').pop().toLowerCase()))
    if (valid.length < arr.length) toast(`${arr.length - valid.length} file ditolak — format tidak didukung`, 'error')
    const max = settings?.maxFileSizeMB || 0
    const sizeOk = valid.filter(f => max <= 0 || f.size <= max * 1024 * 1024)
    if (sizeOk.length < valid.length) toast(`${valid.length - sizeOk.length} file melebihi batas ${max} MB`, 'error')
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      return [...prev, ...sizeOk.filter(f => !existing.has(f.name + f.size))]
    })
  }, [tab, settings, toast])

  const removeFile = (f) => setFiles(prev => prev.filter(x => x !== f))
  const clearAll = () => { setFiles([]); setThumbs({}) }
  const handleDrop = (e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }

  const doUpload = async () => {
    if (!files.length || uploading) return
    setUploading(true); setProgress({ pct: 0, loaded: 0, total: 0, speed: 0 })
    abortRef.current = new AbortController()
    try {
      const res = await uploadFiles(files, { field, onProgress: p => setProgress(p), signal: abortRef.current.signal })
      saveHistory({ code: res.code, codes: res.codes, bundle: res.bundle, count: res.count, files: files.map(f => f.name), totalSize: files.reduce((s, f) => s + f.size, 0), timestamp: Date.now(), expireMinutes: settings?.expireMinutes || 60 })
      setResult({ ...res, expireMinutes: settings?.expireMinutes || 60 })
      toast('Upload berhasil!', 'success')
      setFiles([]); setThumbs({})
    } catch (e) { if (e.message !== 'Upload dibatalkan') toast(e.message, 'error') }
    finally { setUploading(false); setProgress({ pct: 0, loaded: 0, total: 0, speed: 0 }) }
  }

  const cancelUpload = () => { abortRef.current?.abort(); setUploading(false); setProgress(0); toast('Upload dibatalkan', 'info') }

  if (settings?.maintenance) {
    return (
      <div className="card p-6 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-[3px] bg-[var(--t-surface2)] border border-[var(--t-warn)] grid place-items-center">
          <i className="fa-solid fa-screwdriver-wrench text-[var(--t-warn)] text-lg" />
        </div>
        <h2 className="font-black text-base">Sedang Maintenance</h2>
        <p className="text-[var(--t-muted)] text-[12px]">Server dalam pemeliharaan. Coba lagi nanti.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {/* Tab selector */}
        <div className="flex gap-1.5">
          {[['video', 'fa-video', 'Video'], ['image', 'fa-image', 'Foto']].map(([t, icon, label]) => (
            <button key={t} onClick={() => { if (!uploading) { setTab(t); clearAll() } }}
              className={`flex-1 py-2.5 rounded-[3px] font-bold text-[12px] tracking-wide border transition-all duration-[150ms] active:scale-[.97] font-mono ${tab === t
                ? 'bg-[var(--t-ink)] border-[var(--t-ink)] text-[var(--t-bg)]'
                : 'bg-transparent border-[var(--t-line)] text-[var(--t-muted)] hover:border-[var(--t-line-strong)] hover:text-[var(--t-ink)]'}`}
            >
              <i className={`fa-solid ${icon} mr-1.5`} />{label}
            </button>
          ))}
        </div>

        {/* Upload card */}
        <div className="card">
          <div className="p-4 space-y-3">
            {/* Format badges + limit */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {exts.map(ext => (
                  <span key={ext} className="px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-[.1em] border rounded-[2px]"
                    style={{ color: TAG_COLORS[ext.toLowerCase()], borderColor: TAG_COLORS[ext.toLowerCase()] + '40', background: TAG_COLORS[ext.toLowerCase()] + '0a' }}>
                    {ext}
                  </span>
                ))}
              </div>
              <span className="text-[9px] font-mono font-semibold text-[var(--t-muted)] tracking-wider">
                {settings?.maxFileSizeMB > 0 ? `MAX ${settings.maxFileSizeMB}MB` : '∞'}
              </span>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => { if (!uploading) fileRef.current?.click() }}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              className={`drop-luxe py-8 px-4 text-center cursor-pointer ${drag ? 'dragging' : ''}`}
            >
              <input ref={fileRef} type="file" accept={accept} multiple className="hidden" onChange={e => addFiles(e.target.files)} />

              <div className={`w-10 h-10 mx-auto rounded-[3px] grid place-items-center mb-3 border ${isImg
                ? 'border-[var(--t-ok)] text-[var(--t-ok)] bg-[var(--t-surface)]'
                : 'border-[var(--t-accent-2)] text-[var(--t-accent-2)] bg-[var(--t-surface)]'}`}>
                <i className={`fa-solid ${isImg ? 'fa-images' : 'fa-arrow-up-from-bracket'} text-[16px]`} />
              </div>

              <p className="font-bold text-[13px] text-[var(--t-ink)]">
                {tab === 'video' ? 'Drop video di sini' : 'Drop foto di sini'}
              </p>
              <p className="text-[var(--t-muted)] text-[11px] mt-1 font-mono">
                atau <span className="text-[var(--t-accent)] font-bold underline underline-offset-2 decoration-[var(--t-accent)]/40 cursor-pointer">pilih file</span>
              </p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="stagger">
                <div className="flex items-center justify-between px-0.5 mb-2">
                  <span className="field-label">
                    {files.length} FILE · {fmtSize(files.reduce((s, f) => s + f.size, 0))}
                  </span>
                  <button onClick={clearAll} disabled={uploading} className="text-[var(--t-bad)] text-[10px] font-mono font-bold hover:underline transition-opacity disabled:opacity-30">
                    <i className="fa-solid fa-trash-can mr-1" />HAPUS
                  </button>
                </div>

                {isImg ? (
                  <div className="grid grid-cols-3 gap-1.5">
                    {files.map(f => {
                      const key = f.name + f.size
                      return (
                        <div key={key} className="relative aspect-square rounded-[3px] overflow-hidden border border-[var(--t-line)] group hover:border-[var(--t-ink)] transition-all duration-[140ms]">
                          {thumbs[key] && <img src={thumbs[key]} alt="" className="w-full h-full object-cover" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[140ms]" />
                          <p className="absolute bottom-0.5 left-1 right-1 text-[7px] text-white font-mono font-bold truncate opacity-0 group-hover:opacity-100 transition-opacity duration-[140ms]">{f.name}</p>
                          {!uploading && (
                            <button onClick={(e) => { e.stopPropagation(); removeFile(f) }} className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--t-bad)] text-white text-[7px] grid place-items-center opacity-0 group-hover:opacity-100 transition-all duration-[140ms]">
                              <i className="fa-solid fa-xmark" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {files.map(f => {
                      const ext = f.name.split('.').pop().toUpperCase()
                      return (
                        <div key={f.name + f.size} className="flex items-center gap-2 py-2 px-2.5 rounded-[3px] bg-[var(--t-surface2)] border border-[var(--t-line)] group hover:border-[var(--t-line-strong)] transition-all duration-[140ms]">
                          <span className="w-7 h-7 shrink-0 rounded-[3px] bg-[var(--t-surface)] border border-[var(--t-line)] grid place-items-center">
                            <i className="fa-solid fa-film text-[var(--t-accent-2)] text-[10px]" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[11px] truncate">{f.name}</p>
                            <span className="text-[var(--t-muted)] text-[9px] font-mono">{fmtSize(f.size)}</span>
                          </div>
                          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border"
                            style={{ color: TAG_COLORS[ext.toLowerCase()], borderColor: TAG_COLORS[ext.toLowerCase()] + '40' }}>{ext}</span>
                          {!uploading && (
                            <button onClick={() => removeFile(f)} className="w-5 h-5 shrink-0 rounded-full border border-[var(--t-bad)]/30 text-[var(--t-bad)] text-[8px] grid place-items-center opacity-0 group-hover:opacity-100 transition-all duration-[140ms]">
                              <i className="fa-solid fa-xmark" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Progress */}
            {uploading && (
              <div className="anim-fade space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-[3px] border border-[var(--t-line)] bg-[var(--t-surface2)] grid place-items-center">
                      <i className="fa-solid fa-arrow-up text-[var(--t-ink)] text-[9px] caret-blink" />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold">Mengirim…</p>
                      <p className="text-[8px] font-mono text-[var(--t-muted)] tnum">
                        {fmtSize(progress.loaded)} / {fmtSize(progress.total)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[18px] font-black tnum">{progress.pct}%</p>
                    <p className="text-[9px] font-mono font-semibold text-[var(--t-muted)] tnum">
                      {progress.speed > 0 ? `${(progress.speed * 8 / 1000000).toFixed(1)} Mbps` : '—'}
                    </p>
                  </div>
                </div>

                {/* Progress bar — ink stripe */}
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: progress.pct + '%' }} />
                </div>

                {progress.speed > 0 && progress.pct < 100 && (
                  <p className="text-[8px] text-[var(--t-muted)] font-mono text-right tnum">
                    ≈ {Math.ceil((progress.total - progress.loaded) / progress.speed)}s tersisa
                  </p>
                )}
              </div>
            )}

            {/* Upload / Cancel */}
            {files.length > 0 && (
              <div>
                {uploading ? (
                  <button onClick={cancelUpload} className="w-full py-3 rounded-[3px] font-bold text-[12px] font-mono text-[var(--t-bad)] border-2 border-[var(--t-bad)] bg-transparent hover:bg-[var(--t-bad)] hover:text-white active:scale-[.97] transition-all duration-[140ms]">
                    <i className="fa-solid fa-circle-stop mr-1.5" />BATALKAN
                  </button>
                ) : (
                  <button onClick={doUpload} className="btn-primary w-full py-3 rounded-[3px] font-mono text-[12px]">
                    <i className="fa-solid fa-arrow-up-from-bracket mr-1.5" />UPLOAD {files.length} {tab === 'video' ? 'VIDEO' : 'FOTO'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {result && <SuccessModal result={result} settings={settings} expireMinutes={result.expireMinutes} onClose={() => setResult(null)} />}
    </>
  )
}
