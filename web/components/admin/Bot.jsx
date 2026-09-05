'use client'
import { useEffect, useState } from 'react'
import { getBotStatus, getBotInternalStatus, getBotPlugins, getBotGroups, leaveGroup, toggleGroup, broadcast, cancelBroadcast, sendMessage, execCommand, restartBot, getLogs } from '@/lib/admin-api'
import Pairing from './Pairing'
import Bots from './Bots'

export default function Bot({ toast }) {
  const [status, setStatus] = useState(null)
  const [internal, setInternal] = useState(null)
  const [plug, setPlug] = useState(null)
  const [showDups, setShowDups] = useState(false)
  const [showMati, setShowMati] = useState(false)
  const [showBajak, setShowBajak] = useState(false)
  const [groups, setGroups] = useState([])
  const [busy, setBusy] = useState(false)

  // pairing dipindah ke komponen Pairing.jsx (papan status + polling kode)

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
    getBotPlugins().then(r => setPlug(r)).catch(() => { })
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
    // Target hanya perlu kalau kodenya memang menyebut `target` — perintah
    // diagnostik seperti `getPluginCount()` tidak mengirim pesan ke siapa pun.
    const butuhTarget = /\btarget\b/.test(cmd)
    if (butuhTarget && !execTarget.trim()) { toast('Kode ini memakai `target`, isi JID dulu', 'error'); return }
    setBusy(true)
    try {
      const r = await execCommand(cmd.trim(), execTarget.trim())
      const bagian = []
      if (r?.logs?.length) bagian.push(r.logs.join('\n'))
      const nilai = typeof r === 'string' ? r : (r?.output ?? r?.result)
      if (nilai !== undefined && nilai !== null && nilai !== 'undefined') bagian.push(String(nilai))
      setOut(bagian.length ? bagian.join('\n') : '(selesai, tidak ada nilai kembalian)')
    } catch (e) { setOut(`Error: ${e.message}`); toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  // WhatsApp mengembalikan subject "" untuk sebagian grup (metadata belum sinkron),
  // dan rantai `||` lama lolos dari string kosong ke JID mentah — jadi tampil
  // "120363411642455263@g.us" dua kali berturut-turut. Sekarang string kosong
  // dianggap tidak ada, dan JID dipendekkan supaya baris tidak jadi sampah angka.
  const groupName = (g) => {
    const pick = [g.name, g.subject].map(v => (v || '').trim()).find(Boolean)
    if (pick) return pick
    const jid = g.jid || g.id || ''
    return jid ? '(tanpa nama) ' + jid.replace(/@g\.us$/, '').slice(-6) : '(tanpa nama)'
  }
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
        <p className="text-[var(--ink-2)] text-sm mt-1">Kelola koneksi &amp; operasi WhatsApp bot</p>
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
          <p className="text-[var(--ink-2)] text-sm mt-0.5 font-mono text-xs">
            Session: {status?.hasSession ? 'ada' : 'tidak ada'} · PID: {status?.pid ?? '—'} · Uptime: {fmtUptime(status?.uptime)} · Restart: {status?.restarts ?? 0}
          </p>
        </div>
        <button onClick={load} disabled={busy} aria-busy={busy} className="btn btn-quiet ml-auto"><i className="fa-solid fa-arrows-rotate mr-1.5" />Refresh</button>
      </div>

      {/* Plugin registry — angka dari registry bot, bukan hitungan baris log */}
      <div className="card p-6 md:p-8">
        <h2 className="font-[family-name:var(--font-display)] font-bold mb-4 text-base">
          <i className="fa-solid fa-puzzle-piece text-[var(--volt)] mr-2" />Plugin
        </h2>
        {!plug?.ok ? (
          <p className="text-[var(--ink-2)] text-sm">Data plugin belum tersedia. Bot mungkin sedang booting.</p>
        ) : (
          <>
            {/* grid-cols-6 di layar lebar: kartu kelima ("Plugin mati") dan
                keenam ("Alias dibajak") ditambah setelahnya; dengan
                md:grid-cols-4 mereka jatuh sendirian ke baris kedua dan terbaca
                seperti angka nyasar, bukan bagian ringkasan. */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { l: 'Plugin aktif', v: plug.plugins, c: '#34d399' },
                { l: 'Command + alias', v: plug.commands, c: '#67e8f9' },
                { l: 'Kategori', v: plug.categories, c: '#93c5fd' },
                { l: 'Nama tabrakan', v: plug.duplicateCount, c: plug.duplicateCount ? '#fbbf24' : '#7e90ad' },
                { l: 'Plugin mati', v: plug.unreachableCount ?? '—', c: plug.unreachableCount ? '#f87171' : '#7e90ad' },
                { l: 'Alias dibajak', v: plug.hijackedAliasCount ?? '—', c: plug.hijackedAliasCount ? '#f472b6' : '#7e90ad' },
              ].map(s => (
                <div key={s.l} className="rounded-[var(--r)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)]">
                  <p className="text-[10px] font-bold tracking-wider uppercase text-[var(--ink-2)]">{s.l}</p>
                  <p className="text-xl font-bold tabular-nums" style={{ color: s.c }}>{s.v}</p>
                </div>
              ))}
            </div>
            {plug.duplicateCount > 0 && (
              <div className="mt-4">
                <button onClick={() => setShowDups(v => !v)}
                  className="btn btn-warn">
                  <i className={`fa-solid fa-chevron-${showDups ? 'up' : 'down'} mr-1.5`} />
                  {showDups ? 'Sembunyikan' : 'Lihat'} {plug.duplicateCount} command yang saling menimpa
                </button>
                {showDups && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[var(--ink-2)] text-xs">
                      Dua plugin memakai nama command yang sama; yang dimuat terakhir menang, yang lain tidak pernah jalan.
                      Ini bukan error — hanya perlu diketahui agar tidak bingung saat sebuah command terasa &quot;salah fungsi&quot;.
                    </p>
                    {plug.duplicates.map((d, i) => (
                      <div key={d.command + i} className="rounded-[var(--r-soft)] px-3 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] text-xs">
                        <p className="font-mono font-bold text-[#b45309]">.{d.command}</p>
                        <p className="text-[var(--acid)] mt-1 break-all"><i className="fa-solid fa-check mr-1" />aktif: {d.kept}</p>
                        <p className="text-[var(--ink-2)] break-all"><i className="fa-solid fa-xmark mr-1" />mati: {d.shadowed}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Daftar plugin yang benar-benar tidak bisa dipanggil. Dipisah dari
                daftar tabrakan di atas karena maknanya berbeda: tabrakan sering
                tidak berbahaya (plugin yang kalah masih punya nama lain), yang
                di sini seluruh nama DAN aliasnya direbut. */}
            {plug.unreachableCount > 0 && (
              <div className="mt-4">
                <button onClick={() => setShowMati(v => !v)}
                  className="btn btn-danger">
                  <i className={`fa-solid fa-chevron-${showMati ? 'up' : 'down'} mr-1.5`} />
                  {showMati ? 'Sembunyikan' : 'Lihat'} {plug.unreachableCount} plugin yang tak bisa dipanggil
                </button>
                {showMati && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[var(--ink-2)] text-xs">
                      Seluruh nama dan alias plugin ini sudah dipakai plugin lain yang dimuat setelahnya.
                      Berkasnya tetap dimuat dan memakan memori, tapi tidak ada satu pun cara memanggilnya.
                      Perbaikannya: ganti namanya, atau hapus berkasnya kalau memang duplikat.
                    </p>
                    {(plug.unreachable || []).map((p, i) => (
                      <div key={p.file + i} className="rounded-[var(--r-soft)] px-3 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] text-xs">
                        <p className="font-mono font-bold text-[#f87171] break-all">{p.file}</p>
                        <p className="text-[var(--ink-2)] mt-1">
                          nama: {(p.names || []).map(n => '.' + n).join(' ')}
                          {p.aliases?.length ? ` · alias: ${p.aliases.map(a => '.' + a).join(' ')}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Daftar alias dibajak — kelas ketiga, dan yang paling berbahaya.
                Dua daftar di atas memberi tahu ada command yang MATI; yang ini
                soal command yang HIDUP tapi menjalankan berkas lain. Tanpa
                daftar ini kartu "Alias dibajak" cuma angka tanpa jalan keluar:
                admin tahu ada 9 masalah tapi tidak tahu alias mana. */}
            {plug.hijackedAliasCount > 0 && (
              <div className="mt-4">
                <button onClick={() => setShowBajak(v => !v)}
                  className="btn btn-danger">
                  <i className={`fa-solid fa-chevron-${showBajak ? 'up' : 'down'} mr-1.5`} />
                  {showBajak ? 'Sembunyikan' : 'Lihat'} {plug.hijackedAliasCount} alias yang menjalankan plugin salah
                </button>
                {showBajak && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[var(--ink-2)] text-xs">
                      Alias ini ditulis di satu berkas, tapi saat dipanggil yang jalan berkas lain.
                      Tidak ada gejalanya: command tetap membalas, hasilnya saja bukan yang dimaksud.
                      Perbaikannya: ganti alias yang bertabrakan di salah satu berkas.
                    </p>
                    {(plug.hijackedAliases || []).map((h, i) => (
                      <div key={h.alias + i} className="rounded-[var(--r-soft)] px-3 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] text-xs">
                        <p className="font-mono font-bold text-[#f472b6]">.{h.alias}</p>
                        <p className="text-[var(--ink-2)] mt-1 break-all">
                          <i className="fa-solid fa-pen-to-square mr-1" />ditulis di: {h.declaredIn}
                        </p>
                        <p className="text-[var(--acid)] break-all">
                          <i className="fa-solid fa-play mr-1" />yang jalan: {h.executes}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Pairing + registry multi-bot: dua kartu terpisah, keduanya menjaga
          state sendiri lewat polling papan status. */}
      <Pairing toast={toast} />
      <Bots toast={toast} />

      {/* Groups */}
      <div className="card p-6 md:p-8">
        <h2 className="font-[family-name:var(--font-display)] font-bold mb-4 text-base"><i className="fa-solid fa-users text-[var(--volt)] mr-2" />Grup ({groups.length})</h2>
        {!groups.length ? (
          <div className="py-10 text-center">
            <i className="fa-solid fa-users-slash text-4xl text-[var(--ink-3)] mb-3" />
            <p className="text-[var(--ink-2)] text-sm">Tidak ada grup / bot belum terhubung.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-2.5">
            {groups.map(g => {
              const jid = groupJid(g)
              const enabled = !g.disabled && g.enabled !== false
              return (
                <div key={jid} className="hist-item rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] px-4 py-3 flex items-center gap-3">
                  {/* area sentuh 40px lewat <label>; padding pada checkbox diabaikan browser */}
                  <label aria-label="Pilih grup untuk broadcast" title="Pilih untuk broadcast" className="shrink-0 -m-2.5 p-2.5 cursor-pointer inline-flex items-center">
                    <input type="checkbox" checked={selJids.has(jid)} onChange={() => toggleSel(jid)} className="w-5 h-5 accent-[#22d3ee]" />
                  </label>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{groupName(g)}</p>
                    <p className="text-xs text-[var(--ink-2)] font-mono truncate">{jid}</p>
                  </div>
                  <button onClick={() => run(toggleGroup, null, jid)} disabled={busy} aria-busy={busy}
                    className={`chip px-3 min-h-10 inline-flex items-center text-[11px] transition-all duration-[150ms] active:scale-[.97] ${enabled ? 'bg-emerald-500/15 text-emerald-300' : 'bg-[var(--paper-2)] text-[var(--ink-2)]'}`}>
                    {enabled ? 'AKTIF' : 'NONAKTIF'}
                  </button>
                  {/* Keluar grup tidak bisa dibatalkan — targetnya jangan 23x23px. */}
                  <button onClick={() => confirm(`Bot keluar dari grup "${groupName(g)}"?`) && run(leaveGroup, 'Keluar dari grup', jid)}
                    disabled={busy} aria-busy={busy} title="Keluar grup" aria-label={`Keluar dari grup ${groupName(g)}`} className="btn btn-danger shrink-0"><i className="fa-solid fa-right-from-bracket" /></button>
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
          <span className="text-xs text-[var(--ink-2)]">{selJids.size} grup dipilih {bcRunning && <span className="chip px-2 py-0.5 ml-1 bg-emerald-500/15 text-emerald-300">BERJALAN</span>}</span>
        </div>
        <textarea value={bcText} onChange={e => setBcText(e.target.value)} rows={3} placeholder="Tulis pesan broadcast…"
          className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm resize-y transition-colors duration-[150ms]" />
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">Delay per grup (detik)</label>
            <input type="number" min="1" value={bcDelay} onChange={e => setBcDelay(e.target.value)}
              className="w-24 rounded-[var(--r-soft)] px-3 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm transition-colors duration-[150ms]" />
          </div>
          {!bcRunning ? (
            <button onClick={doBroadcast} disabled={busy} aria-busy={busy} className="btn btn-primary font-[family-name:var(--font-display)] text-sm"><i className="fa-solid fa-paper-plane mr-2" />Kirim Broadcast</button>
          ) : (
            <button onClick={doCancelBc} disabled={busy} aria-busy={busy} className="btn btn-danger"><i className="fa-solid fa-stop mr-2" />Batalkan</button>
          )}
        </div>
        {internal && typeof internal.broadcastProgress !== 'undefined' && (
          <p className="text-xs text-[var(--ink-2)] font-mono">Progres: {JSON.stringify(internal.broadcastProgress)}</p>
        )}
      </div>

      {/* Send message */}
      <div className="card p-6 md:p-8 space-y-3 max-w-xl">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-comment-dots text-[var(--volt)] mr-2" />Kirim Pesan</h2>
        <input value={sendJid} onChange={e => setSendJid(e.target.value)} placeholder="JID tujuan (628xxx@s.whatsapp.net atau grup)"
          className="w-full rounded-[var(--r-soft)] px-4 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-mono transition-colors duration-[150ms]" />
        <textarea value={sendText} onChange={e => setSendText(e.target.value)} rows={2} placeholder="Isi pesan…"
          className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm resize-y transition-colors duration-[150ms]" />
        <button onClick={doSend} disabled={busy} aria-busy={busy} className="btn btn-primary font-[family-name:var(--font-display)] text-sm"><i className="fa-solid fa-paper-plane mr-2" />Kirim</button>
      </div>

      {/* Exec command */}
      <div className="card p-6 md:p-8 space-y-3">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-terminal text-[var(--volt)] mr-2" />Eksekusi Perintah</h2>
        <p className="text-xs text-[var(--ink-2)]">Kode dieksekusi di konteks bot dengan variabel <code className="font-mono">sock</code> dan <code className="font-mono">target</code>. Nilai kembalian &amp; <code className="font-mono">console.log</code> ikut ditampilkan. JID hanya wajib kalau kode memakai <code className="font-mono">target</code>.</p>
        <div className="flex flex-wrap gap-2">
          {[
            ['Cek koneksi', 'sock.user'],
            ['Jumlah plugin', "(await import('/root/shirowahd/src/lib/hillz-plugins.js')).getPluginCount()"],
            ['Pakai RAM', 'process.memoryUsage()'],
          ].map(([label, kode]) => (
            <button key={label} type="button" onClick={() => setCmd(kode)}
              className="btn btn-quiet text-[11px] text-[var(--ink-2)] hover:text-[var(--ink)]">
              {label}
            </button>
          ))}
        </div>
        <input value={execTarget} onChange={e => setExecTarget(e.target.value)} placeholder="JID target (opsional — hanya bila kode memakai `target`)"
          className="w-full rounded-[var(--r-soft)] px-4 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-mono transition-colors duration-[150ms]" />
        <form onSubmit={doExec} className="flex gap-2">
          <input value={cmd} onChange={e => setCmd(e.target.value)} placeholder="Contoh: await sock.sendMessage(target, { text: 'hai' })"
            className="flex-1 rounded-[var(--r-soft)] px-4 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-mono transition-colors duration-[150ms]" />
          <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary min-h-10 text-sm"><i className="fa-solid fa-play mr-1.5" />Run</button>
        </form>
        {out && (
          <pre className="rounded-[var(--r-soft)] bg-black/40 border border-[var(--edge)] p-4 text-xs font-mono overflow-x-auto max-h-72 overflow-y-auto whitespace-pre-wrap anim-fade">{out}</pre>
        )}
      </div>

      {/* Kontrol proses + live log */}
      <div className="card p-6 md:p-8 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-scroll text-[var(--volt)] mr-2" />Log &amp; Kontrol Proses</h2>
          <button onClick={doRestart} disabled={busy} aria-busy={busy}
            className="btn btn-quiet">
            <i className="fa-solid fa-rotate-right mr-2" />Restart Bot
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={logType} onChange={e => { setLogType(e.target.value); loadLogs(e.target.value) }}
            className="rounded-[var(--r-soft)] px-3 py-2 bg-[var(--paper-2)] border border-[var(--edge)] outline-none text-sm">
            <option value="out">stdout</option>
            <option value="error">stderr</option>
          </select>
          <button onClick={() => loadLogs()} disabled={logBusy}
            className="btn btn-quiet">
            <i className={`fa-solid fa-arrows-rotate mr-2 ${logBusy ? 'fa-spin' : ''}`} />Muat Log
          </button>
          <label className="flex items-center gap-2 text-xs text-[var(--ink-2)] cursor-pointer select-none">
            <span className="-m-2.5 p-2.5 inline-flex items-center">
              <input type="checkbox" aria-label="Auto refresh log" checked={logAuto} onChange={e => setLogAuto(e.target.checked)} className="w-5 h-5 accent-[#22d3ee]" />
            </span>
            Auto-refresh 5s
          </label>
        </div>
        <pre className="rounded-[var(--r-soft)] bg-black/40 border border-[var(--edge)] p-4 text-[11px] leading-relaxed font-mono overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
          {logLines.length ? logLines.join('\n') : 'Belum ada log dimuat.'}
        </pre>
      </div>
    </div>
  )
}
