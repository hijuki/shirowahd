import { useEffect, useState } from 'react'
import { getStats, getAnalytics, getSystem, setMaintenance } from '../api'

function Stat({ icon, label, value, color }) {
  return (
    <div className="glass p-4 md:p-5 flex items-center gap-4">
      <div className="icon-tile w-12 h-12 shrink-0"><i className={`fa-solid ${icon} text-lg`} style={{ color }} /></div>
      <div className="min-w-0">
        <p className="text-muted text-xs font-semibold uppercase tracking-wider truncate">{label}</p>
        <p className="font-display font-bold text-xl md:text-2xl truncate">{value}</p>
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

export default function Dashboard() {
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
    try { await setMaintenance(!maint); setMaint(!maint) } catch { }
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
        <h1 className="font-display font-bold text-2xl md:text-3xl grad-text">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Ringkasan aktivitas bot & server</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <Stat icon="fa-cloud-arrow-up" label="Total Upload" value={stats ? stats.totalUploads : '—'} color="#818cf8" />
        <Stat icon="fa-calendar-day" label="Hari Ini" value={stats ? stats.todayUploads : '—'} color="#22d3ee" />
        <Stat icon="fa-film" label="Video" value={stats ? stats.videoCount : '—'} color="#a78bfa" />
        <Stat icon="fa-image" label="Foto" value={stats ? stats.fotoCount : '—'} color="#f472b6" />
        <Stat icon="fa-database" label="Penyimpanan" value={fmtBytes(stats?.totalStorage)} color="#34d399" />
        <Stat icon="fa-chart-simple" label="Rata-rata Ukuran" value={fmtBytes(stats?.avgSize)} color="#fb7185" />
      </div>

      {/* Chart + System */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* 7-day bar chart - pure CSS */}
        <div className="glass p-5 lg:col-span-3">
          <h2 className="font-display font-bold mb-1"><i className="fa-solid fa-chart-column text-indigo-300 mr-2" />Upload 7 Hari Terakhir</h2>
          <p className="text-muted text-xs mb-6">Grafik jumlah upload per hari</p>
          <div className="flex items-end justify-between gap-2 h-48">
            {days.length === 0 && <p className="text-muted text-sm m-auto">Memuat data…</p>}
            {days.map(d => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end min-w-0">
                <span className="text-xs font-bold text-indigo-200">{d.count}</span>
                <div
                  className="w-full max-w-10 rounded-t-lg transition-all duration-500 relative"
                  style={{
                    height: `${Math.max(4, (d.count / maxCount) * 100)}%`,
                    minHeight: 4,
                    background: 'linear-gradient(180deg,#22d3ee,#6366f1)',
                    boxShadow: '0 0 14px rgba(99,102,241,.5)'
                  }}
                />
                <span className="text-[10px] text-muted whitespace-nowrap">{d.date.slice(8)}/{d.date.slice(5, 7)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System info */}
        <div className="glass p-5 lg:col-span-2 space-y-4">
          <h2 className="font-display font-bold"><i className="fa-solid fa-server text-cyan-300 mr-2" />Info Sistem</h2>
          {!system ? <p className="text-muted text-sm">Memuat…</p> : (
            <>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted">RAM</span>
                  <span className="font-semibold">{fmtBytes(system.mem?.used)} / {fmtBytes(system.mem?.total)}</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${system.mem?.total ? (system.mem.used / system.mem.total) * 100 : 0}%` }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted">Disk</span>
                  <span className="font-semibold">{fmtBytes(system.disk?.used)} / {fmtBytes(system.disk?.total)} ({system.disk?.pct ?? 0}%)</span>
                </div>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${system.disk?.pct ?? 0}%` }} /></div>
              </div>
              <div className="divider-glow my-2" />
              <div className="flex justify-between text-sm"><span className="text-muted"><i className="fa-solid fa-clock mr-2" />Uptime</span><span className="font-semibold font-mono">{fmtUptime(system.uptime)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted"><i className="fa-solid fa-gauge-high mr-2" />Load Avg</span><span className="font-mono text-xs">{(system.loadavg || []).map(l => Number(l).toFixed(2)).join(' · ') || '—'}</span></div>
            </>
          )}
          <div className="divider-glow my-2" />
          {/* Maintenance toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Mode Maintenance</p>
              <p className="text-xs text-muted">Nonaktifkan upload sementara</p>
            </div>
            <button onClick={toggleMaint} disabled={busy}
              className={`relative w-14 h-8 rounded-full transition-all duration-300 shrink-0 ${maint ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_18px_rgba(251,113,133,.5)]' : 'bg-white/10'}`}>
              <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${maint ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
