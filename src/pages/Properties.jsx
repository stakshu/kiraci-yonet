/* ── KiraciYonet — Mulklerim — Complete Redesign ── */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import {
  Building2, Plus, Pencil, Trash2, X, Check,
  ChevronDown, AlertCircle, UserPlus
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"
const money = n => Number(n).toLocaleString('tr-TR')

function formatDate(dateStr) {
  if (!dateStr) return '—'
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

/* Animations */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } }
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
}

/* Colors */
const C = {
  teal: '#025864',
  green: '#00D47E',
  red: '#EF4444',
  bg: '#F0F2F5',
  card: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F1F5F9',
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8'
}

export default function Properties() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [apartments, setApartments] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const [showPopup, setShowPopup] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  /* Tenant add popup */
  const [showTenantPopup, setShowTenantPopup] = useState(false)
  const [tenantAptId, setTenantAptId] = useState(null)
  const [tenantAptName, setTenantAptName] = useState('')
  const [tenantForm, setTenantForm] = useState({
    full_name: '', email: '', phone: '', tc_no: '',
    lease_start: '', lease_end: '', rent: '', deposit: ''
  })
  const [savingTenant, setSavingTenant] = useState(false)

  useEffect(() => { ensurePayments().then(() => loadData()) }, [])

  /* Ensure payment records exist up to next month so "Sıradaki Ödeme" is always visible */
  const ensurePayments = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: tenants } = await supabase
      .from('tenants').select('id, apartment_id, lease_start, rent')
      .eq('user_id', session.user.id).not('apartment_id', 'is', null)
    if (!tenants || tenants.length === 0) return
    const { data: existing } = await supabase
      .from('rent_payments').select('tenant_id, due_date').eq('user_id', session.user.id)
    const existingKeys = new Set((existing || []).map(p => `${p.tenant_id}_${p.due_date.slice(0, 7)}`))
    const now = new Date()
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    const newPayments = []
    for (const t of tenants) {
      const rentAmount = Number(t.rent) || 0
      if (rentAmount <= 0) continue
      const startDate = t.lease_start ? new Date(t.lease_start) : new Date()
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
    if (newPayments.length > 0) await supabase.from('rent_payments').insert(newPayments)
  }

  const loadData = async () => {
    setLoading(true); setError(null)
    const [aptRes, payRes] = await Promise.all([
      supabase.from('apartments')
        .select('*, tenants(id, full_name, email, lease_start, lease_end, rent)')
        .order('created_at', { ascending: false }),
      supabase.from('rent_payments')
        .select('id, tenant_id, due_date, status, amount')
        .order('due_date', { ascending: true })
    ])
    if (aptRes.error) { setError(aptRes.error.message); setLoading(false); return }
    setApartments(aptRes.data || [])
    setPayments(payRes.data || [])
    setLoading(false)
  }

  /* Derive unique cities and districts for filters */
  const cities = [...new Set(apartments.map(a => a.city).filter(Boolean))].sort()
  const districts = [...new Set(
    apartments
      .filter(a => !cityFilter || a.city === cityFilter)
      .map(a => a.district)
      .filter(Boolean)
  )].sort()

  /* Stats */
  const totalApt = apartments.length
  const occupied = apartments.filter(a => a.tenants?.[0]).length
  const vacant = totalApt - occupied
  const monthlyIncome = apartments.reduce((s, a) => s + Number(a.tenants?.[0]?.rent || 0), 0)

  /* Get next unpaid payment for a tenant */
  const getNextPayment = (tenantId) => {
    if (!tenantId) return null
    const now = new Date()
    const upcoming = payments
      .filter(p => p.tenant_id === tenantId && p.status !== 'paid')
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    return upcoming[0] || null
  }

  /* Filtered list */
  const filtered = apartments.filter(a => {
    const isOccupied = !!a.tenants?.[0]
    if (statusFilter === 'occupied' && !isOccupied) return false
    if (statusFilter === 'vacant' && isOccupied) return false
    if (cityFilter && a.city !== cityFilter) return false
    if (districtFilter && a.district !== districtFilter) return false
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
  const updateTenantForm = (field, value) => setTenantForm(prev => ({ ...prev, [field]: value }))

  const openTenantAdd = (e, aptId, aptName) => {
    e.stopPropagation()
    setTenantAptId(aptId)
    setTenantAptName(aptName)
    setTenantForm({ full_name: '', email: '', phone: '', tc_no: '', lease_start: '', lease_end: '', rent: '', deposit: '' })
    setShowTenantPopup(true)
  }

  const handleTenantSave = async (e) => {
    e.preventDefault()
    setSavingTenant(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('Oturum suresi dolmus.', 'error'); setSavingTenant(false); return }
    const record = {
      user_id: session.user.id, full_name: tenantForm.full_name.trim(),
      email: tenantForm.email.trim(), phone: tenantForm.phone.trim(),
      tc_no: tenantForm.tc_no.trim(), apartment_id: tenantAptId,
      lease_start: tenantForm.lease_start || null,
      lease_end: tenantForm.lease_end || null,
      rent: parseFloat(tenantForm.rent) || 0,
      deposit: parseFloat(tenantForm.deposit) || 0
    }
    const result = await supabase.from('tenants').insert(record).select()
    if (result.error) { showToast('Hata: ' + result.error.message, 'error'); setSavingTenant(false); return }
    // Auto-generate payment records
    if (result.data?.[0] && record.rent > 0) {
      const tenantId = result.data[0].id
      const paymentRecords = []
      const startDate = record.lease_start ? new Date(record.lease_start) : new Date()
      const now = new Date()
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
      for (let i = 0; i < 120; i++) {
        const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate())
        if (dueDate > endOfNextMonth) break
        paymentRecords.push({
          user_id: session.user.id, tenant_id: tenantId, apartment_id: tenantAptId,
          due_date: dueDate.toISOString().split('T')[0], amount: record.rent, status: 'pending'
        })
      }
      if (paymentRecords.length > 0) await supabase.from('rent_payments').insert(paymentRecords)
    }
    setSavingTenant(false)
    showToast('Kiraci eklendi.', 'success')
    setShowTenantPopup(false)
    loadData()
  }

  /* Select style */
  const selectStyle = {
    fontFamily: font, fontSize: 13, fontWeight: 500,
    padding: '8px 32px 8px 14px',
    borderRadius: 10, border: `1.5px solid ${C.border}`,
    background: 'white', color: C.text,
    cursor: 'pointer', outline: 'none',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center'
  }

  /* Input style for popup */
  const inputStyle = {
    fontFamily: font, fontSize: 13, padding: '10px 14px',
    borderRadius: 10, border: `1.5px solid ${C.border}`,
    background: '#FAFBFC', color: C.text, outline: 'none',
    width: '100%', boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  }

  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: C.textMuted,
    marginBottom: 6, display: 'block'
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ fontFamily: font, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ═══ HEADER ═══ */}
      <motion.div variants={item}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: C.text,
          letterSpacing: '-0.02em', margin: 0
        }}>
          Mulklerim
          <span style={{
            fontSize: 16, fontWeight: 600, color: C.textFaint,
            marginLeft: 8
          }}>
            ({filtered.length})
          </span>
        </h1>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={openAdd}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 20px', borderRadius: 12,
            background: C.teal, color: 'white', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
            boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
          }}>
          <Plus style={{ width: 15, height: 15 }} /> Mulk Ekle
        </motion.button>
      </motion.div>

      {/* ═══ STAT CARDS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Toplam Mulk', value: totalApt, color: C.teal, borderColor: '#CCE4E8' },
          { label: 'Kirada', value: occupied, color: '#059669', borderColor: '#D1FAE5' },
          { label: 'Bosta', value: vacant, color: '#DC2626', borderColor: '#FECACA' },
          { label: 'Aylik Toplam Gelir', value: `${money(monthlyIncome)} ₺`, color: C.teal, borderColor: '#CCE4E8' }
        ].map((s, i) => (
          <motion.div key={i} variants={item}
            whileHover={{ y: -3, boxShadow: '0 0 0 1px rgba(2,88,100,0.1), 0 12px 32px rgba(15,23,42,0.1)' }}
            style={{
              background: 'white', borderRadius: 16,
              boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
              padding: '20px 22px',
              borderLeft: `3px solid ${s.borderColor}`,
              cursor: 'default', transition: 'box-shadow 0.2s'
            }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: '0.01em' }}>
              {s.label}
            </div>
            <div style={{
              fontSize: 26, fontWeight: 800, color: s.color,
              letterSpacing: '-0.02em', lineHeight: 1, marginTop: 10
            }}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ FILTERS ═══ */}
      <motion.div variants={item}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <select value={cityFilter} onChange={e => { setCityFilter(e.target.value); setDistrictFilter('') }}
          style={selectStyle}>
          <option value="">Tum Iller</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}
          style={selectStyle}>
          <option value="">Tum Ilceler</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={selectStyle}>
          <option value="">Mulk Durumu</option>
          <option value="occupied">Kirada</option>
          <option value="vacant">Bosta</option>
        </select>

        {(cityFilter || districtFilter || statusFilter) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => { setCityFilter(''); setDistrictFilter(''); setStatusFilter('') }}
            style={{
              fontSize: 12, fontWeight: 600, color: C.red,
              background: '#FEF2F2', border: 'none', borderRadius: 8,
              padding: '8px 14px', cursor: 'pointer', fontFamily: font
            }}>
            Temizle
          </motion.button>
        )}
      </motion.div>

      {/* ═══ TABLE ═══ */}
      <motion.div variants={item} style={{
        background: C.card, borderRadius: 16,
        boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px',
          padding: '14px 24px',
          borderBottom: `1px solid ${C.borderLight}`,
          background: '#FAFBFC'
        }}>
          {['Mulk Bilgileri', 'Kiraci', 'Siradaki Odeme', 'Sozlesme Bitis', ''].map((h, i) => (
            <div key={i} style={{
              fontSize: 11, fontWeight: 700, color: C.textFaint,
              textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.teal}`, borderTopColor: 'transparent' }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.red, fontSize: 14 }}>
            <AlertCircle style={{ width: 20, height: 20, marginBottom: 8 }} />
            <div>Hata: {error}</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.textFaint, fontSize: 14 }}>
            {statusFilter || cityFilter || districtFilter
              ? 'Filtreyle eslesen mulk bulunamadi.'
              : 'Henuz mulk eklenmemis.'}
          </div>
        ) : (
          filtered.map((apt, i) => {
            const tenant = apt.tenants?.[0]
            const isOccupied = !!tenant
            const nextPay = tenant ? getNextPayment(tenant.id) : null
            const location = [apt.district, apt.city].filter(Boolean).join(', ')
            const address = apt.address
              ? `${apt.address}${location ? ', ' + location : ''}`
              : location || '—'

            return (
              <motion.div key={apt.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => navigate(`/properties/${apt.id}`)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px',
                  padding: '16px 24px',
                  alignItems: 'center',
                  borderBottom: `1px solid ${C.borderLight}`,
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                whileHover={{ backgroundColor: '#F8FAFC' }}
              >
                {/* Mülk Bilgileri */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  {/* Status badge */}
                  <div style={{
                    padding: '4px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    background: isOccupied ? '#ECFDF5' : '#FEF2F2',
                    color: isOccupied ? '#059669' : '#DC2626'
                  }}>
                    {isOccupied ? 'Kirada' : 'Bosta'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: C.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {apt.building}{apt.unit_no ? ` — No: ${apt.unit_no}` : ''}
                    </div>
                    <div style={{
                      fontSize: 12, color: C.textFaint, marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {address}
                    </div>
                  </div>
                </div>

                {/* Kiracı */}
                <div>
                  {tenant ? (
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                      {tenant.full_name}
                    </div>
                  ) : (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 12, fontWeight: 600, color: C.teal,
                      cursor: 'pointer'
                    }}
                    onClick={(e) => openTenantAdd(e, apt.id, `${apt.building} ${apt.unit_no || ''}`.trim())}>
                      <UserPlus style={{ width: 13, height: 13 }} />
                      Kiraci Ekle
                    </div>
                  )}
                </div>

                {/* Sıradaki Ödeme */}
                <div>
                  {tenant ? (
                    nextPay ? (
                      <div style={{
                        fontSize: 13, fontWeight: 500,
                        color: new Date(nextPay.due_date) < new Date() ? C.red : C.text
                      }}>
                        {formatDate(nextPay.due_date)}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: C.textFaint }}>
                        Odeme kaydi yok
                      </div>
                    )
                  ) : (
                    <div style={{ fontSize: 12, color: C.textFaint }}>—</div>
                  )}
                </div>

                {/* Sözleşme Bitiş */}
                <div>
                  {tenant?.lease_end ? (
                    <div style={{
                      fontSize: 13, fontWeight: 500,
                      color: new Date(tenant.lease_end) < new Date() ? C.red : C.text
                    }}>
                      {formatDate(tenant.lease_end)}
                    </div>
                  ) : tenant ? (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 600, color: C.teal, cursor: 'pointer'
                    }}
                    onClick={(e) => { e.stopPropagation(); navigate(`/properties/${apt.id}`) }}>
                      Sozlesme Ekle
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: C.textFaint }}>—</div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={(e) => openEdit(e, apt.id)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: C.textMuted
                    }}>
                    <Pencil style={{ width: 14, height: 14 }} />
                  </motion.button>
                </div>
              </motion.div>
            )
          })
        )}
      </motion.div>

      {/* ═══ ADD/EDIT POPUP ═══ */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowPopup(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20
            }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: 'white', borderRadius: 20,
                boxShadow: '0 25px 60px rgba(15,23,42,0.2)',
                width: '100%', maxWidth: 680,
                maxHeight: '85vh', overflowY: 'auto'
              }}>
              {/* Popup Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 28px', borderBottom: `1px solid ${C.borderLight}`
              }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, fontFamily: font }}>
                  {editId ? 'Mulk Duzenle' : 'Yeni Mulk Ekle'}
                </h3>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPopup(false)}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#F1F5F9', border: 'none', cursor: 'pointer', color: C.textMuted
                  }}>
                  <X style={{ width: 18, height: 18 }} />
                </motion.button>
              </div>

              {/* Popup Form */}
              <form onSubmit={handleSave}>
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Row 1: Building + Unit */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Mulk Adi / Bina *</label>
                      <input style={inputStyle} type="text" placeholder="Opus Sitesi" required
                        value={form.building} onChange={e => updateForm('building', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>No / Daire *</label>
                      <input style={inputStyle} type="text" placeholder="2/10" required
                        value={form.unit_no} onChange={e => updateForm('unit_no', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>

                  {/* Row 2: Type + City + District */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Mulk Tipi</label>
                      <select style={{ ...inputStyle, cursor: 'pointer' }}
                        value={form.property_type} onChange={e => updateForm('property_type', e.target.value)}>
                        {Object.entries(PROPERTY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Sehir</label>
                      <input style={inputStyle} type="text" placeholder="Istanbul"
                        value={form.city} onChange={e => updateForm('city', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Ilce</label>
                      <input style={inputStyle} type="text" placeholder="Kadikoy"
                        value={form.district} onChange={e => updateForm('district', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>

                  {/* Address */}
                  <div>
                    <label style={labelStyle}>Adres</label>
                    <input style={inputStyle} type="text" placeholder="Mahalle, Sokak, No"
                      value={form.address} onChange={e => updateForm('address', e.target.value)}
                      onFocus={e => e.target.style.borderColor = C.teal}
                      onBlur={e => e.target.style.borderColor = C.border} />
                  </div>

                  {/* Row 3: Room, Floor, m2, Age, Deposit, Furnished */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Oda Sayisi</label>
                      <input style={inputStyle} type="text" placeholder="2+1"
                        value={form.room_count} onChange={e => updateForm('room_count', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Kat</label>
                      <input style={inputStyle} type="text" placeholder="3"
                        value={form.floor_no} onChange={e => updateForm('floor_no', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Brut m²</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="120"
                        value={form.m2_gross} onChange={e => updateForm('m2_gross', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Net m²</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="100"
                        value={form.m2_net} onChange={e => updateForm('m2_net', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Bina Yasi</label>
                      <input style={inputStyle} type="number" min="0" placeholder="5"
                        value={form.building_age} onChange={e => updateForm('building_age', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Depozito (₺)</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0"
                        value={form.deposit} onChange={e => updateForm('deposit', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>

                  {/* Furnished checkbox */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="furnished" checked={form.furnished}
                      onChange={e => updateForm('furnished', e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: C.teal, cursor: 'pointer' }} />
                    <label htmlFor="furnished" style={{ fontSize: 13, fontWeight: 600, color: C.text, cursor: 'pointer' }}>
                      Esyali
                    </label>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={labelStyle}>Notlar</label>
                    <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} rows={2}
                      placeholder="Opsiyonel notlar..."
                      value={form.notes} onChange={e => updateForm('notes', e.target.value)}
                      onFocus={e => e.target.style.borderColor = C.teal}
                      onBlur={e => e.target.style.borderColor = C.border} />
                  </div>
                </div>

                {/* Popup Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
                  padding: '16px 28px', borderTop: `1px solid ${C.borderLight}`
                }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="button" onClick={() => setShowPopup(false)}
                    style={{
                      padding: '10px 20px', borderRadius: 10,
                      background: '#F1F5F9', color: C.textMuted, border: 'none',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
                    }}>
                    Iptal
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit" disabled={saving}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '10px 22px', borderRadius: 10,
                      background: C.teal, color: 'white', border: 'none',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                      opacity: saving ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
                    }}>
                    <Check style={{ width: 15, height: 15 }} />
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TENANT ADD POPUP ═══ */}
      <AnimatePresence>
        {showTenantPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowTenantPopup(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20
            }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: 'white', borderRadius: 20,
                boxShadow: '0 25px 60px rgba(15,23,42,0.2)',
                width: '100%', maxWidth: 560,
                maxHeight: '85vh', overflowY: 'auto'
              }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 28px', borderBottom: `1px solid ${C.borderLight}`
              }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, fontFamily: font }}>
                    Kiraci Ekle
                  </h3>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.teal, marginTop: 4 }}>
                    {tenantAptName}
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setShowTenantPopup(false)}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#F1F5F9', border: 'none', cursor: 'pointer', color: C.textMuted
                  }}>
                  <X style={{ width: 18, height: 18 }} />
                </motion.button>
              </div>

              {/* Form */}
              <form onSubmit={handleTenantSave}>
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Ad Soyad + TC */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Ad Soyad *</label>
                      <input style={inputStyle} required placeholder="Ahmet Yılmaz"
                        value={tenantForm.full_name} onChange={e => updateTenantForm('full_name', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>TC No</label>
                      <input style={inputStyle} placeholder="12345678901"
                        value={tenantForm.tc_no} onChange={e => updateTenantForm('tc_no', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>
                  {/* Telefon + E-posta */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Telefon</label>
                      <input style={inputStyle} placeholder="0532 xxx xx xx"
                        value={tenantForm.phone} onChange={e => updateTenantForm('phone', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>E-posta</label>
                      <input style={inputStyle} type="email" placeholder="ornek@mail.com"
                        value={tenantForm.email} onChange={e => updateTenantForm('email', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>
                  {/* Sözleşme Başlangıç + Bitiş */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Sozlesme Baslangic</label>
                      <input style={inputStyle} type="date"
                        value={tenantForm.lease_start} onChange={e => updateTenantForm('lease_start', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Sozlesme Bitis</label>
                      <input style={inputStyle} type="date"
                        value={tenantForm.lease_end} onChange={e => updateTenantForm('lease_end', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>
                  {/* Kira + Depozito */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Aylik Kira (₺)</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0"
                        value={tenantForm.rent} onChange={e => updateTenantForm('rent', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Depozito (₺)</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0"
                        value={tenantForm.deposit} onChange={e => updateTenantForm('deposit', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
                  padding: '16px 28px', borderTop: `1px solid ${C.borderLight}`
                }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="button" onClick={() => setShowTenantPopup(false)}
                    style={{
                      padding: '10px 20px', borderRadius: 10,
                      background: '#F1F5F9', color: C.textMuted, border: 'none',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
                    }}>
                    Iptal
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit" disabled={savingTenant}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '10px 22px', borderRadius: 10,
                      background: C.teal, color: 'white', border: 'none',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                      opacity: savingTenant ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
                    }}>
                    <Check style={{ width: 15, height: 15 }} />
                    {savingTenant ? 'Kaydediliyor...' : 'Kiraci Ekle'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
