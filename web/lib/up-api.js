const LS_INTRO = 'sw_intro_seen_v2'
const LS_HISTORY = 'sw_upload_history'

export function loadSettings() {
  return fetch('/api/settings/public').then(r => r.json())
}

// Ambang pindah jalur: Cloudflare Free menolak body >100 MB (413) sebelum request
// sampai ke server. Di atas ambang ini file dipecah jadi bagian kecil supaya tiap
// request lolos proxy, lalu digabung utuh di server. File kecil tetap lewat
// jalur lama yang sudah terbukti.
const CHUNK_THRESHOLD = 95 * 1024 * 1024
const CHUNK_SIZE = 20 * 1024 * 1024

async function uploadChunked(files, { onProgress, signal }) {
  const meta = files.map(f => ({ name: f.name, size: f.size }))
  const initRes = await fetch('/upload/chunk/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: meta }),
    signal,
  })
  const init = await initRes.json()
  if (!initRes.ok || !init.ok) throw new Error(init.error || 'Gagal memulai upload besar')

  const chunkSize = init.chunkSize || CHUNK_SIZE
  const total = files.reduce((s, f) => s + f.size, 0)
  let sent = 0
  const startedAt = Date.now()

  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi]
    const parts = Math.ceil(file.size / chunkSize)
    for (let ci = 0; ci < parts; ci++) {
      if (signal?.aborted) throw new Error('Upload dibatalkan')
      const blob = file.slice(ci * chunkSize, Math.min((ci + 1) * chunkSize, file.size))
      let lastErr = null
      // Retry per bagian: jaringan HP sering putus sesaat; ulang bagiannya saja,
      // bukan seluruh file.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const r = await fetch(`/upload/chunk?sid=${encodeURIComponent(init.sessionId)}&fi=${fi}&ci=${ci}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: blob,
            signal,
          })
          const d = await r.json()
          if (!r.ok || !d.ok) throw new Error(d.error || 'Bagian gagal dikirim')
          lastErr = null
          break
        } catch (e) {
          if (signal?.aborted) throw new Error('Upload dibatalkan')
          lastErr = e
          await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
        }
      }
      if (lastErr) throw lastErr
      sent += blob.size
      if (onProgress) {
        const elapsed = (Date.now() - startedAt) / 1000
        onProgress({
          pct: Math.round((sent / total) * 100),
          loaded: sent,
          total,
          speed: elapsed > 0.5 ? sent / elapsed : 0,
        })
      }
    }
  }

  const finRes = await fetch('/upload/chunk/finish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: init.sessionId }),
    signal,
  })
  const fin = await finRes.json()
  if (!finRes.ok || !fin.ok) throw new Error(fin.error || 'Gagal menggabung file')
  return fin
}

export function uploadFiles(files, opts) {
  const arr = Array.from(files)
  const needsChunk = arr.some(f => f.size > CHUNK_THRESHOLD)
  if (needsChunk) return uploadChunked(arr, opts)
  return uploadSingle(arr, opts)
}

function uploadSingle(files, { onProgress, field, signal }) {
  const fd = new FormData()
  for (const f of files) fd.append(field, f, f.name)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/upload')
    let lastLoaded = 0, lastTime = Date.now()
    xhr.upload.onprogress = e => {
      if (!e.lengthComputable || !onProgress) return
      const now = Date.now(), dt = (now - lastTime) / 1000
      const speed = dt > 0.1 ? (e.loaded - lastLoaded) / dt : 0
      lastLoaded = e.loaded; lastTime = now
      onProgress({ pct: Math.round((e.loaded / e.total) * 100), loaded: e.loaded, total: e.total, speed })
    }
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && data.ok) resolve(data)
        else reject(new Error(data.error || 'Upload gagal'))
      } catch { reject(new Error('Respons server tidak valid')) }
    }
    xhr.onerror = () => reject(new Error('Koneksi gagal'))
    xhr.onabort = () => reject(new Error('Upload dibatalkan'))
    signal?.addEventListener('abort', () => xhr.abort())
    xhr.send(fd)
  })
}

export function pollJobStatus(jobId) {
  return fetch('/upload/status?id=' + encodeURIComponent(jobId)).then(r => r.json())
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
