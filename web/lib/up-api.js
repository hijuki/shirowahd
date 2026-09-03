const LS_INTRO = 'sw_intro_seen_v2'
const LS_HISTORY = 'sw_upload_history'

export function loadSettings() {
  return fetch('/api/settings/public?_t=' + Date.now(), {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
  }).then(r => r.json())
}


// Base jalur langsung. Di-cache 15 detik: pollJobStatus dipanggil tiap 400 ms,
// dan versi lama mem-fetch /api/settings/public di SETIAP poll — konversi video
// 2 menit berarti ~300 request setting yang tidak perlu.
let baseCache = { v: '', at: 0 }

async function uploadBase() {
  if (Date.now() - baseCache.at < 15000) return baseCache.v
  try {
    const r = await fetch('/api/settings/public?_t=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
    if (!r.ok) return baseCache.v
    const s = await r.json()
    baseCache = { v: s?.directUploadBase || '', at: Date.now() }
    return baseCache.v
  } catch {
    return baseCache.v
  }
}

// Batas nyata Cloudflare Free = 100 MB pada UKURAN BODY (bukan durasi).
// 95 MB memberi ruang untuk overhead multipart supaya tidak kena 413 di tepi.
const CF_BODY_LIMIT = 95 * 1024 * 1024

export async function uploadFiles(files, opts) {
  const arr = Array.from(files)
  // Penting: body multipart menampung SEMUA file terpilih, jadi yang menentukan
  // adalah TOTAL, bukan file terbesar. Dulu pakai some() → 3x50 MB lolos
  // pemeriksaan lalu ditolak edge sebagai 413.
  const totalSize = arr.reduce((n, f) => n + (f.size || 0), 0)
  const base = await uploadBase()

  // Tanpa jalur langsung, apa pun di atas batas edge dipastikan gagal. Tolak di
  // sisi klien dengan pesan yang bisa ditindaklanjuti, bukan menunggu 413 HTML
  // dari Cloudflare yang muncul ke user sebagai "respons server tidak valid".
  if (!base && totalSize > CF_BODY_LIMIT) {
    throw new Error(
      'Total ' + fmtSize(totalSize) + ' melebihi batas 95 MB jalur biasa. ' +
      'Aktifkan "Upload Langsung" di dashboard admin untuk file besar.'
    )
  }
  const res = await uploadSingle(arr, { ...opts, base })
  // Sematkan base yang dipakai: kalau admin mematikan "Upload Langsung" saat
  // upload masih jalan, poll berikutnya akan menembak host yang berbeda dan
  // dapat 404 "Job tidak ditemukan" — loader gagal padahal file sudah masuk.
  return { ...res, base }
}

async function uploadSingle(files, { onProgress, field, signal, base }) {
  const fd = new FormData()
  for (const f of files) fd.append(field || 'files', f, f.name)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', (base || '') + '/upload')
    let lastLoaded = 0, lastTime = Date.now()
    xhr.upload.onprogress = e => {
      if (!e.lengthComputable || !onProgress) return
      const now = Date.now(), dt = (now - lastTime) / 1000
      const speed = dt > 0.1 ? (e.loaded - lastLoaded) / dt : 0
      lastLoaded = e.loaded; lastTime = now
      onProgress({ pct: Math.round((e.loaded / e.total) * 100), loaded: e.loaded, total: e.total, speed })
    }
    xhr.onload = () => {
      if (xhr.status === 413) {
        reject(new Error('Ditolak jaringan karena melebihi 100 MB. Aktifkan "Upload Langsung" di dashboard admin untuk file besar.'))
        return
      }
      if (xhr.status === 0) { reject(new Error('Koneksi terputus saat mengirim')); return }
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && data.ok) resolve(data)
        else reject(new Error(data.error || 'Upload gagal (kode ' + xhr.status + ')'))
      } catch {
        reject(new Error('Server menolak upload (kode ' + xhr.status + ')'))
      }
    }
    xhr.onerror = () => reject(new Error('Koneksi gagal — periksa jaringan lalu coba lagi'))
    xhr.onabort = () => reject(new Error('Upload dibatalkan'))
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(fd)
  })
}

export async function pollJobStatus(jobId, pinnedBase) {
  const base = pinnedBase !== undefined ? pinnedBase : await uploadBase()
  return fetch((base || '') + '/upload/status?id=' + encodeURIComponent(jobId), {
    cache: 'no-store'
  }).then(r => r.json())
}

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY)) || [] } catch { return [] }
}

export function saveHistory(entry) {
  const h = getHistory()
  h.unshift(entry)
  localStorage.setItem(LS_HISTORY, JSON.stringify(h.slice(0, 30)))
}

export function clearHistory() {
  localStorage.removeItem(LS_HISTORY)
}

export function introSeen() {
  return !!localStorage.getItem(LS_INTRO)
}
export function markIntroSeen() {
  localStorage.setItem(LS_INTRO, '1')
}

export function fmtSize(bytes) {
  if (bytes === 0) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(u.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + u[i]
}

export function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'baru saja'
  const m = Math.floor(s / 60)
  if (m < 60) return m + ' menit lalu'
  const h = Math.floor(m / 60)
  if (h < 24) return h + ' jam lalu'
  return Math.floor(h / 24) + ' hari lalu'
}
