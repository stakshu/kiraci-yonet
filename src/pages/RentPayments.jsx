/* ── KiraciYonet — Kira Odemeleri (Faz 6) ── */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

/* ── Tarih formatlama ── */
function formatDate(dateStr) {
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

/* ── Gun farki hesapla ── */
function daysDiff(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

/* ── Gercek durumu hesapla (pending ama vade gecmisse → overdue) ── */
function realStatus(payment) {
  if (payment.status === 'paid') return 'paid'
  const diff = daysDiff(payment.due_date)
  if (diff < 0) return 'overdue'
  return 'pending'
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

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('rent_payments')
      .select('*, tenants(full_name, email), apartments(building, unit_no)')
      .order('due_date', { ascending: true })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setPayments(data || [])
    setLoading(false)
  }

  /* ── Mail gonder ── */
  const sendEmail = async (payment, type) => {
    const tenantName = payment.tenants?.full_name
    const tenantEmail = payment.tenants?.email
    if (!tenantEmail) {
      showToast('Kiracinin e-posta adresi bulunamadi.', 'error')
      return false
    }

    const { data: { session } } = await supabase.auth.getSession()
    const landlordName = session?.user?.email?.split('@')[0] || 'Mulk Sahibi'
    const diff = daysDiff(payment.due_date)

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          tenantName,
          tenantEmail,
          amount: payment.amount,
          dueDate: formatDate(payment.due_date),
          paidDate: formatDate(new Date().toISOString()),
          daysLate: Math.abs(diff),
          landlordName
        })
      })
      const result = await res.json()

      /* Log kaydet */
      await supabase.from('email_logs').insert({
        user_id: session.user.id,
        tenant_id: payment.tenant_id,
        payment_id: payment.id,
        email_type: type,
        recipient: tenantEmail,
        subject: type === 'reminder' ? 'Kira Hatirlatmasi' : type === 'overdue' ? 'Geciken Odeme' : type === 'payment_received' ? 'Odeme Onay' : 'Kira Bildirimi',
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null
      })

      if (result.success) {
        showToast(`Mail gonderildi: ${tenantEmail}`, 'success')
        return true
      } else {
        showToast('Mail gonderilemedi: ' + (result.error || 'Bilinmeyen hata'), 'error')
        return false
      }
    } catch (err) {
      showToast('Mail gonderilemedi: ' + err.message, 'error')
      return false
    }
  }

  /* ── Hatirlatma gonder ── */
  const sendReminder = async (payment) => {
    const st = realStatus(payment)
    const type = st === 'overdue' ? 'overdue' : 'reminder'
    await sendEmail(payment, type)
  }

  /* ── Odendi olarak isaretle ── */
  const markAsPaid = async (id) => {
    const today = new Date().toISOString().split('T')[0]
    const { error: err } = await supabase
      .from('rent_payments')
      .update({ status: 'paid', paid_date: today })
      .eq('id', id)

    if (err) {
      showToast('Hata: ' + err.message, 'error')
      return
    }
    showToast('Odeme kaydedildi.', 'success')

    /* Tesekkur maili gonder */
    const payment = payments.find(p => p.id === id)
    if (payment?.tenants?.email) {
      sendEmail(payment, 'payment_received')
    }

    loadPayments()
  }

  /* ── Odenmedi olarak geri al ── */
  const markAsUnpaid = async (id) => {
    const { error: err } = await supabase
      .from('rent_payments')
      .update({ status: 'pending', paid_date: null })
      .eq('id', id)

    if (err) {
      showToast('Hata: ' + err.message, 'error')
      return
    }
    showToast('Odeme geri alindi.', 'success')
    loadPayments()
  }

  /* ── Istatistikler ── */
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.due_date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const totalCollected = thisMonthPayments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const totalPending = thisMonthPayments
    .filter(p => realStatus(p) === 'pending')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const overdueCount = payments.filter(p => realStatus(p) === 'overdue').length

  const totalAll = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  /* ── Filtreleme ── */
  const filtered = payments.filter(p => {
    const st = realStatus(p)
    if (!filter) return true
    return st === filter
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
            <div className="stat-number"><span>{totalCollected.toLocaleString('tr-TR')}</span></div>
            <div className="stat-label">Bu Ay Tahsil (₺)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box amber">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{totalPending.toLocaleString('tr-TR')}</span></div>
            <div className="stat-label">Bu Ay Bekleyen (₺)</div>
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
            <div className="stat-label">Toplam Tahsilat (₺)</div>
          </div>
        </div>
      </div>

      {/* Table Controls */}
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
              <th>Kiraci</th>
              <th>Daire</th>
              <th>Vade Tarihi</th>
              <th>Tutar (₺)</th>
              <th>Durum</th>
              <th>Kalan Gun</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Yukleniyor...</td></tr>
            ) : error ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--red)' }}>Hata: {error}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                {filter ? 'Bu filtreye uygun odeme bulunamadi.' : 'Henuz odeme kaydi yok. Kiraci eklediginizde otomatik olusturulacak.'}
              </td></tr>
            ) : filtered.map(p => {
              const st = realStatus(p)
              const cfg = STATUS_CONFIG[st]
              const diff = daysDiff(p.due_date)
              const tenantName = p.tenants?.full_name || '—'
              const aptName = p.apartments ? `${p.apartments.building} ${p.apartments.unit_no}` : '—'

              let dayLabel = ''
              if (st === 'paid') {
                dayLabel = p.paid_date ? formatDate(p.paid_date) : '—'
              } else if (st === 'overdue') {
                dayLabel = Math.abs(diff) + ' gun gecikti'
              } else {
                if (diff === 0) dayLabel = 'Bugun'
                else if (diff === 1) dayLabel = 'Yarin'
                else dayLabel = diff + ' gun kaldi'
              }

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
                  <td>{Number(p.amount).toLocaleString('tr-TR')}</td>
                  <td><span className={`status-badge ${cfg.css}`}>{cfg.label}</span></td>
                  <td style={{ color: st === 'overdue' ? 'var(--red)' : st === 'pending' && diff <= 3 ? 'var(--amber)' : 'var(--text-muted)', fontWeight: st === 'overdue' ? 600 : 400 }}>
                    {dayLabel}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {st === 'paid' ? (
                        <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => markAsUnpaid(p.id)}>
                          Geri Al
                        </button>
                      ) : (
                        <>
                          <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => markAsPaid(p.id)}>
                            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12"/></svg>
                            Odendi
                          </button>
                          <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => sendReminder(p)} title="Hatirlatma maili gonder">
                            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            Hatirla
                          </button>
                        </>
                      )}
                    </div>
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
