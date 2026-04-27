/* ── KiraciYonet — Sidebar — Lucide + Motion + i18n ── */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import LanguageSwitcher from './LanguageSwitcher'
import {
  LayoutDashboard, Building2, Users, CreditCard,
  DollarSign, BarChart3, FileText, HelpCircle,
  Home, ChevronDown, LogOut, Wrench, Settings
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
  wrench: Wrench
}

function Icon({ name, className }) {
  const LucideIcon = ICON_MAP[name]
  if (!LucideIcon) return null
  return <LucideIcon className={className} />
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const { showToast } = useToast()
  const [openGroups, setOpenGroups] = useState({})

  const NAV_SECTIONS = [
    {
      label: t('sidebar.sectionGeneral'),
      items: [
        { text: t('sidebar.overview'),   icon: 'dashboard', route: '/dashboard' },
        { text: t('sidebar.properties'), icon: 'building',  route: '/properties' },
        { text: t('sidebar.tenants'),    icon: 'users',     route: '/tenants/list' },
        { text: t('sidebar.payments'),   icon: 'card',      route: '/payments/rent' }
      ]
    },
    {
      label: t('sidebar.sectionManagement'),
      items: [
        { text: t('sidebar.expenses'),    icon: 'dollar', route: '/expenses' },
        { text: t('sidebar.maintenance'), icon: 'wrench', route: '/maintenance' },
        { text: t('sidebar.accounting'),  icon: 'chart',  route: '/accounting' },
        { text: t('sidebar.documents'),   icon: 'file',   route: '/documents' }
      ]
    }
  ]

  const handleLogout = async () => {
    try {
      await signOut()
      showToast(t('sidebar.logoutSuccess'))
    } catch (err) {
      showToast(t('sidebar.logoutError', { msg: err.message }), 'error')
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
        <span className="sb-logo-text">{t('app.name')}</span>
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
                      data-tooltip={item.text}
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
                  data-tooltip={item.text}
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
            data-tooltip={t('sidebar.helpSupport')}
            whileHover={{ x: 2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <span className="nav-item-icon">
              <HelpCircle className="w-[18px] h-[18px]" />
            </span>
            <span className="nav-item-text">{t('sidebar.helpSupport')}</span>
          </motion.a>
        </div>

        <LanguageSwitcher />

        <div className="sb-user">
          <motion.div
            className="sb-user-avatar"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            KY
          </motion.div>
          <div className="sb-user-info">
            <div className="sb-user-name">{user ? user.email.split('@')[0] : t('sidebar.user')}</div>
            <div className="sb-user-badge">
              {user ? (
                <><span className="inline-block w-2 h-2 rounded-full" style={{ background: '#00D47E' }} /> {t('sidebar.online')}</>
              ) : (
                <><span className="inline-block w-2 h-2 rounded-full" style={{ background: '#94A3B8' }} /> {t('sidebar.notLoggedIn')}</>
              )}
            </div>
          </div>
          {user && (
            <>
              <motion.button
                type="button"
                className={`sb-user-logout${currentPath === '/settings' ? ' active' : ''}`}
                onClick={() => goTo('/settings')}
                whileHover={{ scale: 1.06, rotate: 30 }}
                whileTap={{ scale: 0.94 }}
                title={t('sidebar.settingsTitle')}
                aria-label={t('sidebar.settingsTitle')}
                style={{ marginRight: 6 }}
              >
                <Settings className="w-[16px] h-[16px]" />
              </motion.button>
              <motion.button
                type="button"
                className="sb-user-logout"
                onClick={handleLogout}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                title={t('sidebar.logoutTitle')}
                aria-label={t('sidebar.logoutTitle')}
              >
                <LogOut className="w-[16px] h-[16px]" />
              </motion.button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
