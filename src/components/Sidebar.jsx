/* ── KiraciYonet — Sidebar — Lucide + Motion ── */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import {
  LayoutDashboard, Building2, Users, CreditCard,
  DollarSign, BarChart3, FileText, HelpCircle,
  Home, PanelLeftClose, ChevronDown, LogOut
} from 'lucide-react'

const ICON_MAP = {
  dashboard: LayoutDashboard,
  building: Building2,
  users: Users,
  card: CreditCard,
  dollar: DollarSign,
  chart: BarChart3,
  file: FileText,
  help: HelpCircle,
  home: Home,
  collapse: PanelLeftClose
}

const NAV_SECTIONS = [
  {
    label: 'GENEL',
    items: [
      { text: 'Ozet', icon: 'dashboard', route: '/dashboard', tooltip: 'Ozet' },
      { text: 'Mulklerim', icon: 'building', route: '/properties', tooltip: 'Mulklerim' },
      { text: 'Kiracilar', icon: 'users', route: '/tenants/list', tooltip: 'Kiracilar' },
      { text: 'Odemeler', icon: 'card', route: '/payments/rent', tooltip: 'Odemeler' }
    ]
  },
  {
    label: 'YONETIM',
    items: [
      { text: 'Giderler', icon: 'dollar', route: '/expenses', tooltip: 'Giderler' },
      { text: 'Muhasebe', icon: 'chart', route: '/accounting', tooltip: 'Muhasebe' },
      { text: 'Belgeler', icon: 'file', route: '/documents', tooltip: 'Belgeler' }
    ]
  }
]

function Icon({ name, className }) {
  const LucideIcon = ICON_MAP[name]
  if (!LucideIcon) return null
  return <LucideIcon className={className} />
}

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { showToast } = useToast()
  const [openGroups, setOpenGroups] = useState({})

  const handleLogout = async () => {
    try {
      await signOut()
      showToast('Basariyla cikis yapildi.')
    } catch (err) {
      showToast('Cikis hatasi: ' + err.message, 'error')
    }
  }

  const currentPath = location.pathname
  const toggleGroup = (text) => setOpenGroups(prev => ({ ...prev, [text]: !prev[text] }))
  const goTo = (route) => navigate(route)
  const isActive = (route) => currentPath === route
  const isGroupActive = (children) => children?.some(c => currentPath === c.route)

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sb-logo">
        <motion.div
          className="sb-logo-icon"
          whileHover={{ scale: 1.08, rotate: 3 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <Home className="w-[18px] h-[18px] text-white" strokeWidth={2} />
        </motion.div>
        <span className="sb-logo-text">KiraciYonet</span>
        <button className="sb-collapse-btn" onClick={onToggleCollapse} title="Menuyu daralt">
          <PanelLeftClose className="w-[14px] h-[14px]" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sb-nav">
        {NAV_SECTIONS.map((section, si) => (
          <div className="nav-section" key={si}>
            {section.label && <div className="nav-label">{section.label}</div>}
            {section.items.map((item, ii) => {
              if (item.children) {
                const isOpen = openGroups[item.text] || isGroupActive(item.children)
                return (
                  <div className={`nav-group${isOpen ? ' open' : ''}`} key={ii}>
                    <a
                      className={`nav-item${isGroupActive(item.children) ? ' active' : ''}`}
                      data-tooltip={item.tooltip}
                      onClick={() => toggleGroup(item.text)}
                    >
                      <span className="nav-item-icon">
                        <Icon name={item.icon} className="w-[18px] h-[18px]" />
                      </span>
                      <span className="nav-item-text">{item.text}</span>
                      <ChevronDown className="nav-group-arrow" />
                    </a>
                    <div className="nav-sub">
                      {item.children.map((child, ci) => (
                        <a
                          key={ci}
                          className={`nav-sub-item${isActive(child.route) ? ' active' : ''}`}
                          onClick={() => goTo(child.route)}
                        >
                          {child.text}
                        </a>
                      ))}
                    </div>
                  </div>
                )
              }
              return (
                <motion.a
                  key={ii}
                  className={`nav-item${isActive(item.route) ? ' active' : ''}`}
                  data-tooltip={item.tooltip}
                  onClick={() => goTo(item.route)}
                  whileHover={{ x: 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <span className="nav-item-icon">
                    <Icon name={item.icon} className="w-[18px] h-[18px]" />
                  </span>
                  <span className="nav-item-text">{item.text}</span>
                </motion.a>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sb-bottom">
        <div className="nav-section" style={{ paddingBottom: 4 }}>
          <motion.a
            className="nav-item"
            data-tooltip="Yardim"
            whileHover={{ x: 2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <span className="nav-item-icon">
              <HelpCircle className="w-[18px] h-[18px]" />
            </span>
            <span className="nav-item-text">Yardim & Destek</span>
          </motion.a>
        </div>

        <div className="sb-user">
          <motion.div
            className="sb-user-avatar"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            KY
          </motion.div>
          <div className="sb-user-info">
            <div className="sb-user-name">{user ? user.email.split('@')[0] : 'Kullanici'}</div>
            <div className="sb-user-badge">
              {user ? (
                <><span className="inline-block w-2 h-2 rounded-full" style={{ background: '#00D47E' }} /> Cevrimici</>
              ) : (
                <><span className="inline-block w-2 h-2 rounded-full" style={{ background: '#94A3B8' }} /> Giris yapilmadi</>
              )}
            </div>
          </div>
          {user && (
            <motion.button
              type="button"
              className="sb-user-logout"
              onClick={handleLogout}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              title="Cikis yap"
              aria-label="Cikis yap"
            >
              <LogOut className="w-[16px] h-[16px]" />
            </motion.button>
          )}
        </div>
      </div>
    </aside>
  )
}
