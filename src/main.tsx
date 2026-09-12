import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@honickman/ui'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* Internal PCNY tool, so the brand is fixed rather than switchable.
        A version for another bottler would be its own app declaring its own
        brand here — not a runtime switch users can change. */}
    <ThemeProvider brand="pcny">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
