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
    <div className="min-h-dvh flex items-center justify-center p-4 relative bg-[var(--paper)] selection:bg-[var(--paper-2)] selection:text-[var(--ink)]">
      {/* Subtle Luxury Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--paper-2)].07] blur-[120px] rounded-full" />
        <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-[#38bdf8]/[0.04] blur-[100px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="rounded-[var(--r-soft)] bg-[rgba(10,15,30,0.7)] border border-[var(--edge)] shadow-[0_24px_64px_rgba(0,0,0,0.6)] p-8 sm:p-10 space-y-8">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-[var(--r-xs)] bg-gradient-to-b from-[var(--ink)] to-[var(--ink)] p-[1px] shadow-[var(--sh-1)]">
              <div className="w-full h-full rounded-[var(--r-soft)] bg-[var(--paper)] flex items-center justify-center">
                <i className="fa-solid fa-shield-halved text-xl text-[var(--volt)]" />
              </div>
            </div>
            <div>
              <h1 className="font-[family-name:var(--font-display)] font-extrabold text-2xl tracking-tight text-[var(--ink)]">
                Admin Console
              </h1>
              <p className="text-xs text-[var(--ink-2)] mt-1 font-mono">
                SHIROWAHD · Host Control Portal
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-[var(--ink-2)]">
                  Security Key / Password
                </label>
                <span className="text-[10px] text-[var(--ink-3)] font-mono">Admin Authorization</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoFocus
                  required
                  className="w-full rounded-[var(--r-soft)] px-4 py-3.5 bg-[var(--paper-2)] border border-[var(--edge)] focus:border-[var(--edge)] focus:bg-[var(--paper-2)] focus:shadow-[var(--sh-1)] outline-none text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)] font-mono transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-[var(--r-xs)] text-[var(--ink-2)] hover:text-[var(--ink)] flex items-center justify-center transition-colors"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`} />
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-[var(--r-soft)] bg-bad/10 border border-bad/25 flex items-center gap-2.5 text-xs text-bad anim-fade">
                <i className="fa-solid fa-circle-exclamation shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3.5 rounded-[var(--r-soft)] font-extrabold text-xs tracking-wider uppercase bg-[var(--accent)] hover:bg-[var(--acid)] text-[#06180d] shadow-[var(--sh-1)] transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
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
          <div className="pt-4 border-t border-[var(--edge)] text-center">
            <p className="text-[11px] text-[var(--ink-3)] font-mono">
              Protected by SSH Root &amp; Bearer Auth
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
