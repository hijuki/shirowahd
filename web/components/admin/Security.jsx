'use client'
import { useEffect, useState } from 'react'
import { changePassword, blacklistAction, getBlacklist, getStats, setMaintenance } from '@/lib/admin-api'

export default function Security({ toast }) {
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [cf, setCf] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)

  const [blInput, setBlInput] = useState('')
  const [blacklist, setBlacklist] = useState([])
  const [maint, setMaint] = useState(false)
  const [busy, setBusy] = useState(false)

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
      toast('Password berhasil diubah!', 'success')
      setCur(''); setNw(''); setCf('')
    } catch (e) {
      setPwMsg({ ok: false, text: e.message })
      toast(`Error: ${e.message}`, 'error')
    }
    setPwBusy(false)
  }

  const addBl = async () => {
    const ip = blInput.trim()
    if (!ip) return
    try { await blacklistAction('add', ip); toast(`IP ${ip} diblokir`, 'success'); setBlInput(''); load() }
    catch (e) { toast(`Error: ${e.message}`, 'error') }
  }
  const rmBl = async (ip) => {
    try { await blacklistAction('remove', ip); toast(`IP ${ip} dihapus dari blacklist`, 'success'); load() }
    catch (e) { toast(`Error: ${e.message}`, 'error') }
  }

  const toggleMaint = async () => {
    setBusy(true)
    try { await setMaintenance(!maint); setMaint(!maint); toast(maint ? 'Maintenance dimatikan' : 'Maintenance dinyalakan', maint ? 'success' : 'warn') } catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-3xl grad-text">Security</h1>
        <p className="text-[#7e90ad] text-sm mt-1">Password, blacklist IP &amp; maintenance</p>
      </div>

      {/* Change password */}
      <form onSubmit={submitPw} className="card p-6 md:p-8 space-y-4 max-w-xl">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-key text-[#67e8f9] mr-2" />Ganti Password Admin</h2>
        {[['Password Saat Ini', cur, setCur], ['Password Baru', nw, setNw], ['Konfirmasi Password Baru', cf, setCf]].map(([label, val, setter]) => (
          <div key={label}>
            <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-1.5 block">{label}</label>
            <input type="password" value={val} onChange={e => setter(e.target.value)} required
              className="w-full rounded-[12px] px-4 py-3 bg-white/5 border border-white/[.07] focus:border-[#22d3ee]/50 outline-none transition-colors duration-[150ms]" />
          </div>
        ))}
        {pwMsg && <p className={`text-sm anim-fade ${pwMsg.ok ? 'text-emerald-300' : 'text-bad'}`}><i className={`fa-solid ${pwMsg.ok ? 'fa-circle-check' : 'fa-triangle-exclamation'} mr-1.5`} />{pwMsg.text}</p>}
        <button type="submit" disabled={pwBusy} className="btn-primary min-h-10 rounded-[12px] px-6 py-3 font-[family-name:var(--font-display)] font-bold">
          {pwBusy ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Menyimpan…</> : <><i className="fa-solid fa-check mr-2" />Ubah Password</>}
        </button>
      </form>

      {/* Blacklist */}
      <div className="card p-6 md:p-8 space-y-4">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-ban text-bad mr-2" />Blacklist IP</h2>
        <div className="flex gap-2">
          <input value={blInput} onChange={e => setBlInput(e.target.value)} placeholder="Contoh: 192.168.1.100"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBl())}
            className="flex-1 rounded-[12px] px-4 py-2.5 bg-white/5 border border-white/[.07] focus:border-[#22d3ee]/50 outline-none text-sm font-mono transition-colors duration-[150ms]" />
          <button onClick={addBl} disabled={!blInput.trim()} className="btn-primary rounded-[12px] px-4 py-2.5 text-sm font-bold"><i className="fa-solid fa-plus mr-1.5" />Blokir</button>
        </div>
        {!blacklist.length ? (
          <div className="py-10 text-center">
            <i className="fa-solid fa-user-shield text-4xl text-[#7e90ad]/40 mb-3" />
            <p className="text-[#7e90ad] text-sm">Belum ada IP yang diblokir.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {blacklist.map(ip => {
              const val = typeof ip === 'string' ? ip : ip.ip
              return (
                <div key={val} className="hist-item flex items-center justify-between rounded-[12px] bg-white/[.04] border border-white/[.05] px-4 py-3">
                  <span className="font-mono text-sm"><i className="fa-solid fa-user-slash text-bad mr-2" />{val}</span>
                  <button onClick={() => rmBl(val)} className="text-bad hover:text-bad/70 transition-all duration-[150ms] text-sm active:scale-[.97]"><i className="fa-solid fa-trash mr-1" />Hapus</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Maintenance toggle */}
      <div className="card p-6 md:p-8 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-screwdriver-wrench text-[#fbbf24] mr-2" />Mode Maintenance</h2>
          <p className="text-[#7e90ad] text-sm mt-0.5">Saat aktif, upload dinonaktifkan untuk semua pengguna</p>
        </div>
        {/* after:-inset-y-1 = area sentuh 40px. Dipakai ::after (bukan padding) karena
            padding pada elemen rounded-full ikut mewarnai latar dan bentuk pil jadi berubah. */}
        <button onClick={toggleMaint} disabled={busy} aria-label="Mode maintenance" aria-pressed={!!maint}
          className={`relative w-14 h-8 after:content-[''] after:absolute after:-inset-y-1 after:inset-x-0 rounded-full transition-all duration-[250ms] shrink-0 ml-4 ${maint ? 'bg-gradient-to-r from-[#fbbf24] to-[#fb7185] shadow-[0_0_18px_rgba(251,113,133,.45)]' : 'bg-white/10'}`}
          style={{ transitionTimingFunction: 'var(--ease-out)' }}>
          <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-[250ms] ${maint ? 'translate-x-6' : ''}`} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
        </button>
      </div>
    </div>
  )
}
