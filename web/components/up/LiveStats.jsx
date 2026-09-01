'use client'
import { useState, useEffect } from 'react'

export default function LiveStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats/public')
      if (res.ok) {
        const data = await res.json()
        if (data.ok) setStats(data)
      }
    } catch {
      // fallback silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const timer = setInterval(fetchStats, 12000)
    return () => clearInterval(timer)
  }, [])

  if (loading && !stats) return null

  const total = stats?.totalToday || 0
  const success = stats?.successToday || total
  const failed = stats?.failedToday || 0
  const isDirectOn = stats?.directReady !== false

  return (
    <div className="mb-6 anim-entrance" style={{ animationDelay: '150ms' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-1 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34d399]" />
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[var(--t-muted)]">
            Aktivitas Server Hari Ini
          </span>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] text-[9px] font-extrabold tracking-wider border ${
          isDirectOn
            ? 'bg-[#22d3ee]/8 border-[#22d3ee]/25 text-[#67e8f9]'
            : 'bg-white/[.02] border-white/[.06] text-[var(--t-muted)]'
        }`}>
          <i className={`fa-solid ${isDirectOn ? 'fa-bolt-lightning text-[#22d3ee]' : 'fa-bolt text-[var(--t-muted)]'} text-[8px]`} />
          {isDirectOn ? '100MB+ ON' : '100MB+ OFF'}
        </span>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Total Upload */}
        <div className="relative rounded-[16px] bg-white/[.02] border border-white/[.07] p-3 text-center transition-all duration-[200ms] hover:border-[#22d3ee]/30 hover:bg-white/[.04]">
          <div className="text-[9px] font-extrabold tracking-wider uppercase text-[var(--t-muted)] mb-1 flex items-center justify-center gap-1">
            <i className="fa-solid fa-cloud-arrow-up text-[#22d3ee] text-[9px]" />
            <span>Total</span>
          </div>
          <p className="font-mono font-extrabold text-[18px] text-[var(--t-ink)] tracking-tight tabular-nums">
            {total}
          </p>
          <p className="text-[8px] font-bold text-[var(--t-muted)]/60 mt-0.5 uppercase tracking-wider">Berkas</p>
        </div>

        {/* Sukses */}
        <div className="relative rounded-[16px] bg-[#34d399]/[.03] border border-[#34d399]/20 p-3 text-center transition-all duration-[200ms] hover:border-[#34d399]/40 hover:bg-[#34d399]/[.06]">
          <div className="text-[9px] font-extrabold tracking-wider uppercase text-[#34d399] mb-1 flex items-center justify-center gap-1">
            <i className="fa-solid fa-circle-check text-[#34d399] text-[9px]" />
            <span>Sukses</span>
          </div>
          <p className="font-mono font-extrabold text-[18px] text-[#34d399] tracking-tight tabular-nums">
            {success}
          </p>
          <p className="text-[8px] font-bold text-[#34d399]/70 mt-0.5 uppercase tracking-wider">100% HD</p>
        </div>

        {/* Gagal */}
        <div className="relative rounded-[16px] bg-white/[.02] border border-white/[.07] p-3 text-center transition-all duration-[200ms] hover:border-bad/30 hover:bg-white/[.04]">
          <div className="text-[9px] font-extrabold tracking-wider uppercase text-[var(--t-muted)] mb-1 flex items-center justify-center gap-1">
            <i className="fa-solid fa-circle-xmark text-bad text-[9px]" />
            <span>Gagal</span>
          </div>
          <p className="font-mono font-extrabold text-[18px] text-[var(--t-ink)]/70 tracking-tight tabular-nums">
            {failed}
          </p>
          <p className="text-[8px] font-bold text-[var(--t-muted)]/60 mt-0.5 uppercase tracking-wider">Ditolak</p>
        </div>
      </div>
    </div>
  )
}
