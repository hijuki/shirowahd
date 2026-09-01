'use client'
import { useState, useEffect } from 'react'
import { getHistory, clearHistory, fmtSize } from '@/lib/up-api'

export default function HistorySection() {
  const [history, setHistory] = useState([])
  const [copied, setCopied] = useState('')

  const reload = () => {
    setHistory(getHistory())
  }

  useEffect(() => {
    reload()
  }, [])

  const copy = async (code) => {
    const textToCopy = '.claim ' + code
    try {
      await navigator.clipboard.writeText(textToCopy)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = textToCopy
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(code)
    setTimeout(() => setCopied(''), 2000)
  }

  const handleClear = () => {
    if (confirm('Hapus seluruh riwayat upload lokal?')) {
      clearHistory()
      reload()
    }
  }

  if (!history.length) return null

  return (
    <div className="rounded-[22px] bg-[#060A14] border border-white/[0.08] p-5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-500/10 grid place-items-center">
            <i className="fa-solid fa-clock-rotate-left text-sky-400 text-[10px]" />
          </div>
          <h3 className="font-[family-name:var(--font-display)] font-extrabold text-[13px] text-white">
            Riwayat Upload Anda
          </h3>
        </div>
        <button
          onClick={handleClear}
          className="text-slate-500 hover:text-rose-400 text-[10px] font-bold transition-colors"
        >
          <i className="fa-solid fa-trash-can mr-1" /> Bersihkan
        </button>
      </div>

      <div className="space-y-2">
        {history.slice(0, 5).map((item, idx) => {
          const code = item.code || (item.codes && item.codes[0]?.code) || '—'
          const files = item.files || []
          const dateStr = item.timestamp
            ? new Date(item.timestamp).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : ''

          return (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 p-3 rounded-[14px] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.035] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[11px] text-white truncate">
                  {files[0] || 'Upload Media'}
                  {files.length > 1 && ` (+${files.length - 1} lainnya)`}
                </p>
                <p className="text-slate-500 text-[9px] font-mono mt-0.5">
                  {fmtSize(item.totalSize || 0)} · {dateStr}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => copy(code)}
                  className={`px-3 py-1.5 rounded-[10px] font-mono font-extrabold text-[11px] tracking-wider transition-all flex items-center gap-1.5 active:scale-95 ${
                    copied === code
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-sky-500/10 text-sky-400 border border-sky-500/25 hover:bg-sky-500/20'
                  }`}
                >
                  <i className={`fa-solid ${copied === code ? 'fa-check' : 'fa-copy'} text-[10px]`} />
                  <span>.claim {code}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
