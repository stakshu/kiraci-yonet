/* ── KiraciYonet — Sidebar ── */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* ── Nav yapilandirmasi ── */
const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { text: 'Ana Sayfa', icon: 'dashboard', route: '/apartments/list', tooltip: 'Ana Sayfa' }
    ]
  },
  {
    label: 'Mulkler',
    items: [
      {
        text: 'Daireler', icon: 'building', tooltip: 'Daireler',
        children: [
          { text: 'Daire Listesi', route: '/apartments/list' },
          { text: 'Bina Yonetimi', route: '/apartments/buildings' }
        ]
      },
      {
        text: 'Kiracilar', icon: 'users', tooltip: 'Kiracilar',
        children: [
          { text: 'Kiraci Listesi', route: '/tenants/list' },
          { text: 'Sozlesmeler', route: '/tenants/contracts' },
          { text: 'Tahliye Takibi', route: '/tenants/evictions' }
        ]
      }
    ]
  },
  {
    label: 'Finans',
    items: [
      {
        text: 'Odemeler', icon: 'card', tooltip: 'Odemeler',
        children: [
          { text: 'Kira Odemeleri', route: '/payments/rent' },
          { text: 'Geciken Odemeler', route: '/payments/overdue' },
          { text: 'Odeme Gecmisi', route: '/payments/history' }
        ]
      },
      { text: 'Giderler', icon: 'dollar', route: '/expenses', tooltip: 'Giderler' },
      { text: 'Muhasebe', icon: 'chart', route: '/accounting', tooltip: 'Muhasebe' }
    ]
  },
  {
    label: 'Diger',
    items: [
      { text: 'Belgeler', icon: 'file', route: '/documents', tooltip: 'Belgeler' }
    ]
  }
]

/* ── SVG Ikonlari ── */
const ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  building: <><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><line x1="9" y1="9" x2="9" y2="9.01"/><line x1="9" y1="13" x2="9" y2="13.01"/><line x1="9" y1="17" x2="9" y2="17.01"/></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  card: <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>,
  dollar: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  chart: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
  help: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  collapse: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></>
}

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24">{ICONS[name]}</svg>
  )
}

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [openGroups, setOpenGroups] = useState({ Daireler: true })

  const currentPath = location.pathname

  const toggleGroup = (text) => {
    setOpenGroups(prev => ({ ...prev, [text]: !prev[text] }))
  }

  const goTo = (route) => {
    navigate(route)
  }

  const isActive = (route) => currentPath === route
  const isGroupActive = (children) => children?.some(c => currentPath === c.route)

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sb-logo">
        <div className="sb-logo-icon">
          <Icon name="home" />
        </div>
        <span className="sb-logo-text">KiraciYonet</span>
        <button className="sb-collapse-btn" onClick={onToggleCollapse} title="Menuyu daralt">
          <Icon name="collapse" />
        </button>
      </div>

      {/* Search */}
      <div className="sb-search">
        <div className="sb-search-box">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" className="sb-search-input" placeholder="Ara..." />
          <div className="sb-search-shortcut">
            <kbd>⌘</kbd><kbd>F</kbd>
          </div>
        </div>
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
                      <span className="nav-item-icon"><Icon name={item.icon} /></span>
                      <span className="nav-item-text">{item.text}</span>
                      <svg className="nav-group-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
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
                <a
                  key={ii}
                  className={`nav-item${isActive(item.route) ? ' active' : ''}`}
                  data-tooltip={item.tooltip}
                  onClick={() => goTo(item.route)}
                >
                  <span className="nav-item-icon"><Icon name={item.icon} /></span>
                  <span className="nav-item-text">{item.text}</span>
                </a>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sb-bottom">
        <div className="nav-section" style={{ paddingBottom: 4 }}>
          <a className="nav-item" data-tooltip="Ayarlar" onClick={() => goTo('/settings')}>
            <span className="nav-item-icon"><Icon name="settings" /></span>
            <span className="nav-item-text">Ayarlar</span>
          </a>
          <a className="nav-item" data-tooltip="Yardim">
            <span className="nav-item-icon"><Icon name="help" /></span>
            <span className="nav-item-text">Yardim & Destek</span>
          </a>
        </div>

        <div className="sb-user">
          <div className="sb-user-avatar">KY</div>
          <div className="sb-user-info">
            <div className="sb-user-name">{user ? user.email.split('@')[0] : 'Kullanici'}</div>
            <div className="sb-user-badge">
              {user ? (
                <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg> Cevrimici</>
              ) : (
                <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg> Giris yapilmadi</>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
