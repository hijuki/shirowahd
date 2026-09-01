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
    const timer = setInterval(fetchStats, 15000)
    return () => clearInterval(timer)
  }, [])

  if (loading && !stats) {
    return (
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-[14px] bg-white/[0.02] border border-white/[0.06] animate-pulse" />
        ))}
      </div>
    )
  }

  const total = stats?.totalToday || 0
  const success = stats?.successToday || total
  const failed = stats?.failedToday || 0

  return (
    <div className="mb-6">
      {/* Header telemetri */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Aktivitas Server Hari Ini
          </span>
        </div>
        <span className="text-[9px] font-mono font-medium text-slate-400 flex items-center gap-1">
          <i className="fa-solid fa-bolt-lightning text-sky-400 text-[8px]" />
          TLS 8443 Direct
        </span>
      </div>

      {/* 3 Kartu Metrik */}
      <div className="grid grid-cols-3 gap-2">
        {/* Total */}
        <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] p-3 text-center transition-all duration-200 hover:border-sky-500/30 hover:bg-white/[0.03]">
          <div className="text-[9px] font-extrabold tracking-wider uppercase text-slate-400 mb-1 flex items-center justify-center gap-1">
            <i className="fa-solid fa-cloud-arrow-up text-sky-400 text-[9px]" />
            <span>Total</span>
          </div>
          <p className="font-mono font-extrabold text-[18px] text-white tracking-tight tabular-nums">
            {total}
          </p>
          <p className="text-[8px] font-medium text-slate-400 mt-0.5">berkas masuk</p>
        </div>

        {/* Sukses */}
        <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-b from-emerald-500/[0.06] to-white/[0.01] border border-emerald-500/20 p-3 text-center transition-all duration-200 hover:border-emerald-500/40">
          <div className="text-[9px] font-extrabold tracking-wider uppercase text-emerald-400 mb-1 flex items-center justify-center gap-1">
            <i className="fa-solid fa-circle-check text-emerald-400 text-[9px]" />
            <span>Sukses</span>
          </div>
          <p className="font-mono font-extrabold text-[18px] text-emerald-400 tracking-tight tabular-nums">
            {success}
          </p>
          <p className="text-[8px] font-medium text-emerald-400/80 mt-0.5">100% HD convert</p>
        </div>

        {/* Gagal */}
        <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] p-3 text-center transition-all duration-200 hover:border-rose-500/30">
          <div className="text-[9px] font-extrabold tracking-wider uppercase text-slate-400 mb-1 flex items-center justify-center gap-1">
            <i className="fa-solid fa-circle-xmark text-rose-400 text-[9px]" />
            <span>Gagal</span>
          </div>
          <p className="font-mono font-extrabold text-[18px] text-slate-300 tracking-tight tabular-nums">
            {failed}
          </p>
          <p className="text-[8px] font-medium text-slate-400 mt-0.5">ditolak / corrupt</p>
        </div>
      </div>
    </div>
  )
}
