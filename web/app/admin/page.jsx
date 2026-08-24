'use client'
import { useEffect, useState } from 'react'
import Login from '@/components/admin/Login'
import Layout from '@/components/admin/Layout'
import Dashboard from '@/components/admin/Dashboard'
import Files from '@/components/admin/Files'
import Settings from '@/components/admin/Settings'
import Security from '@/components/admin/Security'
import Bot from '@/components/admin/Bot'
import Toasts, { useToasts } from '@/components/up/Toasts'

const pages = { dashboard: Dashboard, files: Files, settings: Settings, security: Security, bot: Bot }

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const { toasts, add: toast } = useToasts()

  // localStorage is unavailable during SSR; read on mount
  useEffect(() => {
    setAuthed(!!localStorage.getItem('admin_token'))
    const iv = setInterval(() => {
      if (!localStorage.getItem('admin_token')) setAuthed(false)
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  const Page = pages[tab] || Dashboard
  return (
    <>
      <Toasts toasts={toasts} />
      {authed
        ? <Layout active={tab} setActive={setTab}><Page toast={toast} /></Layout>
        : <Login onSuccess={() => setAuthed(true)} />}
    </>
  )
}
