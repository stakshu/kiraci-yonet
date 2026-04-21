/* ── KiraciYonet — Ana Layout ── */
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const location = useLocation()

  return (
    <>
      <Sidebar />
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
