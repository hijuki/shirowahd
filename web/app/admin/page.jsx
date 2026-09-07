'use client'
import { useEffect, useState } from 'react'
import Login from '@/components/admin/Login'
import Layout from '@/components/admin/Layout'
import Dashboard from '@/components/admin/Dashboard'
import Files from '@/components/admin/Files'
import Settings from '@/components/admin/Settings'
import Security from '@/components/admin/Security'
import Bot from '@/components/admin/Bot'
import PluginsManager from '@/components/admin/PluginsManager'
import Toasts, { useToasts } from '@/components/up/Toasts'

const pages = { dashboard: Dashboard, files: Files, plugins: PluginsManager, settings: Settings, security: Security, bot: Bot }

export default function AdminPage() {
  const [mounted, setMounted] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const { toasts, add: toast } = useToasts()

  // localStorage tidak ada saat SSR di server Next.js.
  // Tunggu client mount sebelum mengevaluasi status login agar tidak ada flicker/bug.
  useEffect(() => {
    setMounted(true)
    setAuthed(!!localStorage.getItem('admin_token'))
  }, [])

  const Page = pages[tab] || Dashboard

  // Sebelum mount selesai di browser, tampilkan shell netral tanpa flicker ke login
  if (!mounted) {
    return null
  }

  return (
    <>
      <Toasts toasts={toasts} />
      {authed
        ? <Layout active={tab} setActive={setTab}><Page toast={toast} /></Layout>
        : <Login onSuccess={() => setAuthed(true)} />}
    </>
  )
}
