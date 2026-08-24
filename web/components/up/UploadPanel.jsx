'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadFiles, fmtSize, saveHistory } from '@/lib/up-api'
import SuccessModal from './SuccessModal'

const V_EXT = ['mp4','mkv','avi','mov']
const I_EXT = ['jpg','jpeg','png','gif','webp']

export default function UploadPanel({ settings, toast }) {
  const [tab, setTab] = useState('video')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [drag, setDrag] = useState(false)
  const [thumbs, setThumbs] = useState({})
  const fileRef = useRef(null)
  const abortRef = useRef(null)

  const isImg = tab === 'image'
  const exts = isImg ? I_EXT : V_EXT
  const accept = exts.map(e => `.${e}`).join(',')

  useEffect(() => {
    if (!isImg) return
    const n = {}
    files.forEach(f => { const k = f.name + f.size; if (!thumbs[k]) n[k] = URL.createObjectURL(f) })
    if (Object.keys(n).length) setThumbs(t => ({ ...t, ...n }))
    return () => Object.values(n).forEach(URL.revokeObjectURL)
  }, [files, isImg])

  const addFiles = useCallback((fl) => {
    const arr = Array.from(fl)
    const ok = arr.filter(f => exts.includes(f.name.split('.').pop().toLowerCase()))
    if (ok.length < arr.length) toast(`${arr.length - ok.length} file format tidak didukung`, 'error')
    const max = settings?.maxFileSizeMB || 0
    const sized = ok.filter(f => max <= 0 || f.size <= max * 1048576)
    if (sized.length < ok.length) toast(`File melebihi batas ${max}MB`, 'error')
    setFiles(p => { const s = new Set(p.map(f => f.name + f.size)); return [...p, ...sized.filter(f => !s.has(f.name + f.size))] })
  }, [tab, settings, toast])

  const remove = (f) => setFiles(p => p.filter(x => x !== f))
  const clear = () => { setFiles([]); setThumbs({}) }
  const onDrop = (e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }

  const upload = async () => {
    if (!files.length || uploading) return
    setUploading(true); setProgress(0)
    abortRef.current = new AbortController()
    try {
      const res = await uploadFiles(files, { field: isImg ? 'image' : 'video', onProgress: setProgress, signal: abortRef.current.signal })
      saveHistory({ code: res.code, codes: res.codes, bundle: res.bundle, count: res.count, files: files.map(f => f.name), totalSize: files.reduce((s, f) => s + f.size, 0), timestamp: Date.now(), expireMinutes: settings?.expireMinutes || 60 })
      setResult({ ...res, expireMinutes: settings?.expireMinutes || 60 })
      toast('Upload berhasil!', 'success')
      setFiles([]); setThumbs({})
    } catch (e) { if (e.message !== 'Upload dibatalkan') toast(e.message, 'error') }
    finally { setUploading(false); setProgress(0) }
  }

  const cancel = () => { abortRef.current?.abort(); setUploading(false); setProgress(0); toast('Dibatalkan', 'info') }

  if (settings?.maintenance) return (
    <div className="card p-8 text-center">
      <i className="fa-solid fa-screwdriver-wrench text-[#fbbf24] text-3xl mb-3" />
      <h2 className="font-bold text-lg">Maintenance</h2>
      <p className="text-[#7e90ad] text-sm mt-1">Coba lagi nanti.</p>
    </div>
  )

  return (
    <>
      <div className="space-y-3">
        {/* Tabs */}
        <div className="flex gap-2">
          {[['video','fa-video','Video'],['image','fa-image','Foto']].map(([t,ic,lb]) => (
            <button key={t} onClick={() => { if (!uploading) { setTab(t); clear() } }}
              className={`flex-1 py-3 rounded-xl font-semibold text-[13px] border transition-all duration-200 active:scale-[.97] ${tab === t
                ? 'bg-[#22d3ee]/8 border-[#22d3ee]/20 text-[#e8f1ff]'
                : 'bg-white/[.02] border-white/[.04] text-[#7e90ad] hover:bg-white/[.04]'}`}>
              <i className={`fa-solid ${ic} mr-2 ${tab === t ? 'text-[#22d3ee]' : ''}`} />{lb}
            </button>
          ))}
        </div>

        {/* Upload card */}
        <div className="card p-5">
          {/* Drop zone */}
          <div onClick={() => { if (!uploading) fileRef.current?.click() }}
            onDrop={onDrop} onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
            className={`relative py-10 px-4 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all duration-200 ${drag ? 'border-[#22d3ee]/40 bg-[#22d3ee]/[.04]' : 'border-white/[.06] bg-white/[.01] hover:border-white/[.12] hover:bg-white/[.02]'}`}>
            <input ref={fileRef} type="file" accept={accept} multiple className="hidden" onChange={e => addFiles(e.target.files)} />
            <div className={`w-12 h-12 mx-auto rounded-xl grid place-items-center mb-3 ${isImg ? 'bg-[#34d399]/10' : 'bg-[#22d3ee]/10'}`}>
              <i className={`fa-solid ${isImg ? 'fa-images text-[#34d399]' : 'fa-cloud-arrow-up text-[#22d3ee]'} text-xl`} />
            </div>
            <p className="font-semibold text-sm">{isImg ? 'Pilih foto' : 'Pilih video'}</p>
            <p className="text-[#7e90ad] text-xs mt-1">atau drag & drop ke sini</p>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {exts.map(e => <span key={e} className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider uppercase bg-white/[.04] text-[#7e90ad]/60">{e}</span>)}
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#7e90ad] text-[11px] font-medium">{files.length} file · {fmtSize(files.reduce((s, f) => s + f.size, 0))}</span>
                <button onClick={clear} disabled={uploading} className="text-[10px] text-[#fb7185]/60 font-semibold hover:text-[#fb7185] transition-colors duration-150 disabled:opacity-30">Hapus semua</button>
              </div>

              {isImg ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {files.map(f => {
                    const k = f.name + f.size
                    return (
                      <div key={k} className="relative aspect-square rounded-lg overflow-hidden border border-white/[.06] group">
                        {thumbs[k] && <img src={thumbs[k]} alt="" className="w-full h-full object-cover" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                        {!uploading && <button onClick={e => { e.stopPropagation(); remove(f) }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[8px] grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"><i className="fa-solid fa-xmark" /></button>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {files.map(f => (
                    <div key={f.name + f.size} className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-white/[.02] border border-white/[.04] group">
                      <i className="fa-solid fa-film text-[#22d3ee]/50 text-xs" />
                      <span className="flex-1 text-[11px] font-medium truncate">{f.name}</span>
                      <span className="text-[9px] font-mono text-[#7e90ad]/50">{fmtSize(f.size)}</span>
                      {!uploading && <button onClick={() => remove(f)} className="text-[#fb7185]/40 hover:text-[#fb7185] transition-colors duration-150"><i className="fa-solid fa-xmark text-[10px]" /></button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <span className="text-[#7e90ad] font-medium">Mengupload…</span>
                <span className="font-mono font-bold text-[#22d3ee]">{progress}%</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: progress + '%' }} /></div>
            </div>
          )}

          {/* Upload button */}
          {files.length > 0 && (
            <div className="mt-4">
              {uploading ? (
                <button onClick={cancel} className="w-full py-3 rounded-xl font-semibold text-sm text-[#fb7185] bg-[#fb7185]/8 border border-[#fb7185]/15 hover:bg-[#fb7185]/12 active:scale-[.98] transition-all duration-150">
                  <i className="fa-solid fa-stop mr-2" />Batalkan
                </button>
              ) : (
                <button onClick={upload} className="btn-primary w-full py-3 rounded-xl font-bold text-sm">
                  <i className="fa-solid fa-cloud-arrow-up mr-2" />Upload {files.length} {isImg ? 'Foto' : 'Video'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {result && <SuccessModal result={result} settings={settings} expireMinutes={result.expireMinutes} onClose={() => setResult(null)} />}
    </>
  )
}
