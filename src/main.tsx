import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ToastContainer } from './components/notifications/ToastContainer'
import './index.css'

function normalizeLegacyHash() {
  const legacyRoute = window.location.hash.slice(1)
  if (!legacyRoute || legacyRoute.startsWith('/')) return

  const [legacyPath, ...queryParts] = legacyRoute.split('?')
  const path = legacyPath === 'home' ? '/' : `/${legacyPath}`
  const query = queryParts.length ? `?${queryParts.join('?')}` : ''
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${path}${query}`)
}

normalizeLegacyHash()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
    <ToastContainer />
  </React.StrictMode>,
)
