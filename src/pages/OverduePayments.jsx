/* ── KiraciYonet — Geciken Odemeler ── */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { apartmentLabel, buildingLabel } from '../lib/apartmentLabel'

/* ── Tarih formatlama ── */
function formatDate(dateStr) {
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

/* ── Gun farki ── */
function daysDiff(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

export default function OverduePayments() {
  const { showToast } = useToast()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadOverdue()
  }, [])

  const loadOverdue = async () => {
    setLoading(true)
    setError(null)
    const today = new Date().toISOString().split('T')[0]
    const { data, error: err } = await supabase
      .from('rent_payments')
      .select('*, tenants(full_name, email, phone), apartments(unit_no, floor_no, buildings(name))')
      .eq('status', 'pending')
      .lt('due_date', today)
      .order('due_date', { ascending: true })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setPayments(data || [])
    setLoading(false)
  }

  /* ── Odendi isaretle ── */
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
    loadOverdue()
  }

  /* ── Hatirlatma gonder ── */
  const sendReminder = async (payment) => {
    const tenantEmail = payment.tenants?.email
    if (!tenantEmail) {
      showToast('Kiracinin e-posta adresi bulunamadi.', 'error')
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    const landlordName = session?.user?.email?.split('@')[0] || 'Mulk Sahibi'
    const diff = daysDiff(payment.due_date)

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'overdue',
          tenantName: payment.tenants?.full_name,
          tenantEmail,
          amount: payment.amount,
          dueDate: formatDate(payment.due_date),
          daysLate: Math.abs(diff),
          landlordName
        })
      })
      const result = await res.json()

      await supabase.from('email_logs').insert({
        user_id: session.user.id,
        tenant_id: payment.tenant_id,
        payment_id: payment.id,
        email_type: 'overdue',
        recipient: tenantEmail,
        subject: 'Geciken Odeme',
        status: result.success ? 'sent' : 'failed',
        error_message: result.error || null
      })

      if (result.success) {
        showToast(`Hatirlatma gonderildi: ${tenantEmail}`, 'success')
      } else {
        showToast('Mail gonderilemedi: ' + (result.error || 'Bilinmeyen hata'), 'error')
      }
    } catch (err) {
      showToast('Mail gonderilemedi: ' + err.message, 'error')
    }
  }

  /* ── Istatistikler ── */
  const totalOverdue = payments.length
  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const uniqueTenants = new Set(payments.map(p => p.tenant_id)).size
  const maxDays = payments.length > 0
    ? Math.max(...payments.map(p => Math.abs(daysDiff(p.due_date))))
    : 0

  /* ── Arama filtresi ── */
  const filtered = payments.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (p.tenants?.full_name || '').toLowerCase().includes(q) ||
           buildingLabel(p.apartments).toLowerCase().includes(q) ||
           (p.apartments?.unit_no || '').toLowerCase().includes(q)
  })

  return (
    <>
      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon-box red">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{totalOverdue}</span></div>
            <div className="stat-label">Geciken Odeme</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box amber">
            <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{totalAmount.toLocaleString('tr-TR')}</span></div>
            <div className="stat-label">Toplam Geciken ({'\u20BA'})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box blue">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{uniqueTenants}</span></div>
            <div className="stat-label">Borclu Kiraci</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box red">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{maxDays}</span></div>
            <div className="stat-label">En Fazla Gecikme (Gun)</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="table-controls">
        <div className="table-search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Kiraci veya bina ara..." value={search} onChange={e => setSearch(e.target.value)} />
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
              <th>Tutar ({'\u20BA'})</th>
              <th>Gecikme</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Yukleniyor...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--red)' }}>Hata: {error}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                {search ? 'Aramayla eslesen geciken odeme bulunamadi.' : 'Geciken odeme bulunmuyor.'}
              </td></tr>
            ) : filtered.map(p => {
              const diff = Math.abs(daysDiff(p.due_date))
              const tenantName = p.tenants?.full_name || '—'
              const aptName = apartmentLabel(p.apartments)

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
                  <td style={{ color: 'var(--red)', fontWeight: 600 }}>
                    {diff} gun gecikti
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => markAsPaid(p.id)}>
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12"/></svg>
                        Odendi
                      </button>
                      <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => sendReminder(p)} title="Gecikme hatirlatmasi gonder">
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        Hatirla
                      </button>
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
