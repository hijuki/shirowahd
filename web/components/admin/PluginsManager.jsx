'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  getBotPluginsDetailed,
  auditBotPlugins,
  toggleBotPlugin,
  reloadBotPlugin,
  testBotPlugin,
  getBotPluginErrors,
  clearBotPluginErrors,
} from '@/lib/admin-api'

const PAGE_SIZE = 25

const CATEGORY_ICONS = {
  owner: 'fa-user-shield',
  group: 'fa-users',
  rpg: 'fa-shield-halved',
  tools: 'fa-toolbox',
  cek: 'fa-list-check',
  ai: 'fa-robot',
  search: 'fa-magnifying-glass',
  fun: 'fa-face-laugh-beam',
  game: 'fa-gamepad',
  canvas: 'fa-paintbrush',
  download: 'fa-cloud-arrow-down',
  main: 'fa-house',
  sticker: 'fa-note-sticky',
  panel: 'fa-server',
  user: 'fa-user',
  stalker: 'fa-crosshairs',
  info: 'fa-circle-info',
  store: 'fa-shop',
  random: 'fa-shuffle',
  clan: 'fa-flag',
  primbon: 'fa-hat-wizard',
  vps: 'fa-network-wired',
  claim: 'fa-gift',
  religi: 'fa-mosque',
  islamic: 'fa-star-and-crescent',
  anime: 'fa-tv',
  asupan: 'fa-film',
  utility: 'fa-gear',
  convert: 'fa-arrow-right-arrow-left',
  media: 'fa-photo-film',
  music: 'fa-music',
  tts: 'fa-microphone',
  ephoto: 'fa-image',
  jpm: 'fa-bullhorn',
  pushkontak: 'fa-address-book',
  other: 'fa-puzzle-piece'
}

export default function PluginsManager({ toast: propToast }) {
  const toast = propToast || ((msg) => console.log(msg))

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)

  // Filtering & Pagination
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [page, setPage] = useState(1)

  // View Mode: 'category' (grouped per section) or 'flat' (list biasa)
  const [viewMode, setViewMode] = useState('category')
  const [collapsedCategories, setCollapsedCategories] = useState({})

  // Modals & Inspection States
  const [auditResult, setAuditResult] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [errorLogs, setErrorLogs] = useState(null)
  const [selectedPluginError, setSelectedPluginError] = useState(null)

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await getBotPluginsDetailed()
      if (res?.ok) {
        setData(res)
      } else {
        toast(res?.error || 'Gagal mengambil data plugin', 'error')
      }
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handlers
  const handleToggle = async (plugin) => {
    const targetStatus = !plugin.isEnabled
    setActionBusy(true)
    try {
      const res = await toggleBotPlugin(plugin.name || plugin.filePath, !targetStatus)
      if (res?.ok) {
        toast(`Plugin .${plugin.name} ${targetStatus ? 'diaktifkan' : 'dinonaktifkan'}`, 'success')
        loadData(true)
      } else {
        toast(res?.error || 'Gagal mengubah status plugin', 'error')
      }
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setActionBusy(false)
    }
  }

  const handleReload = async (plugin) => {
    setActionBusy(true)
    try {
      const res = await reloadBotPlugin(plugin.filePath || plugin.name, false)
      if (res?.ok) {
        toast(`Plugin .${plugin.name} berhasil di-reload dari disk!`, 'success')
        loadData(true)
      } else {
        toast(`Reload gagal: ${res?.error || 'Format tidak valid'}`, 'error')
      }
    } catch (err) {
      toast(`Error reload: ${err.message}`, 'error')
    } finally {
      setActionBusy(false)
    }
  }

  const handleReloadAll = async () => {
    if (!confirm('Hot-reload SELURUH plugin dari disk? Koneksi WhatsApp tetap aktif.')) return
    setActionBusy(true)
    try {
      const res = await reloadBotPlugin(null, true)
      if (res?.ok) {
        toast(`Berhasil reload ${res.count} plugin dari disk!`, 'success')
        loadData()
      } else {
        toast(`Reload all gagal: ${res?.error}`, 'error')
      }
    } catch (err) {
      toast(`Error: ${err.message}`, 'error')
    } finally {
      setActionBusy(false)
    }
  }

  const handleTest = async (plugin) => {
    setActionBusy(true)
    try {
      const res = await testBotPlugin(plugin.filePath || plugin.name)
      setTestResult(res)
      if (res?.valid) {
        toast(`Plugin .${plugin.name} VALID & SEHAT!`, 'success')
      } else {
        toast(`Plugin .${plugin.name} BERMASALAH!`, 'error')
      }
    } catch (err) {
      toast(`Error test: ${err.message}`, 'error')
    } finally {
      setActionBusy(false)
    }
  }

  const handleAuditAll = async () => {
    setActionBusy(true)
    try {
      toast('Memulai scan diagnostic seluruh file plugin...', 'info')
      const res = await auditBotPlugins()
      setAuditResult(res)
      if (res?.ok) {
        toast(`Diagnostic selesai: ${res.validCount}/${res.scannedFiles} file plugin sehat.`, 'success')
        loadData(true)
      } else {
        toast(`Audit gagal: ${res?.error}`, 'error')
      }
    } catch (err) {
      toast(`Error audit: ${err.message}`, 'error')
    } finally {
      setActionBusy(false)
    }
  }

  const handleOpenErrors = async () => {
    setActionBusy(true)
    try {
      const res = await getBotPluginErrors()
      if (res?.ok) {
        setErrorLogs(res.errors || [])
      } else {
        toast(res?.error || 'Gagal memuat log error', 'error')
      }
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setActionBusy(false)
    }
  }

  const handleClearErrors = async () => {
    if (!confirm('Hapus seluruh riwayat error runtime plugin?')) return
    setActionBusy(true)
    try {
      const res = await clearBotPluginErrors()
      if (res?.ok) {
        toast('Riwayat error plugin dibersihkan', 'success')
        setErrorLogs([])
        loadData(true)
      }
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setActionBusy(false)
    }
  }

  // Categories list extraction
  const categories = useMemo(() => {
    if (!data?.plugins) return []
    const map = new Map()
    for (const p of data.plugins) {
      const cat = (p.category || 'other').trim().toLowerCase()
      map.set(cat, (map.get(cat) || 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [data])

  // Filtering plugins
  const filteredPlugins = useMemo(() => {
    if (!data?.plugins) return []
    let list = data.plugins

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      list = list.filter((p) => (p.category || 'other').toLowerCase() === categoryFilter.toLowerCase())
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          (p.filePath && p.filePath.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.aliases && p.aliases.some((a) => a.toLowerCase().includes(q)))
        )
      })
    }

    return list
  }, [data, statusFilter, categoryFilter, search])

  // Grouped by category for Category View
  const groupedPlugins = useMemo(() => {
    const groups = {}
    for (const p of filteredPlugins) {
      const cat = (p.category || 'other').toLowerCase().trim()
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(p)
    }
    // Urutkan plugin dalam kategori berdasarkan nama A-Z
    for (const cat in groups) {
      groups[cat].sort((a, b) => a.name.localeCompare(b.name))
    }
    // Urutkan kelompok kategori berdasarkan jumlah plugin terbanyak
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
  }, [filteredPlugins])

  // Toggle Collapse
  const toggleCategoryCollapse = (catName) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }))
  }

  const collapseAll = () => {
    const all = {}
    groupedPlugins.forEach(([cat]) => {
      all[cat] = true
    })
    setCollapsedCategories(all)
  }

  const expandAll = () => {
    setCollapsedCategories({})
  }

  // Pagination for Flat View
  const totalPages = Math.ceil(filteredPlugins.length / PAGE_SIZE) || 1
  const paginatedPlugins = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredPlugins.slice(start, start + PAGE_SIZE)
  }, [filteredPlugins, page])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, categoryFilter])

  // Render individual plugin row
  const renderPluginRow = (plugin) => {
    const isOnline = plugin.status === 'online'
    const isErr = plugin.status === 'error'
    const isOff = plugin.status === 'disabled'
    const isShadow = plugin.status === 'shadowed'

    return (
      <div
        key={plugin.filePath || plugin.name}
        className={`p-3.5 md:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-colors border-b border-[var(--edge)] last:border-b-0 ${
          isErr
            ? 'bg-rose-500/5 hover:bg-rose-500/10'
            : isOff
            ? 'bg-amber-500/5 hover:bg-amber-500/10'
            : 'hover:bg-[var(--paper-2)]'
        }`}
      >
        {/* Left: Plugin Details */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Badge */}
            <span
              className={`chip text-[10px] font-bold px-2 py-0.5 flex items-center gap-1.5 ${
                isOnline
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : isErr
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : isOff
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: isOnline
                    ? '#34d399'
                    : isErr
                    ? '#f87171'
                    : isOff
                    ? '#fbbf24'
                    : '#c084fc',
                }}
              />
              {isOnline ? 'ONLINE' : isErr ? 'ERROR' : isOff ? 'OFF' : 'SHADOWED'}
            </span>

            {/* Command Name */}
            <span className="font-mono font-bold text-sm md:text-base text-[var(--ink)]">
              .{plugin.name}
            </span>

            {/* Category Tag */}
            <span className="chip text-[9.5px] px-2 py-0.2 bg-[var(--paper-2)] border-[var(--edge)] text-[var(--ink-2)] font-mono uppercase tracking-wider">
              {plugin.category}
            </span>

            {/* Role Flags */}
            {plugin.isOwner && (
              <span className="chip text-[9px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 font-bold">
                OWNER
              </span>
            )}
            {plugin.isPremium && (
              <span className="chip text-[9px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 font-bold">
                PREM
              </span>
            )}
            {plugin.isGroup && (
              <span className="chip text-[9px] px-1.5 py-0.2 bg-teal-500/20 text-teal-300 font-bold">
                GROUP
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-[var(--ink-2)] line-clamp-1">
            {plugin.description || 'Tidak ada deskripsi modul.'}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--ink-2)] font-mono">
            <span className="flex items-center gap-1 opacity-80" title={plugin.filePath}>
              <i className="fa-regular fa-file-code text-[10px]" />
              {plugin.filePath}
            </span>

            {plugin.aliases && plugin.aliases.length > 0 && (
              <span className="flex items-center gap-1 opacity-70">
                <i className="fa-solid fa-tags text-[10px]" />
                alias: {plugin.aliases.map((a) => `.${a}`).join(', ')}
              </span>
            )}

            <span className="flex items-center gap-2 opacity-80">
              <span>Runs: <b>{plugin.runs}x</b></span>
              {plugin.errors > 0 && (
                <span className="text-rose-400">Galat: <b>{plugin.errors}x</b></span>
              )}
            </span>
          </div>

          {/* Last Error inline message if available */}
          {plugin.lastError && (
            <div className="mt-1 p-2 rounded bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
              <i className="fa-solid fa-triangle-exclamation text-rose-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] truncate">{plugin.lastError.message}</p>
              </div>
              <button
                onClick={() => setSelectedPluginError(plugin)}
                className="btn btn-quiet text-[10px] py-0.5 px-1.5 text-rose-300 shrink-0"
              >
                Detail
              </button>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          {/* Toggle Switch */}
          <button
            onClick={() => handleToggle(plugin)}
            disabled={actionBusy}
            title={plugin.isEnabled ? 'Nonaktifkan Plugin' : 'Aktifkan Plugin'}
            className={`btn text-xs py-1.5 px-3 flex items-center gap-1.5 ${
              plugin.isEnabled ? 'btn-quiet text-emerald-400' : 'btn-warn text-amber-300'
            }`}
          >
            <i className={`fa-solid ${plugin.isEnabled ? 'fa-toggle-on text-emerald-400 text-sm' : 'fa-toggle-off text-amber-400 text-sm'}`} />
            <span>{plugin.isEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Test Syntax Button */}
          <button
            onClick={() => handleTest(plugin)}
            disabled={actionBusy}
            className="btn btn-quiet text-xs py-1.5 px-2.5"
            title="Uji Syntax & Import Module"
          >
            <i className="fa-solid fa-vial" />
          </button>

          {/* Hot Reload Button */}
          <button
            onClick={() => handleReload(plugin)}
            disabled={actionBusy}
            className="btn btn-quiet text-xs py-1.5 px-2.5"
            title="Hot-Reload Plugin dari Disk"
          >
            <i className="fa-solid fa-rotate" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-3xl grad-text flex items-center gap-2.5">
            <i className="fa-solid fa-screwdriver-wrench text-[var(--volt)]" />
            Montir Plugin
          </h1>
          <p className="text-[var(--ink-2)] text-sm mt-1">
            Pantau status kesehatan, periksa error runtime, uji modul, dan kelola seluruh {data?.total || '830+'} plugin bot secara live per kategori.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAuditAll}
            disabled={actionBusy || loading}
            className="btn btn-primary text-xs py-2 px-3.5 flex items-center gap-2"
          >
            <i className="fa-solid fa-stethoscope" />
            <span>Audit &amp; Diagnosa Semua</span>
          </button>
          <button
            onClick={handleReloadAll}
            disabled={actionBusy || loading}
            className="btn btn-quiet text-xs py-2 px-3.5 flex items-center gap-2"
          >
            <i className="fa-solid fa-rotate" />
            <span>Reload Semua</span>
          </button>
          <button
            onClick={handleOpenErrors}
            disabled={actionBusy || loading}
            className="btn btn-warn text-xs py-2 px-3.5 flex items-center gap-2"
          >
            <i className="fa-solid fa-triangle-exclamation" />
            <span>Riwayat Error</span>
          </button>
          <button
            onClick={() => loadData()}
            disabled={actionBusy || loading}
            className="btn btn-quiet text-xs py-2 px-3"
            title="Refresh Data"
          >
            <i className="fa-solid fa-arrows-rotate" />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {[
          {
            label: 'PLUGIN ONLINE',
            val: data?.onlineCount ?? '—',
            color: '#34d399',
            icon: 'fa-circle-check',
            filter: 'online',
          },
          {
            label: 'PLUGIN ERROR',
            val: data?.errorCount ?? '—',
            color: '#f87171',
            icon: 'fa-circle-xmark',
            filter: 'error',
          },
          {
            label: 'NONAKTIF / OFF',
            val: data?.disabledCount ?? '—',
            color: '#fbbf24',
            icon: 'fa-toggle-off',
            filter: 'disabled',
          },
          {
            label: 'SHADOWED / KONFLIK',
            val: data?.shadowedCount ?? '—',
            color: '#f472b6',
            icon: 'fa-clone',
            filter: 'shadowed',
          },
          {
            label: 'TOTAL PLUGIN',
            val: data?.total ?? '—',
            color: '#60a5fa',
            icon: 'fa-puzzle-piece',
            filter: 'all',
          },
        ].map((m) => {
          const active = statusFilter === m.filter
          return (
            <div
              key={m.label}
              onClick={() => setStatusFilter(m.filter)}
              className={`card p-4 cursor-pointer transition-all duration-150 relative overflow-hidden ${
                active ? 'ring-2 ring-[var(--volt)] bg-[var(--paper-2)]' : 'hover:border-[var(--edge-2)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--ink-2)]">{m.label}</span>
                <i className={`fa-solid ${m.icon} text-xs`} style={{ color: m.color }} />
              </div>
              <p className="text-2xl font-bold font-mono mt-1.5 tabular-nums" style={{ color: m.color }}>
                {m.val}
              </p>
              {active && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--volt)]" />
              )}
            </div>
          )
        })}
      </div>

      {/* Category Pills Bar (Quick Filter) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--ink-2)]">
          <span className="font-bold tracking-wider uppercase text-[10.5px]">Kategori Modul ({categories.length})</span>
          {viewMode === 'category' && (
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="hover:text-[var(--ink)] transition-colors text-[11px] underline"
              >
                Buka Semua
              </button>
              <span>·</span>
              <button
                onClick={collapseAll}
                className="hover:text-[var(--ink)] transition-colors text-[11px] underline"
              >
                Tutup Semua
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`chip text-xs py-1 px-3 cursor-pointer shrink-0 transition-all font-mono ${
              categoryFilter === 'all'
                ? 'bg-[var(--volt)] text-black font-bold border-transparent shadow-sm'
                : 'bg-[var(--paper)] hover:bg-[var(--paper-2)] text-[var(--ink-2)] border-[var(--edge)]'
            }`}
          >
            SEMUA ({data?.total || 0})
          </button>
          {categories.map((c) => {
            const active = categoryFilter.toLowerCase() === c.name.toLowerCase()
            const icon = CATEGORY_ICONS[c.name] || 'fa-folder'
            return (
              <button
                key={c.name}
                onClick={() => setCategoryFilter(active ? 'all' : c.name)}
                className={`chip text-xs py-1 px-3 cursor-pointer shrink-0 transition-all flex items-center gap-1.5 font-mono ${
                  active
                    ? 'bg-[var(--volt)] text-black font-bold border-transparent shadow-sm'
                    : 'bg-[var(--paper)] hover:bg-[var(--paper-2)] text-[var(--ink-2)] border-[var(--edge)]'
                }`}
              >
                <i className={`fa-solid ${icon} text-[10.5px]`} />
                <span>{c.name.toUpperCase()}</span>
                <span className="opacity-70 text-[10px]">({c.count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Filter & View Mode Bar */}
      <div className="card p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-2)] text-xs" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari command (.play), alias, path file, atau deskripsi..."
            className="input w-full pl-9 pr-8 text-xs py-2"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-2)] hover:text-[var(--ink)] text-xs"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        {/* View Mode Switcher + Category Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Segmented View Mode */}
          <div className="bg-[var(--paper-2)] p-1 rounded-xl border border-[var(--edge)] flex items-center gap-1">
            <button
              onClick={() => setViewMode('category')}
              className={`text-xs py-1 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'category'
                  ? 'bg-[var(--paper)] text-[var(--volt)] shadow-sm border border-[var(--edge)]'
                  : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
              }`}
              title="Kelompokkan plugin per kategori"
            >
              <i className="fa-solid fa-layer-group" />
              <span>Per Kategori</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`text-xs py-1 px-3 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'flat'
                  ? 'bg-[var(--paper)] text-[var(--volt)] shadow-sm border border-[var(--edge)]'
                  : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
              }`}
              title="Tampilkan daftar flat dengan paginasi"
            >
              <i className="fa-solid fa-list-ul" />
              <span>List Datar</span>
            </button>
          </div>

          {/* Quick Clear Filter */}
          {(statusFilter !== 'all' || categoryFilter !== 'all' || search) && (
            <button
              onClick={() => {
                setStatusFilter('all')
                setCategoryFilter('all')
                setSearch('')
              }}
              className="btn btn-quiet text-xs py-2 px-2.5"
              title="Reset Semua Filter"
            >
              <i className="fa-solid fa-filter-circle-xmark text-xs mr-1" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="card p-12 text-center text-[var(--ink-2)] text-sm">
          <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[var(--volt)] mb-3 block" />
          Memuat daftar seluruh plugin &amp; status montir...
        </div>
      ) : filteredPlugins.length === 0 ? (
        <div className="card p-12 text-center text-[var(--ink-2)] text-sm">
          <i className="fa-solid fa-box-open text-3xl mb-3 block opacity-40" />
          Tidak ada plugin yang cocok dengan filter atau pencarian saat ini.
        </div>
      ) : viewMode === 'category' ? (
        /* ═══ VIEW MODE: GROUPED PER KATEGORI ═══ */
        <div className="space-y-4">
          {groupedPlugins.map(([catName, pluginsInCat]) => {
            const isCollapsed = !!collapsedCategories[catName]
            const icon = CATEGORY_ICONS[catName] || 'fa-folder'
            const errCount = pluginsInCat.filter((p) => p.status === 'error').length
            const offCount = pluginsInCat.filter((p) => p.status === 'disabled').length

            return (
              <div
                key={catName}
                className="card p-0 overflow-hidden border-[var(--edge)] bg-[var(--paper)]"
              >
                {/* Category Header Banner */}
                <div
                  onClick={() => toggleCategoryCollapse(catName)}
                  className="p-3.5 md:p-4 bg-[var(--paper-2)] border-b border-[var(--edge)] flex items-center justify-between cursor-pointer hover:bg-[var(--paper-3)] transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--paper)] border border-[var(--edge)] flex items-center justify-center text-[var(--volt)] shadow-xs">
                      <i className={`fa-solid ${icon} text-sm`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-[family-name:var(--font-display)] font-bold text-sm md:text-base tracking-wide text-[var(--ink)] uppercase">
                          {catName}
                        </h2>
                        <span className="chip text-[10px] font-mono px-2 py-0.2 bg-[var(--paper)] border-[var(--edge)] text-[var(--ink-2)]">
                          {pluginsInCat.length} Plugin
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--ink-2)] mt-0.5">
                        Folder: <code className="font-mono opacity-80">plugins/{catName}/</code>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {errCount > 0 && (
                      <span className="chip text-[9.5px] px-2 py-0.5 bg-rose-500/20 text-rose-300 font-bold font-mono">
                        {errCount} Error
                      </span>
                    )}
                    {offCount > 0 && (
                      <span className="chip text-[9.5px] px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold font-mono">
                        {offCount} Off
                      </span>
                    )}
                    <div className="w-7 h-7 rounded-full bg-[var(--paper)] border border-[var(--edge)] flex items-center justify-center text-[var(--ink-2)] text-xs">
                      <i className={`fa-solid fa-chevron-down transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                    </div>
                  </div>
                </div>

                {/* Plugins in this Category */}
                {!isCollapsed && (
                  <div className="divide-y divide-[var(--edge)]">
                    {pluginsInCat.map((plugin) => renderPluginRow(plugin))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ═══ VIEW MODE: FLAT LIST DENGAN PAGINASI ═══ */
        <div className="card p-0 overflow-hidden border-[var(--edge)]">
          <div className="divide-y divide-[var(--edge)]">
            {paginatedPlugins.map((plugin) => renderPluginRow(plugin))}
          </div>

          {/* Pagination Footer */}
          {filteredPlugins.length > PAGE_SIZE && (
            <div className="p-4 border-t border-[var(--edge)] flex items-center justify-between text-xs text-[var(--ink-2)] bg-[var(--paper-2)]">
              <div>
                Menampilkan {(page - 1) * PAGE_SIZE + 1} -{' '}
                {Math.min(page * PAGE_SIZE, filteredPlugins.length)} dari {filteredPlugins.length} plugin
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-quiet py-1 px-2.5 text-xs disabled:opacity-30"
                >
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <span className="px-2 font-mono font-bold">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-quiet py-1 px-2.5 text-xs disabled:opacity-30"
                >
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Audit Diagnosa Result */}
      {auditResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="card w-full max-w-2xl max-h-[85vh] flex flex-col p-6 space-y-4 overflow-hidden border-[var(--edge-2)]">
            <div className="flex items-center justify-between border-b border-[var(--edge)] pb-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <i className="fa-solid fa-stethoscope text-[var(--volt)]" />
                Laporan Diagnosa Montir Plugin
              </h3>
              <button
                onClick={() => setAuditResult(null)}
                className="text-[var(--ink-2)] hover:text-[var(--ink)] text-sm"
              >
                <i className="fa-solid fa-xmark text-base" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded bg-[var(--paper-2)] border border-[var(--edge)]">
                <p className="text-[10px] text-[var(--ink-2)] font-bold">TOTAL BERKAS</p>
                <p className="text-xl font-mono font-bold text-blue-400">{auditResult.scannedFiles}</p>
              </div>
              <div className="p-3 rounded bg-[var(--paper-2)] border border-[var(--edge)]">
                <p className="text-[10px] text-[var(--ink-2)] font-bold">BERKAS SEHAT</p>
                <p className="text-xl font-mono font-bold text-emerald-400">{auditResult.validCount}</p>
              </div>
              <div className="p-3 rounded bg-[var(--paper-2)] border border-[var(--edge)]">
                <p className="text-[10px] text-[var(--ink-2)] font-bold">BERKAS GALAT</p>
                <p className="text-xl font-mono font-bold text-rose-400">{auditResult.errorCount}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {auditResult.errorCount === 0 ? (
                <div className="p-4 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-center">
                  <i className="fa-solid fa-circle-check text-2xl mb-2 block" />
                  Seluruh {auditResult.scannedFiles} file plugin lolos verifikasi module &amp; syntax tanpa error!
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-bold text-rose-400">Daftar Plugin yang Bermasalah ({auditResult.errorCount}):</p>
                  {auditResult.errors.map((err, i) => (
                    <div key={i} className="p-3 rounded bg-rose-950/40 border border-rose-500/30 font-mono">
                      <p className="font-bold text-rose-300">{err.file}</p>
                      <p className="text-rose-400 mt-1 text-[11px]">{err.error}</p>
                    </div>
                  ))}
                </div>
              )}

              {auditResult.duplicateCommandsCount > 0 && (
                <div className="space-y-2 mt-4">
                  <p className="font-bold text-amber-400">
                    Tabrakan Nama Command ({auditResult.duplicateCommandsCount}):
                  </p>
                  {auditResult.duplicateCommands.map((d, i) => (
                    <div key={i} className="p-2.5 rounded bg-[var(--paper-2)] border border-[var(--edge)] font-mono text-[11px]">
                      <span className="text-amber-400 font-bold">.{d.command}</span>
                      <p className="text-emerald-400 mt-0.5">Aktif: {d.kept}</p>
                      <p className="text-[var(--ink-2)]">Shadowed: {d.shadowed}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--edge)] flex justify-end">
              <button onClick={() => setAuditResult(null)} className="btn btn-quiet text-xs">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Runtime Errors Log */}
      {errorLogs !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="card w-full max-w-3xl max-h-[85vh] flex flex-col p-6 space-y-4 overflow-hidden border-[var(--edge-2)]">
            <div className="flex items-center justify-between border-b border-[var(--edge)] pb-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-rose-400" />
                Riwayat Error Runtime Plugin ({errorLogs.length})
              </h3>
              <div className="flex items-center gap-2">
                {errorLogs.length > 0 && (
                  <button
                    onClick={handleClearErrors}
                    className="btn btn-danger text-xs py-1 px-2.5 flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-trash-can" />
                    <span>Bersihkan</span>
                  </button>
                )}
                <button
                  onClick={() => setErrorLogs(null)}
                  className="text-[var(--ink-2)] hover:text-[var(--ink)] text-sm ml-2"
                >
                  <i className="fa-solid fa-xmark text-base" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {errorLogs.length === 0 ? (
                <div className="p-8 text-center text-[var(--ink-2)]">
                  <i className="fa-solid fa-champagne-glasses text-2xl text-emerald-400 mb-2 block" />
                  Belum ada catatan error runtime dari plugin bot.
                </div>
              ) : (
                errorLogs.map((log, i) => (
                  <div key={i} className="p-3 rounded bg-[var(--paper-2)] border border-[var(--edge)] space-y-1.5 font-mono">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-rose-400 font-bold">.{log.command}</span>
                      <span className="text-[var(--ink-2)]">{new Date(log.timestamp).toLocaleString('id-ID')}</span>
                    </div>
                    <p className="text-rose-300 text-xs break-all">{log.message}</p>
                    {log.stack && (
                      <pre className="p-2 rounded bg-black/40 text-[10px] text-[var(--ink-2)] overflow-x-auto">
                        {log.stack}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[var(--edge)] flex justify-end">
              <button onClick={() => setErrorLogs(null)} className="btn btn-quiet text-xs">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Test Syntax Result */}
      {testResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="card w-full max-w-lg p-5 space-y-3 border-[var(--edge-2)]">
            <div className="flex items-center justify-between border-b border-[var(--edge)] pb-2.5">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <i className="fa-solid fa-vial text-[var(--volt)]" />
                Hasil Uji Syntax Modul
              </h3>
              <button onClick={() => setTestResult(null)} className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className={`p-4 rounded border text-xs font-mono ${
              testResult.valid
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-2">
                <i className={`fa-solid ${testResult.valid ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-rose-400'} text-base`} />
                <span>{testResult.valid ? 'STATUS SEHAT (SYNTAX VALID)' : 'TERDETEKSI KESALAHAN'}</span>
              </div>
              <p className="text-[11px] text-[var(--ink-2)]">File: {testResult.file}</p>
              {testResult.error && (
                <pre className="mt-2 p-2 rounded bg-black/50 text-rose-400 overflow-x-auto text-[10px]">
                  {testResult.error}
                </pre>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setTestResult(null)} className="btn btn-quiet text-xs">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Single Plugin Error Detail */}
      {selectedPluginError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="card w-full max-w-lg p-5 space-y-3 border-[var(--edge-2)]">
            <div className="flex items-center justify-between border-b border-[var(--edge)] pb-2.5">
              <h3 className="font-bold text-sm flex items-center gap-2 text-rose-400">
                <i className="fa-solid fa-triangle-exclamation" />
                Detail Error Terakhir: .{selectedPluginError.name}
              </h3>
              <button onClick={() => setSelectedPluginError(null)} className="text-[var(--ink-2)] hover:text-[var(--ink)]">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-3 rounded bg-rose-950/40 border border-rose-500/30 font-mono text-xs space-y-2">
              <p className="font-bold text-rose-300">{selectedPluginError.lastError?.message || 'Error tidak diketahui'}</p>
              {selectedPluginError.lastError?.time && (
                <p className="text-[10px] text-[var(--ink-2)]">
                  Waktu: {new Date(selectedPluginError.lastError.time).toLocaleString('id-ID')}
                </p>
              )}
              {selectedPluginError.lastError?.stack && (
                <pre className="p-2 rounded bg-black/50 text-[10px] text-rose-400 overflow-x-auto max-h-48">
                  {selectedPluginError.lastError.stack}
                </pre>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedPluginError(null)} className="btn btn-quiet text-xs">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
