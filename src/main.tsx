import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './core/i18n/index'
import './index.css'
import App from './App.tsx'
import { initSentry } from './core/monitoring/sentry'

initSentry()

// After a new deploy, content-hashed chunks are renamed while already-open tabs
// still reference the old filenames — so lazy navigation 404s. Vite fires
// `vite:preloadError`; reload once to pick up the fresh index.html + assets.
// The timestamp guard prevents a reload loop if the failure is genuine.
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'vitePreloadReloadAt'
  const last = Number(sessionStorage.getItem(KEY) ?? 0)
  if (Date.now() - last < 10_000) return
  sessionStorage.setItem(KEY, String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
