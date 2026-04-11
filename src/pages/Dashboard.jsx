/* ── KiraciYonet — Ozet (Dashboard) ── */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/* ── Tarih formatlama ── */
const MONTHS = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear()
}
function timeAgo(dateStr) {
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now - d
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

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [apartments, setApartments] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [aptRes, payRes] = await Promise.all([
      supabase.from('apartments').select('*, tenants(id, full_name, rent)').order('created_at', { ascending: false }),
      supabase.from('rent_payments').select('*, tenants(full_name), apartments(building, unit_no)').order('due_date', { ascending: false })
    ])
    setApartments(aptRes.data || [])
    setPayments(payRes.data || [])
    setLoading(false)
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  /* ── Istatistikler ── */
  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.due_date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  const collectedThisMonth = thisMonthPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const pendingThisMonth = thisMonthPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const paidCount = thisMonthPayments.filter(p => p.status === 'paid').length
  const unpaidCount = thisMonthPayments.filter(p => p.status !== 'paid').length

  const totalApartments = apartments.length
  const occupiedApartments = apartments.filter(a => a.tenants?.[0]).length
  const vacantApartments = totalApartments - occupiedApartments

  /* ── Son hareketler (odenen odemeler, en yeni 8) ── */
  const recentPaid = payments
    .filter(p => p.status === 'paid' && p.paid_date)
    .sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date))
    .slice(0, 8)

  /* ── Son 6 ay bar chart verisi ── */
  const barData = []
  for (let i = 5; i >= 0; i--) {
    const m = new Date(currentYear, currentMonth - i, 1)
    const month = m.getMonth()
    const year = m.getFullYear()
    const monthPayments = payments.filter(p => {
      const d = new Date(p.due_date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    const paid = monthPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
    const pending = monthPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0)
    barData.push({ label: MONTHS[month].slice(0, 3), paid, pending })
  }
  const maxBar = Math.max(...barData.map(d => d.paid + d.pending), 1)

  const userName = user?.email?.split('@')[0] || 'Kullanici'

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Yukleniyor...</div>

  return (
    <div className="dashboard">
      {/* Baslik */}
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Ozet</h2>
          <p className="dash-greeting">{getGreeting()}, {userName}</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="dash-stats">
        <div className="dash-stat-card dash-stat-green" onClick={() => navigate('/payments/rent')}>
          <div className="dash-stat-label">Gerceklesen Odemeler</div>
          <div className="dash-stat-sub">Bu ay</div>
          <div className="dash-stat-value">{collectedThisMonth.toLocaleString('tr-TR')} {'\u20BA'}</div>
        </div>
        <div className="dash-stat-card dash-stat-red" onClick={() => navigate('/payments/rent')}>
          <div className="dash-stat-label">Bekleyen Odemeler</div>
          <div className="dash-stat-sub">Bu ay</div>
          <div className="dash-stat-value">{pendingThisMonth.toLocaleString('tr-TR')} {'\u20BA'}</div>
        </div>
        <div className="dash-stat-card dash-stat-blue">
          <div className="dash-stat-label">Odenen Kiralar</div>
          <div className="dash-stat-sub">Bu ay</div>
          <div className="dash-stat-value">{paidCount}</div>
        </div>
        <div className="dash-stat-card dash-stat-amber">
          <div className="dash-stat-label">Odenmemis Kiralar</div>
          <div className="dash-stat-sub">Bu ay</div>
          <div className="dash-stat-value">{unpaidCount}</div>
        </div>
      </div>

      {/* Iki kolon: Hareket Akisi + Mulk Dagilimi */}
      <div className="dash-row">
        {/* Hareket Akisi */}
        <div className="dash-card dash-activity">
          <div className="dash-card-header">
            <h3 className="dash-card-title">Hareket Akisi</h3>
          </div>
          <div className="dash-card-body">
            {recentPaid.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>
                Henuz odeme hareketi yok.
              </div>
            ) : recentPaid.map(p => (
              <div key={p.id} className="dash-activity-item">
                <div className="dash-activity-dot" />
                <div className="dash-activity-content">
                  <div className="dash-activity-title">Kira odemesi alindi.</div>
                  <div className="dash-activity-desc">
                    {p.tenants?.full_name || '—'} — {p.apartments ? `${p.apartments.building} No: ${p.apartments.unit_no}` : '—'}
                  </div>
                  <div className="dash-activity-amount">{Number(p.amount).toLocaleString('tr-TR')} {'\u20BA'}</div>
                </div>
                <div className="dash-activity-time">{timeAgo(p.paid_date)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mulk Dagilimi */}
        <div className="dash-card dash-distribution">
          <div className="dash-card-header">
            <h3 className="dash-card-title">Mulk Dagilimi</h3>
          </div>
          <div className="dash-card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, padding: '24px 16px' }}>
            {/* Donut Chart CSS */}
            <div className="dash-donut-wrap">
              <div
                className="dash-donut"
                style={{
                  background: totalApartments > 0
                    ? `conic-gradient(var(--green) 0deg ${(occupiedApartments / totalApartments) * 360}deg, var(--red) ${(occupiedApartments / totalApartments) * 360}deg 360deg)`
                    : 'var(--border)'
                }}
              >
                <div className="dash-donut-inner">
                  <span className="dash-donut-label">Toplam</span>
                  <span className="dash-donut-number">{totalApartments}</span>
                </div>
              </div>
            </div>
            <div className="dash-donut-legend">
              <div className="dash-legend-item">
                <span className="dash-legend-dot" style={{ background: 'var(--green)' }} />
                <span>Kirada</span>
                <strong>{occupiedApartments}</strong>
              </div>
              <div className="dash-legend-item">
                <span className="dash-legend-dot" style={{ background: 'var(--red)' }} />
                <span>Bosta</span>
                <strong>{vacantApartments}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bar Chart — Kira Odemeleri */}
      <div className="dash-card">
        <div className="dash-card-header">
          <h3 className="dash-card-title">Kira Odemeleri (Son 6 Ay)</h3>
        </div>
        <div className="dash-card-body">
          <div className="dash-bar-chart">
            {barData.map((d, i) => (
              <div key={i} className="dash-bar-col">
                <div className="dash-bar-stack" style={{ height: 180 }}>
                  {(d.paid + d.pending) > 0 && (
                    <>
                      <div
                        className="dash-bar dash-bar-paid"
                        style={{ height: `${(d.paid / maxBar) * 100}%` }}
                        title={`Odenen: ${d.paid.toLocaleString('tr-TR')} \u20BA`}
                      />
                      <div
                        className="dash-bar dash-bar-pending"
                        style={{ height: `${(d.pending / maxBar) * 100}%` }}
                        title={`Bekleyen: ${d.pending.toLocaleString('tr-TR')} \u20BA`}
                      />
                    </>
                  )}
                </div>
                <span className="dash-bar-label">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="dash-bar-legend">
            <div className="dash-legend-item">
              <span className="dash-legend-dot" style={{ background: 'var(--green)' }} />
              <span>Odenen</span>
            </div>
            <div className="dash-legend-item">
              <span className="dash-legend-dot" style={{ background: 'var(--amber)' }} />
              <span>Bekleyen</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
