import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'

const AdminApp = React.lazy(() => import('../../admin/src/AdminApp.jsx'))

const bootstrap = async () => {
  const isAdmin = window.location.pathname.startsWith('/admin')
  document.documentElement.dataset.app = isAdmin ? 'admin' : 'frontend'
  if (isAdmin) await import('../../admin/src/index.css')
  else await import('./index.css')

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={null}>
                <AdminApp />
              </Suspense>
            }
          />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>,
  )
}

bootstrap()
