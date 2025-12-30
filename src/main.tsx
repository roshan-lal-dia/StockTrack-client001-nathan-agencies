import React from 'react'
import ReactDOM from 'react-dom/client'
// Import PWA install handler first to capture beforeinstallprompt before React mounts
import '@/lib/pwaInstall'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)