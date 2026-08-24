import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loadSettings as fetchSettings } from './api'

const Ctx = createContext(null)
export const useSettings = () => useContext(Ctx)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null)
  const [error, setError] = useState(null)
  const reload = useCallback(() => {
    fetchSettings().then(setSettings).catch(e => setError(e.message))
  }, [])
  useEffect(reload, [reload])
  return <Ctx.Provider value={{ settings, error, reload }}>{children}</Ctx.Provider>
}
