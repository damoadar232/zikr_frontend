import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ToastContainer } from './components/notifications/ToastContainer'
import './index.css'

const legacyRouteRoots = new Set([
  'about', 'about-us', 'admin', 'admin-edit', 'audio', 'audio-detail', 'book-detail', 'book-reader',
  'contact', 'contact-us', 'copyright-policy', 'ebooks', 'home', 'login', 'lyric-detail',
  'lyrics', 'lyrics-artists', 'lyrics-books', 'lyrics-category', 'lyrics-languages',
  'lyrics-poets', 'lyrics-subjects', 'para', 'privacy-policy', 'quran', 'quran-topics',
  'register', 'services', 'surah-read', 'surahs', 'terms-and-conditions',
])

function normalizeLegacyHash() {
  const legacyRoute = window.location.hash.slice(1)
  if (!legacyRoute) return

  const [legacyPath, ...queryParts] = legacyRoute.replace(/^\/+/, '').split('?')
  if (!legacyRouteRoots.has(legacyPath.split('/')[0] || '')) return
  const path = !legacyPath || legacyPath === 'home' ? '/' : `/${legacyPath}`
  const query = queryParts.length ? `?${queryParts.join('?')}` : ''
  window.history.replaceState(window.history.state, '', `${path}${query}`)
}

normalizeLegacyHash()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <ToastContainer />
  </React.StrictMode>,
)
