'use client'
import { useEffect, useState } from 'react'
import { changePassword, blacklistAction, getBlacklist, getStats, setMaintenance, getSettings } from '@/lib/admin-api'

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
  // Benderanya dari backend (`passwordBocor` di GET /admin/api/settings): password
  // aktif masih sama dengan default yang pernah ter-commit ke repo publik.
  const [pwBocor, setPwBocor] = useState(false)

  const load = async () => {
    try {
      const [b, s, st] = await Promise.all([
        getBlacklist().catch(() => []),
        getStats(),
        getSettings().catch(() => null),
      ])
      setBlacklist(Array.isArray(b) ? b : [])
      if (s?.maintenance != null) setMaint(s.maintenance)
      setPwBocor(!!st?.passwordBocor)
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
      load() // peringatan password-bocor harus hilang begitu password diganti
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
        <p className="text-[var(--ink-2)] text-sm mt-1">Password, blacklist IP &amp; maintenance</p>
      </div>

      {/* Peringatan password bawaan: nilainya ada di repo publik, jadi ini
          bukan "kurang ideal" — panel benar-benar bisa dimasuki orang lain. */}
      {pwBocor && (
        <div role="alert" className="card p-5 md:p-6 border border-bad/40 bg-bad/[.07] space-y-2">
          <p className="font-bold text-bad text-sm">
            <i className="fa-solid fa-triangle-exclamation mr-2" />Password admin masih bawaan
          </p>
          <p className="text-sm text-[var(--ink-2)]">
            Password yang aktif sama dengan default yang pernah ter-commit ke repositori publik,
            jadi siapa pun yang membaca repo bisa masuk ke panel ini. Ganti sekarang lewat formulir di bawah.
          </p>
        </div>
      )}

      {/* Change password */}
      <form onSubmit={submitPw} className="card p-6 md:p-8 space-y-4 max-w-xl">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-key text-[var(--volt)] mr-2" />Ganti Password Admin</h2>
        {[['Password Saat Ini', cur, setCur], ['Password Baru', nw, setNw], ['Konfirmasi Password Baru', cf, setCf]].map(([label, val, setter]) => (
          <div key={label}>
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)] mb-1.5 block">{label}</label>
            <input type="password" value={val} onChange={e => setter(e.target.value)} required
              minLength={label === 'Password Saat Ini' ? undefined : 8}
              className="w-full rounded-[var(--r-soft)] px-4 py-3 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none transition-colors duration-[150ms]" />
          </div>
        ))}
        {pwMsg && <p className={`text-sm anim-fade ${pwMsg.ok ? 'text-emerald-300' : 'text-bad'}`}><i className={`fa-solid ${pwMsg.ok ? 'fa-circle-check' : 'fa-triangle-exclamation'} mr-1.5`} />{pwMsg.text}</p>}
        <button type="submit" disabled={pwBusy} className="btn-primary min-h-10 font-[family-name:var(--font-display)]">
          {pwBusy ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Menyimpan…</> : <><i className="fa-solid fa-check mr-2" />Ubah Password</>}
        </button>
      </form>

      {/* Blacklist */}
      <div className="card p-6 md:p-8 space-y-4">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-ban text-bad mr-2" />Blacklist IP</h2>
        <div className="flex gap-2">
          <input value={blInput} onChange={e => setBlInput(e.target.value)} placeholder="Contoh: 192.168.1.100"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addBl())}
            className="flex-1 rounded-[var(--r-soft)] px-4 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] outline-none text-sm font-mono transition-colors duration-[150ms]" />
          <button onClick={addBl} disabled={!blInput.trim()} className="btn-primary text-sm"><i className="fa-solid fa-plus mr-1.5" />Blokir</button>
        </div>
        {!blacklist.length ? (
          <div className="py-10 text-center">
            <i className="fa-solid fa-user-shield text-4xl text-[var(--ink-3)] mb-3" />
            <p className="text-[var(--ink-2)] text-sm">Belum ada IP yang diblokir.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {blacklist.map(ip => {
              const val = typeof ip === 'string' ? ip : ip.ip
              return (
                <div key={val} className="hist-item flex items-center justify-between rounded-[var(--r-soft)] bg-[var(--paper-2)] border border-[var(--edge)] px-4 py-3">
                  <span className="font-mono text-sm"><i className="fa-solid fa-user-slash text-bad mr-2" />{val}</span>
                  <button onClick={() => rmBl(val)} className="btn btn-danger"><i className="fa-solid fa-trash mr-1" />Hapus</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Maintenance toggle */}
      <div className="card p-6 md:p-8 flex items-center justify-between">
        <div>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-base"><i className="fa-solid fa-screwdriver-wrench text-[#b45309] mr-2" />Mode Maintenance</h2>
          <p className="text-[var(--ink-2)] text-sm mt-0.5">Saat aktif, upload dinonaktifkan untuk semua pengguna</p>
        </div>
        {/* after:-inset-y-1 = area sentuh 40px. Dipakai ::after (bukan padding) karena
            padding pada elemen rounded-full ikut mewarnai latar dan bentuk pil jadi berubah. */}
        <button onClick={toggleMaint} disabled={busy} aria-busy={busy} aria-label="Mode maintenance"
          type="button" role="switch" aria-checked={!!maint}
          className={`relative w-14 h-8 after:content-[''] after:absolute after:-inset-y-1 after:inset-x-0 rounded-full transition-all duration-[250ms] shrink-0 ml-4 ${maint ? 'bg-gradient-to-r from-[#fbbf24] to-[#fb7185] shadow-[0_0_18px_rgba(251,113,133,.45)]' : 'bg-[var(--paper-2)]'}`}
          style={{ transitionTimingFunction: 'var(--ease-out)' }}>
          <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-[250ms] ${maint ? 'translate-x-6' : ''}`} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
        </button>
      </div>
    </div>
  )
}
