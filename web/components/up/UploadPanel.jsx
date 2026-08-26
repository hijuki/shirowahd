'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadFiles, fmtSize, saveHistory } from '@/lib/up-api'
import SuccessModal from './SuccessModal'

const VIDEO_EXTS = ['mp4', 'mkv', 'avi', 'mov']
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const VIDEO_ACCEPT = VIDEO_EXTS.map(e => `.${e}`).join(',')
const IMAGE_ACCEPT = IMAGE_EXTS.map(e => `.${e}`).join(',')
const TAG_COLORS = {
  mp4: '#2563eb', mkv: '#7c3aed', avi: '#d97706', mov: '#16a34a',
  jpg: '#dc2626', jpeg: '#dc2626', png: '#16a34a', gif: '#d97706', webp: '#2563eb',
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
      <div className="card p-8 text-center space-y-3 anim-pop-spring">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--t-surface2)] border border-[var(--t-warn)]/40 grid place-items-center anim-float">
          <i className="fa-solid fa-screwdriver-wrench text-[var(--t-warn)] text-xl" />
        </div>
        <h2 className="font-black text-base">Sedang Maintenance</h2>
        <p className="text-[var(--t-muted)] text-[12px]">Server dalam pemeliharaan. Coba lagi nanti ya.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {/* Segmented Tab Switch */}
        <div className="pill-switch w-full">
          {[['video', 'fa-video', 'Video'], ['image', 'fa-image', 'Foto']].map(([t, icon, label]) => (
            <button key={t} onClick={() => { if (!uploading) { setTab(t); clearAll() } }}
              className={`pill-switch-btn flex-1 flex items-center justify-center gap-1.5 ${tab === t ? 'active' : ''}`}>
              <i className={`fa-solid ${icon} text-[12px]`} />{label}
            </button>
          ))}
        </div>

        {/* Upload card */}
        <div className="card card-3d-hover">
          <div className="p-4 space-y-3">
            {/* Format badges + limit */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {exts.map(ext => (
                  <span key={ext} className="px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wide rounded-md border"
                    style={{ color: TAG_COLORS[ext.toLowerCase()], borderColor: TAG_COLORS[ext.toLowerCase()] + '35', background: TAG_COLORS[ext.toLowerCase()] + '0d' }}>
                    {ext}
                  </span>
                ))}
              </div>
              <span className="text-[10px] font-mono font-bold text-[var(--t-muted)] tracking-wider px-2 py-0.5 rounded-full bg-[var(--t-surface2)] border border-[var(--t-line)] tnum">
                MAX {settings?.maxFileSizeMB > 0 ? `${settings.maxFileSizeMB} MB` : '∞'}
              </span>
            </div>

            {/* Drop Zone Pro */}
            <div
              onClick={() => { if (!uploading) fileRef.current?.click() }}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              className={`drop-zone-pro py-10 px-4 text-center cursor-pointer group ${drag ? 'dragging' : ''}`}
            >
              <input ref={fileRef} type="file" accept={accept} multiple className="hidden" onChange={e => addFiles(e.target.files)} />

              {/* Corner reticles */}
              <span className="reticle-tl" /><span className="reticle-tr" />
              <span className="reticle-bl" /><span className="reticle-br" />

              {drag && <div className="scan-line" />}

              <div className={`w-14 h-14 mx-auto rounded-2xl grid place-items-center mb-3 shadow-md transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3 ${drag ? 'scale-125 rotate-6' : ''}`}
                style={{
                  background: isImg ? 'color-mix(in srgb, var(--t-ok) 12%, var(--t-surface))' : 'color-mix(in srgb, var(--t-accent) 10%, var(--t-surface))',
                  color: isImg ? 'var(--t-ok)' : 'var(--t-accent)',
                  border: `1px solid color-mix(in srgb, ${isImg ? 'var(--t-ok)' : 'var(--t-accent)'} 30%, transparent)`
                }}>
                <i className={`fa-solid ${isImg ? 'fa-images' : 'fa-cloud-arrow-up'} text-[22px]`} />
              </div>

              <p className="font-bold text-[14px] text-[var(--t-ink)] transition-transform duration-200 group-hover:scale-[1.02]">
                {drag ? 'Lepas di sini! 🎯' : tab === 'video' ? 'Tarik & lepas video kamu' : 'Tarik & lepas foto kamu'}
              </p>
              <p className="text-[var(--t-muted)] text-[11px] mt-1.5 font-mono">
                atau <span className="text-[var(--t-accent)] font-bold underline underline-offset-4 decoration-2 decoration-[var(--t-accent)]/30 group-hover:decoration-[var(--t-accent)]">browse file</span>
              </p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="stagger-in">
                <div className="flex items-center justify-between px-0.5 mb-2">
                  <span className="field-label tnum">
                    {files.length} FILE · {fmtSize(files.reduce((s, f) => s + f.size, 0))}
                  </span>
                  <button onClick={clearAll} disabled={uploading} className="text-[var(--t-bad)] text-[10px] font-mono font-bold hover:scale-105 active:scale-95 transition-transform disabled:opacity-30 px-2 py-1 rounded-lg hover:bg-[var(--t-bad)]/5">
                    <i className="fa-solid fa-trash-can mr-1" />HAPUS
                  </button>
                </div>

                {isImg ? (
                  <div className="grid grid-cols-3 gap-2">
                    {files.map(f => {
                      const key = f.name + f.size
                      return (
                        <div key={key} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--t-line)] group shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-[var(--t-accent)]/40 transition-all duration-300">
                          {thumbs[key] && <img src={thumbs[key]} alt="" className="w-full h-full object-cover" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          <p className="absolute bottom-1 left-1.5 right-1.5 text-[8px] text-white font-mono font-bold truncate opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">{f.name}</p>
                          {!uploading && (
                            <button onClick={(e) => { e.stopPropagation(); removeFile(f) }} className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 backdrop-blur text-white text-[9px] grid place-items-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 hover:bg-red-500">
                              <i className="fa-solid fa-xmark" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {files.map(f => {
                      const ext = f.name.split('.').pop().toUpperCase()
                      return (
                        <div key={f.name + f.size} className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-[var(--t-surface2)]/60 border border-[var(--t-line)] group hover:border-[var(--t-line-strong)] hover:bg-[var(--t-surface2)] hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200">
                          <span className="w-9 h-9 shrink-0 rounded-xl bg-[var(--t-surface)] border border-[var(--t-line)] grid place-items-center shadow-sm">
                            <i className="fa-solid fa-film text-[var(--t-accent-2)] text-[13px]" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[12px] truncate">{f.name}</p>
                            <span className="text-[var(--t-muted)] text-[10px] font-mono tnum">{fmtSize(f.size)}</span>
                          </div>
                          <span className="text-[9px] font-mono font-extrabold px-2 py-1 rounded-lg border"
                            style={{ color: TAG_COLORS[ext.toLowerCase()], borderColor: TAG_COLORS[ext.toLowerCase()] + '35', background: TAG_COLORS[ext.toLowerCase()] + '0a' }}>{ext}</span>
                          {!uploading && (
                            <button onClick={() => removeFile(f)} className="w-6 h-6 shrink-0 rounded-full text-[var(--t-muted)] hover:text-white hover:bg-red-500 text-[10px] grid place-items-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200">
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

            {/* Progress Ultra */}
            {uploading && (
              <div className="anim-slide-up space-y-2.5 bg-[var(--t-surface2)]/50 rounded-2xl p-3.5 border border-[var(--t-line)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-[var(--t-accent)]/10 text-[var(--t-accent)] grid place-items-center animate-pulse">
                      <i className="fa-solid fa-arrow-up text-[13px]" />
                    </span>
                    <div>
                      <p className="text-[12px] font-bold">Mengirim ke server…</p>
                      <p className="text-[9px] font-mono text-[var(--t-muted)] tnum">
                        {fmtSize(progress.loaded)} / {fmtSize(progress.total)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[20px] font-black tnum leading-none">{progress.pct}<span className="text-[12px]">%</span></p>
                    <p className="text-[9px] font-mono font-semibold text-[var(--t-muted)] tnum mt-0.5">
                      {progress.speed > 0 ? `${(progress.speed * 8 / 1000000).toFixed(1)} Mbps` : '—'}
                    </p>
                  </div>
                </div>

                <div className="progress-bar-wrap">
                  <div className="progress-bar-fluid" style={{ width: Math.max(progress.pct, 2) + '%' }} />
                </div>

                {progress.speed > 0 && progress.pct < 100 && (
                  <p className="text-[9px] text-[var(--t-muted)] font-mono text-right tnum">
                    ≈ {Math.ceil((progress.total - progress.loaded) / progress.speed)}s tersisa
                  </p>
                )}
              </div>
            )}

            {/* Upload / Cancel */}
            {files.length > 0 && !uploading && (
              <button onClick={doUpload} className="btn-primary w-full py-3.5 text-[13px] tracking-wide">
                <i className="fa-solid fa-rocket" />UPLOAD {files.length} {tab === 'video' ? 'VIDEO' : 'FOTO'}
              </button>
            )}
            {uploading && (
              <button onClick={cancelUpload} className="w-full py-3 rounded-xl font-bold text-[12px] text-[var(--t-bad)] border-2 border-[var(--t-bad)]/60 bg-transparent hover:bg-[var(--t-bad)] hover:text-white hover:border-[var(--t-bad)] active:scale-[.98] transition-all duration-200">
                <i className="fa-solid fa-circle-stop mr-1.5" />BATALKAN UPLOAD
              </button>
            )}
          </div>
        </div>
      </div>

      {result && <SuccessModal result={result} settings={settings} expireMinutes={result.expireMinutes} onClose={() => setResult(null)} />}
    </>
  )
}
