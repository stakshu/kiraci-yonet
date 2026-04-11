/* ── KiraciYonet — Kiraci Listesi (Faz 4 CRUD) ── */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

/* ── Tarih formatlama ── */
function formatDate(dateStr) {
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

/* ── Bos form verisi ── */
const EMPTY_FORM = {
  full_name: '', email: '', phone: '', tc_no: '',
  apartment_id: '', lease_start: '', lease_end: '',
  deposit: '', notes: ''
}

export default function TenantsList() {
  const { showToast } = useToast()
  const [tenants, setTenants] = useState([])
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

  /* Search */
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadTenants()
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

  /* ── Kiracilari yukle ── */
  const loadTenants = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('tenants')
      .select('*, apartments(building, unit_no)')
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
    setTenants(data || [])
    setLoading(false)
  }

  /* ── Daireleri yukle (dropdown icin) ── */
  const loadApartments = async () => {
    const { data } = await supabase
      .from('apartments')
      .select('id, building, unit_no, status, rent')
      .order('building', { ascending: true })
    setApartments(data || [])
  }

  /* ── Bos daireler (sadece popup dropdown'unda gosterilecek) ── */
  const vacantApartments = apartments.filter(a => a.status === 'vacant')

  /* ── Istatistikler ── */
  const total = tenants.length
  const withApartment = tenants.filter(t => t.apartment_id).length
  const withoutApartment = total - withApartment
  const expiringCount = tenants.filter(t => {
    if (!t.lease_end) return false
    const diff = (new Date(t.lease_end) - new Date()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 30
  }).length

  /* ── Filtrelenmis kiracilari ── */
  const filtered = tenants.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.full_name.toLowerCase().includes(q) ||
           t.email.toLowerCase().includes(q) ||
           t.phone.includes(q)
  })

  /* ── Popup ac ── */
  const openAdd = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowPopup(true)
  }

  const openEdit = async (id) => {
    setOpenMenu(null)
    const { data, error: err } = await supabase
      .from('tenants').select('*').eq('id', id).single()
    if (err || !data) {
      showToast('Kiraci bulunamadi.', 'error')
      return
    }
    setEditId(id)
    setForm({
      full_name: data.full_name || '',
      email: data.email || '',
      phone: data.phone || '',
      tc_no: data.tc_no || '',
      apartment_id: data.apartment_id || '',
      lease_start: data.lease_start || '',
      lease_end: data.lease_end || '',
      deposit: data.deposit || '',
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

    /* Onceki daire id'sini bul (edit modunda daire degisirse eski daireyi bos yap) */
    let prevApartmentId = null
    if (editId) {
      const existing = tenants.find(t => t.id === editId)
      if (existing) prevApartmentId = existing.apartment_id
    }

    const record = {
      user_id: session.user.id,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      tc_no: form.tc_no.trim(),
      apartment_id: form.apartment_id || null,
      lease_start: form.lease_start || null,
      lease_end: form.lease_end || null,
      deposit: parseFloat(form.deposit) || 0,
      notes: form.notes.trim()
    }

    let result
    if (editId) {
      result = await supabase.from('tenants').update(record).eq('id', editId).select()
    } else {
      result = await supabase.from('tenants').insert(record).select()
    }

    if (result.error) {
      showToast('Hata: ' + result.error.message, 'error')
      setSaving(false)
      return
    }

    /* Daire durumunu guncelle */
    if (record.apartment_id) {
      await supabase.from('apartments').update({ status: 'occupied', tenant_name: record.full_name }).eq('id', record.apartment_id)
    }
    /* Eski daire bos birakildi ise */
    if (prevApartmentId && prevApartmentId !== record.apartment_id) {
      await supabase.from('apartments').update({ status: 'vacant', tenant_name: '' }).eq('id', prevApartmentId)
    }

    /* Yeni kiraci eklendiyse ve daire secildiyse → 12 aylik odeme kaydi olustur */
    if (!editId && record.apartment_id && result.data?.[0]) {
      const tenantId = result.data[0].id
      const apt = apartments.find(a => a.id === record.apartment_id)
      const rentAmount = apt ? Number(apt.rent) || 0 : 0

      if (rentAmount > 0) {
        const paymentRecords = []
        const startDate = record.lease_start ? new Date(record.lease_start) : new Date()
        for (let i = 0; i < 12; i++) {
          const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate())
          paymentRecords.push({
            user_id: session.user.id,
            tenant_id: tenantId,
            apartment_id: record.apartment_id,
            due_date: dueDate.toISOString().split('T')[0],
            amount: rentAmount,
            status: 'pending'
          })
        }
        await supabase.from('rent_payments').insert(paymentRecords)
      }
    }

    setSaving(false)
    showToast(editId ? 'Kiraci guncellendi.' : 'Kiraci eklendi.', 'success')
    setShowPopup(false)
    loadTenants()
    loadApartments()
  }

  /* ── Sil ── */
  const handleDelete = async (id, name) => {
    setOpenMenu(null)
    if (!confirm(name + ' silinsin mi? Bu islem geri alinamaz.')) return

    /* Silinecek kiracinin dairesini bos yap */
    const tenant = tenants.find(t => t.id === id)
    if (tenant?.apartment_id) {
      await supabase.from('apartments').update({ status: 'vacant', tenant_name: '' }).eq('id', tenant.apartment_id)
    }

    const { error: err } = await supabase.from('tenants').delete().eq('id', id)
    if (err) {
      showToast('Silme hatasi: ' + err.message, 'error')
      return
    }
    showToast('Kiraci silindi.', 'success')
    loadTenants()
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
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{total}</span></div>
            <div className="stat-label">Toplam Kiraci</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box green">
            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{withApartment}</span></div>
            <div className="stat-label">Dairesi Olan</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box red">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{withoutApartment}</span></div>
            <div className="stat-label">Dairesiz</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-box amber">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="stat-info">
            <div className="stat-number"><span>{expiringCount}</span></div>
            <div className="stat-label">Suresi Dolan</div>
          </div>
        </div>
      </div>

      {/* Table Controls */}
      <div className="table-controls">
        <div className="table-search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Kiraci ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-filter-group">
          <button className="btn btn-primary" onClick={openAdd}>
            <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Yeni Kiraci
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="td-check"><input type="checkbox" /></th>
              <th>Ad Soyad</th>
              <th>E-posta</th>
              <th>Telefon</th>
              <th>Daire</th>
              <th>Sozlesme Bitis</th>
              <th>Depozito</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Yukleniyor...</td></tr>
            ) : error ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--red)' }}>Hata: {error}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                {search ? 'Arama sonucu bulunamadi.' : 'Henuz kiraci eklenmemis. "Yeni Kiraci" butonuna tiklayin.'}
              </td></tr>
            ) : filtered.map(t => {
              const apt = t.apartments ? `${t.apartments.building} ${t.apartments.unit_no}` : '—'
              const leaseEnd = t.lease_end ? formatDate(t.lease_end) : '—'
              const deposit = t.deposit ? Number(t.deposit).toLocaleString('tr-TR') + ' ₺' : '—'

              return (
                <tr key={t.id}>
                  <td className="td-check"><input type="checkbox" /></td>
                  <td>
                    <div className="tenant-cell">
                      <span className="tenant-name">{t.full_name}</span>
                      <span className="tenant-email">{t.email}</span>
                    </div>
                  </td>
                  <td>{t.email || '—'}</td>
                  <td>{t.phone || '—'}</td>
                  <td>{apt}</td>
                  <td>{leaseEnd}</td>
                  <td>{deposit}</td>
                  <td className="td-actions">
                    <div className="action-menu">
                      <button className="action-menu-btn" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === t.id ? null : t.id) }}>
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
                      </button>
                      {openMenu === t.id && (
                        <div className="action-dropdown show">
                          <button onClick={() => openEdit(t.id)}>
                            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Duzenle
                          </button>
                          <button onClick={() => handleDelete(t.id, t.full_name)}>
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
              <h3 className="popup-title">{editId ? 'Kiraci Duzenle' : 'Yeni Kiraci Ekle'}</h3>
              <button className="popup-close" onClick={() => setShowPopup(false)}>
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="popup-body">
                <div className="popup-grid">
                  <div className="form-group">
                    <label className="form-label">Ad Soyad *</label>
                    <input className="form-input" type="text" placeholder="Ahmet Yilmaz" required
                      value={form.full_name} onChange={e => updateForm('full_name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">E-posta *</label>
                    <input className="form-input" type="email" placeholder="ornek@mail.com" required
                      value={form.email} onChange={e => updateForm('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefon</label>
                    <input className="form-input" type="text" placeholder="0532 123 4567"
                      value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">TC Kimlik</label>
                    <input className="form-input" type="text" placeholder="Opsiyonel" maxLength={11}
                      value={form.tc_no} onChange={e => updateForm('tc_no', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Daire</label>
                    <select className="form-input"
                      value={form.apartment_id} onChange={e => updateForm('apartment_id', e.target.value)}>
                      <option value="">Daire secin...</option>
                      {/* Edit modunda mevcut daireyi de goster */}
                      {(editId ? apartments.filter(a => a.status === 'vacant' || a.id === form.apartment_id) : vacantApartments).map(a => (
                        <option key={a.id} value={a.id}>{a.building} — {a.unit_no}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sozlesme Baslangic</label>
                    <input className="form-input" type="date"
                      value={form.lease_start} onChange={e => updateForm('lease_start', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sozlesme Bitis</label>
                    <input className="form-input" type="date"
                      value={form.lease_end} onChange={e => updateForm('lease_end', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Depozito (&#8378;)</label>
                    <input className="form-input" type="number" min="0" step="0.01" placeholder="0"
                      value={form.deposit} onChange={e => updateForm('deposit', e.target.value)} />
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
    </>
  )
}
