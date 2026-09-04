const BASE = '/admin'

function getToken() { return localStorage.getItem('admin_token') }

async function api(path, opts = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...opts.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
  // 401 pada endpoint ber-token = sesi mati -> paksa balik ke login.
  // TAPI /login sendiri memakai 401 untuk "password salah"; kalau ikut
  // di-reload, halaman cuma berkedip dan pesan error tidak pernah terlihat.
  if (res.status === 401 && path !== '/login') {
    localStorage.removeItem('admin_token'); window.location.reload(); return null
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // status ikut dibawa: halaman login perlu membedakan 401 (password salah)
    // dari 429 (IP diblokir 15 menit setelah 5 kali gagal).
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

export const login = (password) => api('/login', { method: 'POST', body: { password } })
export const getStats = () => api('/api/stats')
export const getAnalytics = () => api('/api/analytics')
export const getSystem = () => api('/api/system')
export const getSettings = () => api('/api/settings')
export const saveSettings = (s) => api('/api/settings', { method: 'POST', body: s })
export const changePassword = (currentPassword, newPassword) => api('/api/change-password', { method: 'POST', body: { currentPassword, newPassword } })
export const getVideos = () => api('/api/videos')
export const deleteVideo = (code) => api('/api/video/delete', { method: 'POST', body: { code } })
export const extendVideo = (code) => api('/api/video/extend', { method: 'POST', body: { code } })
export const cleanupExpired = () => api('/api/cleanup', { method: 'POST' })
export const cleanupOrphans = () => api('/api/cleanup-orphans', { method: 'POST' })
export const getUploadLog = () => api('/api/upload-log')
export const setMaintenance = (enabled) => api('/api/maintenance', { method: 'POST', body: { enabled } })
export const blacklistAction = (action, ip) => api('/api/blacklist', { method: 'POST', body: { action, ip } })
export const getBotStatus = () => api('/api/bot/status')
export const getBlacklist = () => api('/api/blacklist')
export const getBotInternalStatus = () => api('/api/bot/internal-status')
export const getBotPlugins = () => api('/api/bot/plugins')
export const pairBot = (number, force = false) => api('/api/bot/pair', { method: 'POST', body: { number, force } })
// Papan status pairing: dibaca dari berkas oleh proses web, jadi tetap terbaca
// walau proses bot belum pernah hidup (kondisi VPS baru).
export const getPairState = () => api('/api/bot/pair/state')
export const resetBotSession = () => api('/api/bot/session/reset', { method: 'POST' })
export const announceBot = () => api('/api/bot/announce', { method: 'POST' })
// Registry multi-bot
export const getBots = () => api('/api/bots')
export const saveBot = (bot) => api('/api/bots/save', { method: 'POST', body: bot })
export const deleteBot = (id) => api('/api/bots/delete', { method: 'POST', body: { id } })
export const pairExtraBot = (nomor, label, role) => api('/api/bots/pair', { method: 'POST', body: { nomor, label, role } })
export const stopExtraBot = (nomor) => api('/api/bots/stop', { method: 'POST', body: { nomor } })
export const saveBotRole = (role) => api('/api/bots/role/save', { method: 'POST', body: role })
export const deleteBotRole = (id) => api('/api/bots/role/delete', { method: 'POST', body: { id } })
export const getBotGroups = () => api('/api/bot/groups')
export const leaveGroup = (jid) => api('/api/bot/groups/leave', { method: 'POST', body: { jid } })
export const toggleGroup = (jid) => api('/api/bot/groups/toggle', { method: 'POST', body: { jid } })
export const broadcast = (jids, text, delay) => api('/api/bot/broadcast', { method: 'POST', body: { jids, text, delay } })
export const cancelBroadcast = () => api('/api/bot/broadcast/cancel', { method: 'POST' })
export const sendMessage = (jid, text) => api('/api/bot/send', { method: 'POST', body: { jid, text } })
export const execCommand = (code, target) => api('/api/bot/exec', { method: 'POST', body: { code, target } })
export const backupToGithub = () => api('/api/backup', { method: 'POST' })
export const getBackupHistory = () => api('/api/backup/history')
export const restartBot = () => api('/api/bot/restart', { method: 'POST' })
export const getLogs = (type = 'out', lines = 200) => api(`/api/logs?type=${type}&lines=${lines}`)
export const getTunnelStatus = () => api('/api/tunnel')
// Kendali Cloudflare + jalur upload langsung
export const getCfDns = () => api('/api/cf/dns')
export const setCfProxy = (recordId, proxied) => api('/api/cf/proxy', { method: 'POST', body: { recordId, proxied } })
export const setDirectUpload = (enabled) => api('/api/direct-upload', { method: 'POST', body: { enabled } })

// ── Brand gallery ──
export const getGallery = () => api('/api/gallery')
export const deleteGalleryFile = (name) => api('/api/gallery/delete', { method: 'POST', body: { name } })
export async function uploadGalleryFile(file) {
  const token = getToken()
  const res = await fetch(`${BASE}/api/gallery/upload?name=${encodeURIComponent(file.name)}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
    body: file,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // status ikut dibawa: halaman login perlu membedakan 401 (password salah)
    // dari 429 (IP diblokir 15 menit setelah 5 kali gagal).
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

export const restartWeb = () => api("/api/web/restart", { method: "POST" })
export const restartAll = () => api("/api/all/restart", { method: "POST" })
