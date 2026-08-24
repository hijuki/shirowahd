'use client'
import { useEffect, useState } from 'react'
import { getStats, getAnalytics, getSystem, setMaintenance } from '@/lib/admin-api'

function Stat({ icon, label, value, color }) {
  return (
    <div className="card p-4 md:p-5 flex items-center gap-4 hover-lift">
      <div className="icon-tile w-12 h-12 shrink-0"><i className={`fa-solid ${icon} text-lg`} style={{ color }} /></div>
      <div className="min-w-0">
        <p className="text-[#7e90ad] text-xs font-semibold uppercase tracking-wider truncate">{label}</p>
        <p className="font-[family-name:var(--font-display)] font-bold text-xl md:text-2xl truncate">{value}</p>
      </div>
    </div>
  )
}

const fmtBytes = (b) => {
  if (!b && b !== 0) return '—'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0
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

  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv) }, [])

  const toggleMaint = async () => {
    setBusy(true)
    try {
      await setMaintenance(!maint); setMaint(!maint)
      toast(!maint ? 'Maintenance dinyalakan' : 'Maintenance dimatikan', !maint ? 'warn' : 'success')
    } catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  // analytics → last 7 days array
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
    return d ? `${d}h ${h}j` : h ? `${h}j ${m}m` : `${m}m`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-3xl grad-text">Dashboard</h1>
        <p className="text-[#7e90ad] text-sm mt-1">Ringkasan aktivitas bot &amp; server</p>
      </div>

      {/* Stat cards */}
      {!stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card p-5 flex items-center gap-4"><div className="skeleton w-12 h-12 shrink-0" /><div className="flex-1 space-y-2"><div className="skeleton h-3 w-20" /><div className="skeleton h-6 w-14" /></div></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <Stat icon="fa-cloud-arrow-up" label="File Aktif" value={stats.totalActive ?? 0} color="#22d3ee" />
          <Stat icon="fa-calendar-day" label="Hari Ini" value={stats.uploadsToday ?? 0} color="#3b82f6" />
          <Stat icon="fa-database" label="Total Tersimpan" value={fmtBytes(stats?.totalStorage)} color="#34d399" />
          <Stat icon="fa-weight-hanging" label="Ukuran Aktif" value={fmtBytes(stats?.totalSize)} color="#fbbf24" />
          <Stat icon="fa-database" label="Penyimpanan Disk" value={fmtBytes(stats?.totalStorage)} color="#34d399" />
          <Stat icon="fa-chart-simple" label="Rata-rata Ukuran" value={fmtBytes(stats?.totalActive ? Math.round((stats?.totalSize || 0) / stats.totalActive) : 0)} color="#fb7185" />
        </div>
      )}

      {/* Chart + System */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* 7-day bar chart - pure CSS */}
        <div className="card p-5 lg:col-span-3">
          <h2 className="font-[family-name:var(--font-display)] font-bold mb-1 text-base"><i className="fa-solid fa-chart-column text-[#67e8f9] mr-2" />Upload 7 Hari Terakhir</h2>
          <p className="text-[#7e90ad] text-xs mb-6">Grafik jumlah upload per hari</p>
          <div className="flex items-end justify-between gap-2 h-48">
            {days.length === 0 && <p className="text-[#7e90ad] text-sm m-auto">Memuat data…</p>}
            {days.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end min-w-0">
                <span className="text-xs font-bold text-[#67e8f9]">{d.count}</span>
                <div
                  className="w-full max-w-10 rounded-t-[8px] relative transition-all duration-[250ms]"
                  style={{
                    height: `${Math.max(4, (d.count / maxCount) * 100)}%`,
                    minHeight: 4,
                    background: 'linear-gradient(180deg,#22d3ee,#3b82f6)',
                    boxShadow: '0 0 14px rgba(34,211,238,.45)',
                    transitionTimingFunction: 'var(--ease-out)',
                  }}
                />
                <span className="text-[10px] text-[#7e90ad] whitespace-nowrap">{d.date.slice(8)}/{d.date.slice(5, 7)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System info */}
        <div className="card p-5 lg:col-span-2 space-y-4">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-server text-[#22d3ee] mr-2" />Info Sistem</h2>
          {!system ? (
            <div className="space-y-4">
              <div className="skeleton h-4 w-full" /><div className="skeleton h-8 w-full" /><div className="skeleton h-4 w-full" /><div className="skeleton h-8 w-full" /><div className="skeleton h-4 w-32" />
            </div>
          ) : (
            <>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#7e90ad]">RAM</span>
                  <span className="font-semibold">{fmtBytes(system.mem?.used)} / {fmtBytes(system.mem?.total)}</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${system.mem?.total ? (system.mem.used / system.mem.total) * 100 : 0}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#7e90ad]">Disk</span>
                  <span className="font-semibold">{fmtBytes(system.disk?.used)} / {fmtBytes(system.disk?.total)} ({system.disk?.pct ?? 0}%)</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${system.disk?.pct ?? 0}%` }} /></div>
              </div>
              <div className="divider-glow my-2" />
              <div className="flex justify-between text-sm"><span className="text-[#7e90ad]"><i className="fa-solid fa-clock mr-2" />Uptime</span><span className="font-semibold font-mono">{fmtUptime(system.uptime)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#7e90ad]"><i className="fa-solid fa-gauge-high mr-2" />Load Avg</span><span className="font-mono text-xs">{(typeof system.loadavg === "string" ? system.loadavg.split(" ") : (system.loadavg || [])).map(l => Number(l).toFixed(2)).join(' · ') || '—'}</span></div>
            </>
          )}
          <div className="divider-glow my-2" />
          {/* Maintenance toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Mode Maintenance</p>
              <p className="text-xs text-[#7e90ad]">Nonaktifkan upload sementara</p>
            </div>
            <button onClick={toggleMaint} disabled={busy}
              className={`relative w-14 h-8 rounded-full transition-all duration-[250ms] shrink-0 ${maint ? 'bg-gradient-to-r from-[#fbbf24] to-[#fb7185] shadow-[0_0_18px_rgba(251,113,133,.45)]' : 'bg-white/10'}`}
              style={{ transitionTimingFunction: 'var(--ease-out)' }}>
              <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-[250ms] ${maint ? 'translate-x-6' : ''}`} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
