/* ── KiraciYonet — Ana Layout ── */
import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  /* body class'ini guncelle (CSS collapsed stilleri icin) */
  useEffect(() => {
    document.body.classList.toggle('collapsed', collapsed)
  }, [collapsed])

  const toggleCollapse = () => {
    setCollapsed(prev => !prev)
  }

  return (
    <>
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <div className="main">
        <div className="content">
          <div className="page-content" key={location.pathname}>
            <Outlet />
          </div>
        </div>
      </div>
    </>
  )
}
