/* ── KiraciYonet — Ana Uygulama ── */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import AuthOverlay from './components/AuthOverlay'
import MfaChallenge from './components/MfaChallenge'
import ErrorBoundary from './components/ErrorBoundary'
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
import MaintenanceIssues from './pages/MaintenanceIssues'
import Accounting from './pages/Accounting'
import Settings from './pages/Settings'
import EmptyPage from './pages/EmptyPage'

/* ── Auth korumasi ── */
function ProtectedApp() {
  const { user, loading, mfaPending } = useAuth()

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#F0F2F5',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid #025864', borderTopColor: 'transparent',
          animation: 'kysSpin 0.9s linear infinite',
        }} />
        <style>{`@keyframes kysSpin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!user) return <AuthOverlay />
  if (mfaPending) return <MfaChallenge />

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
        <Route path="/maintenance" element={<MaintenanceIssues />} />
        <Route path="/accounting" element={<Accounting />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/documents" element={<EmptyPage path="/documents" />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <ProtectedApp />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
