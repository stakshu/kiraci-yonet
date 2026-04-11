/* ── KiraciYonet — Odeme Gecmisi ── */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/* ── Tarih formatlama ── */
function formatDate(dateStr) {
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

/* ── Ay adi ── */
function monthName(m) {
  return ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'][m]
}

export default function PaymentHistory() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [monthFilter, setMonthFilter] = useState('')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('rent_payments')
      .select('*, tenants(full_name, email), apartments(building, unit_no)')
      .eq('status', 'paid')
      .order('paid_date', { ascending: false })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setPayments(data || [])
    setLoading(false)
  }

  /* ── Ay secenekleri olustur ── */
  const monthOptions = []
  const seenMonths = new Set()
  payments.forEach(p => {
    const d = new Date(p.paid_date || p.due_date)
    const key = d.getFullYear() + '-' + String(d.getMonth()).padStart(2, '0')
    if (!seenMonths.has(key)) {
      seenMonths.add(key)
      monthOptions.push({ key, label: monthName(d.getMonth()) + ' ' + d.getFullYear() })
    }
  })

  /* ── Istatistikler ── */
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalCount = payments.length

  const now = new Date()
  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.paid_date || p.due_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisMonthTotal = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  const uniqueTenants = new Set(payments.map(p => p.tenant_id)).size

  /* ── Filtreleme ── */
  const filtered = payments.filter(p => {
    if (search) {
      const q = search.toLowerCase()
      const match = (p.tenants?.full_name || '').toLowerCase().includes(q) ||
                    (p.apartments?.building || '').toLowerCase().includes(q) ||
                    (p.apartments?.unit_no || '').toLowerCase().includes(q)
      if (!match) return false
    }
    if (monthFilter) {
      const d = new Date(p.paid_date || p.due_date)
      const key = d.getFullYear() + '-' + String(d.getMonth()).padStart(2, '0')
      if (key !== monthFilter) return false
    }
    return true
  })

  return (
    <>
      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon-box green">
            <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{totalPaid.toLocaleString('tr-TR')}</span></div>
            <div className="stat-label">Toplam Tahsilat ({'\u20BA'})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box blue">
            <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{thisMonthTotal.toLocaleString('tr-TR')}</span></div>
            <div className="stat-label">Bu Ay Tahsilat ({'\u20BA'})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box amber">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{totalCount}</span></div>
            <div className="stat-label">Toplam Odeme</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box blue">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{uniqueTenants}</span></div>
            <div className="stat-label">Odeme Yapan Kiraci</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="table-controls">
        <div className="table-search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Kiraci veya bina ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-filter-group">
          <select className="filter-btn" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
            <option value="">Tum Aylar</option>
            {monthOptions.map(m => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kiraci</th>
              <th>Daire</th>
              <th>Vade Tarihi</th>
              <th>Odeme Tarihi</th>
              <th>Tutar ({'\u20BA'})</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Yukleniyor...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--red)' }}>Hata: {error}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                {search || monthFilter ? 'Filtreyle eslesen odeme bulunamadi.' : 'Henuz odenmis odeme yok.'}
              </td></tr>
            ) : filtered.map(p => {
              const tenantName = p.tenants?.full_name || '—'
              const aptName = p.apartments ? `${p.apartments.building} ${p.apartments.unit_no}` : '—'
              const dueD = new Date(p.due_date)
              const paidD = p.paid_date ? new Date(p.paid_date) : null
              const isLate = paidD && paidD > dueD

              return (
                <tr key={p.id}>
                  <td>
                    <div className="tenant-cell">
                      <span className="tenant-name">{tenantName}</span>
                      <span className="tenant-email">{p.tenants?.email || ''}</span>
                    </div>
                  </td>
                  <td>{aptName}</td>
                  <td>{formatDate(p.due_date)}</td>
                  <td>{p.paid_date ? formatDate(p.paid_date) : '—'}</td>
                  <td>{Number(p.amount).toLocaleString('tr-TR')}</td>
                  <td>
                    <span className={`status-badge ${isLate ? 'pending' : 'active'}`}>
                      {isLate ? 'Gec Odendi' : 'Zamaninda'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
