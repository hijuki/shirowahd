import { useEffect, useState } from 'react'
import { getBotStatus, getBotInternalStatus, pairBot, getBotGroups, leaveGroup, toggleGroup, broadcast, cancelBroadcast, sendMessage, execCommand } from '../api'

export default function Bot() {
  const [status, setStatus] = useState(null)
  const [internal, setInternal] = useState(null)
  const [groups, setGroups] = useState([])
  const [toast, setToast] = useState('')
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
  const [out, setOut] = useState('')

  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

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
    try { await fn(...args); if (okMsg) notify(okMsg); load() }
    catch (e) { notify(`Error: ${e.message}`) }
    finally { setBusy(false) }
  }

  const doPair = async () => {
    if (!phone.trim()) return
    setBusy(true); setPairMsg('Mengirim permintaan pairing…')
    try {
      await pairBot(phone.trim())
      setPairMsg('Kode pairing dikirim. Cek WhatsApp di HP untuk konfirmasi.')
      load()
    } catch (e) { setPairMsg(`Error: ${e.message}`) }
    setBusy(false)
  }

  const toggleSel = (jid) => setSelJids(prev => { const n = new Set(prev); n.has(jid) ? n.delete(jid) : n.add(jid); return n })

  const doBroadcast = async () => {
    if (!selJids.size || !bcText.trim()) return notify('Pilih grup & tulis pesan dulu')
    setBusy(true)
    try { await broadcast([...selJids], bcText, Number(bcDelay) || 3); setBcRunning(true); notify('Broadcast dimulai') }
    catch (e) { notify(`Error: ${e.message}`) }
    setBusy(false)
  }
  const doCancelBc = () => run(cancelBroadcast, 'Broadcast dibatalkan')

  const doSend = async () => {
    if (!sendJid.trim() || !sendText.trim()) return notify('Isi JID & pesan')
    setBusy(true)
    try { await sendMessage(sendJid.trim(), sendText); notify('Pesan terkirim!'); setSendText('') }
    catch (e) { notify(`Error: ${e.message}`) }
    setBusy(false)
  }

  const doExec = async (e) => {
    e.preventDefault()
    if (!cmd.trim()) return
    setBusy(true)
    try {
      const r = await execCommand(cmd.trim())
      setOut(typeof r === 'string' ? r : r?.output ?? r?.result ?? JSON.stringify(r, null, 2))
    } catch (e) { setOut(`Error: ${e.message}`) }
    setBusy(false)
  }

  const groupName = (g) => g.name || g.subject || g.jid || g.id
  const groupJid = (g) => g.jid || g.id
  const fmtUptime = (s) => {
    s = Number(s) || 0
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    return h ? `${h}j ${m}m` : `${m}m`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl md:text-3xl grad-text">Bot</h1>
        <p className="text-muted text-sm mt-1">Kelola koneksi & operasi WhatsApp bot</p>
      </div>

      {/* Status card */}
      <div className="glass border-flow p-6 md:p-7 flex flex-wrap items-center gap-5">
        <div className={`icon-tile w-14 h-14 shrink-0 ${status?.botOnline ? '' : 'opacity-70'}`}>
          <i className="fa-brands fa-whatsapp text-3xl" style={{ color: status?.botOnline ? '#34d399' : '#8892b0' }} />
        </div>
        <div className="min-w-0">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            Status Bot
            <span className={`chip px-2.5 py-0.5 text-[11px] ${status?.botOnline ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
              {status ? (status.botOnline ? 'ONLINE' : 'OFFLINE') : '…'}
            </span>
          </h2>
          <p className="text-muted text-sm mt-0.5 font-mono text-xs">
            Session: {status?.hasSession ? 'ada' : 'tidak ada'} · PID: {status?.pid ?? '—'} · Uptime: {fmtUptime(status?.uptime)} · Restart: {status?.restarts ?? 0}
          </p>
        </div>
        <button onClick={load} disabled={busy} className="ml-auto rounded-xl px-4 py-2.5 bg-white/5 border border-line hover:border-brand2 transition-colors text-sm"><i className="fa-solid fa-arrows-rotate mr-1.5" />Refresh</button>
      </div>

      {/* Pairing */}
      <div className="glass p-6 md:p-8 max-w-xl space-y-3">
        <h2 className="font-display font-bold"><i className="fa-solid fa-mobile-screen text-cyan-300 mr-2" />Pairing Perangkat</h2>
        <p className="text-muted text-sm">Masukkan nomor WhatsApp bot (format internasional, tanpa +)</p>
        <div className="flex gap-2">
          <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="628xxxxxxxxxx"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), doPair())}
            className="flex-1 rounded-xl px-4 py-2.5 bg-white/5 border border-line focus:border-brand2 outline-none text-sm font-mono" />
          <button onClick={doPair} disabled={busy || !phone.trim()} className="btn-glow rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"><i className="fa-solid fa-link mr-1.5" />Pair</button>
        </div>
        {pairMsg && <p className="text-sm anim-fade text-cyan-200"><i className="fa-solid fa-circle-info mr-1.5" />{pairMsg}</p>}
      </div>

      {/* Groups */}
      <div className="glass p-6 md:p-8">
        <h2 className="font-display font-bold mb-4"><i className="fa-solid fa-users text-violet-300 mr-2" />Grup ({groups.length})</h2>
        {!groups.length ? <p className="text-muted text-sm">Tidak ada grup / bot belum terhubung.</p> : (
          <div className="grid md:grid-cols-2 gap-2.5">
            {groups.map(g => {
              const jid = groupJid(g)
              const enabled = g.enabled !== false
              return (
                <div key={jid} className="hist-item rounded-xl bg-white/[.04] px-4 py-3 flex items-center gap-3">
                  <input type="checkbox" checked={selJids.has(jid)} onChange={() => toggleSel(jid)} title="Pilih untuk broadcast" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{groupName(g)}</p>
                    <p className="text-xs text-muted font-mono truncate">{jid}</p>
                  </div>
                  <button onClick={() => run(toggleGroup, null, jid)} disabled={busy}
                    className={`chip px-3 py-1.5 text-[11px] transition-all ${enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-muted'}`}>
                    {enabled ? 'AKTIF' : 'NONAKTIF'}
                  </button>
                  <button onClick={() => confirm(`Bot keluar dari grup "${groupName(g)}"?`) && run(leaveGroup, 'Keluar dari grup', jid)}
                    disabled={busy} title="Keluar grup" className="text-rose-400 hover:text-rose-300 transition-colors px-1"><i className="fa-solid fa-right-from-bracket" /></button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Broadcast */}
      <div className="glass p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-display font-bold"><i className="fa-solid fa-bullhorn text-pink-300 mr-2" />Broadcast</h2>
          <span className="text-xs text-muted">{selJids.size} grup dipilih {bcRunning && <span className="chip px-2 py-0.5 ml-1 bg-pink-500/15 text-pink-300">BERJALAN</span>}</span>
        </div>
        <textarea value={bcText} onChange={e => setBcText(e.target.value)} rows={3} placeholder="Tulis pesan broadcast…"
          className="w-full rounded-xl px-4 py-3 bg-white/5 border border-line focus:border-brand2 outline-none text-sm resize-y" />
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">Delay per grup (detik)</label>
            <input type="number" min="1" value={bcDelay} onChange={e => setBcDelay(e.target.value)}
              className="w-24 rounded-xl px-3 py-2.5 bg-white/5 border border-line focus:border-brand2 outline-none text-sm" />
          </div>
          {!bcRunning ? (
            <button onClick={doBroadcast} disabled={busy} className="btn-glow rounded-xl px-6 py-2.5 font-display font-bold text-sm disabled:opacity-50"><i className="fa-solid fa-paper-plane mr-2" />Kirim Broadcast</button>
          ) : (
            <button onClick={doCancelBc} disabled={busy} className="rounded-xl px-6 py-2.5 bg-rose-500/20 border border-rose-500/40 text-rose-200 font-bold text-sm hover:bg-rose-500/30 transition-colors"><i className="fa-solid fa-stop mr-2" />Batalkan</button>
          )}
        </div>
        {internal && typeof internal.broadcastProgress !== 'undefined' && (
          <p className="text-xs text-muted font-mono">Progres: {JSON.stringify(internal.broadcastProgress)}</p>
        )}
      </div>

      {/* Send message */}
      <div className="glass p-6 md:p-8 space-y-3 max-w-xl">
        <h2 className="font-display font-bold"><i className="fa-solid fa-comment-dots text-indigo-300 mr-2" />Kirim Pesan</h2>
        <input value={sendJid} onChange={e => setSendJid(e.target.value)} placeholder="JID tujuan (628xxx@s.whatsapp.net atau grup)"
          className="w-full rounded-xl px-4 py-2.5 bg-white/5 border border-line focus:border-brand2 outline-none text-sm font-mono" />
        <textarea value={sendText} onChange={e => setSendText(e.target.value)} rows={2} placeholder="Isi pesan…"
          className="w-full rounded-xl px-4 py-3 bg-white/5 border border-line focus:border-brand2 outline-none text-sm resize-y" />
        <button onClick={doSend} disabled={busy} className="btn-glow rounded-xl px-6 py-2.5 font-display font-bold text-sm disabled:opacity-50"><i className="fa-solid fa-paper-plane mr-2" />Kirim</button>
      </div>

      {/* Exec command */}
      <div className="glass p-6 md:p-8 space-y-3">
        <h2 className="font-display font-bold"><i className="fa-solid fa-terminal text-cyan-300 mr-2" />Eksekusi Perintah</h2>
        <form onSubmit={doExec} className="flex gap-2">
          <input value={cmd} onChange={e => setCmd(e.target.value)} placeholder="Contoh: status"
            className="flex-1 rounded-xl px-4 py-2.5 bg-white/5 border border-line focus:border-brand2 outline-none text-sm font-mono" />
          <button type="submit" disabled={busy} className="btn-glow rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50"><i className="fa-solid fa-play mr-1.5" />Run</button>
        </form>
        {out && (
          <pre className="rounded-xl bg-black/40 border border-line p-4 text-xs font-mono overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap anim-fade">{out}</pre>
        )}
      </div>

      {toast && <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 toast-card rounded-xl px-5 py-3 text-sm anim-pop z-50"><i className="fa-solid fa-circle-check text-emerald-300 mr-2" />{toast}</div>}
    </div>
  )
}
