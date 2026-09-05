'use client'
import { useEffect, useRef, useState } from 'react'
import { pairBot, getPairState, resetBotSession, announceBot } from '@/lib/admin-api'

/**
 * Kartu Pairing — menautkan nomor WhatsApp dari panel, bukan dari terminal VPS.
 *
 * Kenapa polling, bukan sekali tembak: kode pairing lahir di proses bot beberapa
 * detik SETELAH tombol ditekan (bot harus boot dulu, lalu minta kode ke server
 * WhatsApp). Jadi tombol hanya memicu; kodenya datang belakangan lewat papan
 * status yang di-polling di sini.
 *
 * Polling dipercepat (2s) hanya saat sedang menunggu, dan melambat (10s) saat
 * idle/tersambung — supaya tidak membebani panel tanpa alasan.
 */
export default function Pairing({ toast }) {
  const [state, setState] = useState(null)
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [sisaDetik, setSisaDetik] = useState(0)
  const timerRef = useRef(null)

  const tahap = state?.utama?.tahap || 'idle'
  const menunggu = tahap === 'diminta' || tahap === 'kode-siap'
  const tersambung = !!state?.terhubung

  const muat = async () => {
    try { setState(await getPairState()) } catch { }
  }

  useEffect(() => {
    muat()
    const jeda = menunggu ? 2000 : 10000
    timerRef.current = setInterval(muat, jeda)
    return () => clearInterval(timerRef.current)
  }, [menunggu])

  // Hitung mundur umur kode. Kode WA hidup ~2-3 menit; tanpa hitungan ini admin
  // akan mencoba memasukkan kode mati lalu menyalahkan bot.
  useEffect(() => {
    if (tahap !== 'kode-siap') { setSisaDetik(0); return }
    const umur = Number(state?.utama?.umurKodeDetik || 0)
    setSisaDetik(Math.max(0, 180 - umur))
    const iv = setInterval(() => setSisaDetik(s => (s > 0 ? s - 1 : 0)), 1000)
    return () => clearInterval(iv)
  }, [tahap, state?.utama?.kodeDibuat])

  const doPair = async () => {
    const nomor = phone.replace(/\D/g, '')
    if (nomor.length < 10) return toast('Nomor minimal 10 digit, format 628xxx', 'warn')
    setBusy(true)
    try {
      const r = await pairBot(nomor)
      toast(r?.message || 'Bot dinyalakan, tunggu kode', 'success')
      setTimeout(muat, 3000)
    } catch (e) {
      // 409 = bot masih tersambung; itu penolakan yang disengaja, bukan error acak.
      if (e.status === 409) toast('Bot masih tersambung. Tekan "Ganti Nomor" dulu.', 'warn')
      else toast(`Error: ${e.message}`, 'error')
    }
    setBusy(false)
  }

  const doReset = async () => {
    if (!confirm('Hapus sesi bot? Bot akan terputus dan harus pairing ulang. Sesi lama dicadangkan otomatis.')) return
    setBusy(true)
    try {
      const r = await resetBotSession()
      toast(r?.message || 'Sesi dihapus', 'success')
      setTimeout(muat, 1500)
    } catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  const doAnnounce = async () => {
    setBusy(true)
    try {
      const r = await announceBot()
      toast(`Pengumuman terkirim ke ${r?.terkirim ?? 0} grup` + (r?.dilewati ? `, ${r.dilewati} dilewati` : ''), 'success')
    } catch (e) { toast(`Error: ${e.message}`, 'error') }
    setBusy(false)
  }

  const salinKode = async () => {
    const kode = state?.utama?.kode || ''
    if (!kode) return
    try {
      await navigator.clipboard.writeText(kode)
      toast('Kode disalin', 'success')
    } catch {
      // Clipboard API butuh HTTPS + gestur; fallback ke seleksi manual.
      toast('Salin manual: ' + kode, 'info')
    }
  }

  const badge = tersambung
    ? { t: 'TERSAMBUNG', c: 'bg-emerald-500/15 text-emerald-300', d: '#34d399' }
    : tahap === 'kode-siap'
      ? { t: 'MENUNGGU KODE DIMASUKKAN', c: 'bg-[var(--volt)]/15 text-[var(--volt)]', d: '#67e8f9' }
      : tahap === 'diminta'
        ? { t: 'MEMINTA KODE…', c: 'bg-[var(--volt)]/15 text-[var(--volt)]', d: '#67e8f9' }
        : tahap === 'gagal'
          ? { t: 'GAGAL', c: 'bg-bad/15 text-bad', d: '#fb7185' }
          : tahap === 'kadaluarsa'
            ? { t: 'KODE KADALUARSA', c: 'bg-[#fbbf24]/15 text-[#b45309]', d: '#fbbf24' }
            : { t: 'BELUM DITAUTKAN', c: 'bg-[var(--paper-2)] text-[var(--ink-2)]', d: '#7e90ad' }

  return (
    <div className="card p-6 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-base">
          <i className="fa-solid fa-mobile-screen text-[var(--volt)] mr-2" />Pairing Perangkat
        </h2>
        <span className={`chip px-2.5 py-0.5 text-[11px] flex items-center gap-1.5 ${badge.c}`}>
          <span className="w-[6px] h-[6px] rounded-full" style={{ background: badge.d, animation: menunggu ? 'pulseDot 1.7s infinite' : 'none' }} />
          {badge.t}
        </span>
      </div>

      {/* Keadaan proses bot dipisah dari keadaan WhatsApp: "bot mati" dan "bot
          hidup tapi belum tertaut" butuh tindakan berbeda. */}
      <p className="text-[var(--ink-2)] text-xs font-mono">
        Proses bot: {state?.pm2?.ada ? state.pm2.status : 'belum terdaftar'}
        {' · '}Sesi: {state?.hasSession ? 'ada' : 'belum ada'}
        {state?.user?.id ? ` · ${state.user.id.split(':')[0]}` : ''}
        {state?.user?.name ? ` (${state.user.name})` : ''}
      </p>

      {tersambung ? (
        <div className="rounded-[var(--r)] p-4 bg-emerald-500/[.07] border border-emerald-500/25 space-y-3">
          <p className="text-sm">
            <i className="fa-solid fa-circle-check text-emerald-400 mr-2" />
            Bot sudah tertaut ke <b className="font-mono">{state?.user?.id?.split(':')[0] || '—'}</b>. Tidak perlu pairing lagi.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={doAnnounce} disabled={busy} aria-busy={busy}
              className="btn btn-quiet">
              <i className="fa-solid fa-bullhorn mr-1.5" />Kirim ulang &quot;BOT ON&quot; ke grup
            </button>
            <button onClick={doReset} disabled={busy} aria-busy={busy}
              className="btn btn-danger">
              <i className="fa-solid fa-arrows-rotate mr-1.5" />Ganti Nomor (hapus sesi)
            </button>
          </div>
        </div>
      ) : (
        <>
          {tahap === 'kode-siap' && state?.utama?.kode ? (
            <div className="rounded-[var(--r)] p-5 bg-[var(--paper-2)] border border-[var(--volt)]/30 text-center space-y-3">
              <p className="text-[10px] font-bold tracking-[.2em] uppercase text-[var(--ink-2)]">Kode Pairing</p>
              <p className="font-mono font-bold tabular-nums select-all"
                style={{ fontSize: 'clamp(28px,9vw,44px)', letterSpacing: '.08em', color: 'var(--volt)' }}>
                {state.utama.kodeRapi || state.utama.kode}
              </p>
              <p className="text-[var(--ink-2)] text-xs">
                WhatsApp di HP <b>{state.utama.nomor}</b> → Perangkat Tertaut → Tautkan dengan nomor telepon
              </p>
              <p className="text-xs" style={{ color: sisaDetik > 30 ? 'var(--ink-2)' : '#fb7185' }}>
                <i className="fa-solid fa-clock mr-1.5" />
                {sisaDetik > 0 ? `Berlaku ±${sisaDetik}s lagi` : 'Kemungkinan sudah kadaluarsa — minta kode baru'}
              </p>
              <button onClick={salinKode}
                className="btn btn-quiet">
                <i className="fa-solid fa-copy mr-1.5" />Salin kode
              </button>
            </div>
          ) : tahap === 'diminta' ? (
            <div className="rounded-[var(--r)] p-4 bg-[var(--paper-2)] border border-[var(--edge)] text-sm text-[var(--ink-2)]">
              <i className="fa-solid fa-spinner fa-spin mr-2 text-[var(--volt)]" />
              Bot sedang boot dan meminta kode untuk <b className="font-mono">{state?.utama?.nomor}</b>. Biasanya 10-20 detik.
            </div>
          ) : null}

          {(tahap === 'gagal' || tahap === 'kadaluarsa') && state?.utama?.pesan && (
            <p className="text-sm text-bad"><i className="fa-solid fa-triangle-exclamation mr-1.5" />{state.utama.pesan}</p>
          )}

          <div className="space-y-2">
            <p className="text-[var(--ink-2)] text-sm">Nomor WhatsApp bot (format internasional, tanpa +)</p>
            <div className="flex gap-2">
              <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="628xxxxxxxxxx"
                inputMode="numeric" autoComplete="off" aria-label="Nomor WhatsApp bot"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), doPair())}
                className="flex-1 min-h-11 rounded-[var(--r-soft)] px-4 py-2.5 bg-[var(--paper-2)] border border-[var(--edge)] outline-none text-sm font-mono transition-colors duration-[150ms]" />
              <button onClick={doPair} disabled={busy || phone.replace(/\D/g, '').length < 10} aria-busy={busy}
                className="btn-primary min-h-11 text-sm disabled:opacity-50">
                <i className="fa-solid fa-link mr-1.5" />{menunggu ? 'Ulangi' : 'Pair'}
              </button>
            </div>
            <p className="text-[var(--ink-2)] text-xs">
              Menekan Pair akan menghapus sesi lama, menyalakan proses bot, dan menampilkan kode di sini.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
