/* ── KiraciYonet — Mulklerim — Lucide + Motion ── */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import {
  Building2, Users, Home, DollarSign, Search, Plus,
  Pencil, Trash2, X, Check
} from 'lucide-react'

function formatDate(dateStr) {
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

const PROPERTY_TYPES = {
  daire: 'Daire', mustakil: 'Mustakil Ev', villa: 'Villa',
  dukkan: 'Dukkan', ofis: 'Ofis', arsa: 'Arsa', diger: 'Diger'
}

const EMPTY_FORM = {
  building: '', unit_no: '', city: '', district: '', address: '',
  property_type: 'daire', room_count: '', floor_no: '',
  m2_gross: '', m2_net: '', furnished: false, building_age: '',
  deposit: '', notes: ''
}

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }

export default function Properties() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showPopup, setShowPopup] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('apartments')
      .select('*, tenants(id, full_name, email, lease_start, lease_end, rent)')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setApartments(data || []); setLoading(false)
  }

  const total = apartments.length
  const occupied = apartments.filter(a => a.tenants?.[0]).length
  const vacant = apartments.filter(a => !a.tenants?.[0]).length
  const totalRent = apartments.reduce((s, a) => s + Number(a.tenants?.[0]?.rent || 0), 0)

  const filtered = apartments.filter(a => {
    const derivedStatus = a.tenants?.[0] ? 'occupied' : 'vacant'
    if (statusFilter && derivedStatus !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (a.building || '').toLowerCase().includes(q) ||
             (a.unit_no || '').toLowerCase().includes(q) ||
             (a.city || '').toLowerCase().includes(q) ||
             (a.district || '').toLowerCase().includes(q) ||
             (a.tenants?.[0]?.full_name || '').toLowerCase().includes(q)
    }
    return true
  })

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setShowPopup(true) }

  const openEdit = async (e, id) => {
    e.stopPropagation()
    const { data } = await supabase.from('apartments').select('*').eq('id', id).single()
    if (!data) { showToast('Mulk bulunamadi.', 'error'); return }
    setEditId(id)
    setForm({
      building: data.building || '', unit_no: data.unit_no || '',
      city: data.city || '', district: data.district || '',
      address: data.address || '', property_type: data.property_type || 'daire',
      room_count: data.room_count || '', floor_no: data.floor_no || '',
      m2_gross: data.m2_gross || '', m2_net: data.m2_net || '',
      furnished: data.furnished || false, building_age: data.building_age || '',
      deposit: data.deposit || '', notes: data.notes || ''
    })
    setShowPopup(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('Oturum suresi dolmus.', 'error'); setSaving(false); return }
    const record = {
      user_id: session.user.id,
      building: form.building.trim(), unit_no: form.unit_no.trim(),
      city: form.city.trim(), district: form.district.trim(),
      address: form.address.trim(), property_type: form.property_type,
      room_count: form.room_count.trim(), floor_no: form.floor_no.trim(),
      m2_gross: parseFloat(form.m2_gross) || null, m2_net: parseFloat(form.m2_net) || null,
      furnished: form.furnished, building_age: parseInt(form.building_age) || null,
      deposit: parseFloat(form.deposit) || 0, notes: form.notes.trim()
    }
    let result
    if (editId) result = await supabase.from('apartments').update(record).eq('id', editId)
    else result = await supabase.from('apartments').insert(record)
    setSaving(false)
    if (result.error) { showToast('Hata: ' + result.error.message, 'error'); return }
    showToast(editId ? 'Mulk guncellendi.' : 'Mulk eklendi.', 'success')
    setShowPopup(false); loadData()
  }

  const handleDelete = async (e, id, name) => {
    e.stopPropagation()
    if (!confirm(name + ' silinsin mi?')) return
    const { error: err } = await supabase.from('apartments').delete().eq('id', id)
    if (err) { showToast('Hata: ' + err.message, 'error'); return }
    showToast('Mulk silindi.', 'success'); loadData()
  }

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Stat Cards */}
      <div className="stat-grid">
        {[
          { icon: Building2, color: 'blue', value: total, label: 'Toplam Mulk' },
          { icon: Users, color: 'green', value: occupied, label: 'Kirada' },
          { icon: Home, color: 'red', value: vacant, label: 'Bosta' },
          { icon: DollarSign, color: 'green', value: totalRent.toLocaleString('tr-TR'), label: `Aylik Kira (\u20BA)` }
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
          <input type="text" placeholder="Mulk veya kiraci ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-filter-group">
          <select className="filter-btn" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ cursor: 'pointer', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}>
            <option value="">Tum Durumlar</option>
            <option value="occupied">Kirada</option>
            <option value="vacant">Bosta</option>
          </select>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus className="w-4 h-4" />
            Yeni Mulk
          </button>
        </div>
      </motion.div>

      {/* Property Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Yukleniyor...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--red)' }}>Hata: {error}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          {search || statusFilter ? 'Filtreyle eslesen mulk bulunamadi.' : 'Henuz mulk eklenmemis. "Yeni Mulk" butonuna tiklayin.'}
        </div>
      ) : (
        <div className="property-list">
          {filtered.map((apt, i) => {
            const tenant = apt.tenants?.[0]
            const isOccupied = !!tenant
            const statusLabel = isOccupied ? 'Kirada' : 'Bosta'
            const statusCss = isOccupied ? 'active' : 'inactive'
            const location = [apt.district, apt.city].filter(Boolean).join(', ')
            const fullAddress = apt.address ? `${apt.address}${location ? ', ' + location : ''}` : location || '—'

            return (
              <motion.div
                key={apt.id}
                variants={fadeUp}
                whileHover={{ y: -2 }}
                className="property-card"
                onClick={() => navigate(`/properties/${apt.id}`)}
              >
                <div className="property-card-top">
                  <div className="property-card-info">
                    <span className={`status-badge ${statusCss}`}>{statusLabel}</span>
                    <h3 className="property-card-title">
                      {apt.building}{apt.unit_no ? ` — No: ${apt.unit_no}` : ''}
                    </h3>
                    <p className="property-card-address">{fullAddress}</p>
                  </div>
                  <div className="property-card-actions">
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px' }} onClick={(e) => openEdit(e, apt.id)}>
                      <Pencil className="w-3.5 h-3.5" /> Duzenle
                    </button>
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px', color: 'var(--red)' }} onClick={(e) => handleDelete(e, apt.id, apt.building + ' ' + apt.unit_no)}>
                      <Trash2 className="w-3.5 h-3.5" /> Sil
                    </button>
                  </div>
                </div>
                <div className="property-card-details">
                  <div className="property-card-detail">
                    <span className="property-detail-label">Depozito</span>
                    <span className="property-detail-value">{apt.deposit ? Number(apt.deposit).toLocaleString('tr-TR') + ' \u20BA' : '—'}</span>
                  </div>
                  {tenant ? (
                    <>
                      <div className="property-card-divider" />
                      <div className="property-card-detail">
                        <span className="property-detail-label">Kiraci</span>
                        <span className="property-detail-value">{tenant.full_name}</span>
                      </div>
                      <div className="property-card-detail">
                        <span className="property-detail-label">Kira</span>
                        <span className="property-detail-value">{tenant.rent ? Number(tenant.rent).toLocaleString('tr-TR') + ' \u20BA' : '—'}</span>
                      </div>
                      <div className="property-card-detail">
                        <span className="property-detail-label">Sozlesme Baslangic</span>
                        <span className="property-detail-value">{tenant.lease_start ? formatDate(tenant.lease_start) : '—'}</span>
                      </div>
                      <div className="property-card-detail">
                        <span className="property-detail-label">Sozlesme Bitis</span>
                        <span className="property-detail-value">{tenant.lease_end ? formatDate(tenant.lease_end) : '—'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="property-card-divider" />
                      <div className="property-card-detail" style={{ gridColumn: '1 / -1' }}>
                        <span className="property-detail-label" style={{ color: 'var(--text-muted)' }}>Kiraci bulunmuyor — Sozlesme ekleyin</span>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Popup */}
      <AnimatePresence>
        {showPopup && (
          <div className="popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPopup(false) }}>
            <motion.div
              className="popup"
              style={{ maxWidth: 720 }}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="popup-header">
                <h3 className="popup-title">{editId ? 'Mulk Duzenle' : 'Yeni Mulk Ekle'}</h3>
                <button className="popup-close" onClick={() => setShowPopup(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSave}>
                <div className="popup-body">
                  <div className="popup-grid">
                    <div className="form-group">
                      <label className="form-label">Mulk Adi / Bina *</label>
                      <input className="form-input" type="text" placeholder="Opus Sitesi" required
                        value={form.building} onChange={e => updateForm('building', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">No / Daire *</label>
                      <input className="form-input" type="text" placeholder="2/10" required
                        value={form.unit_no} onChange={e => updateForm('unit_no', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mulk Tipi</label>
                      <select className="form-input" value={form.property_type} onChange={e => updateForm('property_type', e.target.value)}>
                        {Object.entries(PROPERTY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sehir</label>
                      <input className="form-input" type="text" placeholder="Istanbul" value={form.city} onChange={e => updateForm('city', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ilce</label>
                      <input className="form-input" type="text" placeholder="Kadikoy" value={form.district} onChange={e => updateForm('district', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Oda Sayisi</label>
                      <input className="form-input" type="text" placeholder="2+1" value={form.room_count} onChange={e => updateForm('room_count', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: 14 }}>
                    <label className="form-label">Adres</label>
                    <input className="form-input" type="text" placeholder="Mahalle, Sokak, No"
                      value={form.address} onChange={e => updateForm('address', e.target.value)} />
                  </div>
                  <div className="popup-grid" style={{ marginTop: 14 }}>
                    <div className="form-group">
                      <label className="form-label">Kat</label>
                      <input className="form-input" type="text" placeholder="3" value={form.floor_no} onChange={e => updateForm('floor_no', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Brut m2</label>
                      <input className="form-input" type="number" min="0" step="0.01" placeholder="120" value={form.m2_gross} onChange={e => updateForm('m2_gross', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Net m2</label>
                      <input className="form-input" type="number" min="0" step="0.01" placeholder="100" value={form.m2_net} onChange={e => updateForm('m2_net', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bina Yasi</label>
                      <input className="form-input" type="number" min="0" placeholder="5" value={form.building_age} onChange={e => updateForm('building_age', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Depozito ({'\u20BA'})</label>
                      <input className="form-input" type="number" min="0" step="0.01" placeholder="0" value={form.deposit} onChange={e => updateForm('deposit', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                      <input type="checkbox" id="furnished" checked={form.furnished} onChange={e => updateForm('furnished', e.target.checked)} style={{ width: 16, height: 16 }} />
                      <label htmlFor="furnished" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Esyali</label>
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
                    <Check className="w-4 h-4" />
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
