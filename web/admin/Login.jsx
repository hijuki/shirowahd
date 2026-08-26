'use client'
import { useState } from 'react'
import { login } from '@/lib/admin-api'

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const r = await login(password)
      if (r?.ok && r.token) { localStorage.setItem('admin_token', r.token); onSuccess() }
      else setError('Password salah')
    } catch (err) { setError(err.message || 'Login gagal') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-dvh grid place-items-center px-4 relative">
      <div className="bg-aurora" /><div className="bg-grid" /><div className="bg-noise" />
      <form onSubmit={submit} className="card anim-entrance w-full max-w-md p-8 md:p-10 relative z-10" style={{ borderColor: 'rgba(59,130,246,.2)' }}>
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="icon-tile w-16 h-16"><i className="fa-solid fa-shield-halved text-2xl text-[#67e8f9]" /></div>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-2xl grad-text">Admin Panel</h1>
          <p className="text-[#7e90ad] text-sm">Masuk untuk mengelola bot</p>
        </div>
        <label className="text-xs font-bold uppercase tracking-wider text-[#7e90ad] mb-2 block">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoFocus
          required
          className="w-full rounded-[12px] px-4 py-3 bg-white/5 border border-white/[.07] focus:border-[#22d3ee]/50 outline-none transition-colors duration-[150ms] mb-4 text-sm"
          style={{ transitionTimingFunction: 'var(--ease-out)' }}
        />
        {error && <p className="text-bad text-sm mb-4 anim-fade"><i className="fa-solid fa-triangle-exclamation mr-1.5" />{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full rounded-[12px] py-3.5 font-[family-name:var(--font-display)] font-bold tracking-wide">
          {loading ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Memeriksa...</> : <><i className="fa-solid fa-right-to-bracket mr-2" />Masuk</>}
        </button>
      </form>
    </div>
  )
}
