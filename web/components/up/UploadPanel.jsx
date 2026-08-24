'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadFiles, fmtSize, saveHistory } from '@/lib/up-api'
import SuccessModal from './SuccessModal'

const VIDEO_EXTS = ['mp4', 'mkv', 'avi', 'mov']
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp']
const VIDEO_ACCEPT = VIDEO_EXTS.map(e => `.${e}`).join(',')
const IMAGE_ACCEPT = IMAGE_EXTS.map(e => `.${e}`).join(',')
const TAG_COLORS = {
  mp4: '#3b82f6', mkv: '#22d3ee', avi: '#fbbf24', mov: '#34d399',
  jpg: '#fb7185', jpeg: '#fb7185', png: '#34d399', gif: '#fbbf24', webp: '#22d3ee',
}

export default function UploadPanel({ settings, toast }) {
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
    setUploading(true); setProgress(0)
    abortRef.current = new AbortController()
    try {
      const res = await uploadFiles(files, { field, onProgress: p => setProgress(p), signal: abortRef.current.signal })
      saveHistory({ code: res.code, codes: res.codes, bundle: res.bundle, count: res.count, files: files.map(f => f.name), totalSize: files.reduce((s, f) => s + f.size, 0), timestamp: Date.now(), expireMinutes: settings?.expireMinutes || 60 })
      setResult({ ...res, expireMinutes: settings?.expireMinutes || 60 })
      toast('Upload berhasil!', 'success')
      setFiles([]); setThumbs({})
    } catch (e) { if (e.message !== 'Upload dibatalkan') toast(e.message, 'error') }
    finally { setUploading(false); setProgress(0) }
  }

  const cancelUpload = () => { abortRef.current?.abort(); setUploading(false); setProgress(0); toast('Upload dibatalkan', 'info') }

  if (settings?.maintenance) {
    return (
      <div className="card p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-[20px] bg-[#fbbf24]/10 border border-[#fbbf24]/30 grid place-items-center mb-4">
          <i className="fa-solid fa-screwdriver-wrench text-[#fbbf24] text-2xl" />
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-lg">Sedang Maintenance</h2>
        <p className="text-[#7e90ad] text-sm mt-2">Server dalam pemeliharaan. Coba lagi nanti ya.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Tab selector — standalone card */}
        <div className="flex gap-2">
          {[['video', 'fa-video', 'Video'], ['image', 'fa-image', 'Foto']].map(([t, icon, label]) => (
            <button key={t} onClick={() => { if (!uploading) { setTab(t); clearAll() } }}
              className={`flex-1 py-3.5 rounded-[16px] font-bold text-[13px] tracking-wide border transition-all duration-[250ms] active:scale-[.97] ${tab === t
                ? 'bg-gradient-to-r from-[#22d3ee]/15 to-[#3b82f6]/10 border-[#22d3ee]/30 text-[#e8f1ff] shadow-[0_0_24px_-8px_rgba(34,211,238,.35)]'
                : 'bg-white/[.02] border-white/[.06] text-[#7e90ad] hover:bg-white/[.05] hover:border-white/[.10]'}`}
              style={{ transitionTimingFunction: 'var(--ease-out)' }}
            >
              <i className={`fa-solid ${icon} mr-2 ${tab === t ? 'text-[#22d3ee]' : ''}`} />{label}
            </button>
          ))}
        </div>

        {/* Main upload card */}
        <div className="card overflow-visible">
          <div className="absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-b from-[#22d3ee]/[.04] via-transparent to-[#3b82f6]/[.03] blur-xl pointer-events-none" />
          <div className="p-5">
            {/* Format badges + server info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-wrap gap-1.5">
                {exts.map(ext => (
                  <span key={ext} className="px-2 py-0.5 rounded-[6px] text-[8px] font-extrabold tracking-[.12em] border"
                    style={{ color: TAG_COLORS[ext.toLowerCase()], borderColor: `${TAG_COLORS[ext.toLowerCase()]}30`, background: `${TAG_COLORS[ext.toLowerCase()]}08` }}>
                    {ext}
                  </span>
                ))}
              </div>
              <span className="text-[8px] font-mono font-bold tracking-wider text-[#7e90ad]/60 uppercase">
                {settings?.maxFileSizeMB > 0 ? `≤${settings.maxFileSizeMB}MB` : '∞'}
              </span>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => { if (!uploading) fileRef.current?.click() }}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              className={`drop-luxe py-10 px-6 text-center cursor-pointer transition-all duration-[250ms] ${drag ? 'dragging' : ''}`}
            >
              <input ref={fileRef} type="file" accept={accept} multiple className="hidden" onChange={e => addFiles(e.target.files)} />
              <div className="drop-halo">
                <div className={`w-16 h-16 mx-auto rounded-[18px] grid place-items-center mb-4 transition-all duration-[250ms] floaty ${isImg
                  ? 'bg-[#34d399]/12 border border-[#34d399]/25 shadow-[0_0_36px_-8px_rgba(52,211,153,.4)]'
                  : 'bg-[#22d3ee]/12 border border-[#3b82f6]/30 shadow-[0_0_36px_-8px_rgba(59,130,246,.4)]'}`}>
                  <i className={`fa-solid ${isImg ? 'fa-images text-[#34d399]' : 'fa-cloud-arrow-up text-[#67e8f9]'} text-[22px]`} />
                </div>
              </div>
              <p className="font-[family-name:var(--font-display)] font-bold text-[15px] tracking-tight">
                {tab === 'video' ? 'Drop video di sini' : 'Drop foto di sini'}
              </p>
              <p className="text-[#7e90ad] text-[11px] mt-1.5">
                atau <span className="text-[#22d3ee] font-semibold underline underline-offset-4 decoration-[#22d3ee]/40">pilih file</span>
              </p>
              <p className="text-[#7e90ad]/35 text-[8px] mt-3 font-mono uppercase tracking-[.15em]">
                {tab === 'video' ? 'Auto convert MP4 H.264' : 'Multiple select'}
              </p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-4 stagger">
                <div className="flex items-center justify-between px-0.5 mb-2">
                  <span className="text-[#7e90ad] text-[10px] font-bold">
                    {files.length} file · {fmtSize(files.reduce((s, f) => s + f.size, 0))}
                  </span>
                  <button onClick={clearAll} disabled={uploading} className="text-bad/60 text-[10px] font-bold hover:text-bad transition-all duration-[150ms] disabled:opacity-30">
                    <i className="fa-solid fa-trash-can mr-1" />Hapus
                  </button>
                </div>

                {isImg ? (
                  <div className="grid grid-cols-3 gap-2">
                    {files.map(f => {
                      const key = f.name + f.size
                      return (
                        <div key={key} className="relative aspect-square rounded-[12px] overflow-hidden border border-white/[.07] group hover:border-[#3b82f6]/30 transition-all duration-[150ms]">
                          {thumbs[key] && <img src={thumbs[key]} alt="" className="w-full h-full object-cover" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[150ms]" />
                          <p className="absolute bottom-1 left-1.5 right-1.5 text-[7px] text-white font-bold truncate opacity-0 group-hover:opacity-100 transition-opacity duration-[150ms]">{f.name}</p>
                          {!uploading && (
                            <button onClick={(e) => { e.stopPropagation(); removeFile(f) }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-bad/90 text-white text-[8px] grid place-items-center opacity-0 group-hover:opacity-100 transition-all duration-[150ms]">
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
                        <div key={f.name + f.size} className="flex items-center gap-2.5 py-2.5 px-3 rounded-[14px] bg-white/[.02] border border-white/[.05] group hover:border-white/[.10] transition-all duration-[150ms]">
                          <span className="w-8 h-8 shrink-0 rounded-[10px] bg-[#3b82f6]/10 border border-[#3b82f6]/15 grid place-items-center">
                            <i className="fa-solid fa-film text-[#67e8f9] text-[11px]" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[11px] truncate">{f.name}</p>
                            <span className="text-[#7e90ad] text-[9px] font-mono">{fmtSize(f.size)}</span>
                          </div>
                          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-[5px]" style={{ color: TAG_COLORS[ext.toLowerCase()], background: `${TAG_COLORS[ext.toLowerCase()]}12` }}>{ext}</span>
                          {!uploading && (
                            <button onClick={() => removeFile(f)} className="w-6 h-6 shrink-0 rounded-full bg-bad/10 text-bad text-[9px] grid place-items-center opacity-0 group-hover:opacity-100 transition-all duration-[150ms]">
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
              <div className="mt-4 anim-fade">
                <div className="flex items-center justify-between mb-2 text-[11px] font-bold">
                  <span className="text-[#7e90ad]"><i className="fa-solid fa-paper-plane mr-1.5 text-[#22d3ee]" />Mengupload…</span>
                  <span className="font-mono text-[#22d3ee]">{progress}%</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: progress + '%' }} /></div>
              </div>
            )}

            {/* Upload / Cancel button */}
            {files.length > 0 && (
              <div className="mt-4">
                {uploading ? (
                  <button onClick={cancelUpload} className="w-full py-3.5 rounded-[14px] font-bold text-sm text-bad bg-bad/8 border border-bad/25 hover:bg-bad/15 active:scale-[.97] transition-all duration-[150ms]">
                    <i className="fa-solid fa-circle-stop mr-2" />Batalkan
                  </button>
                ) : (
                  <button onClick={doUpload} className="btn-primary w-full py-3.5 rounded-[14px] font-bold text-sm">
                    <i className="fa-solid fa-cloud-arrow-up mr-2" />Upload {files.length} {tab === 'video' ? 'Video' : 'Foto'}
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
