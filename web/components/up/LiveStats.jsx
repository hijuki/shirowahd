'use client'
import { useState, useEffect } from 'react'

export default function LiveStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats/public', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (mounted && data.ok) {
            setStats(data)
          }
        }
      } catch {}
      if (mounted) setLoading(false)
    }

    fetchStats()
    const interval = setInterval(fetchStats, 15000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const total = stats?.totalToday ?? (loading ? '—' : 0)
  const success = stats?.successToday ?? (loading ? '—' : 0)
  const isDirect = !!stats?.directReady

  return (
    <div className="w-full mb-6">
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Upload Hari Ini */}
        <div className="p-3 rounded-2xl bg-white/[0.025] border border-white/[0.07] backdrop-blur-sm text-center shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Total Hari Ini
          </p>
          <p className="font-mono font-black text-[18px] text-white tracking-tight">
            {total}
          </p>
        </div>

        {/* Berhasil HD */}
        <div className="p-3 rounded-2xl bg-white/[0.025] border border-white/[0.07] backdrop-blur-sm text-center shadow-sm">
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
            Berhasil HD
          </p>
          <p className="font-mono font-black text-[18px] text-emerald-400 tracking-tight">
            {success}
          </p>
        </div>

        {/* Status Jalur 100MB+ ON / OFF */}
        <div className="p-3 rounded-2xl bg-white/[0.025] border border-white/[0.07] backdrop-blur-sm text-center shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Mode Jalur
          </p>
          <div className="inline-flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isDirect ? 'bg-sky-400 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span
              className={`font-mono font-black text-[13px] tracking-tight ${
                isDirect ? 'text-sky-400' : 'text-slate-400'
              }`}
            >
              {isDirect ? '100MB+ ON' : '100MB+ OFF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
