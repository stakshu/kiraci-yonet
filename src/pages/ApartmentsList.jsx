/* ── KiraciYonet — Daire Listesi (Faz 3 CRUD) ── */
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

/* ── Tarih formatlama ── */
function formatDate(dateStr) {
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

/* ── Durum haritasi ── */
const STATUS_MAP = {
  occupied: { label: 'Dolu', css: 'active' },
  vacant:   { label: 'Bos', css: 'inactive' },
  expiring: { label: 'Sure Doluyor', css: 'pending' }
}

/* ── Bos form verisi ── */
const EMPTY_FORM = {
  building: '', unit_no: '', city: '', district: '',
  tenant_name: '', rent: '', lease_end: '', status: 'vacant', notes: ''
}

export default function ApartmentsList() {
  const { showToast } = useToast()
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /* Popup state */
  const [showPopup, setShowPopup] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  /* Action menu state */
  const [openMenu, setOpenMenu] = useState(null)

  /* Detail modal state */
  const [detailApt, setDetailApt] = useState(null)

  useEffect(() => {
    loadApartments()
  }, [])

  /* Sayfa disina tiklandiginda action menu kapat */
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.action-menu')) setOpenMenu(null)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  /* ── Daireleri yukle ── */
  const loadApartments = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('apartments')
      .select('*, tenants(id, full_name, email, phone, lease_start, lease_end, deposit)')
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setApartments(data || [])
    setLoading(false)
  }

  /* ── Istatistikler ── */
  const total = apartments.length
  const occupied = apartments.filter(d => d.status === 'occupied').length
  const vacant = apartments.filter(d => d.status === 'vacant').length

  /* ── Popup ac ── */
  const openAdd = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowPopup(true)
  }

  const openEdit = async (id) => {
    setOpenMenu(null)
    const { data, error: err } = await supabase
      .from('apartments').select('*').eq('id', id).single()
    if (err || !data) {
      showToast('Daire bulunamadi.', 'error')
      return
    }
    setEditId(id)
    setForm({
      building: data.building || '',
      unit_no: data.unit_no || '',
      city: data.city || '',
      district: data.district || '',
      tenant_name: data.tenant_name || '',
      rent: data.rent || '',
      lease_end: data.lease_end || '',
      status: data.status || 'vacant',
      notes: data.notes || ''
    })
    setShowPopup(true)
  }

  /* ── Kaydet ── */
  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      showToast('Oturum suresi dolmus. Lutfen tekrar giris yapin.', 'error')
      setSaving(false)
      return
    }

    const record = {
      user_id: session.user.id,
      building: form.building.trim(),
      unit_no: form.unit_no.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      tenant_name: form.tenant_name.trim(),
      rent: parseFloat(form.rent) || 0,
      lease_end: form.lease_end || null,
      status: form.status,
      notes: form.notes.trim()
    }

    let result
    if (editId) {
      result = await supabase.from('apartments').update(record).eq('id', editId)
    } else {
      result = await supabase.from('apartments').insert(record)
    }

    setSaving(false)

    if (result.error) {
      showToast('Hata: ' + result.error.message, 'error')
      return
    }

    showToast(editId ? 'Daire guncellendi.' : 'Daire eklendi.', 'success')
    setShowPopup(false)
    loadApartments()
  }

  /* ── Sil ── */
  const handleDelete = async (id, name) => {
    setOpenMenu(null)
    if (!confirm(name + ' silinsin mi? Bu islem geri alinamaz.')) return

    const { error: err } = await supabase.from('apartments').delete().eq('id', id)
    if (err) {
      showToast('Silme hatasi: ' + err.message, 'error')
      return
    }
    showToast('Daire silindi.', 'success')
    loadApartments()
  }

  /* ── Form degisiklik handler ── */
  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <>
      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon-box blue">
            <svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{total}</span></div>
            <div className="stat-label">Toplam Daire</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box green">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{occupied}</span></div>
            <div className="stat-label">Dolu Daire</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box red">
            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="9" y1="22" x2="9" y2="12"/><line x1="15" y1="22" x2="15" y2="12"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{vacant}</span></div>
            <div className="stat-label">Bos Daire</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box amber">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>--</span></div>
            <div className="stat-label">Bekleyen Odeme</div>
          </div>
        </div>
      </div>

      {/* Table Controls */}
      <div className="table-controls">
        <div className="table-search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Daire ara..." />
        </div>
        <div className="table-filter-group">
          <select className="filter-btn" style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
            <option value="">Tum Durumlar</option>
            <option value="occupied">Dolu</option>
            <option value="vacant">Bos</option>
            <option value="expiring">Sure Doluyor</option>
          </select>
          <button className="btn btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Yeni Daire
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="td-check"><input type="checkbox" /></th>
              <th>Bina / Konum</th>
              <th>Daire No</th>
              <th>Kiraci</th>
              <th>Kira (&#8378;)</th>
              <th>Sozlesme Bitis</th>
              <th>Durum</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Yukleniyor...</td></tr>
            ) : error ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--red)' }}>Hata: {error}</td></tr>
            ) : apartments.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Henuz daire eklenmemis. "Yeni Daire" butonuna tiklayin.</td></tr>
            ) : apartments.map(apt => {
              const st = STATUS_MAP[apt.status] || STATUS_MAP.vacant
              const rent = apt.rent ? Number(apt.rent).toLocaleString('tr-TR') : '—'
              const leaseEnd = apt.lease_end ? formatDate(apt.lease_end) : '—'
              const tenantObj = apt.tenants?.[0]
              const tenantName = tenantObj?.full_name || apt.tenant_name || '—'

              return (
                <tr key={apt.id} onClick={() => setDetailApt(apt)} style={{ cursor: 'pointer' }}>
                  <td className="td-check"><input type="checkbox" onClick={e => e.stopPropagation()} /></td>
                  <td>
                    <div className="tenant-cell">
                      <span className="tenant-name">{apt.building}</span>
                      <span className="tenant-email">{apt.district}, {apt.city}</span>
                    </div>
                  </td>
                  <td className="td-id">{apt.unit_no}</td>
                  <td>{tenantName}</td>
                  <td>{rent}</td>
                  <td>{leaseEnd}</td>
                  <td><span className={`status-badge ${st.css}`}>{st.label}{tenantObj && apt.status === 'occupied' ? ` — ${tenantObj.full_name}` : ''}</span></td>
                  <td className="td-actions" onClick={e => e.stopPropagation()}>
                    <div className="action-menu">
                      <button className="action-menu-btn" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === apt.id ? null : apt.id) }}>
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
                      </button>
                      {openMenu === apt.id && (
                        <div className="action-dropdown show">
                          <button onClick={() => openEdit(apt.id)}>
                            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Duzenle
                          </button>
                          <button onClick={() => handleDelete(apt.id, apt.building + ' ' + apt.unit_no)}>
                            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            Sil
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Popup */}
      {showPopup && (
        <div className="popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPopup(false) }}>
          <div className="popup">
            <div className="popup-header">
              <h3 className="popup-title">{editId ? 'Daire Duzenle' : 'Yeni Daire Ekle'}</h3>
              <button className="popup-close" onClick={() => setShowPopup(false)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="popup-body">
                <div className="popup-grid">
                  <div className="form-group">
                    <label className="form-label">Bina Adi *</label>
                    <input className="form-input" type="text" placeholder="Gunes Apt." required
                      value={form.building} onChange={e => updateForm('building', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Daire No *</label>
                    <input className="form-input" type="text" placeholder="D-001" required
                      value={form.unit_no} onChange={e => updateForm('unit_no', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sehir</label>
                    <input className="form-input" type="text" placeholder="Istanbul"
                      value={form.city} onChange={e => updateForm('city', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ilce</label>
                    <input className="form-input" type="text" placeholder="Kadikoy"
                      value={form.district} onChange={e => updateForm('district', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kiraci Adi</label>
                    <input className="form-input" type="text" placeholder="Bos birakilabilir"
                      value={form.tenant_name} onChange={e => updateForm('tenant_name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Aylik Kira (&#8378;)</label>
                    <input className="form-input" type="number" min="0" step="0.01" placeholder="0"
                      value={form.rent} onChange={e => updateForm('rent', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sozlesme Bitis</label>
                    <input className="form-input" type="date"
                      value={form.lease_end} onChange={e => updateForm('lease_end', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Durum</label>
                    <select className="form-input"
                      value={form.status} onChange={e => updateForm('status', e.target.value)}>
                      <option value="vacant">Bos</option>
                      <option value="occupied">Dolu</option>
                      <option value="expiring">Sure Doluyor</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label className="form-label">Notlar</label>
                  <textarea className="form-input" rows={2} placeholder="Opsiyonel notlar..."
                    value={form.notes} onChange={e => updateForm('notes', e.target.value)} />
                </div>
              </div>
              <div className="popup-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPopup(false)}>Iptal</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailApt && (() => {
        const t = detailApt.tenants?.[0]
        const st = STATUS_MAP[detailApt.status] || STATUS_MAP.vacant
        return (
          <div className="popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDetailApt(null) }}>
            <div className="popup">
              <div className="popup-header">
                <h3 className="popup-title">{detailApt.building} — {detailApt.unit_no}</h3>
                <button className="popup-close" onClick={() => setDetailApt(null)}>
                  <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="popup-body">
                <div className="detail-section">
                  <h4 className="detail-section-title">Daire Bilgileri</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Bina</span>
                      <span className="detail-value">{detailApt.building}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Daire No</span>
                      <span className="detail-value">{detailApt.unit_no}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Sehir</span>
                      <span className="detail-value">{detailApt.city || '—'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Ilce</span>
                      <span className="detail-value">{detailApt.district || '—'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Kira</span>
                      <span className="detail-value">{detailApt.rent ? Number(detailApt.rent).toLocaleString('tr-TR') + ' ₺' : '—'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Durum</span>
                      <span className={`status-badge ${st.css}`}>{st.label}</span>
                    </div>
                  </div>
                </div>

                {t ? (
                  <div className="detail-section">
                    <h4 className="detail-section-title">Kiraci Bilgileri</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="detail-label">Ad Soyad</span>
                        <span className="detail-value">{t.full_name}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">E-posta</span>
                        <span className="detail-value">{t.email || '—'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Telefon</span>
                        <span className="detail-value">{t.phone || '—'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Sozlesme Baslangic</span>
                        <span className="detail-value">{t.lease_start ? formatDate(t.lease_start) : '—'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Sozlesme Bitis</span>
                        <span className="detail-value">{t.lease_end ? formatDate(t.lease_end) : '—'}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Depozito</span>
                        <span className="detail-value">{t.deposit ? Number(t.deposit).toLocaleString('tr-TR') + ' ₺' : '—'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="detail-section">
                    <h4 className="detail-section-title">Kiraci Bilgileri</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Bu dairede kiraci bulunmuyor.</p>
                  </div>
                )}
              </div>
              <div className="popup-footer">
                <button className="btn btn-outline" onClick={() => setDetailApt(null)}>Kapat</button>
                <button className="btn btn-primary" onClick={() => { setDetailApt(null); openEdit(detailApt.id) }}>
                  <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Duzenle
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
