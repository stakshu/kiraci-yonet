/* ── KiraciYonet — Ana Uygulama ── */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import AuthOverlay from './components/AuthOverlay'
import Properties from './pages/Properties'
import PropertyDetail from './pages/PropertyDetail'
import BuildingDetail from './pages/BuildingDetail'
import TenantsList from './pages/TenantsList'
import TenantDetail from './pages/TenantDetail'
import RentPayments from './pages/RentPayments'
import OverduePayments from './pages/OverduePayments'
import PaymentHistory from './pages/PaymentHistory'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Accounting from './pages/Accounting'
import EmptyPage from './pages/EmptyPage'

/* ── Auth korumasi ── */
function ProtectedApp() {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <AuthOverlay />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/properties/building/:id" element={<BuildingDetail />} />
        <Route path="/properties/:id" element={<PropertyDetail />} />
        <Route path="/apartments/list" element={<Navigate to="/properties" replace />} />
        <Route path="/tenants/list" element={<TenantsList />} />
        <Route path="/tenants/list/:id" element={<TenantDetail />} />
        <Route path="/payments/rent" element={<RentPayments />} />
        <Route path="/payments/overdue" element={<OverduePayments />} />
        <Route path="/payments/history" element={<PaymentHistory />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/accounting" element={<Accounting />} />
        <Route path="/documents" element={<EmptyPage path="/documents" />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <ProtectedApp />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
