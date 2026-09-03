'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadFiles, pollJobStatus, fmtSize, saveHistory } from '@/lib/up-api'
import SuccessModal from './SuccessModal'

// Disamakan dengan daftar di server (web-uploader.js VIDEO_EXTS/IMAGE_EXTS).
const VIDEO_EXTS = ['mp4', 'mov', 'mkv', 'avi', 'webm', '3gp', 'flv', 'wmv', 'ts', 'm4v']
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'heic', 'heif', 'avif']
// accept HANYA wildcard MIME. Mencampur `video/*` dengan daftar ".ext" justru
// mempersempit: Android memetakan tiap ekstensi ke MIME lalu memfilter dengan
// hasil pemetaan itu, sehingga file yang MIME-nya kosong tidak muncul di galeri.
const VIDEO_ACCEPT = 'video/*'
const IMAGE_ACCEPT = 'image/*'

const CELLS = 24
const STAGES = ['ANTRE', 'KIRIM', 'PERIKSA', 'PROSES', 'SELESAI']

/* ══════════════════════════════════════════════════════════════
   REACTOR — indikator proses. Tiga lapis informasi sekaligus:
   cincin conic bersegmen (persen), blok sel yang menyala berurut
   (aliran byte), dan rel tahapan (di mana prosesnya sekarang).
   Tidak ada satu pun bar lurus datar.
   ══════════════════════════════════════════════════════════════ */
function Reactor({ pct, stageIdx, phase, phaseText, cellFloor, label, sub, right, subRight }) {
  const on = Math.round((pct / 100) * CELLS)
  return (
    <div className="plate-flat p-3.5">
      <div className="reactor-lay">
        <div className="reactor" data-phase={phase}>
          <span className="reactor-ring" style={{ '--p': pct }} />
          <span className="reactor-notch" />
          <span className="reactor-head" style={{ '--p': pct }} />
          {/* Cincin orbit yang berputar DIHAPUS: aturan rasa pengguna yang
              tercatat = "no spinning orbit rings — subtle conic sweep ring +
              floor shadow". Kemajuan sudah dibawa .reactor-ring (conic --p),
              denyut hidup dibawa .reactor-core, kedalaman oleh floor shadow. */}
          <span className="reactor-core">
            <span className="reactor-num data">{pct}</span>
            <span className="kicker !text-[8px] mt-[2px]">PERSEN</span>
          </span>
          {/* Penanda tahap: tanpa ini, angka yang mulai ulang di tahap 2 terbaca
              sebagai progres yang mundur, bukan sebagai hitungan baru. */}
          <span className="reactor-phase">
            <span className="reactor-pip" data-done={stageIdx > 2 ? '1' : stageIdx >= 1 ? 'now' : '0'} />
            <span className="reactor-pip" data-done={stageIdx > 3 ? '1' : stageIdx === 3 ? 'now' : '0'} />
            {phaseText}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="display-m !text-[14px] truncate">{label}</p>
              {/* Sub-teks dibiarkan turun 2 baris, bukan `truncate`: kalimatnya
                  informatif ("Menyiapkan agar lancar diputar…") dan kalau
                  dipotong ellipsis justru kehilangan artinya. */}
              <p className="data text-[10px] opacity-65 mt-1 leading-[1.45] line-clamp-2">{sub}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="data text-[12px] font-bold">{right}</p>
              <p className="kicker !text-[8px] mt-[2px]">{subRight}</p>
            </div>
          </div>

          <div className="cells mt-3" data-phase={phase}>
            {Array.from({ length: CELLS }).map((_, i) => (
              <span key={i}
                className={`cell ${i < on ? 'cell-on' : ''} ${i >= on && i < cellFloor ? 'cell-done' : ''} ${i === on - 1 && pct < 100 ? 'cell-tip' : ''}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="rail mt-3">
        {STAGES.map((s, i) => (
          <span key={s} className="rail-step"
            data-on={i < stageIdx ? '1' : i === stageIdx ? 'now' : '0'}>{s}</span>
        ))}
      </div>
    </div>
  )
}

export default function UploadPanel({ settings, toast }) {
  const [tab, setTab] = useState('video')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ pct: 0, loaded: 0, total: 0, speed: 0 })
  const [encode, setEncode] = useState(null) // { stage, pct }
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [thumbs, setThumbs] = useState({})
  const abortRef = useRef(null)
  // Pelarian terakhir kalau galeri HP masih menyembunyikan file.
  const [semuaFile, setSemuaFile] = useState(false)

  const accept = semuaFile ? undefined : (tab === 'video' ? VIDEO_ACCEPT : IMAGE_ACCEPT)
  const exts = tab === 'video' ? VIDEO_EXTS : IMAGE_EXTS
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
    let arr = Array.from(newFiles)
    if (tab === 'video' && arr.length > 1) {
      toast('Hanya 1 video per upload', 'info')
      arr = arr.slice(0, 1)
    }
    const validExts = tab === 'video' ? VIDEO_EXTS : IMAGE_EXTS
    const mimePrefix = tab === 'video' ? 'video/' : 'image/'
    const valid = arr.filter(f => {
      const ext = (f.name.split('.').pop() || '').toLowerCase()
      if (validExts.includes(ext) || (f.type || '').toLowerCase().startsWith(mimePrefix)) return true
      const mime = (f.type || '').toLowerCase()
      return semuaFile && (!mime || mime === 'application/octet-stream')
    })
    if (valid.length < arr.length) toast(`${arr.length - valid.length} file ditolak — format tidak didukung`, 'error')
    const max = settings?.maxFileSizeMB || 0
    let sizeOk = valid.filter(f => max <= 0 || f.size <= max * 1024 * 1024)
    if (sizeOk.length < valid.length) toast(`${valid.length - sizeOk.length} file melebihi batas ${max} MB`, 'error')
    // Tanpa jalur langsung (port 8443), Cloudflare menolak body > 100 MB di edge
    // sebelum sampai ke server. Tolak lebih awal dengan alasan yang jelas —
    // jangan biarkan user menunggu lalu kena 413 HTML.
    const bigLimit = 95 * 1024 * 1024
    if (!settings?.directUploadBase) {
      const before = sizeOk.length
      sizeOk = sizeOk.filter(f => f.size <= bigLimit)
      if (sizeOk.length < before) {
        toast(`${before - sizeOk.length} file di atas 95 MB — minta admin menyalakan Upload Langsung`, 'error')
      }
    }
    const hardMB = settings?.largeUploadMaxMB || 0
    if (settings?.allowLargeUpload === false) {
      const before = sizeOk.length
      sizeOk = sizeOk.filter(f => f.size <= bigLimit)
      if (sizeOk.length < before) toast(`${before - sizeOk.length} file besar ditolak — mode file besar sedang dimatikan admin`, 'error')
    } else if (hardMB > 0) {
      const before = sizeOk.length
      sizeOk = sizeOk.filter(f => f.size <= hardMB * 1024 * 1024)
      if (sizeOk.length < before) toast(`${before - sizeOk.length} file melebihi batas upload besar ${hardMB} MB`, 'error')
    }
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      return [...prev, ...sizeOk.filter(f => !existing.has(f.name + f.size))]
    })
  }, [tab, settings, toast, semuaFile])

  const removeFile = (f) => setFiles(prev => prev.filter(x => x !== f))
  const clearAll = () => { setFiles([]); setThumbs({}) }
  const handleDrop = (e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }

  const doUpload = async () => {
    if (!files.length || uploading) return
    setUploading(true); setProgress({ pct: 0, loaded: 0, total: 0, speed: 0 })
    setEncode(null)
    abortRef.current = new AbortController()
    try {
      const res = await uploadFiles(files, { field, onProgress: p => setProgress(p), signal: abortRef.current.signal })
      let final = res
      if (res.pending && res.jobId) {
        // Begitu XHR selesai, tahap jaringan sudah 100%. Tampilkan tahap 2 SEGERA
        // dengan label jujur — dulu `encode` masih null sampai poll pertama datang,
        // jadi loader tertahan di "MENGIRIM 99%" selama ~400 ms tanpa alasan.
        setEncode({ stage: 'Memeriksa video…', pct: 0, startedAt: Date.now(), needsEncode: null })
        final = await new Promise((resolve, reject) => {
          let stop = false
          let miss = 0
          const started = Date.now()
          const tick = async () => {
            if (stop) return
            try {
              // Base disematkan dari respons upload: kalau admin mematikan jalur
              // langsung di tengah proses, poll tetap menembak host yang memegang job.
              const s = await pollJobStatus(res.jobId, res.base)
              // Urutan penting: 404 berbentuk {ok:false, error:'Job tidak
              // ditemukan'}. Kalau s.error diperiksa lebih dulu, toleransi
              // 404-sesaat di bawah tidak akan pernah terpakai.
              if (s.ok === false) {
                if (++miss > 12) { stop = true; reject(new Error(s.error || 'Job hilang di server')); return }
                setTimeout(tick, 350)
                return
              }
              if (s.error) { stop = true; reject(new Error(s.error)); return }
              if (s.result) {
                stop = true
                setEncode({ stage: 'Selesai', pct: 100, startedAt: started, needsEncode: s.needsEncode })
                // Beri satu frame agar cincin benar-benar sampai 100 sebelum
                // modal menutupi loader. Tanpa ini, 100% tidak pernah terlihat.
                setTimeout(() => resolve(s.result), 260)
                return
              }
              miss = 0
              if (s.stage || typeof s.pct === 'number') {
                setEncode({ stage: s.stage || 'Memproses…', pct: s.pct || 0, startedAt: started, needsEncode: s.needsEncode })
              }
              setTimeout(tick, 350)
            } catch {
              // Jaringan goyang bukan alasan menyatakan gagal — job jalan di server.
              if (++miss > 12) { stop = true; reject(new Error('Koneksi ke server terputus')); return }
              setTimeout(tick, 700)
            }
          }
          tick()
        })
      }
      saveHistory({ code: final.code, codes: final.codes, bundle: final.bundle, count: final.count, files: files.map(f => f.name), totalSize: files.reduce((s, f) => s + f.size, 0), timestamp: Date.now(), expireMinutes: settings?.expireMinutes || 60 })
      setResult({ ...final, expireMinutes: settings?.expireMinutes || 60 })
      if (final.warn) toast(final.warn, 'info')
      else toast('Upload berhasil', 'success')
      setFiles([]); setThumbs({})
    } catch (e) { if (e.message !== 'Upload dibatalkan') toast(e.message, 'error') }
    finally { setUploading(false); setProgress({ pct: 0, loaded: 0, total: 0, speed: 0 }); setEncode(null) }
  }

  const cancelUpload = () => { abortRef.current?.abort(); setUploading(false); setProgress({ pct: 0, loaded: 0, total: 0, speed: 0 }); setEncode(null); toast('Upload dibatalkan', 'info') }

  // Angka persen milik TAHAP yang sedang jalan, dan tahapnya dinyatakan eksplisit
  // (pip + label + warna cincin). Dulu keduanya dipaksa ke satu skala 0→100:
  // tahap 2 mulai dari 1% sehingga angka tampak MUNDUR dari 99% → 1%.
  // Tahap 2 hanya dihitung ulang dari 0 kalau server memang RE-ENCODE (needsEncode).
  // Untuk remux/stream-copy yang cuma sedetik, angka ditahan di 99 lalu ke 100 —
  // dulu ia sempat turun ke 1% dan terbaca sebagai loader yang rusak.
  const realEncode = !!encode && encode.needsEncode === true
  const phase = !uploading ? (result ? 'done' : 'idle') : (realEncode ? 'encode' : 'send')
  const totalPct = !uploading
    ? (result ? 100 : 0)
    : realEncode
      ? (encode.pct >= 100 ? 100 : Math.max(1, Math.min(99, Math.round(encode.pct))))
      : encode
        ? (encode.pct >= 100 ? 100 : 99)
        : Math.min(99, Math.round(progress.pct || 0))

  // Tahap aktif untuk rel: KIRIM saat XHR jalan, PROSES saat ffmpeg jalan.
  const stageIdx = !uploading ? 0 : encode ? (encode.pct >= 100 ? 4 : realEncode ? 3 : 2) : (progress.pct >= 99 ? 2 : 1)

  // Selama tahap 2, sel tahap 1 tetap terlihat redup sebagai bukti kerja selesai.
  const cellFloor = phase === 'encode' ? CELLS : 0

  // ETA tahap 2 dihitung dari laju nyata ffmpeg, bukan angka karangan.
  const encEta = (() => {
    if (!realEncode || !encode?.startedAt || encode.pct < 3 || encode.pct >= 100) return null
    const el = (Date.now() - encode.startedAt) / 1000
    const left = Math.ceil((el / encode.pct) * (100 - encode.pct))
    return left > 0 && left < 3600 ? left : null
  })()

  if (settings?.maintenance) {
    return (
      <section className="plate p-7 text-center">
        <span className="sticker">MAINTENANCE</span>
        <p className="display-l mt-4">SEDANG DIPERBAIKI</p>
        <p className="text-[13px] text-[var(--ink-2)] mt-3">Server dalam pemeliharaan. Coba lagi nanti.</p>
      </section>
    )
  }

  return (
    <>
      <section className="plate plate-seam" id="upload" data-reveal="">
        {/* ── Tab: dua sel penuh, bukan pil ── */}
        <div className="grid grid-cols-2 border-b-2 border-[var(--edge)] rounded-t-[14px] overflow-hidden">
          {[['video', 'fa-film', 'VIDEO'], ['image', 'fa-images', 'FOTO']].map(([t, icon, label], i) => (
            <button key={t} onClick={() => { if (!uploading) { setTab(t); clearAll() } }}
              disabled={uploading}
              className={`relative flex items-center justify-center gap-2.5 py-3.5 font-[family-name:var(--font-display)] text-[13px] uppercase transition-[background-color,color] duration-200 disabled:opacity-50 ${i === 0 ? 'border-r-2 border-[var(--edge)]' : ''} ${tab === t ? 'bg-[var(--ink)] text-[var(--paper)]' : 'bg-transparent text-[var(--ink-2)] hover:bg-[var(--paper-2)]'}`}>
              <i className={`fa-solid ${icon} text-[12px]`} />{label}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--accent)]" />}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* ── Format + batas ── */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-1">
              {exts.map(ext => (
                <span key={ext} className="px-2 py-[3px] border-2 border-[var(--edge)] rounded-[var(--r-pill)] bg-[var(--paper-2)] font-[family-name:var(--font-mono)] text-[8px] font-bold tracking-[0.1em]">
                  {ext.toUpperCase()}
                </span>
              ))}
            </div>
            <span className="chip shrink-0">
              {settings?.maxFileSizeMB > 0 ? `≤ ${settings.maxFileSizeMB}MB` : 'TANPA BATAS'}
            </span>
          </div>

          {/* ── Dropzone ── */}
          <div
            onClick={() => { if (!uploading) fileRef.current?.click() }}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            data-drag={drag ? '1' : '0'}
            className="drop py-9 px-5 text-center"
            role="button" tabIndex={0}
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !uploading) { e.preventDefault(); fileRef.current?.click() } }}
            aria-label={tab === 'video' ? 'Pilih video untuk diupload' : 'Pilih foto untuk diupload'}
          >
            <span className="drop-hatch" />
            <input ref={fileRef} type="file" accept={accept} multiple={tab !== 'video'} className="hidden"
              onChange={e => addFiles(e.target.files)} aria-hidden tabIndex={-1} />

            <span className="relative tile w-14 h-14 mx-auto mb-3.5">
              <i className={`fa-solid ${isImg ? 'fa-images' : 'fa-cloud-arrow-up'} text-[19px]`} />
            </span>
            <p className="display-m !text-[17px] relative">{tab === 'video' ? 'LEPAS VIDEO DI SINI' : 'LEPAS FOTO DI SINI'}</p>
            <p className="text-[12px] text-[var(--ink-2)] mt-1.5 relative">
              atau <span className="font-bold underline decoration-2 underline-offset-[3px]">pilih dari perangkat</span>
            </p>

            <button type="button"
              onClick={(e) => { e.stopPropagation(); setSemuaFile(v => !v); setTimeout(() => fileRef.current?.click(), 0) }}
              className="btn btn-sm btn-ghost mt-4 relative">
              <i className="fa-solid fa-folder-open text-[10px]" />
              {semuaFile ? 'KEMBALI KE FILTER' : 'FILE TIDAK MUNCUL?'}
            </button>
          </div>

          {/* ── Daftar file ── */}
          {files.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="kicker">{files.length} FILE · {fmtSize(files.reduce((s, f) => s + f.size, 0))}</span>
                <button onClick={clearAll} disabled={uploading}
                  className="kicker !text-[9px] underline decoration-2 underline-offset-2 hover:text-[var(--hot)] disabled:opacity-30">
                  HAPUS SEMUA
                </button>
              </div>

              {isImg ? (
                <div className="grid grid-cols-3 gap-2">
                  {files.map(f => {
                    const key = f.name + f.size
                    return (
                      <div key={key} className="relative aspect-square border-2 border-[var(--edge)] overflow-hidden bg-[var(--paper-2)]">
                        {thumbs[key] && <img src={thumbs[key]} alt="" className="w-full h-full object-cover" />}
                        <span className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-[var(--ink)] text-[var(--paper)] font-[family-name:var(--font-mono)] text-[8px] truncate">
                          {fmtSize(f.size)}
                        </span>
                        {!uploading && (
                          <button onClick={(e) => { e.stopPropagation(); removeFile(f) }} aria-label={'Hapus ' + f.name}
                            className="absolute top-1 right-1 w-7 h-7 grid place-items-center bg-[var(--hot)] text-white border-2 border-[var(--edge)]">
                            <i className="fa-solid fa-xmark text-[10px]" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {files.map(f => (
                    <div key={f.name + f.size} className="ticket">
                      <span className="ticket-notch" />
                      <span className="icon-tile !w-9 !h-9 shrink-0"><i className="fa-solid fa-film text-[11px]" /></span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[12px] truncate">{f.name}</p>
                        <p className="data text-[10px] opacity-65">{fmtSize(f.size)}</p>
                      </div>
                      <span className="chip shrink-0 !px-2 !py-1">{(f.name.split('.').pop() || '').toUpperCase()}</span>
                      {!uploading && (
                        <button onClick={() => removeFile(f)} aria-label={'Hapus ' + f.name}
                          className="w-9 h-9 shrink-0 grid place-items-center border-2 border-[var(--edge)] text-[var(--hot)] hover:bg-[var(--hot)] hover:text-white transition-colors">
                          <i className="fa-solid fa-xmark text-[11px]" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Indikator proses ── */}
          {uploading && (
            <div className="mt-4 anim-fade">
              <Reactor
                pct={totalPct}
                stageIdx={stageIdx}
                phase={phase}
                phaseText={realEncode ? 'TAHAP 2 DARI 2' : encode ? 'MEMERIKSA' : 'TAHAP 1 DARI 2'}
                cellFloor={cellFloor}
                label={encode ? (encode.stage || 'MEMPROSES') : 'MENGIRIM'}
                sub={encode
                  ? 'Menyiapkan agar lancar diunduh di WhatsApp'
                  : `${fmtSize(progress.loaded)} / ${fmtSize(progress.total)}`}
                right={encode ? 'FFMPEG' : progress.speed > 0 ? `${(progress.speed * 8 / 1000000).toFixed(1)} Mbps` : '—'}
                subRight={encode
                  ? (encEta !== null ? `≈ ${encEta}s LAGI` : realEncode ? 'DI SERVER' : 'SEBENTAR')
                  : (progress.speed > 0 && progress.pct < 100
                    ? `≈ ${Math.ceil((progress.total - progress.loaded) / progress.speed)}s LAGI`
                    : 'KECEPATAN')}
              />
            </div>
          )}

          {/* ── Aksi ── */}
          {files.length > 0 && (
            <div className="mt-4">
              {uploading ? (
                // Setelah masuk tahap 2, file sudah ada di server dan ffmpeg
                // jalan di sana — "batal" tidak akan menghentikannya, jadi jangan
                // tawarkan tombol yang berbohong.
                encode ? (
                  <div className="plate-flat p-3 text-center">
                    <p className="kicker">DIPROSES DI SERVER — JANGAN TUTUP HALAMAN</p>
                  </div>
                ) : (
                <button onClick={cancelUpload} className="btn btn-hot w-full">
                  <span className="btn-cap"><i className="fa-solid fa-stop text-[9px]" /></span>
                  BATALKAN
                </button>
                )
              ) : (
                <button onClick={doUpload} className="btn btn-primary w-full">
                  <span className="btn-cap"><i className="fa-solid fa-arrow-up text-[10px]" /></span>
                  UPLOAD {files.length} {tab === 'video' ? 'VIDEO' : 'FOTO'}
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {result && <SuccessModal result={result} settings={settings} expireMinutes={result.expireMinutes} onClose={() => setResult(null)} />}
    </>
  )
}
