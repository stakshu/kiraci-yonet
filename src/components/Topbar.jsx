/* ── KiraciYonet — Topbar ── */
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'

/* ── Route baslik eslestirmesi ── */
const ROUTE_TITLES = {
  '/properties': 'Mulklerim',
  '/tenants/list': 'Kiracilar',
  '/payments/rent': 'Kira Odemeleri',
  '/payments/overdue': 'Geciken Odemeler',
  '/payments/history': 'Odeme Gecmisi',
  '/expenses': 'Giderler',
  '/accounting': 'Muhasebe',
  '/documents': 'Belgeler',
  '/settings': 'Ayarlar'
}

export default function Topbar({ pathname }) {
  const { user, signOut } = useAuth()
  const { showToast } = useToast()

  const title = ROUTE_TITLES[pathname] || (pathname.startsWith('/properties/') ? 'Mulk Detay' : 'Mulklerim')

  const handleLogout = async () => {
    try {
      await signOut()
      showToast('Basariyla cikis yapildi.')
    } catch (err) {
      showToast('Cikis hatasi: ' + err.message, 'error')
    }
  }

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-actions">
        <button className="topbar-icon-btn" title="Tam ekran">
          <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        </button>
        <button className="topbar-icon-btn" title="Bildirimler">
          <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </button>
        <button className="btn btn-outline">
          <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CSV Indir
        </button>
        <button className="btn btn-primary">
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Yeni Ekle
        </button>

        {user && (
          <div className="user-info">
            <span className="user-email">{user.email}</span>
            <button className="logout-btn" onClick={handleLogout}>
              <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Cikis
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
