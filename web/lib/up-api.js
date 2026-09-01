const LS_INTRO = 'sw_intro_seen_v2'
const LS_HISTORY = 'sw_upload_history'

export function loadSettings() {
  return fetch('/api/settings/public').then(r => r.json())
}

// Ambang pindah jalur: Cloudflare Free menolak body >100 MB (413) sebelum request
// sampai ke server. Di atas ambang ini file dipecah jadi bagian kecil supaya tiap
// request lolos proxy, lalu digabung utuh di server. File kecil tetap lewat
// jalur lama yang sudah terbukti.
// Ambang diturunkan dari 95 MB ke 80 MB: jalur single mengirim seluruh file
// dalam SATU request, jadi file 85–95 MB pun bisa melewati batas waktu proxy
// pada jaringan HP. Di atas 80 MB selalu dipecah.
const CHUNK_THRESHOLD = 80 * 1024 * 1024
// 5 MB, bukan 20 MB. Cloudflare memutus koneksi yang menahan satu request
// terlalu lama (~100 detik); pada jaringan HP 1–2 Mbps satu bagian 20 MB butuh
// 80–160 detik, jadi upload besar dari HP hampir selalu putus di tengah.
// 5 MB selesai dalam ~20–40 detik di jaringan yang sama.
const CHUNK_SIZE = 5 * 1024 * 1024

// --- Jalur upload langsung (di luar Cloudflare) ---
//
// Kalau tuan menyalakan saklarnya di panel admin, `/api/settings/public`
// mengirim `directUploadBase` (mis. "https://up.swhdhlz.my.id:8443"). Subdomain
// itu grey-cloud, jadi request tidak lewat edge dan cap 100 MB tidak berlaku.
// Kalau mati, nilainya null dan SEMUA jalur di berkas ini tetap memakai path
// relatif seperti sekarang — tidak ada perubahan perilaku.
//
// Hanya request UPLOAD yang dialihkan. Halaman, gambar, dan panel tetap lewat
// Cloudflare supaya tetap dapat cache dan perlindungan.
let _basePromise = null
function uploadBase() {
  if (!_basePromise) {
    _basePromise = fetch('/api/settings/public')
      .then(r => r.json())
      .then(s => s?.directUploadBase || '')
      // Gagal ambil setelan tidak boleh menggagalkan upload: jatuh ke host biasa.
      .catch(() => '')
  }
  return _basePromise
}

async function uploadChunked(files, { onProgress, signal }) {
  const base = await uploadBase()
  const meta = files.map(f => ({ name: f.name, size: f.size }))
  const initRes = await fetch(base + '/upload/chunk/init', {
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
      // Retry per bagian dengan 6 percobaan dan jeda bertambah (1s→16s):
      // jaringan HP putus-nyambung selama menit-menit pertama, dan 3 percobaan
      // dengan jeda pendek terlalu cepat menyerah pada file besar. Hanya bagian
      // yang gagal diulang, bukan seluruh file.
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const r = await fetch(`${base}/upload/chunk?sid=${encodeURIComponent(init.sessionId)}&fi=${fi}&ci=${ci}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: blob,
            signal,
          })
          // 5xx dari proxy (524/522/502) tidak selalu punya body JSON.
          let d = {}
          try { d = await r.json() } catch { d = { ok: false, error: 'Jaringan terputus (kode ' + r.status + ')' } }
          if (!r.ok || !d.ok) throw new Error(d.error || 'Bagian gagal dikirim')
          lastErr = null
          break
        } catch (e) {
          if (signal?.aborted) throw new Error('Upload dibatalkan')
          lastErr = e
          await new Promise(r => setTimeout(r, Math.min(16000, 1000 * Math.pow(2, attempt))))
        }
      }
      if (lastErr) throw new Error('Bagian ' + (ci + 1) + ' gagal setelah 6 percobaan: ' + lastErr.message)
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

  // Penggabungan di server butuh waktu untuk file besar; kalau proxy memutus
  // respons, coba lagi — bagian-bagiannya sudah ada di server, jadi mengulang
  // finish aman dan tidak perlu mengunggah ulang.
  let fin = null, finErr = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const finRes = await fetch(base + '/upload/chunk/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: init.sessionId }),
        signal,
      })
      let d = {}
      try { d = await finRes.json() } catch { d = { ok: false, error: 'Server tidak merespons saat menggabung (kode ' + finRes.status + ')' } }
      if (!finRes.ok || !d.ok) throw new Error(d.error || 'Gagal menggabung file')
      fin = d
      break
    } catch (e) {
      if (signal?.aborted) throw new Error('Upload dibatalkan')
      finErr = e
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
    }
  }
  if (!fin) throw finErr || new Error('Gagal menggabung file')
  return fin
}

export function uploadFiles(files, opts) {
  const arr = Array.from(files)
  // Ambang diperiksa terhadap TOTAL, bukan per file. Jalur single mengirim
  // SEMUA file yang dipilih dalam satu request multipart, jadi 3 file @50 MB
  // menghasilkan body 150 MB dan ditolak proxy dengan 413 walaupun tidak ada
  // satu pun file yang melewati ambang. Ini penyebab upload gagal saat memilih
  // beberapa video sekaligus.
  const totalSize = arr.reduce((n, f) => n + (f.size || 0), 0)
  const needsChunk = totalSize > CHUNK_THRESHOLD || arr.some(f => f.size > CHUNK_THRESHOLD)
  if (needsChunk) return uploadChunked(arr, opts)
  return uploadSingle(arr, opts)
}

async function uploadSingle(files, { onProgress, field, signal }) {
  const base = await uploadBase()
  const fd = new FormData()
  for (const f of files) fd.append(field, f, f.name)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', base + '/upload')
    let lastLoaded = 0, lastTime = Date.now()
    xhr.upload.onprogress = e => {
      if (!e.lengthComputable || !onProgress) return
      const now = Date.now(), dt = (now - lastTime) / 1000
      const speed = dt > 0.1 ? (e.loaded - lastLoaded) / dt : 0
      lastLoaded = e.loaded; lastTime = now
      onProgress({ pct: Math.round((e.loaded / e.total) * 100), loaded: e.loaded, total: e.total, speed })
    }
    xhr.onload = () => {
      // Penolakan proxy (413) membalas HTML, bukan JSON. Tanpa cabang ini
      // pesannya jadi "Respons server tidak valid" yang tidak menjelaskan
      // apa pun, padahal penyebabnya jelas: body terlalu besar.
      if (xhr.status === 413) {
        reject(new Error('File terlalu besar untuk dikirim sekaligus. Coba upload satu per satu.'))
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

export async function pollJobStatus(jobId) {
  const base = await uploadBase()
  return fetch((base || '') + '/upload/status?id=' + encodeURIComponent(jobId)).then(r => r.json())
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
