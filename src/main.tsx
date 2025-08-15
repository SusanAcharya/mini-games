import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './parlor/App'

const rootElement = document.getElementById('root')!
createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)


