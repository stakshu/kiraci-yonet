/* ── KiraciYonet — Ana Uygulama ──
 *
 * Tüm sayfa bileşenleri React.lazy ile dinamik import edilir; her sayfa
 * kendi chunk'ında inadir, ilk yükleme paketinden çıkar. Geçişlerde
 * Suspense bir spinner gösterir — typically <100ms cache'lendikten sonra.
 */
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import AuthOverlay from './components/AuthOverlay'
import MfaChallenge from './components/MfaChallenge'
import ErrorBoundary from './components/ErrorBoundary'

const Dashboard         = lazy(() => import('./pages/Dashboard'))
const Properties        = lazy(() => import('./pages/Properties'))
const PropertyDetail    = lazy(() => import('./pages/PropertyDetail'))
const BuildingDetail    = lazy(() => import('./pages/BuildingDetail'))
const TenantsList       = lazy(() => import('./pages/TenantsList'))
const TenantDetail      = lazy(() => import('./pages/TenantDetail'))
const RentPayments      = lazy(() => import('./pages/RentPayments'))
const OverduePayments   = lazy(() => import('./pages/OverduePayments'))
const PaymentHistory    = lazy(() => import('./pages/PaymentHistory'))
const Expenses          = lazy(() => import('./pages/Expenses'))
const MaintenanceIssues = lazy(() => import('./pages/MaintenanceIssues'))
const Accounting        = lazy(() => import('./pages/Accounting'))
const Settings          = lazy(() => import('./pages/Settings'))
const EmptyPage         = lazy(() => import('./pages/EmptyPage'))

const Spinner = () => (
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

const RouteSpinner = () => (
  <div style={{
    minHeight: 'calc(100vh - 80px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      border: '2.5px solid #025864', borderTopColor: 'transparent',
      animation: 'kysSpin 0.9s linear infinite',
    }} />
  </div>
)

/* ── Auth korumasi ── */
function ProtectedApp() {
  const { user, loading, mfaPending } = useAuth()

  if (loading) return <Spinner />
  if (!user) return <AuthOverlay />
  if (mfaPending) return <MfaChallenge />

  return (
    <Suspense fallback={<RouteSpinner />}>
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
    </Suspense>
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
