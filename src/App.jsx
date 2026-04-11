/* ── KiraciYonet — Ana Uygulama ── */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import AuthOverlay from './components/AuthOverlay'
import ApartmentsList from './pages/ApartmentsList'
import TenantsList from './pages/TenantsList'
import EmptyPage from './pages/EmptyPage'

/* ── Auth korumasi ── */
function ProtectedApp() {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <AuthOverlay />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/apartments/list" replace />} />
        <Route path="/apartments/list" element={<ApartmentsList />} />
        <Route path="/apartments/buildings" element={<EmptyPage path="/apartments/buildings" />} />
        <Route path="/tenants/list" element={<TenantsList />} />
        <Route path="/tenants/contracts" element={<EmptyPage path="/tenants/contracts" />} />
        <Route path="/tenants/evictions" element={<EmptyPage path="/tenants/evictions" />} />
        <Route path="/payments/rent" element={<EmptyPage path="/payments/rent" />} />
        <Route path="/payments/overdue" element={<EmptyPage path="/payments/overdue" />} />
        <Route path="/payments/history" element={<EmptyPage path="/payments/history" />} />
        <Route path="/expenses" element={<EmptyPage path="/expenses" />} />
        <Route path="/accounting" element={<EmptyPage path="/accounting" />} />
        <Route path="/documents" element={<EmptyPage path="/documents" />} />
        <Route path="/settings" element={<EmptyPage path="/settings" />} />
        <Route path="*" element={<Navigate to="/apartments/list" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ProtectedApp />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
