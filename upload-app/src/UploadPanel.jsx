import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useSettings } from './SettingsContext'
import { uploadFiles, fmtSize, saveHistory } from './api'

const VIDEO_EXTS = ['mp4', 'mkv', 'avi', 'mov']
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const VIDEO_ACCEPT = VIDEO_EXTS.map(e => `.${e}`).join(',')
const IMAGE_ACCEPT = IMAGE_EXTS.map(e => `.${e}`).join(',')
const TAG_COLORS = { mp4: '#168cff', mkv: '#8b5cf6', avi: '#f97316', mov: '#ec4899', jpg: '#f472b6', jpeg: '#f472b6', png: '#6ee7b7', gif: '#fbbf24', webp: '#38bdf8' }

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

  // thumbnail generation for images
  useEffect(() => {
    if (!isImg) return
    const newThumbs = {}
    files.forEach(f => {
      if (!thumbs[f.name + f.size]) {
        const url = URL.createObjectURL(f)
        newThumbs[f.name + f.size] = url
      }
    })
    if (Object.keys(newThumbs).length) setThumbs(t => ({ ...t, ...newThumbs }))
    return () => {
      Object.values(newThumbs).forEach(URL.revokeObjectURL)
    }
  }, [files, isImg])

  const addFiles = useCallback((newFiles) => {
    const arr = Array.from(newFiles)
    const validExts = tab === 'video' ? VIDEO_EXTS : IMAGE_EXTS
    const valid = arr.filter(f => {
      const ext = f.name.split('.').pop().toLowerCase()
      return validExts.includes(ext)
    })
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
  const handleDragOver = (e) => { e.preventDefault(); setDrag(true) }
  const handleDragLeave = () => setDrag(false)

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
      const entry = {
        code: res.code,
        codes: res.codes,
        bundle: res.bundle,
        count: res.count,
        files: files.map(f => f.name),
        totalSize: files.reduce((s, f) => s + f.size, 0),
        timestamp: Date.now(),
        expireMinutes: settings?.expireMinutes || 60,
      }
      saveHistory(entry)
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
      <div className="glass rounded-[22px] p-6 shimmer-top anim-emerge text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-yellow-500/10 border border-yellow-500/25 grid place-items-center mb-4">
          <i className="fa-solid fa-wrench text-yellow-400 text-2xl" />
        </div>
        <h2 className="font-display font-bold text-lg">Sedang Maintenance</h2>
        <p className="text-muted text-sm mt-2">Server sedang dalam pemeliharaan. Silakan coba lagi nanti.</p>
      </div>
    )
  }

  return (
    <>
      <div className="glass rounded-[22px] p-5 shimmer-top anim-emerge">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[rgba(6,17,38,.55)] border border-[rgba(91,163,255,.12)] rounded-xl mb-4">
          {['video', 'image'].map(t => (
            <button
              key={t}
              onClick={() => { if (!uploading) { setTab(t); clearAll() } }}
              className={`flex-1 py-2.5 rounded-[9px] font-bold text-[12px] transition-all duration-300 ${
                tab === t
                  ? 'bg-gradient-to-r from-brand2 to-[#1454ef] text-white shadow-[0_8px_28px_rgba(14,115,255,.3)]'
                  : 'text-muted hover:text-[#d5e7ff] hover:bg-[rgba(18,53,98,.3)]'
              }`}
            >
              <i className={`fa-solid ${t === 'video' ? 'fa-video' : 'fa-image'} mr-1.5`} />
              {t === 'video' ? 'Video' : 'Foto'}
            </button>
          ))}
        </div>

        {/* Status row */}
        <div className="flex items-center justify-between mb-3 px-0.5">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted font-semibold">
            <span className="w-[7px] h-[7px] bg-[#2ebcff] rounded-full shadow-[0_0_14px_#2ebcff] inline-block" style={{ animation: 'pulseDot 1.7s infinite' }} />
            <span>Online</span>
            <span className="text-[8px] mx-0.5">•</span>
            <span>{settings?.maxFileSizeMB ? `Max ${settings.maxFileSizeMB} MB` : 'Unlimited'}</span>
          </div>
          <span className="font-mono text-[10px] font-bold text-[#9cccff] bg-[rgba(11,49,101,.22)] px-2.5 py-1 rounded-full border border-[rgba(70,158,255,.2)]">
            {settings?.expireMinutes || 60} min
          </span>
        </div>

        {/* File type tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {exts.map(ext => (
            <span key={ext} className="px-2 py-0.5 rounded-md text-[9px] font-bold border" style={{ color: TAG_COLORS[ext.toLowerCase()] || '#8196b8', borderColor: `${TAG_COLORS[ext.toLowerCase()] || '#8196b8'}33`, background: `${TAG_COLORS[ext.toLowerCase()] || '#8196b8'}11` }}>
              {ext}
            </span>
          ))}
        </div>

        {/* Drop zone */}
        <div
          onClick={() => { if (!uploading) fileRef.current?.click() }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative rounded-2xl border-2 border-dashed py-10 text-center cursor-pointer transition-all duration-300 ${
            drag
              ? 'border-brand bg-brand/10 scale-[1.01]'
              : 'border-[rgba(70,158,255,.25)] hover:border-brand/50 hover:bg-white/[.02]'
          }`}
        >
          <input ref={fileRef} type="file" accept={accept} multiple className="hidden" onChange={e => addFiles(e.target.files)} />
          <div className={`w-14 h-14 mx-auto rounded-2xl grid place-items-center mb-3 ${isImg ? 'bg-pink-500/10 border border-pink-500/25' : 'bg-brand/10 border border-brand/25'}`}>
            <i className={`fa-solid ${isImg ? 'fa-images text-pink-400' : 'fa-cloud-arrow-up text-brand2'} text-2xl`} />
          </div>
          <p className="font-semibold text-sm mb-1">Drop {tab === 'video' ? 'video' : 'foto'} di sini</p>
          <p className="text-muted text-[11px]">atau <span className="text-cyan underline underline-offset-2">klik untuk pilih file</span></p>
        </div>

        {/* File list / thumbnail grid */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between px-0.5 mb-1">
              <span className="text-muted text-[10px] font-semibold">{files.length} file dipilih — {fmtSize(files.reduce((s, f) => s + f.size, 0))}</span>
              <button onClick={clearAll} className="text-bad/80 text-[10px] font-bold hover:text-bad transition" disabled={uploading}>
                <i className="fa-solid fa-trash mr-1" />Hapus semua
              </button>
            </div>

            {isImg ? (
              <div className="grid grid-cols-3 gap-2">
                {files.map(f => {
                  const key = f.name + f.size
                  return (
                    <div key={key} className="relative aspect-square rounded-xl overflow-hidden border border-line bg-white/[.02] group">
                      {thumbs[key] && <img src={thumbs[key]} alt="" className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="absolute bottom-1 left-1 right-1 text-[8px] text-white font-semibold truncate opacity-0 group-hover:opacity-100 transition-opacity">{f.name}</p>
                      {!uploading && (
                        <button onClick={(e) => { e.stopPropagation(); removeFile(f) }} className="absolute top-1 right-1 w-5 h-5 rounded-md bg-bad/80 text-white text-[9px] grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                  <div key={f.name + f.size} className="flex items-center gap-3 p-3 rounded-xl bg-white/[.03] border border-white/5 group">
                    <div className="w-9 h-9 shrink-0 rounded-lg bg-brand/15 border border-brand/30 grid place-items-center">
                      <i className="fa-solid fa-video text-brand2 text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[12px] truncate">{f.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-muted text-[10px]">{fmtSize(f.size)}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: TAG_COLORS[ext.toLowerCase()] || '#8196b8', background: `${TAG_COLORS[ext.toLowerCase()] || '#8196b8'}15` }}>{ext}</span>
                      </div>
                    </div>
                    {!uploading && (
                      <button onClick={() => removeFile(f)} className="w-7 h-7 shrink-0 rounded-lg bg-bad/10 border border-bad/20 text-bad text-[10px] grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
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
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-muted">Mengupload...</span>
              <span className="text-cyan font-mono">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-brand to-cyan transition-all duration-300 relative" style={{ width: progress + '%' }}>
                <span className="absolute inset-0 bg-[length:20px_20px] bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%)] animate-[shimmer_1s_linear_infinite]" />
              </div>
            </div>
          </div>
        )}

        {/* Upload / Cancel button */}
        {files.length > 0 && (
          <div className="mt-4">
            {uploading ? (
              <button onClick={cancelUpload} className="w-full py-3 rounded-xl font-bold text-sm text-bad bg-bad/10 border border-bad/30 hover:bg-bad/20 active:scale-[.98] transition">
                <i className="fa-solid fa-xmark mr-1.5" />Batalkan
              </button>
            ) : (
              <button onClick={doUpload} className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand2 to-brand hover:brightness-110 active:scale-[.98] transition shadow-[0_10px_30px_rgba(20,100,255,.35)]">
                <i className="fa-solid fa-cloud-arrow-up mr-1.5" />Upload {files.length} {tab === 'video' ? 'Video' : 'Foto'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Success modal rendered by parent via result prop */}
      {result && (
        <SuccessModalTrigger result={result} onClose={() => setResult(null)} />
      )}
    </>
  )
}

// small bridge to lift success state to parent
import { SuccessModal } from './Modals'
function SuccessModalTrigger({ result, onClose }) {
  return <SuccessModal result={result} expireMinutes={result.expireMinutes} onClose={onClose} />
}
