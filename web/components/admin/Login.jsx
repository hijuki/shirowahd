'use client'
import { useEffect, useRef, useState } from 'react'
import { login } from '@/lib/admin-api'
import { useTheme } from '@/lib/motion'

/* ══════════════════════════════════════════════════════════════
   LOGIN ADMIN — ditulis ulang agar satu bahasa dengan situs.

   Versi lama meleset karena memakai bahasa desain yang berbeda:
   kartu kaca gelap `rgba(10,15,30,0.7)` di atas kertas putih (jadi
   kotak hitam melayang), border 1px padahal seluruh situs 2px, nol
   bayangan tinta, judul Title Case padahal semua judul situs
   uppercase Archivo Black, dan tidak satu pun kelas sistem
   (.plate/.btn/.inp/.kicker) dipakai. Ada juga dua bug nyata:
   kelas malformed `bg-[var(--paper-2)].07]` dan radius anak (11px)
   lebih besar dari induk (7px) pada tile ikon.

   Sekarang: plat kertas + border tinta 2px + bayangan offset, latar
   halftone/grid yang sama dengan halaman lain, tipografi display,
   dan mode terang/gelap mewarisi token — jadi karakternya ikut
   berubah, bukan cuma warnanya.
   ══════════════════════════════════════════════════════════════ */

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [caps, setCaps] = useState(false)
  const [nudge, setNudge] = useState(false)
  const { theme, toggle } = useTheme()
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (loading || !password) return
    setLoading(true)
    setError('')
    try {
      const r = await login(password)
      if (r?.ok && r.token) {
        localStorage.setItem('admin_token', r.token)
        onSuccess()
        return
      }
      setError('Kunci tidak dikenali')
      setNudge(true)
      setPassword('')
      inputRef.current?.focus()
    } catch (err) {
      // 429 = IP diblokir 15 menit setelah 5 percobaan gagal (checkLoginRate)
      if (err?.status === 429) {
        setLocked(true)
        setError('Akses dibekukan 15 menit — terlalu banyak percobaan')
      } else if (err?.status === 401) {
        setError('Kunci tidak dikenali')
      } else {
        setError(err?.message || 'Tidak bisa menghubungi server')
      }
      setNudge(true)
      setPassword('')
      inputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh relative flex flex-col bg-[var(--paper)] text-[var(--ink)] overflow-hidden">
      <div className="bg-field" />
      <div className="bg-grain" />
      <div className="bg-vignette" />

      {/* ══ bilah atas: identitas + saklar mode ══ */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5
        border-b-[var(--bw)] border-[var(--edge)] bg-[var(--plate-fill)]">
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="badge-h inline-grid! w-[22px] h-[22px] !border-[2px] !rounded-[var(--r-xs)] text-[10px]">H</span>
          <span className="kicker !text-[9px] truncate">SWHDHLZ · AREA TERBATAS</span>
        </span>
        <button onClick={toggle} aria-label="Ganti mode tampilan"
          className="ibtn !w-9 !h-9 !rounded-[var(--r-soft)] shrink-0">
          <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'} text-[11px]`} />
        </button>
      </header>

      <main className="relative z-10 flex-1 grid place-items-center px-4 py-8 sm:py-12">
        <div onAnimationEnd={e => { if (e.animationName === 'nudge') setNudge(false) }}
          className={`w-full max-w-[420px] anim-entrance ${nudge ? 'nudge' : ''}`}>

          {/* ══ nomor seri + judul, di luar plat (seperti label arsip) ══ */}
          <div className="flex items-end justify-between gap-3 mb-3 px-0.5">
            <div className="min-w-0">
              <p className="kicker !text-[9px] mb-1.5">GERBANG 01 / KONSOL</p>
              <h1 className="display-m">MASUK<br />KONSOL</h1>
            </div>
            <span className="relative w-12 h-12 shrink-0 grid place-items-center rounded-[var(--r-soft)]
              border-[var(--bw)] border-[var(--edge)] bg-wa stack-shadow">
              <i className="fa-solid fa-shield-halved text-[16px] text-[#06180d]" />
              <span className="stamp-ring" style={{ '--ring-inset': '-5px', '--ring-max': 1.18 }} />
            </span>
          </div>

          <form onSubmit={submit} className="plate p-5 sm:p-6 space-y-4">

            {/* ── baris kunci ── */}
            <div>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <label htmlFor="adm-key" className="kicker !text-[9px] !text-[var(--ink)]">
                  KUNCI AKSES
                </label>
                <span className="kicker !text-[8px] !tracking-[0.18em]">WAJIB</span>
              </div>

              <div className="relative">
                <input
                  ref={inputRef}
                  id="adm-key"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (error) setError('') }}
                  onKeyUp={e => setCaps(e.getModifierState?.('CapsLock') ?? false)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  disabled={locked}
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? 'adm-err' : undefined}
                  className="inp !pr-12 !py-3 !text-[13px] !tracking-[0.12em]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Sembunyikan kunci' : 'Tampilkan kunci'}
                  className="btn btn-icon absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--ink-2)] hover:text-[var(--ink)]"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-[12px]`} />
                </button>
              </div>

              {caps && !locked && (
                <p className="kicker !text-[8px] !text-[var(--hot)] mt-2 anim-fade">
                  <i className="fa-solid fa-arrow-up mr-1" />CAPS LOCK AKTIF
                </p>
              )}
            </div>

            {error && (
              <div id="adm-err" role="alert" className="ticket !py-2.5">
                <span className="ticket-notch" />
                <i className={`fa-solid ${locked ? 'fa-lock' : 'fa-circle-exclamation'} text-[var(--hot)] text-[12px] shrink-0`} />
                <span className="text-[11px] font-bold leading-snug">{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading || locked || !password} aria-busy={loading}
              className="btn btn-wa w-full !py-3.5 disabled:opacity-45 disabled:pointer-events-none">
              <span className="btn-cap">
                <i className={`fa-solid ${loading ? 'fa-circle-notch fa-spin' : locked ? 'fa-ban' : 'fa-arrow-right'} text-[9px]`} />
              </span>
              {loading ? 'MEMERIKSA…' : locked ? 'DIBEKUKAN' : 'BUKA KONSOL'}
            </button>

            <div className="rule" />

            <ul className="grid grid-cols-3 gap-2">
              {[
                ['fa-lock', 'BEARER'],
                ['fa-user-shield', 'SSH ROOT'],
                ['fa-gauge-high', '5 COBA'],
              ].map(([ico, txt]) => (
                <li key={txt} className="flex flex-col items-center gap-1.5 py-2.5 rounded-[var(--r-soft)]
                  border-[var(--bw)] border-[var(--edge)] bg-[var(--paper-2)]">
                  <i className={`fa-solid ${ico} text-[11px] text-[var(--ink-2)]`} />
                  <span className="kicker !text-[7px] !tracking-[0.14em]">{txt}</span>
                </li>
              ))}
            </ul>
          </form>

          <p className="kicker !text-[8px] text-center mt-4">
            SESI KEDALUWARSA 24 JAM · DIBUAT OLEH HILLZ
          </p>
        </div>
      </main>

      {/* ══ pita bawah: menautkan login ke bahasa gerak situs ══ */}
      <div className="relative z-10 shrink-0" style={{ '--vel': 0 }}>
        <div className="vel-band">
          <div className="vel-track" style={{ '--dur': '34s' }}>
            {[0, 1].map(dup => (
              <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
                {['KONSOL HOST', 'AKSES TERBATAS', 'SWHDHLZ', 'BEARER AUTH', 'BY HILLZ'].map((t, i) => (
                  <span key={dup + '-' + i} className="vel-item !text-[12px] !py-2">
                    <span className="vel-dot" />{t}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
