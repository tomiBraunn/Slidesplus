import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import './i18n'
import App from './App.tsx'
import { getAuthToken } from './utils/getAuthToken'
import { urlbackend } from './config.js'
import { initAnalytics } from './analytics'

// Inicializa Google Analytics 4 (no-op si VITE_GA_ID no está configurado).
initAnalytics()

// Wrap fetch to automatically attach Authorization header for backend requests
const originalFetch = window.fetch.bind(window)
window.fetch = async (input: RequestInfo, init?: RequestInit) => {
  try {
    const url = typeof input === 'string' ? input : (input as Request).url
    if (url && url.startsWith(urlbackend)) {
      const headers = new Headers(init?.headers || (typeof input !== 'string' && (input as Request).headers ? (input as Request).headers : undefined))
      if (!headers.has('Authorization')) {
        const token = await getAuthToken()
        if (token) headers.set('Authorization', `Bearer ${token}`)
      }
      const newInit = { ...(init || {}), headers }
      return originalFetch(input, newInit)
    }
  } catch (e) {
    console.error('fetch wrapper error', e)
  }
  return originalFetch(input, init)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster position="bottom-right" richColors closeButton />
  </StrictMode>,
)
