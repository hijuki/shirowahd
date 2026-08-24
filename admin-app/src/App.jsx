import { useEffect, useState } from 'react'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Files from './pages/Files'
import Settings from './pages/Settings'
import Security from './pages/Security'
import Bot from './pages/Bot'

const pages = { dashboard: Dashboard, files: Files, settings: Settings, security: Security, bot: Bot }

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('admin_token'))
  const [tab, setTab] = useState('dashboard')

  // api.js clears admin_token on 401 and reloads; keep state in sync if token vanishes
  useEffect(() => {
    const iv = setInterval(() => {
      if (!localStorage.getItem('admin_token')) setAuthed(false)
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  const Page = pages[tab] || Dashboard
  return authed ? <Layout active={tab} setActive={setTab}><Page /></Layout> : <Login onSuccess={() => setAuthed(true)} />
}
