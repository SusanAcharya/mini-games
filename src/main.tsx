import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './parlor/App'

const rootElement = document.getElementById('root')!
createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Background music
const audio = new Audio('/assets/audio/neon-nexus.mp3')
audio.loop = true
audio.volume = 0.4
// Attempt autoplay; some browsers require user gesture. Fallback: start on first interaction
audio.play().catch(() => {
  const start = () => { audio.play().catch(()=>{}); window.removeEventListener('click', start); window.removeEventListener('keydown', start) }
  window.addEventListener('click', start)
  window.addEventListener('keydown', start)
})


