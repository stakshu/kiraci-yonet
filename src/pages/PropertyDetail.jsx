/* ── KiraciYonet — Mulk Detay Sayfasi ── */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

const PROPERTY_TYPES = {
  daire: 'Daire', mustakil: 'Mustakil Ev', villa: 'Villa',
  dukkan: 'Dukkan', ofis: 'Ofis', arsa: 'Arsa', diger: 'Diger'
}

const TABS = [
  { key: 'overview', label: 'Mulk Detaylari' },
  { key: 'payments', label: 'Odeme Akisi' },
  { key: 'tenant', label: 'Kiraci Bilgileri' },
]

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [apt, setApt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  useEffect(() => {
    loadProperty()
  }, [id])

  useEffect(() => {
    if (tab === 'payments' && apt) loadPayments()
  }, [tab, apt])

  const loadProperty = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('apartments')
      .select('*, tenants(id, full_name, email, phone, tc_no, lease_start, lease_end, deposit, notes)')
      .eq('id', id)
      .single()

    if (error || !data) {
      showToast('Mulk bulunamadi.', 'error')
      navigate('/properties')
      return
    }
    setApt(data)
    setLoading(false)
  }

  const loadPayments = async () => {
    setPaymentsLoading(true)
    const { data } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('apartment_id', id)
      .order('due_date', { ascending: false })

    setPayments(data || [])
    setPaymentsLoading(false)
  }

  const markAsPaid = async (paymentId) => {
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('rent_payments')
      .update({ status: 'paid', paid_date: today })
      .eq('id', paymentId)

    if (error) { showToast('Hata: ' + error.message, 'error'); return }
    showToast('Odeme kaydedildi.', 'success')
    loadPayments()
  }

  const markAsUnpaid = async (paymentId) => {
    const { error } = await supabase
      .from('rent_payments')
      .update({ status: 'pending', paid_date: null })
      .eq('id', paymentId)

    if (error) { showToast('Hata: ' + error.message, 'error'); return }
    showToast('Odeme geri alindi.', 'success')
    loadPayments()
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Yukleniyor...</div>
  if (!apt) return null

  const tenant = apt.tenants?.[0]
  const isOccupied = apt.status === 'occupied'
  const statusLabel = isOccupied ? 'Kirada' : apt.status === 'expiring' ? 'Sure Doluyor' : 'Bosta'
  const statusCss = isOccupied ? 'active' : apt.status === 'expiring' ? 'pending' : 'inactive'
  const location = [apt.district, apt.city].filter(Boolean).join(', ')

  /* Odeme istatistikleri */
  const paidPayments = payments.filter(p => p.status === 'paid')
  const overduePayments = payments.filter(p => p.status !== 'paid' && daysDiff(p.due_date) < 0)
  const rentDebt = overduePayments.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <>
      {/* Geri butonu */}
      <button className="btn btn-outline" style={{ marginBottom: 16, fontSize: 13, padding: '6px 14px' }}
        onClick={() => navigate('/properties')}>
        <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}><polyline points="15 18 9 12 15 6"/></svg>
        Mulklerime Don
      </button>

      {/* Header */}
      <div className="pd-header">
        <div className="pd-header-left">
          <span className={`status-badge ${statusCss}`}>{statusLabel}</span>
          <h2 className="pd-title">{apt.building}{apt.unit_no ? ` — No: ${apt.unit_no}` : ''}</h2>
          <p className="pd-address">
            {apt.address ? `${apt.address}, ` : ''}{location || '—'}
          </p>
          <div className="pd-quick-stats">
            <div className="pd-quick-stat">
              <span className="pd-quick-label">Guncel Kira</span>
              <span className="pd-quick-value">{apt.rent ? Number(apt.rent).toLocaleString('tr-TR') + ' \u20BA' : '—'}</span>
            </div>
            <div className="pd-quick-stat">
              <span className="pd-quick-label">Depozito</span>
              <span className="pd-quick-value">{apt.deposit ? Number(apt.deposit).toLocaleString('tr-TR') + ' \u20BA' : '—'}</span>
            </div>
          </div>
        </div>

        {/* Sag panel — Kiraci ozet */}
        <div className="pd-tenant-summary">
          {tenant ? (
            <>
              <div className="pd-tenant-avatar">{tenant.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</div>
              <div className="pd-tenant-name">{tenant.full_name}</div>
              <div className="pd-tenant-meta">
                <div className="pd-tenant-meta-row">
                  <span>Kira Borcu</span>
                  <span style={{ color: rentDebt > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>
                    {rentDebt > 0 ? rentDebt.toLocaleString('tr-TR') + ' \u20BA' : '0 \u20BA'}
                  </span>
                </div>
                <div className="pd-tenant-meta-row">
                  <span>Geciken Kira</span>
                  <span style={{ fontWeight: 600 }}>{overduePayments.length}</span>
                </div>
                <div className="pd-tenant-meta-row">
                  <span>Sozlesme Baslangic</span>
                  <span>{tenant.lease_start ? formatDate(tenant.lease_start) : '—'}</span>
                </div>
                <div className="pd-tenant-meta-row">
                  <span>Sozlesme Bitis</span>
                  <span>{tenant.lease_end ? formatDate(tenant.lease_end) : '—'}</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: 16 }}>
              Kiraci bulunmuyor
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="pd-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`pd-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pd-tab-content">
        {tab === 'overview' && (
          <>
            <div className="detail-section">
              <h4 className="detail-section-title">Mulk Ozeti</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Mulk Adi</span>
                  <span className="detail-value">{apt.building} {apt.unit_no}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Lokasyon</span>
                  <span className="detail-value">{location || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mulk Tipi</span>
                  <span className="detail-value">{PROPERTY_TYPES[apt.property_type] || apt.property_type || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Oda Sayisi</span>
                  <span className="detail-value">{apt.room_count || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Esyali</span>
                  <span className="detail-value">{apt.furnished ? 'Evet' : 'Hayir'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Kat</span>
                  <span className="detail-value">{apt.floor_no || '—'}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4 className="detail-section-title">Temel Bilgiler</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Adres</span>
                  <span className="detail-value">{apt.address || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">m2 (Brut)</span>
                  <span className="detail-value">{apt.m2_gross || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">m2 (Net)</span>
                  <span className="detail-value">{apt.m2_net || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Bina Yasi</span>
                  <span className="detail-value">{apt.building_age != null ? apt.building_age : '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Kira</span>
                  <span className="detail-value">{apt.rent ? Number(apt.rent).toLocaleString('tr-TR') + ' \u20BA' : '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Depozito</span>
                  <span className="detail-value">{apt.deposit ? Number(apt.deposit).toLocaleString('tr-TR') + ' \u20BA' : '—'}</span>
                </div>
              </div>
            </div>

            {apt.notes && (
              <div className="detail-section">
                <h4 className="detail-section-title">Notlar</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{apt.notes}</p>
              </div>
            )}
          </>
        )}

        {tab === 'payments' && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vade Tarihi</th>
                  <th>Tutar ({'\u20BA'})</th>
                  <th>Durum</th>
                  <th>Odeme Tarihi</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {paymentsLoading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Yukleniyor...</td></tr>
                ) : payments.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Odeme kaydi bulunamadi.</td></tr>
                ) : payments.map(p => {
                  const isPaid = p.status === 'paid'
                  const diff = daysDiff(p.due_date)
                  const isOverdue = !isPaid && diff < 0

                  return (
                    <tr key={p.id}>
                      <td>{formatDate(p.due_date)}</td>
                      <td>{Number(p.amount).toLocaleString('tr-TR')}</td>
                      <td>
                        <span className={`status-badge ${isPaid ? 'active' : isOverdue ? 'inactive' : 'pending'}`}>
                          {isPaid ? 'Odendi' : isOverdue ? 'Gecikti' : 'Bekliyor'}
                        </span>
                      </td>
                      <td>{p.paid_date ? formatDate(p.paid_date) : '—'}</td>
                      <td>
                        {isPaid ? (
                          <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => markAsUnpaid(p.id)}>Geri Al</button>
                        ) : (
                          <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => markAsPaid(p.id)}>
                            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><polyline points="20 6 9 17 4 12"/></svg>
                            Odendi
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'tenant' && (
          tenant ? (
            <div className="detail-section">
              <h4 className="detail-section-title">Kiraci Bilgileri</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Ad Soyad</span>
                  <span className="detail-value">{tenant.full_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">E-posta</span>
                  <span className="detail-value">{tenant.email || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Telefon</span>
                  <span className="detail-value">{tenant.phone || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">TC No</span>
                  <span className="detail-value">{tenant.tc_no || '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Sozlesme Baslangic</span>
                  <span className="detail-value">{tenant.lease_start ? formatDate(tenant.lease_start) : '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Sozlesme Bitis</span>
                  <span className="detail-value">{tenant.lease_end ? formatDate(tenant.lease_end) : '—'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Depozito</span>
                  <span className="detail-value">{tenant.deposit ? Number(tenant.deposit).toLocaleString('tr-TR') + ' \u20BA' : '—'}</span>
                </div>
              </div>
              {tenant.notes && (
                <div style={{ marginTop: 16 }}>
                  <span className="detail-label">Notlar</span>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>{tenant.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              Bu mulkte kiraci bulunmuyor.
            </div>
          )
        )}
      </div>
    </>
  )
}
