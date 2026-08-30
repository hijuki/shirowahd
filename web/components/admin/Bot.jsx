'use client'
import { useEffect, useState } from 'react'
import { getBotStatus, getBotInternalStatus, pairBot, getBotGroups, leaveGroup, toggleGroup, broadcast, cancelBroadcast, sendMessage, execCommand, restartBot, getLogs } from '@/lib/admin-api'

export default function Bot({ toast }) {
  const [status, setStatus] = useState(null)
  const [internal, setInternal] = useState(null)
  const [groups, setGroups] = useState([])
  const [busy, setBusy] = useState(false)

  // pairing
  const [phone, setPhone] = useState('')
  const [pairMsg, setPairMsg] = useState('')

  // broadcast
  const [selJids, setSelJids] = useState(new Set())
  const [bcText, setBcText] = useState('')
  const [bcDelay, setBcDelay] = useState(3)
  const [bcRunning, setBcRunning] = useState(false)

  // send message
  const [sendJid, setSendJid] = useState('')
  const [sendText, setSendText] = useState('')

  // exec
  const [cmd, setCmd] = useState('')
  const [execTarget, setExecTarget] = useState('')
  const [out, setOut] = useState('')

  // live log viewer
  const [logLines, setLogLines] = useState([])
  const [logType, setLogType] = useState('out')
  const [logAuto, setLogAuto] = useState(false)
  const [logBusy, setLogBusy] = useState(false)

  const load = async () => {
    try {
      const [st, gr] = await Promise.all([getBotStatus().catch(() => null), getBotGroups().catch(() => [])])
      if (st) {
        setStatus(st)
        setBcRunning(!!st.broadcasting)
      }
      setGroups(Array.isArray(gr) ? gr : Array.isArray(gr?.groups) ? gr.groups : [])
    } catch { }
    getBotInternalStatus().then(r => setInternal(r)).catch(() => { })
  }
  useEffect(() => {
    load()
    const iv = setInterval(load, 10000)
    return () => clearInterval(iv)
  }, [])

  const run = async (fn, okMsg, ...args) => {
    setBusy(true)
    try { await fn(...args); if (okMsg) toast(okMsg, 'success'); load() }
    catch (e) { toast(`Error: ${e.message}`, 'error') }
    finally { setBusy(false) }
  }

  const doRestart = async () => {
    if (!confirm('Restart bot WhatsApp? Koneksi akan terputus ~10 detik.')) return
    setBusy(true)
    try {
      const r = await restartBot()
      toast(r?.message || 'Bot di-restart', 'success')
      setTimeout(load, 8000)
    } catch (e) { toast(`Error: ${e.message}`, 'error') }
    finally { setBusy(false) }
  }

  const loadLogs = async (type = logType) => {
    setLogBusy(true)
    try {
      const r = await getLogs(type, 300)
      setLogLines(Array.isArray(r?.lines) ? r.lines : [])
    } catch (e) { toast(`Error log: ${e.message}`, 'error') }
    finally { setLogBusy(false) }
  }

  // auto-refresh log tiap 5s kalau toggle aktif
  useEffect(() => {
    if (!logAuto) return
    loadLogs()
    const iv = setInterval(() => loadLogs(), 5000)
    return () => clearInterval(iv)
  }, [logAuto, logType])

  const doPair = async () => {
    if (!phone.trim()) return
    setBusy(true); setPairMsg('Mengirim permintaan pairing…')
    try {
      await pairBot(phone.trim())
      setPairMsg('Kode pairing dikirim. Cek WhatsApp di HP untuk konfirmasi.')
      toast('Permintaan pairing dikirim', 'success')
      load()
    } catch (e) { setPairMsg(`Error: ${e.message}`); toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  const toggleSel = (jid) => setSelJids(prev => { const n = new Set(prev); n.has(jid) ? n.delete(jid) : n.add(jid); return n })

  const doBroadcast = async () => {
    if (!selJids.size || !bcText.trim()) return toast('Pilih grup & tulis pesan dulu', 'warn')
    setBusy(true)
    try { await broadcast([...selJids], bcText, Number(bcDelay) || 3); setBcRunning(true); toast('Broadcast dimulai', 'success') }
    catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }
  const doCancelBc = () => run(cancelBroadcast, 'Broadcast dibatalkan')

  const doSend = async () => {
    if (!sendJid.trim() || !sendText.trim()) return toast('Isi JID & pesan', 'warn')
    setBusy(true)
    try { await sendMessage(sendJid.trim(), sendText); toast('Pesan terkirim!', 'success'); setSendText('') }
    catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  const doExec = async (e) => {
    e.preventDefault()
    if (!cmd.trim()) return
    if (!execTarget.trim()) { toast('Isi JID target dulu (backend butuh target)', 'error'); return }
    setBusy(true)
    try {
      const r = await execCommand(cmd.trim(), execTarget.trim())
      setOut(typeof r === 'string' ? r : r?.output ?? r?.result ?? JSON.stringify(r, null, 2))
    } catch (e) { setOut(`Error: ${e.message}`); toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  const groupName = (g) => g.name || g.subject || g.jid || g.id
  const groupJid = (g) => g.jid || g.id
  const fmtUptime = (s) => {
    // ponytail: server kadang kirim epoch ms (Date.now()-t0), kadang detik — bedakan via magnitude
    let n = Number(s) || 0
    if (n > 1e12) n = Math.max(0, (Date.now() - n) / 1000)
    const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60)
    return h ? `${h}j ${m}m` : `${m}m`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-3xl grad-text">Bot</h1>
        <p className="text-[#7e90ad] text-sm mt-1">Kelola koneksi &amp; operasi WhatsApp bot</p>
      </div>

      {/* Status card */}
      <div className="card p-6 md:p-7 flex flex-wrap items-center gap-5" style={{ borderColor: 'rgba(59,130,246,.2)' }}>
        <div className={`icon-tile w-14 h-14 shrink-0 ${status?.botOnline ? '' : 'opacity-70'}`}>
          <i className="fa-brands fa-whatsapp text-3xl" style={{ color: status?.botOnline ? '#34d399' : '#7e90ad' }} />
        </div>
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-lg flex items-center gap-2">
            Status Bot
            <span className={`chip px-2.5 py-0.5 text-[11px] flex items-center gap-1.5 ${status?.botOnline ? 'bg-emerald-500/15 text-emerald-300' : 'bg-bad/15 text-bad'}`}>
              <span className="w-[6px] h-[6px] rounded-full" style={{ background: status?.botOnline ? '#34d399' : '#fb7185', animation: status?.botOnline ? 'pulseDot 1.7s infinite' : 'none' }} />
              {status ? (status.botOnline ? 'ONLINE' : 'OFFLINE') : '…'}
            </span>
          </h2>
          <p className="text-[#7e90ad] text-sm mt-0.5 font-mono text-xs">
            Session: {status?.hasSession ? 'ada' : 'tidak ada'} · PID: {status?.pid ?? '—'} · Uptime: {fmtUptime(status?.uptime)} · Restart: {status?.restarts ?? 0}
          </p>
        </div>
        <button onClick={load} disabled={busy} className="ml-auto rounded-[12px] px-4 py-2.5 bg-white/5 border border-white/[.07] hover:border-[#22d3ee]/40 transition-all duration-[150ms] active:scale-[.97] text-sm"><i className="fa-solid fa-arrows-rotate mr-1.5" />Refresh</button>
      </div>

      {/* Pairing */}
      <div className="card p-6 md:p-8 max-w-xl space-y-3">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-mobile-screen text-[#22d3ee] mr-2" />Pairing Perangkat</h2>
        <p className="text-[#7e90ad] text-sm">Masukkan nomor WhatsApp bot (format internasional, tanpa +)</p>
        <div className="flex gap-2">
          <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="628xxxxxxxxxx"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), doPair())}
            className="flex-1 rounded-[12px] px-4 py-2.5 bg-white/5 border border-white/[.07] focus:border-[#22d3ee]/50 outline-none text-sm font-mono transition-colors duration-[150ms]" />
          <button onClick={doPair} disabled={busy || !phone.trim()} className="btn-primary rounded-[12px] px-4 py-2.5 text-sm font-bold"><i className="fa-solid fa-link mr-1.5" />Pair</button>
        </div>
        {pairMsg && <p className="text-sm anim-fade text-[#67e8f9]"><i className="fa-solid fa-circle-info mr-1.5" />{pairMsg}</p>}
      </div>

      {/* Groups */}
      <div className="card p-6 md:p-8">
        <h2 className="font-[family-name:var(--font-display)] font-bold mb-4 text-base"><i className="fa-solid fa-users text-[#67e8f9] mr-2" />Grup ({groups.length})</h2>
        {!groups.length ? (
          <div className="py-10 text-center">
            <i className="fa-solid fa-users-slash text-4xl text-[#7e90ad]/40 mb-3" />
            <p className="text-[#7e90ad] text-sm">Tidak ada grup / bot belum terhubung.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-2.5">
            {groups.map(g => {
              const jid = groupJid(g)
              const enabled = !g.disabled && g.enabled !== false
              return (
                <div key={jid} className="hist-item rounded-[12px] bg-white/[.04] border border-white/[.05] px-4 py-3 flex items-center gap-3">
                  <input type="checkbox" checked={selJids.has(jid)} onChange={() => toggleSel(jid)} title="Pilih untuk broadcast" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{groupName(g)}</p>
                    <p className="text-xs text-[#7e90ad] font-mono truncate">{jid}</p>
                  </div>
                  <button onClick={() => run(toggleGroup, null, jid)} disabled={busy}
                    className={`chip px-3 py-1.5 text-[11px] transition-all duration-[150ms] active:scale-[.97] ${enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-[#7e90ad]'}`}>
                    {enabled ? 'AKTIF' : 'NONAKTIF'}
                  </button>
                  <button onClick={() => confirm(`Bot keluar dari grup "${groupName(g)}"?`) && run(leaveGroup, 'Keluar dari grup', jid)}
                    disabled={busy} title="Keluar grup" className="text-bad hover:text-bad/70 transition-all duration-[150ms] px-1 active:scale-[.97]"><i className="fa-solid fa-right-from-bracket" /></button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Broadcast */}
      <div className="card p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-bullhorn text-emerald-300 mr-2" />Broadcast</h2>
          <span className="text-xs text-[#7e90ad]">{selJids.size} grup dipilih {bcRunning && <span className="chip px-2 py-0.5 ml-1 bg-emerald-500/15 text-emerald-300">BERJALAN</span>}</span>
        </div>
        <textarea value={bcText} onChange={e => setBcText(e.target.value)} rows={3} placeholder="Tulis pesan broadcast…"
          className="w-full rounded-[12px] px-4 py-3 bg-white/5 border border-white/[.07] focus:border-[#22d3ee]/50 outline-none text-sm resize-y transition-colors duration-[150ms]" />
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">Delay per grup (detik)</label>
            <input type="number" min="1" value={bcDelay} onChange={e => setBcDelay(e.target.value)}
              className="w-24 rounded-[12px] px-3 py-2.5 bg-white/5 border border-white/[.07] focus:border-[#22d3ee]/50 outline-none text-sm transition-colors duration-[150ms]" />
          </div>
          {!bcRunning ? (
            <button onClick={doBroadcast} disabled={busy} className="btn-primary rounded-[12px] px-6 py-2.5 font-[family-name:var(--font-display)] font-bold text-sm"><i className="fa-solid fa-paper-plane mr-2" />Kirim Broadcast</button>
          ) : (
            <button onClick={doCancelBc} disabled={busy} className="rounded-[12px] px-6 py-2.5 bg-bad/20 border border-bad/40 text-bad font-bold text-sm hover:bg-bad/30 transition-all duration-[150ms] active:scale-[.97]"><i className="fa-solid fa-stop mr-2" />Batalkan</button>
          )}
        </div>
        {internal && typeof internal.broadcastProgress !== 'undefined' && (
          <p className="text-xs text-[#7e90ad] font-mono">Progres: {JSON.stringify(internal.broadcastProgress)}</p>
        )}
      </div>

      {/* Send message */}
      <div className="card p-6 md:p-8 space-y-3 max-w-xl">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-comment-dots text-[#67e8f9] mr-2" />Kirim Pesan</h2>
        <input value={sendJid} onChange={e => setSendJid(e.target.value)} placeholder="JID tujuan (628xxx@s.whatsapp.net atau grup)"
          className="w-full rounded-[12px] px-4 py-2.5 bg-white/5 border border-white/[.07] focus:border-[#22d3ee]/50 outline-none text-sm font-mono transition-colors duration-[150ms]" />
        <textarea value={sendText} onChange={e => setSendText(e.target.value)} rows={2} placeholder="Isi pesan…"
          className="w-full rounded-[12px] px-4 py-3 bg-white/5 border border-white/[.07] focus:border-[#22d3ee]/50 outline-none text-sm resize-y transition-colors duration-[150ms]" />
        <button onClick={doSend} disabled={busy} className="btn-primary rounded-[12px] px-6 py-2.5 font-[family-name:var(--font-display)] font-bold text-sm"><i className="fa-solid fa-paper-plane mr-2" />Kirim</button>
      </div>

      {/* Exec command */}
      <div className="card p-6 md:p-8 space-y-3">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-terminal text-[#22d3ee] mr-2" />Eksekusi Perintah</h2>
        <p className="text-xs text-[#7e90ad]">Kode dieksekusi di konteks bot dengan variabel <code className="font-mono">sock</code> dan <code className="font-mono">target</code>.</p>
        <input value={execTarget} onChange={e => setExecTarget(e.target.value)} placeholder="JID target (628xxx@s.whatsapp.net atau xxx@g.us)"
          className="w-full rounded-[12px] px-4 py-2.5 bg-white/5 border border-white/[.07] focus:border-[#22d3ee]/50 outline-none text-sm font-mono transition-colors duration-[150ms]" />
        <form onSubmit={doExec} className="flex gap-2">
          <input value={cmd} onChange={e => setCmd(e.target.value)} placeholder="Contoh: await sock.sendMessage(target, { text: 'hai' })"
            className="flex-1 rounded-[12px] px-4 py-2.5 bg-white/5 border border-white/[.07] focus:border-[#22d3ee]/50 outline-none text-sm font-mono transition-colors duration-[150ms]" />
          <button type="submit" disabled={busy} className="btn-primary rounded-[12px] px-5 py-2.5 text-sm font-bold"><i className="fa-solid fa-play mr-1.5" />Run</button>
        </form>
        {out && (
          <pre className="rounded-[12px] bg-black/40 border border-white/[.07] p-4 text-xs font-mono overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap anim-fade">{out}</pre>
        )}
      </div>

      {/* Kontrol proses + live log */}
      <div className="card p-6 md:p-8 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-scroll text-[#22d3ee] mr-2" />Log &amp; Kontrol Proses</h2>
          <button onClick={doRestart} disabled={busy}
            className="rounded-[12px] px-4 py-2.5 text-sm font-bold bg-white/5 border border-white/[.07] hover:bg-white/[.09] transition-all duration-[150ms] active:scale-[.97]">
            <i className="fa-solid fa-rotate-right mr-2" />Restart Bot
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={logType} onChange={e => { setLogType(e.target.value); loadLogs(e.target.value) }}
            className="rounded-[12px] px-3 py-2 bg-white/5 border border-white/[.07] outline-none text-sm">
            <option value="out">stdout</option>
            <option value="error">stderr</option>
          </select>
          <button onClick={() => loadLogs()} disabled={logBusy}
            className="rounded-[12px] px-4 py-2 text-sm font-bold bg-white/5 border border-white/[.07] hover:bg-white/[.09] transition-all duration-[150ms] active:scale-[.97]">
            <i className={`fa-solid fa-arrows-rotate mr-2 ${logBusy ? 'fa-spin' : ''}`} />Muat Log
          </button>
          <label className="flex items-center gap-2 text-xs text-[#7e90ad] cursor-pointer select-none">
            <input type="checkbox" checked={logAuto} onChange={e => setLogAuto(e.target.checked)} className="accent-[#22d3ee]" />
            Auto-refresh 5s
          </label>
        </div>
        <pre className="rounded-[12px] bg-black/40 border border-white/[.07] p-4 text-[11px] leading-relaxed font-mono overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
          {logLines.length ? logLines.join('\n') : 'Belum ada log dimuat.'}
        </pre>
      </div>
    </div>
  )
}
