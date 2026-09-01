'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadFiles, pollJobStatus, fmtSize, saveHistory } from '@/lib/up-api'
import SuccessModal from './SuccessModal'

const VIDEO_EXTS = ['mp4', 'mov', 'mkv', 'avi', 'webm', '3gp', 'flv', 'wmv', 'ts', 'm4v']
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'heic', 'heif', 'avif']
const VIDEO_ACCEPT = 'video/*'
const IMAGE_ACCEPT = 'image/*'

const TAG_COLORS = {
  mp4: '#38bdf8',
  mkv: '#60a5fa',
  avi: '#fbbf24',
  mov: '#34d399',
  jpg: '#f43f5e',
  jpeg: '#f43f5e',
  png: '#34d399',
  gif: '#fbbf24',
  webp: '#38bdf8',
}

export default function UploadPanel({ settings, toast }) {
  const [tab, setTab] = useState('video')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ pct: 0, loaded: 0, total: 0, speed: 0 })
  const [encode, setEncode] = useState(null)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [thumbs, setThumbs] = useState({})
  const abortRef = useRef(null)
  const [semuaFile, setSemuaFile] = useState(false)

  const accept = semuaFile ? undefined : tab === 'video' ? VIDEO_ACCEPT : IMAGE_ACCEPT
  const exts = tab === 'video' ? VIDEO_EXTS.map((e) => e.toUpperCase()) : IMAGE_EXTS.map((e) => e.toUpperCase())
  const field = tab === 'video' ? 'video' : 'image'
  const isImg = tab === 'image'

  useEffect(() => {
    if (!isImg) return
    const newThumbs = {}
    files.forEach((f) => {
      if (!thumbs[f.name + f.size]) newThumbs[f.name + f.size] = URL.createObjectURL(f)
    })
    if (Object.keys(newThumbs).length) setThumbs((t) => ({ ...t, ...newThumbs }))
    return () => {
      Object.values(newThumbs).forEach(URL.revokeObjectURL)
    }
  }, [files, isImg])

  const addFiles = useCallback(
    (newFiles) => {
      let arr = Array.from(newFiles)
      if (tab === 'video' && arr.length > 1) {
        toast('Hanya 1 video per sesi upload', 'info')
        arr = arr.slice(0, 1)
      }
      const validExts = tab === 'video' ? VIDEO_EXTS : IMAGE_EXTS
      const mimePrefix = tab === 'video' ? 'video/' : 'image/'

      const valid = arr.filter((f) => {
        const ext = (f.name.split('.').pop() || '').toLowerCase()
        if (validExts.includes(ext) || (f.type || '').toLowerCase().startsWith(mimePrefix)) return true
        const mime = (f.type || '').toLowerCase()
        return semuaFile && (!mime || mime === 'application/octet-stream')
      })

      if (valid.length < arr.length) toast(`${arr.length - valid.length} file ditolak — format tidak didukung`, 'error')

      const max = settings?.maxFileSizeMB || 0
      let sizeOk = valid.filter((f) => max <= 0 || f.size <= max * 1024 * 1024)
      if (sizeOk.length < valid.length) toast(`${valid.length - sizeOk.length} file melebihi batas ${max} MB`, 'error')

      const bigLimit = 80 * 1024 * 1024
      const hardMB = settings?.largeUploadMaxMB || 0
      if (settings?.allowLargeUpload === false) {
        const before = sizeOk.length
        sizeOk = sizeOk.filter((f) => f.size <= bigLimit)
        if (sizeOk.length < before)
          toast(`${before - sizeOk.length} file di atas 80 MB — mode upload besar nonaktif`, 'error')
      } else if (hardMB > 0) {
        const before = sizeOk.length
        sizeOk = sizeOk.filter((f) => f.size <= hardMB * 1024 * 1024)
        if (sizeOk.length < before)
          toast(`${before - sizeOk.length} file melebihi batas upload besar ${hardMB} MB`, 'error')
      }

      setFiles((prev) => {
        const existing = new Set(prev.map((f) => f.name + f.size))
        return [...prev, ...sizeOk.filter((f) => !existing.has(f.name + f.size))]
      })
    },
    [tab, settings, toast, semuaFile]
  )

  const removeFile = (f) => setFiles((prev) => prev.filter((x) => x !== f))
  const clearAll = () => {
    setFiles([])
    setThumbs({})
  }
  const handleDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    addFiles(e.dataTransfer.files)
  }

  const doUpload = async () => {
    if (!files.length || uploading) return
    setUploading(true)
    setProgress({ pct: 0, loaded: 0, total: 0, speed: 0 })
    abortRef.current = new AbortController()

    try {
      const res = await uploadFiles(files, {
        field,
        onProgress: (p) => setProgress(p),
        signal: abortRef.current.signal,
      })

      let final = res
      if (res.pending && res.jobId) {
        final = await new Promise((resolve, reject) => {
          let stop = false
          const tick = async () => {
            if (stop) return
            try {
              const s = await pollJobStatus(res.jobId)
              if (s.error) {
                stop = true
                reject(new Error(s.error))
                return
              }
              if (s.result) {
                stop = true
                setEncode({ stage: 'Selesai', pct: 100 })
                resolve(s.result)
                return
              }
              if (s.stage || typeof s.pct === 'number') {
                setEncode({ stage: s.stage || 'Memproses Media…', pct: s.pct || 0 })
              }
              setTimeout(tick, 400)
            } catch (e) {
              stop = true
              reject(e)
            }
          }
          tick()
        })
      }

      saveHistory({
        code: final.code,
        codes: final.codes,
        bundle: final.bundle,
        count: final.count,
        files: files.map((f) => f.name),
        totalSize: files.reduce((s, f) => s + f.size, 0),
        timestamp: Date.now(),
        expireMinutes: settings?.expireMinutes || 60,
      })

      setResult({ ...final, expireMinutes: settings?.expireMinutes || 60 })
      if (final.warn) toast(final.warn, 'info')
      else toast('Upload berhasil diselesaikan!', 'success')
      setFiles([])
      setThumbs({})
    } catch (e) {
      if (e.message !== 'Upload dibatalkan') toast(e.message, 'error')
    } finally {
      setUploading(false)
      setProgress({ pct: 0, loaded: 0, total: 0, speed: 0 })
      setEncode(null)
    }
  }

  const cancelUpload = () => {
    abortRef.current?.abort()
    setUploading(false)
    setProgress({ pct: 0, loaded: 0, total: 0, speed: 0 })
    setEncode(null)
    toast('Upload dibatalkan', 'info')
  }

  const totalPct = encode
    ? encode.pct >= 100
      ? 100
      : Math.max(1, Math.min(99, Math.round(encode.pct)))
    : uploading
    ? Math.min(99, Math.round(progress.pct || 0))
    : result
    ? 100
    : 0

  if (settings?.maintenance) {
    return (
      <div className="rounded-[22px] bg-[#060A14] border border-amber-500/30 p-8 text-center shadow-xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 grid place-items-center mb-4">
          <i className="fa-solid fa-screwdriver-wrench text-amber-400 text-2xl" />
        </div>
        <h2 className="font-[family-name:var(--font-display)] font-extrabold text-xl text-white">
          Mode Pemeliharaan Aktif
        </h2>
        <p className="text-slate-400 text-sm mt-2 font-medium">
          Server sedang menjalani optimasi berkala. Silakan kembali dalam beberapa saat.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3.5">
        {/* Segmented Tab Filter (Video / Foto) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[16px] bg-white/[0.025] border border-white/[0.07]">
          {[
            ['video', 'fa-film', 'Video HD'],
            ['image', 'fa-images', 'Foto HD'],
          ].map(([t, icon, label]) => (
            <button
              key={t}
              onClick={() => {
                if (!uploading) {
                  setTab(t)
                  clearAll()
                }
              }}
              className={`py-3 rounded-[12px] font-bold text-[13px] tracking-wide transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 ${
                tab === t
                  ? 'bg-gradient-to-r from-sky-500/20 to-blue-600/20 border border-sky-400/40 text-white shadow-[0_0_20px_-4px_rgba(56,189,248,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <i className={`fa-solid ${icon} ${tab === t ? 'text-sky-400' : 'text-slate-500'}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Dropzone Card Surface */}
        <div className="rounded-[22px] bg-[#060A14] border border-white/[0.08] p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden">
          {/* Format tags badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-wrap gap-1">
              {exts.slice(0, 5).map((ext) => (
                <span
                  key={ext}
                  className="px-2 py-0.5 rounded-[6px] text-[8px] font-mono font-extrabold tracking-wider border"
                  style={{
                    color: TAG_COLORS[ext.toLowerCase()] || '#94a3b8',
                    borderColor: `${TAG_COLORS[ext.toLowerCase()] || '#94a3b8'}30`,
                    background: `${TAG_COLORS[ext.toLowerCase()] || '#94a3b8'}10`,
                  }}
                >
                  {ext}
                </span>
              ))}
              {exts.length > 5 && (
                <span className="px-1.5 py-0.5 rounded-[6px] text-[8px] font-mono font-bold text-slate-500 bg-white/[0.02] border border-white/[0.06]">
                  +{exts.length - 5}
                </span>
              )}
            </div>
            <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 uppercase">
              {settings?.maxFileSizeMB > 0 ? `Max ${settings.maxFileSizeMB}MB` : 'Unlimited'}
            </span>
          </div>

          {/* Drag & Drop Area */}
          <div
            onClick={() => {
              if (!uploading) fileRef.current?.click()
            }}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            className={`relative rounded-[18px] border-2 border-dashed py-8 px-4 text-center cursor-pointer transition-all duration-200 ${
              drag
                ? 'border-sky-400 bg-sky-500/[0.08] scale-[1.01]'
                : 'border-white/[0.1] bg-white/[0.015] hover:border-sky-500/40 hover:bg-white/[0.03]'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              multiple={tab !== 'video'}
              aria-label="Pilih file media"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />

            {/* Icon Tile */}
            <div
              className={`w-14 h-14 mx-auto rounded-[16px] grid place-items-center mb-3.5 shadow-lg ${
                isImg
                  ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shadow-emerald-500/10'
                  : 'bg-sky-500/10 border border-sky-500/25 text-sky-400 shadow-sky-500/10'
              }`}
            >
              <i className={`fa-solid ${isImg ? 'fa-images' : 'fa-cloud-arrow-up'} text-[22px]`} />
            </div>

            <p className="font-[family-name:var(--font-display)] font-bold text-[15px] text-white tracking-tight">
              {tab === 'video' ? 'Sentuh untuk memilih video' : 'Sentuh untuk memilih foto'}
            </p>
            <p className="text-slate-400 text-[12px] mt-1 font-medium">
              atau geser file ke area ini
            </p>

            {/* Fallback Filter Button for Android */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSemuaFile((v) => !v)
                setTimeout(() => fileRef.current?.click(), 0)
              }}
              className="mt-3 px-3 py-1.5 rounded-[10px] text-[10px] font-bold text-slate-400 bg-white/[0.03] border border-white/[0.08] hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <i className="fa-solid fa-folder-open mr-1.5" />
              {semuaFile ? 'Gunakan Filter Galeri' : 'File tidak terbaca? Tampilkan Semua'}
            </button>
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between px-1 text-[11px]">
                <span className="text-slate-400 font-bold">
                  {files.length} file dipilih · {fmtSize(files.reduce((s, f) => s + f.size, 0))}
                </span>
                <button
                  onClick={clearAll}
                  disabled={uploading}
                  className="text-rose-400 hover:text-rose-300 font-bold transition-colors disabled:opacity-30"
                >
                  <i className="fa-solid fa-trash-can mr-1" /> Hapus
                </button>
              </div>

              {isImg ? (
                <div className="grid grid-cols-3 gap-2">
                  {files.map((f) => {
                    const key = f.name + f.size
                    return (
                      <div
                        key={key}
                        className="relative aspect-square rounded-[12px] overflow-hidden border border-white/[0.08] group"
                      >
                        {thumbs[key] && <img src={thumbs[key]} alt="" className="w-full h-full object-cover" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <p className="absolute bottom-1 left-1.5 right-1.5 text-[9px] font-bold text-white truncate">
                          {f.name}
                        </p>
                        {!uploading && (
                          <button
                            onClick={() => removeFile(f)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-500/90 text-white text-[10px] grid place-items-center"
                          >
                            <i className="fa-solid fa-xmark" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {files.map((f) => {
                    const ext = f.name.split('.').pop().toUpperCase()
                    return (
                      <div
                        key={f.name + f.size}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-[12px] bg-white/[0.02] border border-white/[0.06]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-sky-500/10 grid place-items-center shrink-0">
                            <i className="fa-solid fa-film text-sky-400 text-xs" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold text-white truncate">{f.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{fmtSize(f.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {ext}
                          </span>
                          {!uploading && (
                            <button
                              onClick={() => removeFile(f)}
                              className="w-7 h-7 rounded-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 grid place-items-center transition-colors"
                            >
                              <i className="fa-solid fa-xmark text-xs" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upload Progress Status */}
          {uploading && (
            <div className="mt-4 rounded-[14px] bg-white/[0.02] border border-white/[0.06] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-sky-500/10 grid place-items-center">
                    <i
                      className={`fa-solid ${
                        encode ? 'fa-wand-magic-sparkles text-emerald-400' : 'fa-cloud-arrow-up text-sky-400 animate-bounce'
                      } text-[10px]`}
                    />
                  </div>
                  <div>
                    <p className="font-bold text-white">{encode ? encode.stage : 'Mengirim ke Server…'}</p>
                    <p className="text-[10px] font-mono text-slate-400">
                      {encode ? 'FFMPEG CRF 18 HD Conversion' : `${fmtSize(progress.loaded)} / ${fmtSize(progress.total)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono font-extrabold text-[15px] text-sky-400 tabular-nums">{totalPct}%</p>
                  <p className="text-[9px] font-mono text-slate-400">
                    {progress.speed > 0 ? `${((progress.speed * 8) / 1000000).toFixed(1)} Mbps` : '—'}
                  </p>
                </div>
              </div>

              {/* Progress Track */}
              <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-emerald-400 transition-all duration-300 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                  style={{ width: `${totalPct}%` }}
                />
              </div>

              {!encode && progress.speed > 0 && progress.pct < 100 && (
                <p className="text-[9px] font-mono text-slate-400 text-right">
                  Estimasi: ≈ {Math.ceil((progress.total - progress.loaded) / progress.speed)} detik tersisa
                </p>
              )}
            </div>
          )}

          {/* Action Trigger Buttons */}
          {files.length > 0 && (
            <div className="mt-4">
              {uploading ? (
                <button
                  onClick={cancelUpload}
                  className="w-full py-3.5 rounded-[14px] font-bold text-[13px] text-rose-400 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 active:scale-[0.98] transition-all"
                >
                  <i className="fa-solid fa-circle-stop mr-2" /> Batalkan Upload
                </button>
              ) : (
                <button
                  onClick={doUpload}
                  className="w-full py-3.5 rounded-[14px] font-extrabold text-[13px] text-white bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 shadow-[0_8px_24px_-4px_rgba(0,98,255,0.4)] hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <i className="fa-solid fa-cloud-arrow-up mr-2" /> Upload Sekarang ({files.length}{' '}
                  {tab === 'video' ? 'Video' : 'Foto'})
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {result && (
        <SuccessModal
          result={result}
          settings={settings}
          expireMinutes={result.expireMinutes}
          onClose={() => setResult(null)}
        />
      )}
    </>
  )
}
