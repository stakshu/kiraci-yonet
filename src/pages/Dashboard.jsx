/* ── KiraciYonet — Ozet (Dashboard) ── */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MONTHS = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']

function timeAgo(dateStr) {
  const diffMs = new Date() - new Date(dateStr)
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Az once'
  if (diffMin < 60) return diffMin + ' dk once'
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return diffH + ' saat once'
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'Dun'
  return diffD + ' gun once'
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Iyi geceler'
  if (h < 12) return 'Gunaydin'
  if (h < 18) return 'Iyi gunler'
  return 'Iyi aksamlar'
}

function daysDiff(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.ceil((target - today) / (1000*60*60*24))
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [apartments, setApartments] = useState([])
  const [payments, setPayments] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [aptRes, payRes, tenRes] = await Promise.all([
      supabase.from('apartments').select('*, tenants(id, full_name, rent)').order('created_at', { ascending: false }),
      supabase.from('rent_payments').select('*, tenants(full_name), apartments(building, unit_no)').order('due_date', { ascending: false }),
      supabase.from('tenants').select('id, full_name, apartment_id, lease_end').order('created_at', { ascending: false })
    ])
    setApartments(aptRes.data || [])
    setPayments(payRes.data || [])
    setTenants(tenRes.data || [])
    setLoading(false)
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const userName = user?.email?.split('@')[0] || 'Kullanici'

  /* ── Istatistikler ── */
  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.due_date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  const collectedThisMonth = thisMonthPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const pendingThisMonth = thisMonthPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const paidCount = thisMonthPayments.filter(p => p.status === 'paid').length
  const unpaidCount = thisMonthPayments.filter(p => p.status !== 'paid').length
  const overdueAll = payments.filter(p => p.status !== 'paid' && daysDiff(p.due_date) < 0)
  const overdueTotal = overdueAll.reduce((s, p) => s + Number(p.amount), 0)

  const totalApartments = apartments.length
  const occupiedApartments = apartments.filter(a => a.tenants?.[0]).length
  const vacantApartments = totalApartments - occupiedApartments
  const totalTenants = tenants.length

  /* ── Son hareketler ── */
  const recentPaid = payments
    .filter(p => p.status === 'paid' && p.paid_date)
    .sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date))
    .slice(0, 6)

  /* ── Sozlesmesi yakinda biten kiraciler (30 gun icinde) ── */
  const expiringTenants = tenants
    .filter(t => {
      if (!t.lease_end) return false
      const d = daysDiff(t.lease_end)
      return d >= 0 && d <= 30
    })
    .sort((a, b) => new Date(a.lease_end) - new Date(b.lease_end))

  const occupiedPct = totalApartments > 0 ? Math.round((occupiedApartments / totalApartments) * 100) : 0
  const vacantPct = 100 - occupiedPct

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Yukleniyor...</div>

  return (
    <div className="dashboard">
      {/* Baslik */}
      <div className="dash-header">
        <div>
          <h2 className="dash-title">{getGreeting()}, {userName}</h2>
          <p className="dash-greeting">Mulk yonetim panelinize hos geldiniz.</p>
        </div>
        <div className="dash-header-date">
          {now.getDate()} {MONTHS[currentMonth]} {currentYear}
        </div>
      </div>

      {/* Stat Cards — beyaz kartlar, sol renkli cizgi */}
      <div className="dash-stats">
        <div className="dash-stat-card" onClick={() => navigate('/payments/rent')}>
          <div className="dash-stat-accent" style={{ background: 'var(--green)' }} />
          <div className="dash-stat-body">
            <div className="dash-stat-top">
              <span className="dash-stat-label">Tahsil Edilen</span>
              <div className="dash-stat-icon-wrap" style={{ background: 'var(--green-bg)' }}>
                <svg viewBox="0 0 24 24" style={{ stroke: 'var(--green)' }}><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </div>
            <div className="dash-stat-value">{collectedThisMonth.toLocaleString('tr-TR')} {'\u20BA'}</div>
            <div className="dash-stat-sub">Bu ay — {paidCount} odeme</div>
          </div>
        </div>

        <div className="dash-stat-card" onClick={() => navigate('/payments/rent')}>
          <div className="dash-stat-accent" style={{ background: 'var(--amber)' }} />
          <div className="dash-stat-body">
            <div className="dash-stat-top">
              <span className="dash-stat-label">Bekleyen</span>
              <div className="dash-stat-icon-wrap" style={{ background: 'var(--amber-bg)' }}>
                <svg viewBox="0 0 24 24" style={{ stroke: 'var(--amber)' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
            </div>
            <div className="dash-stat-value">{pendingThisMonth.toLocaleString('tr-TR')} {'\u20BA'}</div>
            <div className="dash-stat-sub">Bu ay — {unpaidCount} odeme</div>
          </div>
        </div>

        <div className="dash-stat-card" onClick={() => navigate('/payments/rent')}>
          <div className="dash-stat-accent" style={{ background: 'var(--red)' }} />
          <div className="dash-stat-body">
            <div className="dash-stat-top">
              <span className="dash-stat-label">Geciken</span>
              <div className="dash-stat-icon-wrap" style={{ background: 'var(--red-bg)' }}>
                <svg viewBox="0 0 24 24" style={{ stroke: 'var(--red)' }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
            </div>
            <div className="dash-stat-value">{overdueTotal.toLocaleString('tr-TR')} {'\u20BA'}</div>
            <div className="dash-stat-sub">Toplam — {overdueAll.length} odeme</div>
          </div>
        </div>

        <div className="dash-stat-card" onClick={() => navigate('/properties')}>
          <div className="dash-stat-accent" style={{ background: 'var(--blue)' }} />
          <div className="dash-stat-body">
            <div className="dash-stat-top">
              <span className="dash-stat-label">Mulkler</span>
              <div className="dash-stat-icon-wrap" style={{ background: 'var(--blue-bg)' }}>
                <svg viewBox="0 0 24 24" style={{ stroke: 'var(--blue)' }}><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
              </div>
            </div>
            <div className="dash-stat-value">{totalApartments}</div>
            <div className="dash-stat-sub">{occupiedApartments} kirada — {vacantApartments} bosta</div>
          </div>
        </div>
      </div>

      {/* Orta kisim: Hareket + Mulk Dagilimi */}
      <div className="dash-row">
        {/* Hareket Akisi */}
        <div className="dash-card dash-activity">
          <div className="dash-card-header">
            <h3 className="dash-card-title">Son Hareketler</h3>
            <button className="dash-card-link" onClick={() => navigate('/payments/rent')}>Tumunu Gor</button>
          </div>
          <div className="dash-card-body">
            {recentPaid.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>
                Henuz odeme hareketi yok.
              </div>
            ) : recentPaid.map(p => (
              <div key={p.id} className="dash-activity-item">
                <div className="dash-activity-dot" />
                <div className="dash-activity-content">
                  <div className="dash-activity-title">
                    {p.tenants?.full_name || '—'}
                    <span className="dash-activity-amount">{Number(p.amount).toLocaleString('tr-TR')} {'\u20BA'}</span>
                  </div>
                  <div className="dash-activity-desc">
                    {p.apartments ? `${p.apartments.building} — No: ${p.apartments.unit_no}` : '—'}
                  </div>
                </div>
                <div className="dash-activity-time">{timeAgo(p.paid_date)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sag kolon: Mulk Dagilimi + Sozlesme uyarilari */}
        <div className="dash-side">
          {/* Mulk Dagilimi */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3 className="dash-card-title">Mulk Dagilimi</h3>
            </div>
            <div className="dash-card-body" style={{ padding: '24px 20px' }}>
              <div className="dash-donut-wrap">
                <div
                  className="dash-donut"
                  style={{
                    background: totalApartments > 0
                      ? `conic-gradient(var(--green) 0deg ${(occupiedApartments / totalApartments) * 360}deg, #e5e7eb ${(occupiedApartments / totalApartments) * 360}deg 360deg)`
                      : 'var(--border)'
                  }}
                >
                  <div className="dash-donut-inner">
                    <span className="dash-donut-number">{totalApartments}</span>
                    <span className="dash-donut-label">Toplam</span>
                  </div>
                </div>
              </div>
              <div className="dash-donut-legend">
                <div className="dash-legend-row">
                  <span className="dash-legend-dot" style={{ background: 'var(--green)' }} />
                  <span className="dash-legend-text">Kirada</span>
                  <span className="dash-legend-val">{occupiedApartments}</span>
                  <span className="dash-legend-pct">{occupiedPct}%</span>
                </div>
                <div className="dash-legend-row">
                  <span className="dash-legend-dot" style={{ background: '#e5e7eb' }} />
                  <span className="dash-legend-text">Bosta</span>
                  <span className="dash-legend-val">{vacantApartments}</span>
                  <span className="dash-legend-pct">{vacantPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Ozet bilgiler */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3 className="dash-card-title">Hizli Bakis</h3>
            </div>
            <div className="dash-card-body" style={{ padding: 0 }}>
              <div className="dash-quick-item" onClick={() => navigate('/tenants/list')} style={{ cursor: 'pointer' }}>
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <span>Toplam Kiraci</span>
                <strong>{totalTenants}</strong>
              </div>
              <div className="dash-quick-item">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Sozlesmesi Biten</span>
                <strong style={{ color: expiringTenants.length > 0 ? 'var(--red)' : undefined }}>{expiringTenants.length}</strong>
              </div>
              {expiringTenants.map(t => (
                <div key={t.id} className="dash-quick-alert">
                  <span>{t.full_name}</span>
                  <span style={{ color: 'var(--red)', fontSize: 12 }}>{daysDiff(t.lease_end)} gun</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
