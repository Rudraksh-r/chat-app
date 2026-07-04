import React, { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import AppRoutes from './routes'
import useThemeStore from './store/themeStore'

export default function App() {
  const { initTheme, theme } = useThemeStore()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster theme={theme === 'dark' ? 'dark' : 'light'} position="top-right" richColors />
    </BrowserRouter>
  )
}
