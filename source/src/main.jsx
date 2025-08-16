
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log('🚀 React main.jsx is loading...')
console.log('📍 Current location:', window.location.href)
console.log('🔧 Environment:', import.meta.env.MODE)

// Check if root element exists
const rootElement = document.getElementById('root')
if (rootElement) {
  console.log('✅ Root element found, mounting React app...')
  
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  
  console.log('✅ React app mounted successfully!')
} else {
  console.error('❌ Root element not found!')
}