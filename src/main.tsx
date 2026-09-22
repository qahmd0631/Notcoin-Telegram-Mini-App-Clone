import React from 'react'
import ReactDOM from 'react-dom/client'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import App from './App.tsx'
import './index.css'

const tonManifestUrl = typeof window !== 'undefined' && window.location?.origin
  ? `${window.location.origin}/tonconnect-manifest.json`
  : 'https://your-vercel-domain.vercel.app/tonconnect-manifest.json'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={tonManifestUrl}>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>,
)
