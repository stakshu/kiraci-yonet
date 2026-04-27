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

/* Yeni deploy sonrası eski tarayıcı tab'ı eski chunk hash'lerini ister
 * (örn. Accounting-OLD.js) ama Vercel'de artık YENI hash var → 404 → import
 * fail. Tek seferlik bir reload yeni bundle'ı çeker; bunu otomatik yapıyoruz.
 * sessionStorage flag'i ile sonsuz döngü engelleniyor. */
const lazyWithReload = (importFn) => lazy(async () => {
  try {
    return await importFn()
  } catch (err) {
    const msg = String(err?.message || err)
    const looksLikeStaleChunk =
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /Loading chunk \d+ failed/i.test(msg) ||
      /Importing a module script failed/i.test(msg)
    if (looksLikeStaleChunk) {
      const k = '__kys_chunk_reload__'
      if (!sessionStorage.getItem(k)) {
        sessionStorage.setItem(k, '1')
        window.location.reload()
        // Reload tetikleniyor — React'a hiçbir şey döndürme
        return { default: () => null }
      }
    }
    throw err
  }
})

const Dashboard         = lazyWithReload(() => import('./pages/Dashboard'))
const Properties        = lazyWithReload(() => import('./pages/Properties'))
const PropertyDetail    = lazyWithReload(() => import('./pages/PropertyDetail'))
const BuildingDetail    = lazyWithReload(() => import('./pages/BuildingDetail'))
const TenantsList       = lazyWithReload(() => import('./pages/TenantsList'))
const TenantDetail      = lazyWithReload(() => import('./pages/TenantDetail'))
const RentPayments      = lazyWithReload(() => import('./pages/RentPayments'))
const OverduePayments   = lazyWithReload(() => import('./pages/OverduePayments'))
const PaymentHistory    = lazyWithReload(() => import('./pages/PaymentHistory'))
const Expenses          = lazyWithReload(() => import('./pages/Expenses'))
const MaintenanceIssues = lazyWithReload(() => import('./pages/MaintenanceIssues'))
const Accounting        = lazyWithReload(() => import('./pages/Accounting'))
const Settings          = lazyWithReload(() => import('./pages/Settings'))
const EmptyPage         = lazyWithReload(() => import('./pages/EmptyPage'))

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
