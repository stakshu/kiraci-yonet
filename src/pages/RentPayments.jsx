/* ── KiraciYonet — Kira Odemeleri — Lucide + Motion ── */
import React, { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import {
  DollarSign, Clock, XCircle, CreditCard, Search,
  ChevronDown, Check, Mail
} from 'lucide-react'

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
  paid: { label: 'Odendi', css: 'active' },
  pending: { label: 'Bekliyor', css: 'pending' },
  overdue: { label: 'Gecikti', css: 'inactive' }
}

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }

export default function RentPayments() {
  const { showToast } = useToast()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [expandedTenant, setExpandedTenant] = useState(null)

  useEffect(() => { cleanupFuturePayments().then(() => { loadPayments(); checkMissingPayments() }) }, [])

  /* One-time cleanup: delete future pending payments (beyond next month) */
  const cleanupFuturePayments = async () => {
    const now = new Date()
    const monthAfterNext = new Date(now.getFullYear(), now.getMonth() + 2, 1)
    const cutoff = monthAfterNext.toISOString().split('T')[0]
    await supabase
      .from('rent_payments')
      .delete()
      .gte('due_date', cutoff)
      .eq('status', 'pending')
  }

  const checkMissingPayments = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: tenants } = await supabase
      .from('tenants').select('id, apartment_id, lease_start, rent')
      .eq('user_id', session.user.id).not('apartment_id', 'is', null)
    if (!tenants || tenants.length === 0) return
    const { data: existingPayments } = await supabase
      .from('rent_payments').select('tenant_id, due_date').eq('user_id', session.user.id)

    /* Build a set of existing "tenantId_YYYY-MM" keys to find missing months */
    const existingKeys = new Set(
      (existingPayments || []).map(p => `${p.tenant_id}_${p.due_date.slice(0, 7)}`)
    )

    const now = new Date()
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    const newPayments = []

    for (const t of tenants) {
      const rentAmount = Number(t.rent) || 0
      if (rentAmount <= 0 || !t.apartment_id) continue
      const startDate = t.lease_start ? new Date(t.lease_start) : new Date()

      /* Create missing payment records from lease start up to next month */
      for (let i = 0; i < 120; i++) {
        const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate())
        if (dueDate > endOfNextMonth) break
        const key = `${t.id}_${dueDate.toISOString().slice(0, 7)}`
        if (existingKeys.has(key)) continue
        newPayments.push({
          user_id: session.user.id, tenant_id: t.id, apartment_id: t.apartment_id,
          due_date: dueDate.toISOString().split('T')[0], amount: rentAmount, status: 'pending'
        })
      }
    }
    if (newPayments.length > 0) { await supabase.from('rent_payments').insert(newPayments); loadPayments() }
  }

  const loadPayments = async () => {
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('rent_payments').select('*, tenants(full_name, email), apartments(building, unit_no)')
      .order('due_date', { ascending: true })
    if (err) { setError(err.message); setLoading(false); return }
    setPayments(data || []); setLoading(false)
  }

  const getTenantGroups = () => {
    const groups = {}
    payments.forEach(p => {
      const key = p.tenant_id
      if (!key) return
      if (!groups[key]) {
        groups[key] = {
          tenantId: key, tenantName: p.tenants?.full_name || '—',
          tenantEmail: p.tenants?.email || '',
          aptName: p.apartments ? `${p.apartments.building} ${p.apartments.unit_no}` : '—',
          currentPayment: null, overduePayments: [], paidPayments: []
        }
      }
      const st = realStatus(p)
      if (st === 'overdue') groups[key].overduePayments.push(p)
      else if (st === 'paid') groups[key].paidPayments.push(p)
      else if (!groups[key].currentPayment) groups[key].currentPayment = p
    })
    Object.values(groups).forEach(g => {
      g.paidPayments.sort((a, b) => new Date(b.paid_date || b.due_date) - new Date(a.paid_date || a.due_date))
    })
    return Object.values(groups)
  }

  const tenantGroups = loading ? [] : getTenantGroups()
  const filtered = tenantGroups.filter(g => {
    if (!filter) return true
    if (filter === 'overdue') return g.overduePayments.length > 0
    if (filter === 'pending') return g.currentPayment
    if (filter === 'paid') return g.paidPayments.length > 0 && !g.currentPayment && g.overduePayments.length === 0
    return true
  })
  const sorted = [...filtered].sort((a, b) => {
    return (a.overduePayments.length > 0 ? 0 : 1) - (b.overduePayments.length > 0 ? 0 : 1)
  })

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

  const sendEmail = async (payment, type) => {
    const tenantEmail = payment.tenants?.email
    if (!tenantEmail) { showToast('Kiracinin e-posta adresi bulunamadi.', 'error'); return false }
    const { data: { session } } = await supabase.auth.getSession()
    const landlordName = session?.user?.email?.split('@')[0] || 'Mulk Sahibi'
    const diff = daysDiff(payment.due_date)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        status: result.success ? 'sent' : 'failed', error_message: result.error || null
      })
      if (result.success) { showToast(`Mail gonderildi: ${tenantEmail}`, 'success'); return true }
      showToast('Mail gonderilemedi: ' + (result.error || 'Bilinmeyen hata'), 'error'); return false
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
    showToast('Odeme geri alindi.', 'success'); loadPayments()
  }

  const toggleExpand = (tenantId) => setExpandedTenant(prev => prev === tenantId ? null : tenantId)

  const getMainPayment = (group) => {
    if (group.overduePayments.length > 0) return group.overduePayments[0]
    return group.currentPayment
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Stat Cards */}
      <div className="stat-grid">
        {[
          { icon: DollarSign, color: 'green', value: totalCollected.toLocaleString('tr-TR'), label: `Bu Ay Tahsil (\u20BA)` },
          { icon: Clock, color: 'amber', value: totalPending.toLocaleString('tr-TR'), label: `Bu Ay Bekleyen (\u20BA)` },
          { icon: XCircle, color: 'red', value: overdueCount, label: 'Geciken Odeme' },
          { icon: CreditCard, color: 'blue', value: totalAll.toLocaleString('tr-TR'), label: `Toplam Tahsilat (\u20BA)` }
        ].map((s, i) => (
          <motion.div key={i} variants={fadeUp} className="stat-card">
            <div className={`stat-icon-box ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="stat-info">
              <div className="stat-number"><span>{s.value}</span></div>
              <div className="stat-label">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <motion.div variants={fadeUp} className="table-controls">
        <div className="table-search">
          <Search className="w-4 h-4" style={{ stroke: 'var(--text-muted)' }} />
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
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <th>Kiraci</th><th>Daire</th><th>Vade Tarihi</th>
              <th>Tutar ({'\u20BA'})</th><th>Durum</th><th>Kalan Gun</th><th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Yukleniyor...</td></tr>
            ) : error ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--red)' }}>Hata: {error}</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                {filter ? 'Bu filtreye uygun odeme bulunamadi.' : 'Henuz odeme kaydi yok.'}
              </td></tr>
            ) : sorted.map(group => {
              const mainPayment = getMainPayment(group)
              const isExpanded = expandedTenant === group.tenantId
              const hasPaidHistory = group.paidPayments.length > 0
              const hasExtraOverdue = group.overduePayments.length > 1
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
                  <tr
                    onClick={() => (hasPaidHistory || hasExtraOverdue) && toggleExpand(group.tenantId)}
                    style={{ cursor: (hasPaidHistory || hasExtraOverdue) ? 'pointer' : 'default' }}
                  >
                    <td style={{ width: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
                      {(hasPaidHistory || hasExtraOverdue) && (
                        <ChevronDown className="w-4 h-4 transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
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
                            <Check className="w-3.5 h-3.5" /> Odendi
                          </button>
                          <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={(e) => { e.stopPropagation(); sendReminder(mainPayment) }} title="Hatirlatma maili gonder">
                            <Mail className="w-3.5 h-3.5" /> Hatirla
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0, background: 'var(--bg-secondary, #f8f9fa)' }}>
                        <div style={{ padding: '12px 16px 12px 44px' }}>
                          {group.overduePayments.length > 1 && (
                            <>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', marginBottom: 8 }}>Geciken Odemeler</div>
                              {group.overduePayments.slice(1).map(p => {
                                const d = daysDiff(p.due_date)
                                return (
                                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '140px 100px 1fr auto', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                                    <span>{formatDate(p.due_date)}</span>
                                    <span>{Number(p.amount).toLocaleString('tr-TR')} {'\u20BA'}</span>
                                    <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: 12 }}>{Math.abs(d)} gun gecikti</span>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={(e) => markAsPaid(e, p.id)}>Odendi</button>
                                      <button className="btn btn-outline" style={{ fontSize: 11, padding: '3px 8px' }} onClick={(e) => { e.stopPropagation(); sendReminder(p) }}>Hatirla</button>
                                    </div>
                                  </div>
                                )
                              })}
                            </>
                          )}

                          {group.paidPayments.length > 0 && (
                            <>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, marginTop: group.overduePayments.length > 1 ? 16 : 0 }}>
                                Odeme Gecmisi ({group.paidPayments.length})
                              </div>
                              {group.paidPayments.map(p => {
                                const paidLate = p.paid_date && p.due_date && new Date(p.paid_date) > new Date(p.due_date)
                                return (
                                  <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '140px 100px 100px 1fr auto', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                                    <span>{formatDate(p.due_date)}</span>
                                    <span>{Number(p.amount).toLocaleString('tr-TR')} {'\u20BA'}</span>
                                    <span className={`status-badge ${paidLate ? 'pending' : 'active'}`} style={{ fontSize: 11 }}>
                                      {paidLate ? 'Gec Odendi' : 'Zamaninda'}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                      {p.paid_date ? formatDate(p.paid_date) : ''}
                                    </span>
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
      </motion.div>
    </motion.div>
  )
}
