/* ── KiraciYonet — Bina Yonetimi ── */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/* ── Tarih formatlama ── */
function formatDate(dateStr) {
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

export default function BuildingsList() {
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [expandedBuilding, setExpandedBuilding] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('apartments')
      .select('*, tenants(id, full_name, email, phone, lease_start, lease_end)')
      .order('building', { ascending: true })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setApartments(data || [])
    setLoading(false)
  }

  /* ── Binalara grupla ── */
  const buildingMap = {}
  apartments.forEach(apt => {
    const key = apt.building || 'Bilinmeyen'
    if (!buildingMap[key]) {
      buildingMap[key] = { name: key, city: apt.city, district: apt.district, apartments: [] }
    }
    buildingMap[key].apartments.push(apt)
  })

  const buildings = Object.values(buildingMap).filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.city || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.district || '').toLowerCase().includes(search.toLowerCase())
  )

  /* ── Genel istatistikler ── */
  const totalBuildings = Object.keys(buildingMap).length
  const totalApartments = apartments.length
  const totalOccupied = apartments.filter(a => a.status === 'occupied').length
  const totalRent = apartments.filter(a => a.status === 'occupied').reduce((sum, a) => sum + Number(a.rent || 0), 0)
  const occupancyRate = totalApartments > 0 ? Math.round((totalOccupied / totalApartments) * 100) : 0

  return (
    <>
      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon-box blue">
            <svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{totalBuildings}</span></div>
            <div className="stat-label">Toplam Bina</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box green">
            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{totalApartments}</span></div>
            <div className="stat-label">Toplam Daire</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box amber">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>%{occupancyRate}</span></div>
            <div className="stat-label">Doluluk Orani</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box green">
            <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{totalRent.toLocaleString('tr-TR')}</span></div>
            <div className="stat-label">Aylik Toplam Kira ({'\u20BA'})</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="table-controls">
        <div className="table-search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Bina ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Building Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Yukleniyor...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--red)' }}>Hata: {error}</div>
      ) : buildings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          {search ? 'Aramayla eslesen bina bulunamadi.' : 'Henuz bina/daire eklenmemis.'}
        </div>
      ) : (
        <div className="building-list">
          {buildings.map(b => {
            const occupied = b.apartments.filter(a => a.status === 'occupied').length
            const vacant = b.apartments.filter(a => a.status === 'vacant').length
            const expiring = b.apartments.filter(a => a.status === 'expiring').length
            const monthlyRent = b.apartments.filter(a => a.status === 'occupied').reduce((sum, a) => sum + Number(a.rent || 0), 0)
            const isExpanded = expandedBuilding === b.name

            return (
              <div key={b.name} className="building-card">
                <div className="building-card-header" onClick={() => setExpandedBuilding(isExpanded ? null : b.name)}>
                  <div className="building-card-left">
                    <div className="building-icon-box">
                      <svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
                    </div>
                    <div>
                      <div className="building-card-name">{b.name}</div>
                      <div className="building-card-location">{[b.district, b.city].filter(Boolean).join(', ') || '—'}</div>
                    </div>
                  </div>
                  <div className="building-card-stats">
                    <div className="building-mini-stat">
                      <span className="building-mini-num">{b.apartments.length}</span>
                      <span className="building-mini-label">Daire</span>
                    </div>
                    <div className="building-mini-stat">
                      <span className="building-mini-num" style={{ color: 'var(--green)' }}>{occupied}</span>
                      <span className="building-mini-label">Dolu</span>
                    </div>
                    <div className="building-mini-stat">
                      <span className="building-mini-num" style={{ color: 'var(--red)' }}>{vacant}</span>
                      <span className="building-mini-label">Bos</span>
                    </div>
                    <div className="building-mini-stat">
                      <span className="building-mini-num" style={{ color: 'var(--green)' }}>{monthlyRent.toLocaleString('tr-TR')} {'\u20BA'}</span>
                      <span className="building-mini-label">Aylik Kira</span>
                    </div>
                    <svg className={`building-chevron ${isExpanded ? 'expanded' : ''}`} viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>

                {isExpanded && (
                  <div className="building-card-body">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Daire No</th>
                          <th>Kiraci</th>
                          <th>Kira ({'\u20BA'})</th>
                          <th>Sozlesme Bitis</th>
                          <th>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.apartments.map(apt => {
                          const tenant = apt.tenants?.[0]
                          const statusMap = {
                            occupied: { label: 'Dolu', css: 'active' },
                            vacant: { label: 'Bos', css: 'inactive' },
                            expiring: { label: 'Sure Doluyor', css: 'pending' }
                          }
                          const st = statusMap[apt.status] || statusMap.vacant

                          return (
                            <tr key={apt.id}>
                              <td style={{ fontWeight: 600 }}>{apt.unit_no}</td>
                              <td>
                                {tenant ? (
                                  <div className="tenant-cell">
                                    <span className="tenant-name">{tenant.full_name}</span>
                                    <span className="tenant-email">{tenant.email || ''}</span>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                                )}
                              </td>
                              <td>{apt.rent ? Number(apt.rent).toLocaleString('tr-TR') : '—'}</td>
                              <td>{apt.lease_end ? formatDate(apt.lease_end) : '—'}</td>
                              <td><span className={`status-badge ${st.css}`}>{st.label}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
