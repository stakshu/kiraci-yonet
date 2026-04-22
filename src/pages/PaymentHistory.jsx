/* ── KiraciYonet — Ödeme Geçmişi ── */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { apartmentLabel, buildingLabel } from '../lib/apartmentLabel'
import { formatMoney, formatDate as fmtDate, formatMonthYear } from '../i18n/formatters'

export default function PaymentHistory() {
  const { t } = useTranslation()
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
      .select('*, tenants(full_name, email), apartments(unit_no, floor_no, buildings(name))')
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

  /* ── Ay seçenekleri ── */
  const monthOptions = []
  const seenMonths = new Set()
  payments.forEach(p => {
    const d = new Date(p.paid_date || p.due_date)
    const key = d.getFullYear() + '-' + String(d.getMonth()).padStart(2, '0')
    if (!seenMonths.has(key)) {
      seenMonths.add(key)
      monthOptions.push({ key, label: formatMonthYear(d.getMonth() + 1, d.getFullYear()) })
    }
  })

  /* ── İstatistikler ── */
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
                    buildingLabel(p.apartments).toLowerCase().includes(q) ||
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
            <div className="stat-number"><span>{formatMoney(totalPaid)}</span></div>
            <div className="stat-label">{t('paymentHistory.stats.totalCollected')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box blue">
            <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{formatMoney(thisMonthTotal)}</span></div>
            <div className="stat-label">{t('paymentHistory.stats.thisMonth')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box amber">
            <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{totalCount}</span></div>
            <div className="stat-label">{t('paymentHistory.stats.totalCount')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box blue">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{uniqueTenants}</span></div>
            <div className="stat-label">{t('paymentHistory.stats.uniqueTenants')}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="table-controls">
        <div className="table-search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder={t('paymentHistory.searchPh')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-filter-group">
          <select className="filter-btn" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
            style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
            <option value="">{t('paymentHistory.allMonths')}</option>
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
              <th>{t('paymentHistory.table.tenant')}</th>
              <th>{t('paymentHistory.table.apartment')}</th>
              <th>{t('paymentHistory.table.dueDate')}</th>
              <th>{t('paymentHistory.table.paidDate')}</th>
              <th>{t('paymentHistory.table.amount')}</th>
              <th>{t('paymentHistory.table.status')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>{t('paymentHistory.loading')}</td></tr>
            ) : error ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--red)' }}>{t('paymentHistory.errorPrefix', { msg: error })}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                {search || monthFilter ? t('paymentHistory.emptyFiltered') : t('paymentHistory.emptyNone')}
              </td></tr>
            ) : filtered.map(p => {
              const tenantName = p.tenants?.full_name || '—'
              const aptName = apartmentLabel(p.apartments)
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
                  <td>{fmtDate(p.due_date)}</td>
                  <td>{p.paid_date ? fmtDate(p.paid_date) : '—'}</td>
                  <td>{formatMoney(p.amount)}</td>
                  <td>
                    <span className={`status-badge ${isLate ? 'pending' : 'active'}`}>
                      {isLate ? t('paymentHistory.status.late') : t('paymentHistory.status.onTime')}
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
