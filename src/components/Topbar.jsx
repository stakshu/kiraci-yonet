/* ── KiraciYonet — Topbar ── */
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from './Toast'
import { Sun, Moon, LogOut } from 'lucide-react'

const ROUTE_TITLES = {
  '/dashboard': 'Ozet',
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
  const { theme, toggleTheme } = useTheme()
  const { showToast } = useToast()

  const title = ROUTE_TITLES[pathname] || (pathname.startsWith('/properties/') ? 'Mulk Detay' : pathname.startsWith('/tenants/list/') ? 'Kiraci Detay' : 'Mulklerim')

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
        <button
          className="topbar-icon-btn"
          title={theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
          onClick={toggleTheme}
        >
          {theme === 'dark'
            ? <Sun className="w-[16px] h-[16px]" />
            : <Moon className="w-[16px] h-[16px]" />
          }
        </button>

        {user && (
          <div className="user-info">
            <span className="user-email">{user.email}</span>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut className="w-[14px] h-[14px]" />
              Cikis
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
