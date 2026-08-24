const LS_INTRO = 'sw_intro_seen_v2'
const LS_HISTORY = 'sw_upload_history'

export function loadSettings() {
  return fetch('/api/settings/public').then(r => r.json())
}

export function uploadFiles(files, { onProgress, field, signal }) {
  const fd = new FormData()
  for (const f of files) fd.append(field, f, f.name)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/upload')
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
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
