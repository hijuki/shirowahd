'use client'
import { useEffect, useState } from 'react'
import { getStats, getAnalytics, getSystem, setMaintenance, restartWeb, restartBot, restartAll } from '@/lib/admin-api'

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

export default function Dashboard({ toast }) {
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [system, setSystem] = useState(null)
  const [maint, setMaint] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const [s, a, sys] = await Promise.all([getStats(), getAnalytics(), getSystem()])
      setStats(s); setAnalytics(a); setSystem(sys)
      if (s?.maintenance != null) setMaint(s.maintenance)
      if (sys?.maintenance != null) setMaint(sys.maintenance)
    } catch { /* retry on next poll */ }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 15000)
    return () => clearInterval(iv)
  }, [])

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
                setTimeout(() => toast('Web Uploader siap!', 'success'), 1500)
              } catch (e) { toast('Error: ' + e.message, 'error') }
            }}
            className="px-3.5 py-2 rounded-[var(--r-soft)] text-xs font-bold bg-[var(--paper-2)] hover:bg-[var(--paper-2)] text-[var(--ink)] hover:text-[var(--volt)] border border-[var(--edge)] hover:border-[var(--edge)] transition-all flex items-center gap-1.5 active:scale-95"
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
              } catch (e) { toast('Error: ' + e.message, 'error') }
            }}
            className="px-3.5 py-2 rounded-[var(--r-soft)] text-xs font-bold bg-[var(--paper-2)] hover:bg-[var(--paper-2)] text-[var(--ink)] hover:text-[var(--acid)] border border-[var(--edge)] hover:border-[var(--edge)] transition-all flex items-center gap-1.5 active:scale-95"
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
                setTimeout(() => toast('Semua service online!', 'success'), 2000)
              } catch (e) { toast('Error: ' + e.message, 'error') }
            }}
            className="px-3.5 py-2 rounded-[var(--r-soft)] text-xs font-extrabold bg-[var(--accent)] hover:bg-[var(--acid)] text-[#06180d] shadow-[var(--sh-1)] transition-all flex items-center gap-1.5 active:scale-95"
          >
            <i className="fa-solid fa-rotate text-[11px]" />
            <span>Restart All</span>
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      {!stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-5 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] h-28 animate-pulse" />
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
        <div className="p-6 rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] lg:col-span-3 space-y-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-[var(--ink)] flex items-center gap-2">
                <i className="fa-solid fa-chart-simple text-[var(--volt)]" /> Volume Upload 7 Hari Terakhir
              </h3>
              <p className="text-xs text-[var(--ink-2)] mt-0.5">Statistik jumlah media yang masuk per hari</p>
            </div>
            <span className="text-[11px] font-mono text-[var(--volt)] bg-[var(--paper-2)] px-2.5 py-1 rounded-full border border-[var(--edge)]">
              Peak: {Math.max(0, ...days.map(d => d.count))} files
            </span>
          </div>

          <div className="flex items-end justify-between gap-2.5 h-48 pt-4">
            {days.map(d => {
              const heightPct = Math.max(8, (d.count / maxCount) * 100)
              const isToday = d.date === new Date().toISOString().slice(0, 10)
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2.5 h-full justify-end group">
                  <span className={`text-[11px] font-mono font-bold transition-transform group-hover:scale-110 ${d.count > 0 ? (isToday ? 'text-[var(--volt)]' : 'text-[var(--ink)]') : 'text-[var(--ink-3)]'}`}>
                    {d.count}
                  </span>
                  <div className="w-full max-w-[42px] rounded-[var(--r-soft)] bg-[var(--paper-2)] p-1 flex items-end h-full">
                    <div
                      className={`w-full rounded-[var(--r-soft)] transition-all duration-300 ${isToday
                        ? 'bg-gradient-to-t from-[var(--ink)] to-[var(--ink)] shadow-[var(--sh-1)]'
                        : 'bg-[var(--paper-2)] group-hover:bg-[var(--paper-2)]'}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className={`text-[10px] font-mono whitespace-nowrap ${isToday ? 'text-[var(--volt)] font-bold' : 'text-[var(--ink-2)]'}`}>
                    {d.date.slice(8)}/{d.date.slice(5, 7)}
                  </span>
                </div>
              )
            })}
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
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-[var(--paper-2)] rounded" />
              <div className="h-10 bg-[var(--paper-2)] rounded" />
              <div className="h-4 bg-[var(--paper-2)] rounded" />
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
                  onClick={toggleMaint}
                  disabled={busy}
                  className={`px-3 py-1.5 rounded-[var(--r-soft)] text-xs font-extrabold uppercase tracking-wider transition-all ${maint
                    ? 'bg-bad/15 text-bad border border-bad/30'
                    : 'bg-[var(--paper-2)] text-[var(--ink-2)] hover:text-[var(--ink)] border border-[var(--edge)]'}`}
                >
                  {maint ? 'AKTIF (Locked)' : 'OFF (Normal)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
