'use client'
import { useEffect, useState, useRef } from 'react'
import { getStats, getAnalytics, getSystem, setMaintenance, restartWeb, restartBot, restartAll, getLogs, getUploadLog } from '@/lib/admin-api'

function StatCard({ icon, label, value, subtext, color }) {
  return (
    <div className="plate plate-flat p-4 flex flex-col justify-between gap-4 group">
      <div className="flex items-center justify-between gap-2">
        <span className="kicker">{label}</span>
        <span className="icon-tile !w-9 !h-9 shrink-0"
          style={color ? { background: color, color: '#06180d' } : undefined}>
          <i className={`fa-solid ${icon} text-[12px]`} />
        </span>
      </div>
      <div>
        <p className="display-m !text-[26px] truncate">{value}</p>
        {subtext && <p className="data text-[10px] opacity-65 mt-1">{subtext}</p>}
      </div>
    </div>
  )
}

const fmtBytes = (b) => {
  if (!b && b !== 0) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++ }
  return `${b.toFixed(i ? 1 : 0)} ${u[i]}`
}

const fmtTime = (ts) => {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Dashboard({ toast }) {
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [system, setSystem] = useState(null)
  const [maint, setMaint] = useState(false)
  const [busy, setBusy] = useState(false)

  // Live Console & Log Monitor
  const [logTab, setLogTab] = useState('web') // 'web' | 'bot' | 'upload'
  const [logType, setLogType] = useState('out') // 'out' | 'error'
  const [logLines, setLogLines] = useState([])
  const [uploadLogs, setUploadLogs] = useState([])
  const [logAuto, setLogAuto] = useState(true)
  const [logBusy, setLogBusy] = useState(false)
  const [logFilter, setLogFilter] = useState('')
  const logBoxRef = useRef(null)

  const load = async () => {
    try {
      const [s, a, sys] = await Promise.all([getStats(), getAnalytics(), getSystem()])
      setStats(s); setAnalytics(a); setSystem(sys)
      if (s?.maintenance != null) setMaint(s.maintenance)
      if (sys?.maintenance != null) setMaint(sys.maintenance)
    } catch { /* retry on next poll */ }
  }

  const fetchCurrentLogs = async () => {
    if (logTab === 'upload') {
      try {
        const uLogs = await getUploadLog()
        setUploadLogs(Array.isArray(uLogs) ? uLogs : [])
      } catch { }
      return
    }

    setLogBusy(true)
    try {
      const target = logTab === 'web' ? 'web' : 'main'
      const r = await getLogs(logType, 300, target)
      setLogLines(Array.isArray(r?.lines) ? r.lines : [])
    } catch (e) {
      /* ignore poll error */
    } finally {
      setLogBusy(false)
    }
  }

  useEffect(() => {
    load()
    fetchCurrentLogs()
    const iv = setInterval(load, 10000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    fetchCurrentLogs()
  }, [logTab, logType])

  useEffect(() => {
    if (!logAuto) return
    const iv = setInterval(fetchCurrentLogs, 4000)
    return () => clearInterval(iv)
  }, [logAuto, logTab, logType])

  const toggleMaint = async () => {
    setBusy(true)
    try {
      await setMaintenance(!maint)
      setMaint(!maint)
      toast(!maint ? 'Mode maintenance dinyalakan' : 'Mode maintenance dimatikan', !maint ? 'info' : 'success')
    } catch (e) { toast(`Error: ${e.message}`, 'error') }
    finally { setBusy(false) }
  }

  // Analytics 7 days
  const days = []
  if (analytics && typeof analytics === 'object') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      days.push({ date: d, count: Number(analytics[d] || 0) })
    }
  }
  const maxCount = Math.max(1, ...days.map(d => d.count))

  const fmtUptime = (sec) => {
    sec = Number(sec) || 0
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60)
    return d ? `${d}h ${h}j ${m}m` : h ? `${h}j ${m}m` : `${m}m`
  }

  const filteredLines = logLines.filter(line => !logFilter.trim() || line.toLowerCase().includes(logFilter.toLowerCase()))
  const filteredUploads = uploadLogs.filter(l => !logFilter.trim() || (l.filename || '').toLowerCase().includes(logFilter.toLowerCase()) || (l.ip || '').includes(logFilter) || (l.code || '').toLowerCase().includes(logFilter.toLowerCase()))

  const copyLogs = () => {
    let text = ''
    if (logTab === 'upload') {
      text = filteredUploads.map(l => `[${new Date(l.timestamp).toISOString()}] ${l.code} ${l.filename} (${fmtBytes(l.filesize)}) IP: ${l.ip}`).join('\n')
    } else {
      text = filteredLines.join('\n')
    }
    navigator.clipboard?.writeText(text)
    toast('Log disalin ke clipboard!', 'success')
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--edge)]">
        <div>
          <h1 className="font-[family-name:var(--font-display)] font-extrabold text-2xl tracking-tight text-[var(--ink)] flex items-center gap-3">
            <span>System Overview</span>
            <span className="w-2 h-2 rounded-full bg-good animate-pulse" />
          </h1>
          <p className="text-xs text-[var(--ink-2)] mt-1 font-mono">
            Aktivitas Bot WhatsApp, Uploader Server &amp; Host Telemetry
          </p>
        </div>

        {/* Quick Restart Bar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                toast('Me-restart Web Uploader...', 'info')
                await restartWeb()
                setTimeout(() => { toast('Web Uploader siap!', 'success'); load(); fetchCurrentLogs(); }, 1500)
              } catch (e) { toast('Error: ' + e.message, 'error') }
            }}
            className="btn btn-quiet rounded-[var(--r-soft)] text-xs text-[var(--ink)] hover:text-[var(--volt)] gap-1.5 active:scale-95"
          >
            <i className="fa-solid fa-globe text-[11px]" />
            <span>Web</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                toast('Me-restart Bot WA...', 'info')
                await restartBot()
                toast('Bot WA di-restart!', 'success')
                setTimeout(() => { load(); fetchCurrentLogs(); }, 3000)
              } catch (e) { toast('Error: ' + e.message, 'error') }
            }}
            className="btn btn-quiet rounded-[var(--r-soft)] text-xs text-[var(--ink)] hover:text-[var(--acid)] gap-1.5 active:scale-95"
          >
            <i className="fa-brands fa-whatsapp text-[11px]" />
            <span>Bot</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                toast('Me-restart Semua Service...', 'info')
                await restartAll()
                setTimeout(() => { toast('Semua service online!', 'success'); load(); fetchCurrentLogs(); }, 2500)
              } catch (e) { toast('Error: ' + e.message, 'error') }
            }}
            className="btn btn-primary min-h-10 !text-[11px] font-extrabold gap-1.5 !bg-[var(--accent)] hover:!bg-[var(--acid)] !text-[#06180d]"
          >
            <i className="fa-solid fa-rotate text-[11px]" />
            <span>Restart All</span>
          </button>
        </div>
      </div>

      {/* Process Status Indicators (PM2 Services) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(() => {
          const procs = system?.processes || []
          const webP = procs.find(p => p.name === 'web')
          const mainP = procs.find(p => p.name === 'main')

          return (
            <>
              {/* Web Uploader Service */}
              <div className="plate plate-flat p-3.5 flex items-center justify-between border-l-4 !border-l-[var(--volt)]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-[var(--r-soft)] grid place-items-center bg-[var(--paper-2)] border border-[var(--edge)] shrink-0">
                    <i className="fa-solid fa-globe text-[14px] text-[var(--volt)]" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-[var(--ink)]">Web Uploader (:80)</span>
                      <span className={`chip !px-1.5 !py-[1px] !text-[8px] uppercase ${webP?.status === 'online' ? '!bg-good/20 !text-good !border-good/40' : '!bg-bad/20 !text-bad'}`}>
                        {webP?.status || (system ? 'OFFLINE' : 'CHECKING')}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-[var(--ink-2)] mt-0.5 truncate">
                      PID: {webP?.pid || '—'} · RAM: {fmtBytes(webP?.memory)} · Up: {fmtUptime(webP?.uptime)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setLogTab('web'); }}
                  className="btn btn-quiet !px-2.5 !py-1 text-[10px] font-mono shrink-0 ml-2"
                >
                  <i className="fa-solid fa-terminal mr-1 text-[9px]" /> Log
                </button>
              </div>

              {/* Bot WA Service */}
              <div className="plate plate-flat p-3.5 flex items-center justify-between border-l-4 !border-l-[var(--accent)]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-[var(--r-soft)] grid place-items-center bg-[var(--paper-2)] border border-[var(--edge)] shrink-0">
                    <i className="fa-brands fa-whatsapp text-[16px] text-wa" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-[var(--ink)]">Bot WhatsApp (:8081)</span>
                      <span className={`chip !px-1.5 !py-[1px] !text-[8px] uppercase ${mainP?.status === 'online' ? '!bg-good/20 !text-good !border-good/40' : '!bg-bad/20 !text-bad'}`}>
                        {mainP?.status || (system ? 'OFFLINE' : 'CHECKING')}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-[var(--ink-2)] mt-0.5 truncate">
                      PID: {mainP?.pid || '—'} · RAM: {fmtBytes(mainP?.memory)} · Up: {fmtUptime(mainP?.uptime)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setLogTab('bot'); }}
                  className="btn btn-quiet !px-2.5 !py-1 text-[10px] font-mono shrink-0 ml-2"
                >
                  <i className="fa-solid fa-terminal mr-1 text-[9px]" /> Log
                </button>
              </div>
            </>
          )
        })()}
      </div>

      {/* Stat Cards Grid */}
      {!stats ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="plate plate-flat p-4 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="sk sk-line w-[54%] h-[9px]" style={{ '--d': `${i * 90}ms` }} />
                <span className="sk sk-tile w-9 h-9 shrink-0" style={{ '--d': `${i * 90 + 40}ms` }} />
              </div>
              <div className="space-y-2">
                <span className="sk sk-line block w-[68%] h-[22px]" style={{ '--d': `${i * 90 + 80}ms` }} />
                <span className="sk sk-line block w-[44%] h-[8px]" style={{ '--d': `${i * 90 + 120}ms` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon="fa-cloud-arrow-up" label="File Aktif" value={stats.totalActive ?? 0} subtext="Sedang tersimpan" color="var(--accent)" />
          <StatCard icon="fa-calendar-day" label="Upload Hari Ini" value={stats.uploadsToday ?? 0} subtext="24 jam terakhir" color="var(--volt)" />
          <StatCard icon="fa-database" label="Total Storage" value={fmtBytes(stats?.totalStorage)} subtext="Ukuran terpakai" color="var(--acid)" />
          <StatCard icon="fa-weight-hanging" label="Ukuran Aktif" value={fmtBytes(stats?.totalSize)} subtext="File valid" color="var(--volt)" />
          <StatCard icon="fa-hourglass-half" label="Masa Aktif TTL" value={(() => { const m = stats?.expireMinutes ?? 60; return m >= 1440 ? `${Math.floor(m / 1440)} Hari` : m >= 60 ? `${Math.floor(m / 60)} Jam` : `${m}m` })()} subtext="Batas kadaluarsa" color="#ffb020" />
          <StatCard icon="fa-chart-pie" label="Rata-rata File" value={fmtBytes(stats?.totalActive ? Math.round((stats?.totalSize || 0) / stats.totalActive) : 0)} subtext="Per media" color="var(--hot)" />
        </div>
      )}

      {/* Analytics Chart & System Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 7-Day Chart */}
        <div className="plate plate-flat p-5 sm:p-6 lg:col-span-3 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-solid fa-chart-simple text-[var(--accent)]" /> Volume Upload 7 Hari Terakhir
              </h3>
              <p className="text-xs text-[var(--ink-2)] mt-0.5">Statistik jumlah media yang masuk per hari</p>
            </div>
            <span className="text-[11px] font-mono text-[var(--accent)] bg-[var(--paper-2)] px-2.5 py-1 rounded-full border border-[var(--edge)]">
              Peak: {Math.max(0, ...days.map(d => d.count))} files
            </span>
          </div>

          {/* Neo-brutalism Bar Chart dengan kontras tinggi dan garis dasar jelas */}
          <div className="pt-4 border-b-2 border-[var(--edge)] pb-2">
            <div className="flex items-end justify-between gap-2 sm:gap-3 h-48">
              {days.map(d => {
                const heightPct = maxCount > 0 ? Math.max(6, (d.count / maxCount) * 100) : 6
                const isToday = d.date === new Date().toISOString().slice(0, 10)
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className={`text-[11px] font-mono font-bold transition-transform group-hover:scale-110 ${d.count > 0 ? (isToday ? 'text-[var(--accent)] font-extrabold' : 'text-[var(--ink)]') : 'text-[var(--ink-3)]'}`}>
                      {d.count}
                    </span>
                    {/* Track Batang dengan border hitam tegas neo-brutalism */}
                    <div className="w-full max-w-[46px] rounded-t-md bg-[var(--sunk)] border-2 border-[var(--edge)] p-0.5 flex items-end h-full relative overflow-hidden shadow-[var(--sh-press)]">
                      <div
                        className={`w-full rounded-t-[3px] transition-all duration-300 relative ${isToday
                          ? 'bg-[var(--accent)] shadow-[0_0_12px_rgba(37,211,102,0.4)]'
                          : d.count > 0
                            ? 'bg-[var(--ink)] group-hover:bg-[var(--accent)]'
                            : 'bg-transparent'}`}
                        style={{ height: `${heightPct}%` }}
                      >
                        {/* Top Accent Line */}
                        {d.count > 0 && (
                          <span className="absolute top-0 inset-x-0 h-1 bg-white/40 rounded-t-[3px]" />
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono whitespace-nowrap ${isToday ? 'text-[var(--accent)] font-extrabold' : 'text-[var(--ink-2)]'}`}>
                      {d.date.slice(8)}/{d.date.slice(5, 7)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* System Monitor */}
        <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
              <i className="fa-solid fa-server text-[var(--acid)]" /> Host Metrics &amp; Resources
            </h3>
            <span className="text-[10px] font-mono text-[var(--acid)] bg-[var(--paper-2)] px-2 py-0.5 rounded border border-[var(--edge)]">
              Healthy
            </span>
          </div>

          {!system ? (
            <div className="space-y-4">
              {[0, 1].map(i => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="sk sk-line w-[34%] h-[9px]" style={{ '--d': `${i * 110}ms` }} />
                    <span className="sk sk-line w-[28%] h-[9px]" style={{ '--d': `${i * 110 + 50}ms` }} />
                  </div>
                  <span className="sk sk-line block w-full h-[10px] !rounded-full" style={{ '--d': `${i * 110 + 90}ms` }} />
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--edge)] space-y-2.5">
                {[0, 1].map(i => (
                  <div key={i} className="flex justify-between">
                    <span className="sk sk-line w-[38%] h-[9px]" style={{ '--d': `${260 + i * 90}ms` }} />
                    <span className="sk sk-line w-[22%] h-[9px]" style={{ '--d': `${300 + i * 90}ms` }} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* RAM Usage */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[var(--ink-2)]">RAM Utilization</span>
                  <span className="text-[var(--ink)] font-bold">{fmtBytes(system.mem?.used)} / {fmtBytes(system.mem?.total)}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--paper-2)] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--ink)] to-[var(--ink)] rounded-full transition-all duration-300"
                    style={{ width: `${system.mem?.total ? (system.mem.used / system.mem.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Disk Usage */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[var(--ink-2)]">NVMe Storage</span>
                  <span className="text-[var(--ink)] font-bold">{fmtBytes(system.disk?.used)} / {fmtBytes(system.disk?.total)} ({system.disk?.pct ?? 0}%)</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--paper-2)] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#34d399] to-[#818cf8] rounded-full transition-all duration-300"
                    style={{ width: `${system.disk?.pct ?? 0}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--edge)] space-y-2.5 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--ink-2)] flex items-center gap-1.5"><i className="fa-solid fa-clock text-[10px]" />System Uptime</span>
                  <span className="text-[var(--ink)] font-bold">{fmtUptime(system.uptime)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--ink-2)] flex items-center gap-1.5"><i className="fa-solid fa-gauge-high text-[10px]" />CPU Load Average</span>
                  <span className="text-[var(--ink)] font-bold">{(typeof system.loadavg === "string" ? system.loadavg.split(" ") : (system.loadavg || [])).map(l => Number(l).toFixed(2)).join(' · ') || '0.12 · 0.08'}</span>
                </div>
              </div>

              {/* Maintenance Mode Quick Toggle */}
              <div className="pt-3 border-t border-[var(--edge)] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[var(--ink)]">Mode Maintenance</p>
                  <p className="text-[10px] text-[var(--ink-2)]">Kunci uploader sementara</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!maint}
                  onClick={toggleMaint}
                  disabled={busy} aria-busy={busy}
                  className={`btn min-h-10 px-3.5 !text-[11px] font-extrabold uppercase tracking-wider ${maint
                    ? 'btn-danger'
                    : 'btn-quiet !text-[var(--ink-2)]'}`}
                >
                  {maint ? 'AKTIF (Locked)' : 'OFF (Normal)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ LIVE CONSOLE & LOG MONITOR ══ */}
      <div className="card p-5 sm:p-6 space-y-4 border-2 border-[var(--edge)] shadow-[var(--sh-1)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--edge)]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-[var(--r-soft)] grid place-items-center bg-[var(--ink)] text-[var(--paper)]">
              <i className="fa-solid fa-terminal text-[13px]" />
            </span>
            <div>
              <h2 className="font-[family-name:var(--font-display)] font-bold text-base text-[var(--ink)] flex items-center gap-2">
                <span>Real-Time Logs &amp; Activity Stream</span>
                {logAuto && <span className="w-1.5 h-1.5 rounded-full bg-good animate-ping" />}
              </h2>
              <p className="text-[11px] text-[var(--ink-2)] font-mono">
                Pantau log langsung Web Uploader, Bot WA, atau riwayat unggahan media
              </p>
            </div>
          </div>

          {/* Log Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-xs text-[var(--ink-2)] cursor-pointer select-none bg-[var(--paper-2)] border border-[var(--edge)] px-2.5 py-1.5 rounded-[var(--r-soft)]">
              <input
                type="checkbox"
                checked={logAuto}
                onChange={e => setLogAuto(e.target.checked)}
                className="accent-[var(--accent)] cursor-pointer"
              />
              <span className="font-mono text-[11px]">Auto (4s)</span>
            </label>
            <button
              type="button"
              onClick={fetchCurrentLogs}
              disabled={logBusy}
              className="btn btn-quiet !px-2.5 !py-1.5 text-xs font-mono gap-1"
            >
              <i className={`fa-solid fa-rotate ${logBusy ? 'fa-spin' : ''} text-[10px]`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={copyLogs}
              className="btn btn-quiet !px-2.5 !py-1.5 text-xs font-mono gap-1"
            >
              <i className="fa-regular fa-copy text-[10px]" />
              <span>Copy</span>
            </button>
          </div>
        </div>

        {/* Tab Selection & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Target Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--paper-2)] rounded-[var(--r-soft)] border border-[var(--edge)] w-fit">
            <button
              type="button"
              onClick={() => setLogTab('web')}
              className={`px-3 py-1.5 rounded-[calc(var(--r-soft)-2px)] text-xs font-bold font-mono transition-colors ${logTab === 'web' ? 'bg-[var(--ink)] text-[var(--paper)] shadow-[var(--sh-press)]' : 'text-[var(--ink-2)] hover:text-[var(--ink)]'}`}
            >
              <i className="fa-solid fa-globe mr-1.5 text-[10px]" />
              Web Uploader
            </button>
            <button
              type="button"
              onClick={() => setLogTab('bot')}
              className={`px-3 py-1.5 rounded-[calc(var(--r-soft)-2px)] text-xs font-bold font-mono transition-colors ${logTab === 'bot' ? 'bg-[var(--ink)] text-[var(--paper)] shadow-[var(--sh-press)]' : 'text-[var(--ink-2)] hover:text-[var(--ink)]'}`}
            >
              <i className="fa-brands fa-whatsapp mr-1.5 text-[11px]" />
              Bot WA
            </button>
            <button
              type="button"
              onClick={() => setLogTab('upload')}
              className={`px-3 py-1.5 rounded-[calc(var(--r-soft)-2px)] text-xs font-bold font-mono transition-colors ${logTab === 'upload' ? 'bg-[var(--ink)] text-[var(--paper)] shadow-[var(--sh-press)]' : 'text-[var(--ink-2)] hover:text-[var(--ink)]'}`}
            >
              <i className="fa-solid fa-cloud-arrow-up mr-1.5 text-[10px]" />
              Upload Feed
            </button>
          </div>

          {/* Sub Filters */}
          <div className="flex items-center gap-2">
            {logTab !== 'upload' && (
              <div className="flex items-center rounded-[var(--r-soft)] border border-[var(--edge)] overflow-hidden text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setLogType('out')}
                  className={`px-2.5 py-1.5 ${logType === 'out' ? 'bg-[var(--accent)] text-[#06180d] font-bold' : 'bg-[var(--paper-2)] text-[var(--ink-2)]'}`}
                >
                  stdout
                </button>
                <button
                  type="button"
                  onClick={() => setLogType('error')}
                  className={`px-2.5 py-1.5 ${logType === 'error' ? 'bg-bad text-[#fff] font-bold' : 'bg-[var(--paper-2)] text-[var(--ink-2)]'}`}
                >
                  stderr (error)
                </button>
              </div>
            )}

            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--ink-3)]" />
              <input
                type="text"
                value={logFilter}
                onChange={e => setLogFilter(e.target.value)}
                placeholder="Filter log..."
                className="pl-7 pr-2.5 py-1.5 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] text-xs font-mono outline-none text-[var(--ink)] w-36 sm:w-44 focus:border-[var(--accent)]"
              />
            </div>
          </div>
        </div>

        {/* Console Display Screen */}
        <div
          ref={logBoxRef}
          className="rounded-[var(--r-soft)] bg-[#0c1015] border-2 border-[var(--edge)] p-4 text-[#e2e8f0] font-mono text-[11px] leading-relaxed max-h-[420px] overflow-y-auto overflow-x-auto shadow-inner"
        >
          {logTab === 'upload' ? (
            /* Upload Activity Log View */
            filteredUploads.length === 0 ? (
              <div className="py-12 text-center text-[#64748b]">
                <i className="fa-solid fa-inbox text-3xl mb-2" />
                <p>Belum ada rekaman upload media yang cocok.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredUploads.map((l, idx) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-2 py-1 px-2 rounded bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.07] transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[var(--accent)] font-bold">[{fmtTime(l.timestamp)}]</span>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--volt)]/20 text-[var(--volt)] text-[10px] font-extrabold border border-[var(--volt)]/40">
                        {l.code}
                      </span>
                      <span className="truncate max-w-[200px] sm:max-w-xs text-white font-medium">
                        {l.filename}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[#94a3b8] shrink-0 font-mono">
                      <span>{fmtBytes(l.filesize || l.size)}</span>
                      <span>IP: {l.ip}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Standard Stream Log (Web / Bot) */
            filteredLines.length === 0 ? (
              <div className="py-12 text-center text-[#64748b]">
                <i className="fa-solid fa-terminal text-3xl mb-2" />
                <p>{logBusy ? 'Memuat log proses...' : 'Tidak ada baris log yang tersedia atau cocok dengan filter.'}</p>
              </div>
            ) : (
              <pre className="whitespace-pre-wrap word-break space-y-0.5">
                {filteredLines.map((line, idx) => {
                  let colorClass = 'text-[#cbd5e1]'
                  if (line.includes('error') || line.includes('Error') || line.includes('ERR') || line.includes('fail') || line.includes('❌')) {
                    colorClass = 'text-[#f87171]'
                  } else if (line.includes('warn') || line.includes('WARN') || line.includes('⚠️')) {
                    colorClass = 'text-[#fbbf24]'
                  } else if (line.includes('ready') || line.includes('Ready') || line.includes('Online') || line.includes('200') || line.includes('OK') || line.includes('🚀')) {
                    colorClass = 'text-[#34d399]'
                  } else if (line.includes('http') || line.includes('GET') || line.includes('POST')) {
                    colorClass = 'text-[#38bdf8]'
                  }

                  return (
                    <div key={idx} className={`${colorClass} hover:bg-white/[0.04] px-1 py-0.5 rounded transition-colors`}>
                      {line}
                    </div>
                  )
                })}
              </pre>
            )
          )}
        </div>
      </div>
    </div>
  )
}
