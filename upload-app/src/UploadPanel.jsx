import { useState, useRef, useCallback, useEffect } from 'react'
import { useSettings } from './SettingsContext'
import { uploadFiles, fmtSize, saveHistory } from './api'
import { SuccessModal } from './Modals'

const VIDEO_EXTS = ['mp4', 'mkv', 'avi', 'mov']
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const VIDEO_ACCEPT = VIDEO_EXTS.map(e => `.${e}`).join(',')
const IMAGE_ACCEPT = IMAGE_EXTS.map(e => `.${e}`).join(',')
const TAG_COLORS = { mp4: '#818cf8', mkv: '#a78bfa', avi: '#fb923c', mov: '#f472b6', jpg: '#f472b6', jpeg: '#f472b6', png: '#6ee7b7', gif: '#fbbf24', webp: '#22d3ee' }

export default function UploadPanel({ toast }) {
  const { settings } = useSettings()
  const [tab, setTab] = useState('video')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
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
    setUploading(true)
    setProgress(0)
    abortRef.current = new AbortController()
    try {
      const res = await uploadFiles(files, {
        field,
        onProgress: p => setProgress(p),
        signal: abortRef.current.signal,
      })
      saveHistory({
        code: res.code, codes: res.codes, bundle: res.bundle, count: res.count,
        files: files.map(f => f.name),
        totalSize: files.reduce((s, f) => s + f.size, 0),
        timestamp: Date.now(),
        expireMinutes: settings?.expireMinutes || 60,
      })
      setResult({ ...res, expireMinutes: settings?.expireMinutes || 60 })
      toast('Upload berhasil!', 'success')
      setFiles([])
      setThumbs({})
    } catch (e) {
      if (e.message !== 'Upload dibatalkan') toast(e.message, 'error')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const cancelUpload = () => {
    abortRef.current?.abort()
    setUploading(false)
    setProgress(0)
    toast('Upload dibatalkan', 'info')
  }

  const maintenance = settings?.maintenance
  if (maintenance) {
    return (
      <div className="glass p-8 anim-emerge text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-yellow-500/10 border border-yellow-500/30 grid place-items-center mb-4 float-y">
          <i className="fa-solid fa-screwdriver-wrench text-yellow-400 text-2xl" />
        </div>
        <h2 className="font-display font-bold text-lg">Sedang Maintenance</h2>
        <p className="text-muted text-sm mt-2">Server dalam pemeliharaan. Coba lagi nanti ya.</p>
      </div>
    )
  }

  return (
    <>
      <div className="border-flow rounded-[24px] p-5 anim-emerge" style={{ animationDelay: '.12s' }}>
        {/* Tabs */}
        <div className="flex gap-1.5 p-1.5 rounded-2xl bg-black/25 border border-line mb-4">
          {[['video', 'fa-video', 'Video'], ['image', 'fa-image', 'Foto']].map(([t, icon, label]) => (
            <button
              key={t}
              onClick={() => { if (!uploading) { setTab(t); clearAll() } }}
              className={`tab-pill flex-1 py-2.5 rounded-xl font-bold text-[12px] ${tab === t ? 'active text-white' : 'text-muted hover:text-ink'}`}
            >
              <i className={`fa-solid ${icon} mr-1.5`} />{label}
            </button>
          ))}
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted font-bold">
            <span className="w-[7px] h-[7px] bg-ok rounded-full inline-block" style={{ animation: 'pulseDot 1.7s infinite' }} />
            <span className="text-emerald-300">ONLINE</span>
            <span className="opacity-40">•</span>
            <span>{settings?.maxFileSizeMB ? `MAX ${settings.maxFileSizeMB}MB` : 'UNLIMITED'}</span>
          </div>
          <span className="chip text-[10px] text-indigo-200 bg-brand/15 border border-line2/50 px-3 py-1">
            <i className="fa-regular fa-clock mr-1 opacity-70" />{settings?.expireMinutes || 60} menit
          </span>
        </div>

        {/* File type tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {exts.map(ext => (
            <span key={ext} className="px-2 py-1 rounded-lg text-[9px] font-extrabold tracking-wide border" style={{ color: TAG_COLORS[ext.toLowerCase()] || '#8892b0', borderColor: `${TAG_COLORS[ext.toLowerCase()] || '#8892b0'}44`, background: `${TAG_COLORS[ext.toLowerCase()] || '#8892b0'}12` }}>
              {ext}
            </span>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onClick={() => { if (!uploading) fileRef.current?.click() }}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          className={`drop-luxe py-12 px-6 text-center cursor-pointer transition-all duration-300 ${drag ? 'dragging' : ''}`}
        >
          <input ref={fileRef} type="file" accept={accept} multiple className="hidden" onChange={e => addFiles(e.target.files)} />
          <div className={`w-[72px] h-[72px] mx-auto rounded-[22px] grid place-items-center mb-4 float-y ${isImg ? '!bg-gradient-to-br !from-pink-500/20 !to-pink-500/5 !border-pink-400/40 shadow-[0_0_36px_-8px_rgba(244,114,182,.55)]' : '!bg-gradient-to-br !from-brand/25 !to-cyan/5 !border-brand2/50 shadow-[0_0_36px_-8px_rgba(99,102,241,.65)]'}`}>
            <i className={`fa-solid ${isImg ? 'fa-images text-pink-300' : 'fa-cloud-arrow-up text-indigo-300'} text-[26px]`} />
          </div>
          <p className="font-display font-bold text-[15px]">Drop {tab === 'video' ? 'video' : 'foto'} di sini</p>
          <p className="text-muted text-[11px] mt-1.5">atau <span className="text-cyan font-semibold underline underline-offset-4 decoration-cyan/40">klik untuk memilih file</span></p>
          <p className="text-muted/50 text-[9px] mt-3 font-mono uppercase tracking-widest">{tab === 'video' ? 'Auto convert to MP4 H.264' : 'Multiple select supported'}</p>
        </div>

        {/* File list / thumbnail grid */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-muted text-[10px] font-bold">{files.length} file • {fmtSize(files.reduce((s, f) => s + f.size, 0))}</span>
              <button onClick={clearAll} disabled={uploading} className="text-bad/80 text-[10px] font-bold hover:text-bad transition disabled:opacity-40">
                <i className="fa-solid fa-trash-can mr-1" />Hapus semua
              </button>
            </div>

            {isImg ? (
              <div className="grid grid-cols-3 gap-2.5">
                {files.map(f => {
                  const key = f.name + f.size
                  return (
                    <div key={key} className="relative aspect-square rounded-xl overflow-hidden border border-line group">
                      {thumbs[key] && <img src={thumbs[key]} alt="" className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <p className="absolute bottom-1 left-1.5 right-1.5 text-[8px] text-white font-semibold truncate opacity-0 group-hover:opacity-100 transition-opacity">{f.name}</p>
                      {!uploading && (
                        <button onClick={(e) => { e.stopPropagation(); removeFile(f) }} className="absolute top-1 right-1 w-5 h-5 rounded-md bg-bad/90 text-white text-[9px] grid place-items-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                          <i className="fa-solid fa-xmark" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              files.map(f => {
                const ext = f.name.split('.').pop().toUpperCase()
                return (
                  <div key={f.name + f.size} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[.03] border border-white/[.06] group hover:border-line2/60 transition-colors">
                    <span className="icon-tile w-10 h-10 shrink-0"><i className="fa-solid fa-film text-indigo-300 text-sm" /></span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[12px] truncate">{f.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-muted text-[10px] font-mono">{fmtSize(f.size)}</span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md" style={{ color: TAG_COLORS[ext.toLowerCase()] || '#8892b0', background: `${TAG_COLORS[ext.toLowerCase()] || '#8892b0'}18` }}>{ext}</span>
                      </div>
                    </div>
                    {!uploading && (
                      <button onClick={() => removeFile(f)} className="w-7 h-7 shrink-0 rounded-lg bg-bad/10 border border-bad/25 text-bad text-[10px] grid place-items-center opacity-0 group-hover:opacity-100 hover:bg-bad/20 transition-all">
                        <i className="fa-solid fa-xmark" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Overall progress */}
        {uploading && (
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-muted"><i className="fa-solid fa-paper-plane mr-1.5 text-cyan" />Mengupload…</span>
              <span className="font-mono text-cyan">{progress}%</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: progress + '%' }} /></div>
          </div>
        )}

        {/* Upload / Cancel button */}
        {files.length > 0 && (
          <div className="mt-5">
            {uploading ? (
              <button onClick={cancelUpload} className="w-full py-3.5 rounded-2xl font-bold text-sm text-bad bg-bad/10 border border-bad/35 hover:bg-bad/20 active:scale-[.98] transition-all">
                <i className="fa-solid fa-circle-stop mr-2" />Batalkan Upload
              </button>
            ) : (
              <button onClick={doUpload} className="btn-glow w-full py-3.5 rounded-2xl font-bold text-sm text-white">
                <i className="fa-solid fa-cloud-arrow-up mr-2" />Upload {files.length} {tab === 'video' ? 'Video' : 'Foto'}
              </button>
            )}
          </div>
        )}
      </div>

      {result && <SuccessModal result={result} expireMinutes={result.expireMinutes} onClose={() => setResult(null)} />}
    </>
  )
}
