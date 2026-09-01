'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import SuccessModal from './SuccessModal'
import { uploadFiles, formatSize, pollJobStatus } from '@/lib/up-api'

const VIDEO_EXTS = ['mp4', 'mov', 'mkv', 'avi', 'webm', '3gp', 'flv', 'wmv', 'ts', 'm4v']
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'heic', 'heif', 'avif']

export default function UploadPanel({ settings, onToast }) {
  const [tab, setTab] = useState('video')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadStats, setUploadStats] = useState({ speed: '0 MB/s', eta: '0s', sent: '0 MB', total: '0 MB' })
  const [result, setResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [semuaFile, setSemuaFile] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processStatus, setProcessStatus] = useState('')

  const fileInputRef = useRef(null)
  const abortCtrlRef = useRef(null)

  const maxMB = settings?.maxFileSizeMB || 100
  const maxBytes = maxMB * 1024 * 1024
  const allowLarge = settings?.allowLargeUpload !== false
  const largeMaxMB = settings?.largeUploadMaxMB || 1024

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragOver(true)
    else if (e.type === 'dragleave') setDragOver(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (uploading) return
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }, [uploading])

  const addFiles = (newFiles) => {
    if (!newFiles.length) return

    if (tab === 'video') {
      const vid = newFiles[0]
      const ext = vid.name.split('.').pop().toLowerCase()
      if (!VIDEO_EXTS.includes(ext) && !vid.type.startsWith('video/') && !semuaFile) {
        onToast?.('Hanya format video yang diperbolehkan di tab ini', 'error')
        return
      }
      const cap = allowLarge ? largeMaxMB * 1024 * 1024 : maxBytes
      if (vid.size > cap) {
        onToast?.(`Ukuran video melebihi batas (${allowLarge ? largeMaxMB : maxMB}MB)`, 'error')
        return
      }
      setFiles([vid])
    } else {
      const validImages = []
      for (const f of newFiles) {
        const ext = f.name.split('.').pop().toLowerCase()
        if (IMAGE_EXTS.includes(ext) || f.type.startsWith('image/') || semuaFile) {
          if (f.size <= maxBytes) {
            validImages.push(f)
          } else {
            onToast?.(`File ${f.name} melebihi batas ${maxMB}MB`, 'error')
          }
        }
      }
      if (validImages.length) {
        setFiles((prev) => [...prev, ...validImages].slice(0, 20))
      }
    }
  }

  const removeFile = (idx) => {
    if (uploading) return
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const startUpload = async () => {
    if (!files.length || uploading) return
    setUploading(true)
    setProgress(0)
    setIsProcessing(false)
    setProcessStatus('')
    abortCtrlRef.current = new AbortController()

    try {
      const res = await uploadFiles(files, {
        signal: abortCtrlRef.current.signal,
        onProgress: (p, stats) => {
          setProgress(p)
          if (stats) {
            setUploadStats({
              speed: stats.speed || '0 MB/s',
              eta: stats.eta || '0s',
              sent: formatSize(stats.loaded || 0),
              total: formatSize(stats.total || 0),
            })
          }
        },
      })

      if (res.pending && res.jobId) {
        setIsProcessing(true)
        setProcessStatus('Memproses video di server...')
        const pollResult = await pollJobStatus(res.jobId, (status) => {
          setProcessStatus(status || 'Mengoptimalkan kualitas video...')
        })
        if (pollResult && pollResult.ok) {
          setResult(pollResult)
          setFiles([])
        } else {
          onToast?.(pollResult?.error || 'Gagal memproses video', 'error')
        }
      } else if (res.ok) {
        setResult(res)
        setFiles([])
      } else {
        onToast?.(res.error || 'Gagal mengunggah berkas', 'error')
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onToast?.(err.message || 'Terjadi kesalahan jaringan', 'error')
      }
    } finally {
      setUploading(false)
      setIsProcessing(false)
    }
  }

  const cancelUpload = () => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort()
      setUploading(false)
      setIsProcessing(false)
      setProgress(0)
      onToast?.('Upload dibatalkan', 'info')
    }
  }

  return (
    <div className="relative w-full">
      {/* Outer Glow Container */}
      <div className="relative rounded-[26px] bg-[#070C18] border border-white/[0.08] p-4 sm:p-6 shadow-[0_28px_80px_-16px_rgba(0,0,0,0.9)] overflow-hidden">
        
        {/* Animated Top Border Shimmer */}
        <div className="absolute top-0 inset-x-0 h-[2px] overflow-hidden rounded-t-[26px]">
          <div className="h-full w-[200%] bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" style={{ animation: 'modalShimmer 3.5s ease-in-out infinite' }} />
        </div>

        {/* Tab Segmented Control */}
        <div className="flex items-center p-1 rounded-[16px] bg-white/[0.03] border border-white/[0.06] mb-5">
          <button
            onClick={() => {
              if (!uploading) {
                setTab('video')
                setFiles([])
              }
            }}
            className={`flex-1 py-2.5 rounded-[12px] font-extrabold text-[12px] tracking-wide flex items-center justify-center gap-2 transition-all duration-200 ${
              tab === 'video'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_4px_16px_rgba(0,98,255,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <i className="fa-solid fa-video text-[13px]" />
            <span>Video Ultra HD</span>
          </button>

          <button
            onClick={() => {
              if (!uploading) {
                setTab('image')
                setFiles([])
              }
            }}
            className={`flex-1 py-2.5 rounded-[12px] font-extrabold text-[12px] tracking-wide flex items-center justify-center gap-2 transition-all duration-200 ${
              tab === 'image'
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_4px_16px_rgba(0,98,255,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <i className="fa-solid fa-image text-[13px]" />
            <span>Foto Original</span>
          </button>
        </div>

        {/* Dropzone Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => {
            if (!uploading && fileInputRef.current) fileInputRef.current.click()
          }}
          className={`relative rounded-[20px] border-2 border-dashed transition-all duration-300 p-6 sm:p-8 text-center cursor-pointer overflow-hidden ${
            dragOver
              ? 'border-sky-400 bg-sky-500/[0.08] shadow-[0_0_35px_rgba(56,189,248,0.25)] scale-[1.01]'
              : 'border-white/[0.1] bg-white/[0.015] hover:border-sky-400/40 hover:bg-white/[0.03]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={tab === 'image'}
            accept={
              semuaFile
                ? '*/*'
                : tab === 'video'
                ? 'video/mp4,video/quicktime,video/x-matroska,video/avi,video/webm,video/*'
                : 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*'
            }
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(Array.from(e.target.files))
            }}
          />

          {/* Floating Icon */}
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-[20px] bg-gradient-to-br from-sky-400/15 to-blue-600/10 border border-sky-400/30 grid place-items-center mb-3.5 shadow-lg group-hover:scale-105 transition-transform">
            <i className={`fa-solid ${tab === 'video' ? 'fa-cloud-arrow-up' : 'fa-images'} text-sky-400 text-[24px] sm:text-[28px]`} />
          </div>

          <h3 className="font-extrabold text-[15px] sm:text-[16px] text-white tracking-tight mb-1">
            {tab === 'video' ? 'Pilih atau Tarik Video HD ke Sini' : 'Pilih atau Tarik Foto ke Sini'}
          </h3>
          <p className="text-slate-400 text-[11px] font-medium max-w-[280px] mx-auto mb-3.5">
            {tab === 'video'
              ? `Maksimal 1 video (${allowLarge ? largeMaxMB : maxMB}MB) · Format MP4, MOV, MKV`
              : `Hingga 20 foto per batch · Format JPG, PNG, WEBP, HEIC`}
          </p>

          {/* Micro Specs Tags */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pointer-events-none">
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-slate-300">
              100% Stream Copy
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-emerald-400">
              Zero Loss
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-sky-400">
              Auto FastStart
            </span>
          </div>
        </div>

        {/* Selected Files Preview List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-slate-400 flex items-center justify-between px-1">
              <span>Berkas Terpilih ({files.length})</span>
              <span className="text-sky-400 font-mono">{formatSize(files.reduce((a, b) => a + b.size, 0))}</span>
            </p>
            <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
              {files.map((file, idx) => (
                <div
                  key={file.name + idx}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-[12px] bg-white/[0.03] border border-white/[0.07]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 grid place-items-center shrink-0">
                      <i className={`fa-solid ${tab === 'video' ? 'fa-film' : 'fa-image'} text-sky-400 text-[11px]`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white truncate max-w-[200px] sm:max-w-[280px]">{file.name}</p>
                      <p className="text-[9px] text-slate-400 font-mono">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  {!uploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(idx)
                      }}
                      className="w-6 h-6 rounded-full bg-white/[0.05] hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 grid place-items-center transition-colors"
                    >
                      <i className="fa-solid fa-xmark text-[10px]" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress & Telemetry */}
        {(uploading || isProcessing) && (
          <div className="mt-4 p-4 rounded-[16px] bg-white/[0.025] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white font-bold flex items-center gap-2">
                <i className="fa-solid fa-circle-notch fa-spin text-sky-400 text-xs" />
                {isProcessing ? processStatus : 'Mengunggah Berkas...'}
              </span>
              <span className="font-mono font-extrabold text-sky-400 text-sm">{progress}%</span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Stats Telemetry */}
            {!isProcessing && (
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.04] text-[10px] text-slate-400">
                <div>
                  <p className="text-slate-400">Kecepatan</p>
                  <p className="font-mono font-bold text-white">{uploadStats.speed}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400">Terkirim</p>
                  <p className="font-mono font-bold text-white">{uploadStats.sent} / {uploadStats.total}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400">Estimasi</p>
                  <p className="font-mono font-bold text-white">{uploadStats.eta}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5">
          {uploading ? (
            <button
              onClick={cancelUpload}
              className="w-full py-3.5 rounded-[16px] bg-rose-500/10 border border-rose-500/30 text-rose-400 font-extrabold text-[13px] hover:bg-rose-500/20 active:scale-[0.98] transition-all"
            >
              Batalkan Pengunggahan
            </button>
          ) : (
            <button
              disabled={files.length === 0}
              onClick={startUpload}
              className={`w-full py-3.5 rounded-[16px] font-extrabold text-[13px] tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
                files.length > 0
                  ? 'bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 text-white shadow-[0_10px_28px_-6px_rgba(0,98,255,0.45)] hover:brightness-110 active:scale-[0.98]'
                  : 'bg-white/[0.04] border border-white/[0.06] text-slate-400 cursor-not-allowed'
              }`}
            >
              <i className="fa-solid fa-arrow-up-from-bracket text-xs" />
              <span>Unggah {files.length ? `(${files.length} Berkas)` : 'Sekarang'}</span>
            </button>
          )}
        </div>

        {/* Bypass Android / iOS Picker Toggle */}
        <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
          <label className="text-[11px] text-slate-400 cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={semuaFile}
              onChange={(e) => setSemuaFile(e.target.checked)}
              className="rounded border-white/20 bg-white/5 text-sky-500 focus:ring-0"
            />
            <span>Mode Semua Berkas (Bypass Galeri HP)</span>
          </label>
          <span className="text-[10px] font-mono text-slate-400">v3.8h</span>
        </div>
      </div>

      {/* Success Result Modal */}
      {result && (
        <SuccessModal
          result={result}
          settings={settings}
          expireMinutes={settings?.expireMinutes || 60}
          onClose={() => setResult(null)}
        />
      )}
    </div>
  )
}
