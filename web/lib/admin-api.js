const BASE = '/admin'

function getToken() { return localStorage.getItem('admin_token') }

async function api(path, opts = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...opts.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
  if (res.status === 401) { localStorage.removeItem('admin_token'); window.location.reload(); return null }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
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
export const getUploadLog = () => api('/api/upload-log')
export const setMaintenance = (enabled) => api('/api/maintenance', { method: 'POST', body: { enabled } })
export const blacklistAction = (action, ip) => api('/api/blacklist', { method: 'POST', body: { action, ip } })
export const getBotStatus = () => api('/api/bot/status')
export const getBlacklist = () => api('/api/blacklist')
export const getBotInternalStatus = () => api('/api/bot/internal-status')
export const pairBot = (number) => api('/api/bot/pair', { method: 'POST', body: { number } })
export const getBotGroups = () => api('/api/bot/groups')
export const leaveGroup = (jid) => api('/api/bot/groups/leave', { method: 'POST', body: { jid } })
export const toggleGroup = (jid) => api('/api/bot/groups/toggle', { method: 'POST', body: { jid } })
export const broadcast = (jids, text, delay) => api('/api/bot/broadcast', { method: 'POST', body: { jids, text, delay } })
export const cancelBroadcast = () => api('/api/bot/broadcast/cancel', { method: 'POST' })
export const sendMessage = (jid, text) => api('/api/bot/send', { method: 'POST', body: { jid, text } })
export const execCommand = (command) => api('/api/bot/exec', { method: 'POST', body: { command } })
export const backupToGithub = () => api('/api/backup', { method: 'POST' })
