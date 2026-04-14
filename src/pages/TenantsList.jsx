/* ── KiraciYonet — Kiraci Listesi — Lucide + Motion ── */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import {
  Users, Home, XCircle, Clock, Search, Plus,
  Pencil, Trash2, X, Check, MoreVertical
} from 'lucide-react'

function formatDate(dateStr) {
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

const EMPTY_FORM = {
  full_name: '', email: '', phone: '', tc_no: '',
  apartment_id: '', lease_start: '', lease_end: '',
  rent: '', deposit: '', notes: ''
}

const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }

export default function TenantsList() {
  const { showToast } = useToast()
  const [tenants, setTenants] = useState([])
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [openMenu, setOpenMenu] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { loadTenants(); loadApartments() }, [])

  useEffect(() => {
    const handler = (e) => { if (!e.target.closest('.action-menu')) setOpenMenu(null) }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const loadTenants = async () => {
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('tenants').select('*, apartments(building, unit_no)')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setTenants(data || []); setLoading(false)
  }

  const loadApartments = async () => {
    const { data } = await supabase
      .from('apartments').select('id, building, unit_no, tenants(id)')
      .order('building', { ascending: true })
    setApartments(data || [])
  }

  const vacantApartments = apartments.filter(a => !a.tenants?.[0])

  const total = tenants.length
  const withApartment = tenants.filter(t => t.apartment_id).length
  const withoutApartment = total - withApartment
  const expiringCount = tenants.filter(t => {
    if (!t.lease_end) return false
    const diff = (new Date(t.lease_end) - new Date()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 30
  }).length

  const filtered = tenants.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.full_name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || t.phone.includes(q)
  })

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setShowPopup(true) }

  const openEdit = async (id) => {
    setOpenMenu(null)
    const { data, error: err } = await supabase.from('tenants').select('*').eq('id', id).single()
    if (err || !data) { showToast('Kiraci bulunamadi.', 'error'); return }
    setEditId(id)
    setForm({
      full_name: data.full_name || '', email: data.email || '',
      phone: data.phone || '', tc_no: data.tc_no || '',
      apartment_id: data.apartment_id || '', lease_start: data.lease_start || '',
      lease_end: data.lease_end || '', rent: data.rent || '',
      deposit: data.deposit || '', notes: data.notes || ''
    })
    setShowPopup(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('Oturum suresi dolmus.', 'error'); setSaving(false); return }
    const record = {
      user_id: session.user.id, full_name: form.full_name.trim(),
      email: form.email.trim(), phone: form.phone.trim(), tc_no: form.tc_no.trim(),
      apartment_id: form.apartment_id || null,
      lease_start: form.lease_start || null, lease_end: form.lease_end || null,
      rent: parseFloat(form.rent) || 0, deposit: parseFloat(form.deposit) || 0,
      notes: form.notes.trim()
    }
    let result
    if (editId) result = await supabase.from('tenants').update(record).eq('id', editId).select()
    else result = await supabase.from('tenants').insert(record).select()
    if (result.error) { showToast('Hata: ' + result.error.message, 'error'); setSaving(false); return }
    if (!editId && record.apartment_id && result.data?.[0]) {
      const tenantId = result.data[0].id
      const rentAmount = Number(record.rent) || 0
      if (rentAmount > 0) {
        const paymentRecords = []
        const startDate = record.lease_start ? new Date(record.lease_start) : new Date()
        const now = new Date()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        /* Only create payment records from lease start up to current month */
        for (let i = 0; i < 120; i++) {
          const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate())
          if (dueDate > endOfMonth) break
          paymentRecords.push({
            user_id: session.user.id, tenant_id: tenantId, apartment_id: record.apartment_id,
            due_date: dueDate.toISOString().split('T')[0], amount: rentAmount, status: 'pending'
          })
        }
        if (paymentRecords.length > 0) {
          await supabase.from('rent_payments').insert(paymentRecords)
        }
      }
    }
    setSaving(false)
    showToast(editId ? 'Kiraci guncellendi.' : 'Kiraci eklendi.', 'success')
    setShowPopup(false); loadTenants(); loadApartments()
  }

  const handleDelete = async (id, name) => {
    setOpenMenu(null)
    if (!confirm(name + ' silinsin mi? Bu islem geri alinamaz.')) return
    const { error: err } = await supabase.from('tenants').delete().eq('id', id)
    if (err) { showToast('Silme hatasi: ' + err.message, 'error'); return }
    showToast('Kiraci silindi.', 'success'); loadTenants(); loadApartments()
  }

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Stat Cards */}
      <div className="stat-grid">
        {[
          { icon: Users, color: 'blue', value: total, label: 'Toplam Kiraci' },
          { icon: Home, color: 'green', value: withApartment, label: 'Dairesi Olan' },
          { icon: XCircle, color: 'red', value: withoutApartment, label: 'Dairesiz' },
          { icon: Clock, color: 'amber', value: expiringCount, label: 'Suresi Dolan' }
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
          <input type="text" placeholder="Kiraci ara..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-filter-group">
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Yeni Kiraci
          </button>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="td-check"><input type="checkbox" /></th>
              <th>Ad Soyad</th><th>E-posta</th><th>Telefon</th>
              <th>Daire</th><th>Sozlesme Bitis</th><th>Kira</th><th>Depozito</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Yukleniyor...</td></tr>
            ) : error ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--red)' }}>Hata: {error}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                {search ? 'Arama sonucu bulunamadi.' : 'Henuz kiraci eklenmemis. "Yeni Kiraci" butonuna tiklayin.'}
              </td></tr>
            ) : filtered.map(t => {
              const apt = t.apartments ? `${t.apartments.building} ${t.apartments.unit_no}` : '—'
              const leaseEnd = t.lease_end ? formatDate(t.lease_end) : '—'
              const rentVal = t.rent ? Number(t.rent).toLocaleString('tr-TR') + ' \u20BA' : '—'
              const deposit = t.deposit ? Number(t.deposit).toLocaleString('tr-TR') + ' \u20BA' : '—'
              return (
                <tr key={t.id}>
                  <td className="td-check"><input type="checkbox" /></td>
                  <td>
                    <div className="tenant-cell">
                      <span className="tenant-name">{t.full_name}</span>
                      <span className="tenant-email">{t.email}</span>
                    </div>
                  </td>
                  <td>{t.email || '—'}</td><td>{t.phone || '—'}</td>
                  <td>{apt}</td><td>{leaseEnd}</td><td>{rentVal}</td><td>{deposit}</td>
                  <td className="td-actions">
                    <div className="action-menu">
                      <button className="action-menu-btn" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === t.id ? null : t.id) }}>
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMenu === t.id && (
                        <div className="action-dropdown show">
                          <button onClick={() => openEdit(t.id)}>
                            <Pencil className="w-3.5 h-3.5" /> Duzenle
                          </button>
                          <button onClick={() => handleDelete(t.id, t.full_name)}>
                            <Trash2 className="w-3.5 h-3.5" /> Sil
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
      </motion.div>

      {/* Popup */}
      <AnimatePresence>
        {showPopup && (
          <div className="popup-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPopup(false) }}>
            <motion.div
              className="popup"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="popup-header">
                <h3 className="popup-title">{editId ? 'Kiraci Duzenle' : 'Yeni Kiraci Ekle'}</h3>
                <button className="popup-close" onClick={() => setShowPopup(false)}>
                  <X className="w-5 h-5" />
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
                      <select className="form-input" value={form.apartment_id} onChange={e => updateForm('apartment_id', e.target.value)}>
                        <option value="">Daire secin...</option>
                        {(editId ? apartments.filter(a => !a.tenants?.[0] || a.id === form.apartment_id) : vacantApartments).map(a => (
                          <option key={a.id} value={a.id}>{a.building} — {a.unit_no}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sozlesme Baslangic</label>
                      <input className="form-input" type="date" value={form.lease_start} onChange={e => updateForm('lease_start', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Sozlesme Bitis</label>
                      <input className="form-input" type="date" value={form.lease_end} onChange={e => updateForm('lease_end', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Aylik Kira ({'\u20BA'})</label>
                      <input className="form-input" type="number" min="0" step="0.01" placeholder="0"
                        value={form.rent} onChange={e => updateForm('rent', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Depozito ({'\u20BA'})</label>
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
