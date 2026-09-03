'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

/* ══════════════════════════════════════════════════════════════
   MOTION SYSTEM — dipakai halaman uploader & panel admin.
   Tanpa dependensi baru: rAF + IntersectionObserver saja.
   Semua efek mati sendiri kalau user minta reduced-motion.
   ══════════════════════════════════════════════════════════════ */

export function prefersReduced() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false
}

/* ── 1. VELOCITY SCROLL ──────────────────────────────────────────
   Menulis 3 variabel ke <html>:
     --vel   : -1..1  (arah + kecepatan, dipakai skew marquee)
     --velabs: 0..1   (besaran, dipakai blur/gap)
     --sy    : offset scroll px (parallax murah)
   Satu rAF loop untuk seluruh halaman, bukan per komponen.        */
export function useVelocityScroll() {
  useEffect(() => {
    if (prefersReduced()) return
    const root = document.documentElement
    let last = window.scrollY
    let vel = 0
    let raf = 0
    let idle = 0

    const loop = () => {
      const y = window.scrollY
      const dy = y - last
      last = y
      // low-pass filter supaya nilainya tidak gemetar
      vel += (dy - vel) * 0.18
      const clamped = Math.max(-1, Math.min(1, vel / 26))
      root.style.setProperty('--vel', clamped.toFixed(3))
      root.style.setProperty('--velabs', Math.abs(clamped).toFixed(3))
      root.style.setProperty('--sy', y.toFixed(1) + 'px')
      // berhenti kalau benar-benar diam: hemat baterai
      if (Math.abs(dy) < 0.05 && Math.abs(vel) < 0.02) {
        idle++
        if (idle > 40) { raf = 0; return }
      } else idle = 0
      raf = requestAnimationFrame(loop)
    }

    const kick = () => { if (!raf) { idle = 0; raf = requestAnimationFrame(loop) } }
    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('touchmove', kick, { passive: true })
    kick()
    return () => {
      window.removeEventListener('scroll', kick)
      window.removeEventListener('touchmove', kick)
      if (raf) cancelAnimationFrame(raf)
      root.style.removeProperty('--vel')
      root.style.removeProperty('--velabs')
      root.style.removeProperty('--sy')
    }
  }, [])
}

/* ── 1b. MARQUEE REAKTIF-KECEPATAN (posisi, bukan durasi) ────────
   JANGAN memodulasi `animation-duration` untuk membuat marquee ikut scroll.
   Progres animasi CSS = waktu-lokal / durasi, jadi begitu durasinya berubah
   di tengah jalan, posisinya dihitung ulang dan MELOMPAT. Itu terukur:
   durasi berayun antara 16s dan 48s, lompatan posisi sampai 243px dalam satu
   frame padahal laju normalnya ~6px.

   Di sini posisi digeser sendiri tiap frame. Kecepatan = laju dasar +
   kontribusi kecepatan scroll, dijepit dan dihaluskan. Karena yang berubah
   cuma laju (bukan fase), tidak ada satu pun lompatan yang mungkin terjadi. */
export function useVelocityMarquee(speed = 42, boost = 150) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReduced()) { el.style.transform = 'translate3d(0,0,0)'; return }

    const root = document.documentElement
    let pos = 0
    let half = 0
    let raf = 0
    let prev = performance.now()
    let smooth = 0

    const measure = () => { half = el.scrollWidth / 2 }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)

    const dir = el.dataset.dir === 'rev' ? -1 : 1

    const loop = (now) => {
      const dt = Math.min(0.05, (now - prev) / 1000) // jepit lonjakan saat tab kembali aktif
      prev = now
      const vel = parseFloat(root.style.getPropertyValue('--vel') || '0') || 0
      // haluskan supaya perubahan laju terasa seperti inersia, bukan sentakan
      smooth += (vel - smooth) * 0.08
      const px = (speed + Math.abs(smooth) * boost) * dt
      pos -= dir * px
      if (half > 0) {
        // modulo dua arah: aman untuk arah maju maupun balik
        if (pos <= -half) pos += half
        else if (pos >= 0) pos -= half
      }
      el.style.transform = `translate3d(${pos.toFixed(2)}px,0,0)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [speed, boost])
  return ref
}

/* ── 2. REVEAL SAAT MASUK VIEWPORT ───────────────────────────────
   Elemen ber-atribut [data-reveal] dapat data-reveal="in" sekali,
   tidak diputar ulang saat scroll balik.                          */
export function useReveal(deps = []) {
  useEffect(() => {
    const reduced = prefersReduced()
    // Penanda disimpan di WeakSet lokal effect, BUKAN di dataset DOM.
    // Sebelumnya pakai data-reveal-watch: saat `settings` datang, effect
    // re-run → observer lama di-disconnect, tapi node yang sudah bertanda
    // dilewati scan baru → tidak ada yang mengawasinya → macet opacity:0.
    const watched = new WeakSet()
    const io = reduced ? null : new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return
        if (e.target.getAttribute('data-reveal') === 'x') e.target.setAttribute('data-reveal-state', 'in')
        e.target.setAttribute('data-reveal', 'in')
        io.unobserve(e.target)
      })
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' })

    const show = (n) => {
      if (n.getAttribute('data-reveal') === 'in') return
      if (n.getAttribute('data-reveal') === 'x') n.setAttribute('data-reveal-state', 'in')
      n.setAttribute('data-reveal', 'in')
      io?.unobserve(n)
    }

    const scan = () => {
      document.querySelectorAll('[data-reveal=""], [data-reveal="x"]').forEach(n => {
        if (reduced) { show(n); return }
        if (watched.has(n)) return
        watched.add(n)
        io.observe(n)
        // Jaring aman: elemen yang sudah tergulir lewat (mis. muncul setelah
        // fetch saat user sudah di bawah) tidak akan pernah memicu observer.
        if (n.getBoundingClientRect().bottom < 0) show(n)
      })
    }
    scan()

    // ── Jaring aman kedua: sweep berbasis rect ──────────────────────────────
    // IntersectionObserver hanya dikirim saat compositor menghasilkan frame.
    // Di lingkungan tanpa frame (capture headless, tab background, WebView
    // hemat daya) callback-nya bisa tidak pernah datang → seluruh isi halaman
    // nyangkut di opacity:0. Sweep ini menghitung posisi sendiri, jadi konten
    // yang berada di dalam viewport selalu tampil walau observer bungkam.
    const sweep = () => {
      if (reduced) return
      document.querySelectorAll('[data-reveal=""], [data-reveal="x"]').forEach(n => {
        const r = n.getBoundingClientRect()
        if (r.top < innerHeight + 120 && r.bottom > -120) show(n)
      })
    }
    const t1 = setTimeout(sweep, 900)
    const t2 = setTimeout(sweep, 2200)
    let t3 = 0
    const onScroll = () => { clearTimeout(t3); t3 = setTimeout(sweep, 140) }
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll, { passive: true })

    // Komponen yang muncul belakangan (statistik setelah fetch, panel setelah
    // toggle) harus ikut ter-reveal — kalau tidak, elemennya tinggal opacity:0.
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      removeEventListener('scroll', onScroll)
      removeEventListener('resize', onScroll)
      mo.disconnect(); io?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/* ── 3. TILT 3D IKUT POINTER ─────────────────────────────────────
   Dipakai logo hero. Di HP tidak ada pointer → tetap ada animasi
   idle dari CSS, jadi tidak mati total.                           */
export function useTilt(max = 15) {
  const ref = useRef(null)
  const onMove = useCallback((e) => {
    const el = ref.current
    if (!el || prefersReduced()) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    // Logo kini balok box-shadow (2D-sejati), jadi tilt 3D tidak berlaku:
    // yang digerakkan adalah rotasi bidang + angkat halus. Rotasi 3D dulu
    // memecah sudut membulat dan bikin notch di sudut ekstrusi.
    // Rotasi DIHILANGKAN: memutar bidang juga memutar rantai box-shadow,
    // sudut ekstrusi jadi bukan 45° dan blok pecah jadi dua strip. Yang
    // tersisa: angkat halus mengikuti posisi kursor.
    el.style.setProperty('--ty', (-4 - Math.abs(x) * 3).toFixed(1) + 'px')
    el.style.animationPlayState = 'paused'
  }, [max])
  const onLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.removeProperty('--ty')
    el.style.animationPlayState = 'running'
  }, [])
  return { ref, onPointerMove: onMove, onPointerLeave: onLeave }
}

/* ── 4. TEMA: TERANG / GELAP ─────────────────────────────────────
   Nilai awal sudah dipasang skrip boot di layout.jsx (anti-kedip).
   Hook ini hanya membaca ulang + menyediakan toggle.
   `serverDefault` dari admin dipakai HANYA kalau user belum pernah
   memilih sendiri — pilihan user selalu menang.                    */
const LS_THEME = 'sw_theme'

export function useTheme(serverDefault) {
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    const saved = localStorage.getItem(LS_THEME)
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
      return
    }
    // Belum pernah memilih → TERANG, titik. `system` sengaja tidak lagi
    // dipetakan ke prefers-color-scheme: itu yang dulu membuat pengunjung
    // ber-HP dark mode mendarat di versi gelap tanpa pernah memilihnya.
    // Hanya admin yang eksplisit memilih 'dark' bisa menggeser default.
    let next = serverDefault === 'dark' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }, [serverDefault])

  /* Transisi tema: lingkaran yang menyapu keluar dari tombol yang diklik.
     Dipakai View Transitions API kalau ada (Chrome/Edge/Safari 18) — di
     situlah snapshot lama & baru bisa di-clip-path tanpa merender dua kali.
     Kalau tidak didukung, jatuh ke cross-fade selubung: satu lapis warna
     tema baru dikembangkan lalu dilepas. Keduanya menghormati
     prefers-reduced-motion: ganti seketika, tanpa animasi. */
  const toggle = useCallback((ev) => {
    const next = (theme === 'dark') ? 'light' : 'dark'
    const apply = () => {
      document.documentElement.setAttribute('data-theme', next)
      try { localStorage.setItem(LS_THEME, next) } catch {}
      setTheme(next)
    }

    if (prefersReduced()) { apply(); return }

    // Titik pusat = tombol yang diklik; fallback ke sudut kanan-atas navbar.
    const src = ev?.currentTarget?.getBoundingClientRect?.()
    const cx = src ? src.left + src.width / 2 : window.innerWidth - 40
    const cy = src ? src.top + src.height / 2 : 40
    const r = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy))

    const root = document.documentElement

    if (typeof document.startViewTransition === 'function') {
      root.dataset.vtTheme = '1'
      const vt = document.startViewTransition(() => { apply() })
      vt.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${r}px at ${cx}px ${cy}px)`] },
          { duration: 620, easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)' }
        )
      }).catch(() => {})
      vt.finished.then(() => { delete root.dataset.vtTheme }).catch(() => { delete root.dataset.vtTheme })
      return
    }

    // Fallback: selubung warna tema tujuan mengembang dari tombol, tema
    // ditukar di puncak animasi, lalu selubung memudar.
    const veil = document.createElement('div')
    veil.className = 'theme-veil'
    veil.style.setProperty('--vx', cx + 'px')
    veil.style.setProperty('--vy', cy + 'px')
    veil.style.setProperty('--vr', r + 'px')
    veil.dataset.to = next
    document.body.appendChild(veil)
    const grow = veil.animate(
      { clipPath: [`circle(0px at ${cx}px ${cy}px)`, `circle(${r}px at ${cx}px ${cy}px)`] },
      { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
    )
    grow.finished.then(() => {
      apply()
      return veil.animate({ opacity: [1, 0] },
        { duration: 300, easing: 'ease-out', fill: 'forwards' }).finished
    }).then(() => veil.remove()).catch(() => veil.remove())
  }, [theme])

  return { theme, toggle, isDark: theme === 'dark' }
}

/* ── 5. ANGKA MENGGULIR ──────────────────────────────────────────
   Statistik naik dari 0 ke nilai target sekali saat pertama tampil. */
export function useCountUp(value, ms = 900) {
  const [n, setN] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const target = Number(value) || 0
    if (prefersReduced()) { setN(target); from.current = target; return }
    const start = performance.now()
    const a = from.current
    let raf = 0
    const step = (t) => {
      const p = Math.min(1, (t - start) / ms)
      const e = 1 - Math.pow(1 - p, 3)
      setN(Math.round(a + (target - a) * e))
      if (p < 1) raf = requestAnimationFrame(step)
      else from.current = target
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return n
}
