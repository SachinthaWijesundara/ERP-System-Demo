import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import App from './App.jsx'
import { DataProvider } from './data/DataContext.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DataProvider>
      <App />
    </DataProvider>
  </StrictMode>,
)
