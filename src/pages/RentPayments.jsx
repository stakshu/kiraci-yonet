/* ── KiraciYonet — Kira Odemeleri ── */
import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

/* ── Tarih formatlama ── */
function formatDate(dateStr) {
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

function daysDiff(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.ceil((target - today) / (1000*60*60*24))
}

function realStatus(payment) {
  if (payment.status === 'paid') return 'paid'
  return daysDiff(payment.due_date) < 0 ? 'overdue' : 'pending'
}

const STATUS_CONFIG = {
  paid:    { label: 'Odendi', css: 'active' },
  pending: { label: 'Bekliyor', css: 'pending' },
  overdue: { label: 'Gecikti', css: 'inactive' }
}

export default function RentPayments() {
  const { showToast } = useToast()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [expandedTenant, setExpandedTenant] = useState(null)

  useEffect(() => { loadPayments() }, [])

  const loadPayments = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('rent_payments')
      .select('*, tenants(full_name, email), apartments(building, unit_no)')
      .order('due_date', { ascending: true })

    if (err) { setError(err.message); setLoading(false); return }
    setPayments(data || [])
    setLoading(false)
  }

  /* ── Kiracilara gore grupla ── */
  const getTenantGroups = () => {
    const groups = {}
    payments.forEach(p => {
      const key = p.tenant_id
      if (!key) return
      if (!groups[key]) {
        groups[key] = {
          tenantId: key,
          tenantName: p.tenants?.full_name || '—',
          tenantEmail: p.tenants?.email || '',
          aptName: p.apartments ? `${p.apartments.building} ${p.apartments.unit_no}` : '—',
          currentPayment: null,
          overduePayments: [],
          paidPayments: []
        }
      }
      const st = realStatus(p)
      if (st === 'overdue') groups[key].overduePayments.push(p)
      else if (st === 'paid') groups[key].paidPayments.push(p)
      else if (!groups[key].currentPayment) groups[key].currentPayment = p
    })

    /* Odenmisleri tarihe gore sirala (en yeni en ustte) */
    Object.values(groups).forEach(g => {
      g.paidPayments.sort((a, b) => new Date(b.paid_date || b.due_date) - new Date(a.paid_date || a.due_date))
    })

    return Object.values(groups)
  }

  const tenantGroups = loading ? [] : getTenantGroups()

  /* Filtrele */
  const filtered = tenantGroups.filter(g => {
    if (!filter) return true
    if (filter === 'overdue') return g.overduePayments.length > 0
    if (filter === 'pending') return g.currentPayment
    if (filter === 'paid') return g.paidPayments.length > 0 && !g.currentPayment && g.overduePayments.length === 0
    return true
  })

  /* Geciken en ustte */
  const sorted = [...filtered].sort((a, b) => {
    const aHasOverdue = a.overduePayments.length > 0 ? 0 : 1
    const bHasOverdue = b.overduePayments.length > 0 ? 0 : 1
    return aHasOverdue - bHasOverdue
  })

  /* ── Istatistikler ── */
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const thisMonthAll = payments.filter(p => {
    const d = new Date(p.due_date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  const totalCollected = thisMonthAll.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const totalPending = thisMonthAll.filter(p => realStatus(p) === 'pending').reduce((s, p) => s + Number(p.amount), 0)
  const overdueCount = payments.filter(p => realStatus(p) === 'overdue').length
  const totalAll = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)

  /* ── Mail gonder ── */
  const sendEmail = async (payment, type) => {
    const tenantEmail = payment.tenants?.email
    if (!tenantEmail) { showToast('Kiracinin e-posta adresi bulunamadi.', 'error'); return false }

    const { data: { session } } = await supabase.auth.getSession()
    const landlordName = session?.user?.email?.split('@')[0] || 'Mulk Sahibi'
    const diff = daysDiff(payment.due_date)

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, tenantName: payment.tenants?.full_name, tenantEmail,
          amount: payment.amount, dueDate: formatDate(payment.due_date),
          paidDate: formatDate(new Date().toISOString()),
          daysLate: Math.abs(diff), landlordName
        })
      })
      const result = await res.json()
      await supabase.from('email_logs').insert({
        user_id: session.user.id, tenant_id: payment.tenant_id,
        payment_id: payment.id, email_type: type, recipient: tenantEmail,
        subject: type === 'reminder' ? 'Kira Hatirlatmasi' : type === 'overdue' ? 'Geciken Odeme' : 'Odeme Onay',
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null
      })
      if (result.success) { showToast(`Mail gonderildi: ${tenantEmail}`, 'success'); return true }
      showToast('Mail gonderilemedi: ' + (result.error || 'Bilinmeyen hata'), 'error')
      return false
    } catch (err) { showToast('Mail gonderilemedi: ' + err.message, 'error'); return false }
  }

  const sendReminder = async (payment) => {
    await sendEmail(payment, realStatus(payment) === 'overdue' ? 'overdue' : 'reminder')
  }

  const markAsPaid = async (e, id) => {
    e.stopPropagation()
    const today = new Date().toISOString().split('T')[0]
    const { error: err } = await supabase.from('rent_payments').update({ status: 'paid', paid_date: today }).eq('id', id)
    if (err) { showToast('Hata: ' + err.message, 'error'); return }
    showToast('Odeme kaydedildi.', 'success')
    const payment = payments.find(p => p.id === id)
    if (payment?.tenants?.email) sendEmail(payment, 'payment_received')
    loadPayments()
  }

  const markAsUnpaid = async (e, id) => {
    e.stopPropagation()
    const { error: err } = await supabase.from('rent_payments').update({ status: 'pending', paid_date: null }).eq('id', id)
    if (err) { showToast('Hata: ' + err.message, 'error'); return }
    showToast('Odeme geri alindi.', 'success')
    loadPayments()
  }

  const toggleExpand = (tenantId) => {
    setExpandedTenant(prev => prev === tenantId ? null : tenantId)
  }

  /* Ana odemeyi bul (geciken varsa ilk geciken, yoksa bekleyen) */
  const getMainPayment = (group) => {
    if (group.overduePayments.length > 0) return group.overduePayments[0]
    return group.currentPayment
  }

  return (
    <>
      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon-box green">
            <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{totalCollected.toLocaleString('tr-TR')}</span></div>
            <div className="stat-label">Bu Ay Tahsil ({'\u20BA'})</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box amber">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{totalPending.toLocaleString('tr-TR')}</span></div>
            <div className="stat-label">Bu Ay Bekleyen ({'\u20BA'})</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box red">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{overdueCount}</span></div>
            <div className="stat-label">Geciken Odeme</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-box blue">
            <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{totalAll.toLocaleString('tr-TR')}</span></div>
            <div className="stat-label">Toplam Tahsilat ({'\u20BA'})</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="table-controls">
        <div className="table-search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Odeme ara..." disabled style={{ opacity: 0.5 }} />
        </div>
        <div className="table-filter-group">
          <select className="filter-btn" value={filter} onChange={e => setFilter(e.target.value)}
            style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
            <option value="">Tum Durumlar</option>
            <option value="paid">Odendi</option>
            <option value="pending">Bekliyor</option>
            <option value="overdue">Gecikti</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <th>Kiraci</th>
              <th>Daire</th>
              <th>Vade Tarihi</th>
              <th>Tutar ({'\u20BA'})</th>
              <th>Durum</th>
              <th>Kalan Gun</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Yukleniyor...</td></tr>
            ) : error ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--red)' }}>Hata: {error}</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                {filter ? 'Bu filtreye uygun odeme bulunamadi.' : 'Henuz odeme kaydi yok. Kiraci eklediginizde otomatik olusturulacak.'}
              </td></tr>
            ) : sorted.map(group => {
              const mainPayment = getMainPayment(group)
              const isExpanded = expandedTenant === group.tenantId
              const hasPaidHistory = group.paidPayments.length > 0
              const hasExtraOverdue = group.overduePayments.length > 1

              /* Ana satir icin bilgiler */
              const st = mainPayment ? realStatus(mainPayment) : 'paid'
              const cfg = STATUS_CONFIG[st]
              const diff = mainPayment ? daysDiff(mainPayment.due_date) : 0

              let dayLabel = ''
              if (!mainPayment) dayLabel = '—'
              else if (st === 'overdue') dayLabel = Math.abs(diff) + ' gun gecikti'
              else if (diff === 0) dayLabel = 'Bugun'
              else if (diff === 1) dayLabel = 'Yarin'
              else dayLabel = diff + ' gun kaldi'

              const overdueExtra = group.overduePayments.length > 1 ? group.overduePayments.length - 1 : 0

              return (
                <React.Fragment key={group.tenantId}>
                  {/* Ana satir */}
                  <tr
                    onClick={() => (hasPaidHistory || hasExtraOverdue) && toggleExpand(group.tenantId)}
                    style={{ cursor: (hasPaidHistory || hasExtraOverdue) ? 'pointer' : 'default' }}
                  >
                    <td style={{ width: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                      {(hasPaidHistory || hasExtraOverdue) && (
                        <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      )}
                    </td>
                    <td>
                      <div className="tenant-cell">
                        <span className="tenant-name">{group.tenantName}</span>
                        <span className="tenant-email">{group.tenantEmail}</span>
                      </div>
                    </td>
                    <td>{group.aptName}</td>
                    <td>{mainPayment ? formatDate(mainPayment.due_date) : '—'}</td>
                    <td>{mainPayment ? Number(mainPayment.amount).toLocaleString('tr-TR') : '—'}</td>
                    <td>
                      <span className={`status-badge ${cfg.css}`}>{cfg.label}</span>
                      {overdueExtra > 0 && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>+{overdueExtra} geciken</span>}
                    </td>
                    <td style={{ color: st === 'overdue' ? 'var(--red)' : st === 'pending' && diff <= 3 ? 'var(--amber)' : 'var(--text-muted)', fontWeight: st === 'overdue' ? 600 : 400 }}>
                      {dayLabel}
                    </td>
                    <td>
                      {mainPayment && st !== 'paid' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={(e) => markAsPaid(e, mainPayment.id)}>
                            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12"/></svg>
                            Odendi
                          </button>
                          <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={(e) => { e.stopPropagation(); sendReminder(mainPayment) }} title="Hatirlatma maili gonder">
                            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            Hatirla
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Genisletilmis gecmis */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0, background: 'var(--bg-secondary, #f8f9fa)' }}>
                        <div style={{ padding: '12px 16px 12px 44px' }}>
                          {/* Diger geciken odemeler */}
                          {group.overduePayments.length > 1 && (
                            <>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', marginBottom: 8 }}>Geciken Odemeler</div>
                              {group.overduePayments.slice(1).map(p => {
                                const d = daysDiff(p.due_date)
                                return (
                                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', gap: 24, alignItems: 'center', fontSize: 13 }}>
                                      <span>{formatDate(p.due_date)}</span>
                                      <span>{Number(p.amount).toLocaleString('tr-TR')} {'\u20BA'}</span>
                                      <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: 12 }}>{Math.abs(d)} gun gecikti</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={(e) => markAsPaid(e, p.id)}>Odendi</button>
                                      <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px' }} onClick={(e) => { e.stopPropagation(); sendReminder(p) }}>Hatirla</button>
                                    </div>
                                  </div>
                                )
                              })}
                            </>
                          )}

                          {/* Odeme gecmisi */}
                          {group.paidPayments.length > 0 && (
                            <>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, marginTop: group.overduePayments.length > 1 ? 16 : 0 }}>
                                Odeme Gecmisi ({group.paidPayments.length})
                              </div>
                              {group.paidPayments.map(p => {
                                const paidLate = p.paid_date && p.due_date && new Date(p.paid_date) > new Date(p.due_date)
                                return (
                                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', gap: 24, alignItems: 'center', fontSize: 13 }}>
                                      <span>{formatDate(p.due_date)}</span>
                                      <span>{Number(p.amount).toLocaleString('tr-TR')} {'\u20BA'}</span>
                                      <span className={`status-badge ${paidLate ? 'pending' : 'active'}`} style={{ fontSize: 11 }}>
                                        {paidLate ? 'Gec Odendi' : 'Zamaninda'}
                                      </span>
                                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                        {p.paid_date ? formatDate(p.paid_date) : ''}
                                      </span>
                                    </div>
                                    <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px' }} onClick={(e) => markAsUnpaid(e, p.id)}>Geri Al</button>
                                  </div>
                                )
                              })}
                            </>
                          )}

                          {group.paidPayments.length === 0 && group.overduePayments.length <= 1 && (
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Henuz odeme gecmisi yok.</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
