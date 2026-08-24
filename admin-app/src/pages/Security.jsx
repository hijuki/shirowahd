import { useEffect, useState } from 'react'
import { changePassword, blacklistAction, getBlacklist, getStats, setMaintenance } from '../api'

export default function Security() {
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [cf, setCf] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)

  const [blInput, setBlInput] = useState('')
  const [blacklist, setBlacklist] = useState([])
  const [maint, setMaint] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const load = async () => {
    try {
      const [b, s] = await Promise.all([getBlacklist().catch(() => []), getStats()])
      setBlacklist(Array.isArray(b) ? b : [])
      if (s?.maintenance != null) setMaint(s.maintenance)
    } catch { }
  }
  useEffect(() => { load() }, [])

  const submitPw = async (e) => {
    e.preventDefault()
    if (nw !== cf) return setPwMsg({ ok: false, text: 'Konfirmasi password tidak sama' })
    setPwBusy(true); setPwMsg(null)
    try {
      await changePassword(cur, nw)
      setPwMsg({ ok: true, text: 'Password berhasil diubah!' })
      setCur(''); setNw(''); setCf('')
    } catch (e) { setPwMsg({ ok: false, text: e.message }) }
    setPwBusy(false)
  }

  const addBl = async () => {
    const ip = blInput.trim()
    if (!ip) return
    try { await blacklistAction('add', ip); notify(`IP ${ip} diblokir`); setBlInput(''); load() }
    catch (e) { notify(`Error: ${e.message}`) }
  }
  const rmBl = async (ip) => {
    try { await blacklistAction('remove', ip); notify(`IP ${ip} dihapus dari blacklist`) ; load() }
    catch (e) { notify(`Error: ${e.message}`) }
  }

  const toggleMaint = async () => {
    setBusy(true)
    try { await setMaintenance(!maint); setMaint(!maint); notify(maint ? 'Maintenance dimatikan' : 'Maintenance dinyalakan') } catch (e) { notify(`Error: ${e.message}`) }
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl md:text-3xl grad-text">Security</h1>
        <p className="text-muted text-sm mt-1">Password, blacklist IP & maintenance</p>
      </div>

      {/* Change password */}
      <form onSubmit={submitPw} className="glass p-6 md:p-8 space-y-4 max-w-xl">
        <h2 className="font-display font-bold"><i className="fa-solid fa-key text-indigo-300 mr-2" />Ganti Password Admin</h2>
        {[['Password Saat Ini', cur, setCur], ['Password Baru', nw, setNw], ['Konfirmasi Password Baru', cf, setCf]].map(([label, val, setter]) => (
          <div key={label}>
            <label className="text-xs font-bold uppercase tracking-wider text-muted mb-1.5 block">{label}</label>
            <input type="password" value={val} onChange={e => setter(e.target.value)} required
              className="w-full rounded-xl px-4 py-3 bg-white/5 border border-line focus:border-brand2 outline-none transition-colors" />
          </div>
        ))}
        {pwMsg && <p className={`text-sm anim-fade ${pwMsg.ok ? 'text-emerald-300' : 'text-rose-400'}`}><i className={`fa-solid ${pwMsg.ok ? 'fa-circle-check' : 'fa-triangle-exclamation'} mr-1.5`} />{pwMsg.text}</p>}
        <button type="submit" disabled={pwBusy} className="btn-glow rounded-xl px-6 py-3 font-display font-bold disabled:opacity-60">
          {pwBusy ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Menyimpan…</> : <><i className="fa-solid fa-check mr-2" />Ubah Password</>}
        </button>
      </form>

      {/* Blacklist */}
      <div className="glass p-6 md:p-8 space-y-4">
        <h2 className="font-display font-bold"><i className="fa-solid fa-ban text-rose-300 mr-2" />Blacklist IP</h2>
        <div className="flex gap-2">
          <input value={blInput} onChange={e => setBlInput(e.target.value)} placeholder="Contoh: 192.168.1.100"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBl())}
            className="flex-1 rounded-xl px-4 py-2.5 bg-white/5 border border-line focus:border-brand2 outline-none text-sm font-mono" />
          <button onClick={addBl} disabled={!blInput.trim()} className="btn-glow rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"><i className="fa-solid fa-plus mr-1.5" />Blokir</button>
        </div>
        {!blacklist.length ? <p className="text-muted text-sm">Belum ada IP yang diblokir.</p> : (
          <div className="space-y-2">
            {blacklist.map(ip => {
              const val = typeof ip === 'string' ? ip : ip.ip
              return (
                <div key={val} className="hist-item flex items-center justify-between rounded-xl bg-white/[.04] px-4 py-3">
                  <span className="font-mono text-sm"><i className="fa-solid fa-user-slash text-rose-300 mr-2" />{val}</span>
                  <button onClick={() => rmBl(val)} className="text-rose-400 hover:text-rose-300 transition-colors text-sm"><i className="fa-solid fa-trash mr-1" />Hapus</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Maintenance toggle */}
      <div className="glass p-6 md:p-8 flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold"><i className="fa-solid fa-screwdriver-wrench text-amber-300 mr-2" />Mode Maintenance</h2>
          <p className="text-muted text-sm mt-0.5">Saat aktif, upload dinonaktifkan untuk semua pengguna</p>
        </div>
        <button onClick={toggleMaint} disabled={busy}
          className={`relative w-14 h-8 rounded-full transition-all duration-300 shrink-0 ml-4 ${maint ? 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_18px_rgba(251,113,133,.5)]' : 'bg-white/10'}`}>
          <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${maint ? 'translate-x-6' : ''}`} />
        </button>
      </div>

      {toast && <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 toast-card rounded-xl px-5 py-3 text-sm anim-pop z-50"><i className="fa-solid fa-circle-check text-emerald-300 mr-2" />{toast}</div>}
    </div>
  )
}
