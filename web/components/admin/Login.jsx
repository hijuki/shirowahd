'use client'
import { useState } from 'react'
import { login } from '@/lib/admin-api'

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const r = await login(password)
      if (r?.ok && r.token) {
        localStorage.setItem('admin_token', r.token)
        onSuccess()
      } else {
        setError('Password yang Anda masukkan salah')
      }
    } catch (err) {
      setError(err.message || 'Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative bg-[#04070F] selection:bg-[#0062FF]/30 selection:text-white">
      {/* Subtle Luxury Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0062FF]/[0.07] blur-[120px] rounded-full" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-[#38bdf8]/[0.04] blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="rounded-3xl bg-[rgba(10,15,30,0.7)] backdrop-blur-2xl border border-white/[.08] shadow-[0_24px_64px_rgba(0,0,0,0.6)] p-8 sm:p-10 space-y-8">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-b from-[#0062FF] to-[#0047BA] p-[1px] shadow-[0_0_30px_rgba(0,98,255,0.35)]">
              <div className="w-full h-full rounded-2xl bg-[#060A14] flex items-center justify-center">
                <i className="fa-solid fa-shield-halved text-xl text-[#38bdf8]" />
              </div>
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-display)] font-extrabold text-2xl tracking-tight text-white">
                Admin Console
              </h1>
              <p className="text-xs text-[#7e90ad] mt-1 font-mono">
                SHIROWAHD · Host Control Portal
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-[#7e90ad]">
                  Security Key / Password
                </label>
                <span className="text-[10px] text-[#7e90ad]/60 font-mono">Admin Authorization</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoFocus
                  required
                  className="w-full rounded-xl px-4 py-3.5 bg-white/[.03] border border-white/[.08] focus:border-[#0062FF] focus:bg-white/[.05] focus:shadow-[0_0_20px_rgba(0,98,255,0.25)] outline-none text-sm text-white placeholder:text-[#7e90ad]/40 font-mono transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-[#7e90ad] hover:text-white flex items-center justify-center transition-colors"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-bad/10 border border-bad/25 flex items-center gap-2.5 text-xs text-bad anim-fade">
                <i className="fa-solid fa-circle-exclamation shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3.5 rounded-xl font-extrabold text-xs tracking-wider uppercase bg-[#0062FF] hover:bg-[#0052D6] text-white shadow-[0_4px_24px_rgba(0,98,255,0.4)] transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-sm" />
                  <span>Memvalidasi Akses…</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-arrow-right-to-bracket text-sm" />
                  <span>Masuk ke Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Footer Note */}
          <div className="pt-4 border-t border-white/[.06] text-center">
            <p className="text-[11px] text-[#7e90ad]/60 font-mono">
              Protected by SSH Root &amp; Bearer Auth
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
