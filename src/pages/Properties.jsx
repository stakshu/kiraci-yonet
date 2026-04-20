/* ── KiraciYonet — Mulklerim — Bina + Daire hiyerarsisi ── */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { apartmentLabel, buildingLabel, unitLabel } from '../lib/apartmentLabel'
import {
  Building2, Plus, Pencil, Trash2, X, Check,
  ChevronDown, AlertCircle, UserPlus, Home
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

const EMPTY_APT_FORM = {
  building_id: '', unit_no: '', property_type: 'daire',
  room_count: '', floor_no: '',
  m2_gross: '', m2_net: '', furnished: false,
  deposit: '', notes: ''
}

const EMPTY_BLD_FORM = {
  name: '', city: '', district: '', address: '',
  building_age: '', notes: ''
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } }
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
}

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

  const [buildings, setBuildings] = useState([])
  const [apartments, setApartments] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  /* Filters */
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [selectedApartmentId, setSelectedApartmentId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  /* Apartment popup */
  const [showAptPopup, setShowAptPopup] = useState(false)
  const [editAptId, setEditAptId] = useState(null)
  const [aptForm, setAptForm] = useState(EMPTY_APT_FORM)
  const [savingApt, setSavingApt] = useState(false)

  /* Building popup */
  const [showBldPopup, setShowBldPopup] = useState(false)
  const [editBldId, setEditBldId] = useState(null)
  const [bldForm, setBldForm] = useState(EMPTY_BLD_FORM)
  const [savingBld, setSavingBld] = useState(false)

  /* Tenant popup */
  const [showTenantPopup, setShowTenantPopup] = useState(false)
  const [tenantAptId, setTenantAptId] = useState(null)
  const [tenantAptName, setTenantAptName] = useState('')
  const [tenantForm, setTenantForm] = useState({
    full_name: '', email: '', phone: '', tc_no: '',
    lease_start: '', lease_end: '', rent: '', deposit: ''
  })
  const [savingTenant, setSavingTenant] = useState(false)

  useEffect(() => { ensurePayments().then(() => loadData()) }, [])

  /* Ensure payment records exist up to next month */
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
    const [bldRes, aptRes, payRes] = await Promise.all([
      supabase.from('buildings').select('*').order('name', { ascending: true }),
      supabase.from('apartments')
        .select('*, buildings(id, name, city, district, address, building_age), tenants(id, full_name, email, lease_start, lease_end, rent)')
        .order('created_at', { ascending: false }),
      supabase.from('rent_payments')
        .select('id, tenant_id, due_date, status, amount')
        .order('due_date', { ascending: true })
    ])
    if (bldRes.error) { setError(bldRes.error.message); setLoading(false); return }
    if (aptRes.error) { setError(aptRes.error.message); setLoading(false); return }
    setBuildings(bldRes.data || [])
    setApartments(aptRes.data || [])
    setPayments(payRes.data || [])
    setLoading(false)
  }

  /* Stats */
  const totalBld = buildings.length
  const totalApt = apartments.length
  const occupied = apartments.filter(a => a.tenants?.[0]).length
  const vacant = totalApt - occupied
  const monthlyIncome = apartments.reduce((s, a) => s + Number(a.tenants?.[0]?.rent || 0), 0)

  /* Apartments for the selected building (drives Daire dropdown) */
  const aptsInSelectedBuilding = useMemo(() => {
    if (!selectedBuildingId) return []
    return apartments
      .filter(a => a.building_id === selectedBuildingId)
      .sort((a, b) => {
        const f = (Number(a.floor_no) || 0) - (Number(b.floor_no) || 0)
        if (f !== 0) return f
        return String(a.unit_no || '').localeCompare(String(b.unit_no || ''), 'tr')
      })
  }, [apartments, selectedBuildingId])

  /* Filtered list for card grid */
  const filtered = useMemo(() => apartments.filter(a => {
    if (selectedBuildingId && a.building_id !== selectedBuildingId) return false
    if (selectedApartmentId && a.id !== selectedApartmentId) return false
    const isOccupied = !!a.tenants?.[0]
    if (statusFilter === 'occupied' && !isOccupied) return false
    if (statusFilter === 'vacant' && isOccupied) return false
    return true
  }), [apartments, selectedBuildingId, selectedApartmentId, statusFilter])

  /* Get next unpaid payment for a tenant */
  const getNextPayment = (tenantId) => {
    if (!tenantId) return null
    const upcoming = payments
      .filter(p => p.tenant_id === tenantId && p.status !== 'paid')
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    return upcoming[0] || null
  }

  /* ════ BUILDING CRUD ════ */
  const openBldAdd = () => { setEditBldId(null); setBldForm(EMPTY_BLD_FORM); setShowBldPopup(true) }
  const openBldEdit = () => {
    const b = buildings.find(x => x.id === selectedBuildingId)
    if (!b) return
    setEditBldId(b.id)
    setBldForm({
      name: b.name || '', city: b.city || '', district: b.district || '',
      address: b.address || '', building_age: b.building_age ?? '', notes: b.notes || ''
    })
    setShowBldPopup(true)
  }

  const handleBldSave = async (e) => {
    e.preventDefault(); setSavingBld(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('Oturum suresi dolmus.', 'error'); setSavingBld(false); return }
    const record = {
      user_id: session.user.id,
      name: bldForm.name.trim(),
      city: bldForm.city.trim(),
      district: bldForm.district.trim(),
      address: bldForm.address.trim(),
      building_age: bldForm.building_age === '' ? null : parseInt(bldForm.building_age),
      notes: bldForm.notes.trim()
    }
    let result
    if (editBldId) result = await supabase.from('buildings').update(record).eq('id', editBldId).select()
    else result = await supabase.from('buildings').insert(record).select()
    setSavingBld(false)
    if (result.error) { showToast('Hata: ' + result.error.message, 'error'); return }
    showToast(editBldId ? 'Bina guncellendi.' : 'Bina eklendi.', 'success')
    const newId = result.data?.[0]?.id
    setShowBldPopup(false)
    await loadData()
    if (!editBldId && newId) {
      setSelectedBuildingId(newId)
      setSelectedApartmentId('')
    }
  }

  const handleBldDelete = async () => {
    if (!editBldId) return
    const count = apartments.filter(a => a.building_id === editBldId).length
    const msg = count > 0
      ? `Bu bina ve icindeki ${count} daire (+ bagli kiracilar ve odemeler) silinecek. Emin misiniz?`
      : 'Bina silinsin mi?'
    if (!confirm(msg)) return
    const { error: err } = await supabase.from('buildings').delete().eq('id', editBldId)
    if (err) { showToast('Hata: ' + err.message, 'error'); return }
    showToast('Bina silindi.', 'success')
    setShowBldPopup(false)
    if (selectedBuildingId === editBldId) { setSelectedBuildingId(''); setSelectedApartmentId('') }
    loadData()
  }

  /* ════ APARTMENT CRUD ════ */
  const openAptAdd = () => {
    if (buildings.length === 0) {
      showToast('Once bir bina ekleyiniz.', 'error')
      openBldAdd()
      return
    }
    setEditAptId(null)
    setAptForm({ ...EMPTY_APT_FORM, building_id: selectedBuildingId || buildings[0]?.id || '' })
    setShowAptPopup(true)
  }

  const openAptEdit = async (e, id) => {
    e.stopPropagation()
    const { data } = await supabase.from('apartments').select('*').eq('id', id).single()
    if (!data) { showToast('Daire bulunamadi.', 'error'); return }
    setEditAptId(id)
    setAptForm({
      building_id: data.building_id || '',
      unit_no: data.unit_no || '',
      property_type: data.property_type || 'daire',
      room_count: data.room_count || '', floor_no: data.floor_no || '',
      m2_gross: data.m2_gross ?? '', m2_net: data.m2_net ?? '',
      furnished: !!data.furnished,
      deposit: data.deposit ?? '', notes: data.notes || ''
    })
    setShowAptPopup(true)
  }

  const handleAptSave = async (e) => {
    e.preventDefault()
    if (!aptForm.building_id) { showToast('Bina seciniz.', 'error'); return }
    setSavingApt(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('Oturum suresi dolmus.', 'error'); setSavingApt(false); return }
    const record = {
      user_id: session.user.id,
      building_id: aptForm.building_id,
      unit_no: aptForm.unit_no.trim(),
      property_type: aptForm.property_type,
      room_count: aptForm.room_count.trim(),
      floor_no: aptForm.floor_no.trim(),
      m2_gross: aptForm.m2_gross === '' ? null : parseFloat(aptForm.m2_gross),
      m2_net: aptForm.m2_net === '' ? null : parseFloat(aptForm.m2_net),
      furnished: aptForm.furnished,
      deposit: aptForm.deposit === '' ? 0 : parseFloat(aptForm.deposit),
      notes: aptForm.notes.trim()
    }
    let result
    if (editAptId) result = await supabase.from('apartments').update(record).eq('id', editAptId)
    else result = await supabase.from('apartments').insert(record)
    setSavingApt(false)
    if (result.error) { showToast('Hata: ' + result.error.message, 'error'); return }
    showToast(editAptId ? 'Daire guncellendi.' : 'Daire eklendi.', 'success')
    setShowAptPopup(false)
    loadData()
  }

  const handleAptDelete = async (e, id, name) => {
    e.stopPropagation()
    if (!confirm(name + ' silinsin mi?')) return
    const { error: err } = await supabase.from('apartments').delete().eq('id', id)
    if (err) { showToast('Hata: ' + err.message, 'error'); return }
    showToast('Daire silindi.', 'success'); loadData()
  }

  /* ════ TENANT ADD ════ */
  const openTenantAdd = (e, aptId, aptName) => {
    e.stopPropagation()
    setTenantAptId(aptId)
    setTenantAptName(aptName)
    setTenantForm({ full_name: '', email: '', phone: '', tc_no: '', lease_start: '', lease_end: '', rent: '', deposit: '' })
    setShowTenantPopup(true)
  }

  const handleTenantSave = async (e) => {
    e.preventDefault(); setSavingTenant(true)
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

  /* ════ DROPDOWN HANDLERS ════ */
  const onBuildingDropdownChange = (val) => {
    if (val === '__new__') { openBldAdd(); return }
    setSelectedBuildingId(val)
    setSelectedApartmentId('')
  }

  const updateAptForm = (f, v) => setAptForm(prev => ({ ...prev, [f]: v }))
  const updateBldForm = (f, v) => setBldForm(prev => ({ ...prev, [f]: v }))
  const updateTenantForm = (f, v) => setTenantForm(prev => ({ ...prev, [f]: v }))

  /* Styles */
  const selectStyle = {
    fontFamily: font, fontSize: 13, fontWeight: 500,
    padding: '10px 34px 10px 14px',
    borderRadius: 10, border: `1.5px solid ${C.border}`,
    background: 'white', color: C.text,
    cursor: 'pointer', outline: 'none',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    minWidth: 200
  }

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

  const selectedBld = buildings.find(b => b.id === selectedBuildingId)

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ fontFamily: font, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ═══ HEADER ═══ */}
      <motion.div variants={item}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: C.text,
          letterSpacing: '-0.02em', margin: 0
        }}>
          Mulklerim
          <span style={{ fontSize: 16, fontWeight: 600, color: C.textFaint, marginLeft: 8 }}>
            ({filtered.length})
          </span>
        </h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={openBldAdd}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 12,
              background: 'white', color: C.teal,
              border: `1.5px solid ${C.teal}`,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
            }}>
            <Building2 style={{ width: 15, height: 15 }} /> Bina Ekle
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={openAptAdd}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 12,
              background: C.teal, color: 'white', border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
              boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
            }}>
            <Plus style={{ width: 15, height: 15 }} /> Daire Ekle
          </motion.button>
        </div>
      </motion.div>

      {/* ═══ STAT CARDS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { label: 'Toplam Bina', value: totalBld, color: C.teal, borderColor: '#CCE4E8' },
          { label: 'Toplam Daire', value: totalApt, color: C.teal, borderColor: '#CCE4E8' },
          { label: 'Kirada', value: occupied, color: '#059669', borderColor: '#D1FAE5' },
          { label: 'Bosta', value: vacant, color: '#DC2626', borderColor: '#FECACA' },
          { label: 'Aylik Gelir', value: `${money(monthlyIncome)} ₺`, color: C.teal, borderColor: '#CCE4E8' }
        ].map((s, i) => (
          <motion.div key={i} variants={item}
            whileHover={{ y: -3, boxShadow: '0 0 0 1px rgba(2,88,100,0.1), 0 12px 32px rgba(15,23,42,0.1)' }}
            style={{
              background: 'white', borderRadius: 16,
              boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
              padding: '18px 20px',
              borderLeft: `3px solid ${s.borderColor}`,
              cursor: 'default', transition: 'box-shadow 0.2s'
            }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: '0.01em' }}>
              {s.label}
            </div>
            <div style={{
              fontSize: 24, fontWeight: 800, color: s.color,
              letterSpacing: '-0.02em', lineHeight: 1, marginTop: 8
            }}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ BINA + DAIRE FILTERS ═══ */}
      <motion.div variants={item}
        style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

        {/* Bina dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Bina
          </span>
          <select
            value={selectedBuildingId}
            onChange={e => onBuildingDropdownChange(e.target.value)}
            style={selectStyle}
          >
            <option value="">Tumu ({buildings.length})</option>
            {buildings.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
            <option value="__new__">+ Yeni Bina Ekle</option>
          </select>
          {selectedBld && (
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              onClick={openBldEdit}
              title="Binayi duzenle"
              style={{
                width: 34, height: 34, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: C.borderLight, border: 'none', cursor: 'pointer', color: C.textMuted
              }}>
              <Pencil style={{ width: 13, height: 13 }} />
            </motion.button>
          )}
        </div>

        {/* Daire dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Daire
          </span>
          <select
            value={selectedApartmentId}
            onChange={e => setSelectedApartmentId(e.target.value)}
            disabled={!selectedBuildingId}
            style={{ ...selectStyle, opacity: selectedBuildingId ? 1 : 0.5, cursor: selectedBuildingId ? 'pointer' : 'not-allowed' }}
          >
            <option value="">Tumu ({aptsInSelectedBuilding.length})</option>
            {aptsInSelectedBuilding.map(a => (
              <option key={a.id} value={a.id}>{unitLabel(a)}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={selectStyle}>
          <option value="">Durum (Hepsi)</option>
          <option value="occupied">Kirada</option>
          <option value="vacant">Bosta</option>
        </select>

        {(selectedBuildingId || selectedApartmentId || statusFilter) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => { setSelectedBuildingId(''); setSelectedApartmentId(''); setStatusFilter('') }}
            style={{
              fontSize: 12, fontWeight: 600, color: C.red,
              background: '#FEF2F2', border: 'none', borderRadius: 8,
              padding: '8px 14px', cursor: 'pointer', fontFamily: font
            }}>
            Temizle
          </motion.button>
        )}
      </motion.div>

      {/* ═══ SELECTED BUILDING INFO STRIP ═══ */}
      {selectedBld && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 18px', borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(2,88,100,0.04), rgba(0,212,126,0.04))',
            border: `1px solid rgba(2,88,100,0.15)`
          }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: C.teal, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Building2 style={{ width: 18, height: 18 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{selectedBld.name}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
              {[
                selectedBld.address,
                [selectedBld.district, selectedBld.city].filter(Boolean).join(', '),
                selectedBld.building_age ? `${selectedBld.building_age} yasinda` : null
              ].filter(Boolean).join(' • ') || 'Adres bilgisi yok'}
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, whiteSpace: 'nowrap' }}>
            {aptsInSelectedBuilding.length} daire
          </div>
        </motion.div>
      )}

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
          {['Daire Bilgileri', 'Kiraci', 'Siradaki Odeme', 'Sozlesme Bitis', ''].map((h, i) => (
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
            {buildings.length === 0
              ? 'Once bir bina ekleyin, sonra daireleri ekleyebilirsiniz.'
              : apartments.length === 0
                ? 'Henuz daire eklenmemis.'
                : 'Filtreyle eslesen daire bulunamadi.'}
          </div>
        ) : (
          filtered.map((apt, i) => {
            const tenant = apt.tenants?.[0]
            const isOccupied = !!tenant
            const nextPay = tenant ? getNextPayment(tenant.id) : null
            const bld = apt.buildings
            const location = bld ? [bld.district, bld.city].filter(Boolean).join(', ') : ''
            const address = bld?.address
              ? `${bld.address}${location ? ', ' + location : ''}`
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
                {/* Daire Bilgileri */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
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
                      {apartmentLabel(apt)}
                    </div>
                    <div style={{
                      fontSize: 12, color: C.textFaint, marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {address}
                    </div>
                  </div>
                </div>

                {/* Kiraci */}
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
                    onClick={(e) => openTenantAdd(e, apt.id, apartmentLabel(apt))}>
                      <UserPlus style={{ width: 13, height: 13 }} />
                      Kiraci Ekle
                    </div>
                  )}
                </div>

                {/* Siradaki Odeme */}
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

                {/* Sozlesme Bitis */}
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
                    onClick={(e) => openAptEdit(e, apt.id)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: C.textMuted
                    }}>
                    <Pencil style={{ width: 14, height: 14 }} />
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={(e) => handleAptDelete(e, apt.id, apartmentLabel(apt))}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: C.textMuted
                    }}>
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </motion.button>
                </div>
              </motion.div>
            )
          })
        )}
      </motion.div>

      {/* ═══ BUILDING POPUP ═══ */}
      <AnimatePresence>
        {showBldPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowBldPopup(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
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
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 28px', borderBottom: `1px solid ${C.borderLight}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: C.teal, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Building2 style={{ width: 18, height: 18 }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, fontFamily: font }}>
                    {editBldId ? 'Binayi Duzenle' : 'Yeni Bina Ekle'}
                  </h3>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setShowBldPopup(false)}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#F1F5F9', border: 'none', cursor: 'pointer', color: C.textMuted
                  }}>
                  <X style={{ width: 18, height: 18 }} />
                </motion.button>
              </div>

              <form onSubmit={handleBldSave}>
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Bina Adi *</label>
                    <input style={inputStyle} type="text" required
                      placeholder="Cömertkent Sitesi H1 Blok"
                      value={bldForm.name} onChange={e => updateBldForm('name', e.target.value)}
                      onFocus={e => e.target.style.borderColor = C.teal}
                      onBlur={e => e.target.style.borderColor = C.border} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Sehir</label>
                      <input style={inputStyle} type="text" placeholder="Istanbul"
                        value={bldForm.city} onChange={e => updateBldForm('city', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Ilce</label>
                      <input style={inputStyle} type="text" placeholder="Kadikoy"
                        value={bldForm.district} onChange={e => updateBldForm('district', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Adres</label>
                    <input style={inputStyle} type="text" placeholder="Mahalle, Sokak, No"
                      value={bldForm.address} onChange={e => updateBldForm('address', e.target.value)}
                      onFocus={e => e.target.style.borderColor = C.teal}
                      onBlur={e => e.target.style.borderColor = C.border} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Bina Yasi</label>
                      <input style={inputStyle} type="number" min="0" placeholder="5"
                        value={bldForm.building_age} onChange={e => updateBldForm('building_age', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Notlar</label>
                      <input style={inputStyle} type="text" placeholder="Opsiyonel"
                        value={bldForm.notes} onChange={e => updateBldForm('notes', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 28px', borderTop: `1px solid ${C.borderLight}`
                }}>
                  <div>
                    {editBldId && (
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        type="button" onClick={handleBldDelete}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '10px 16px', borderRadius: 10,
                          background: '#FEF2F2', color: C.red, border: 'none',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
                        }}>
                        <Trash2 style={{ width: 14, height: 14 }} />
                        Binayi Sil
                      </motion.button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      type="button" onClick={() => setShowBldPopup(false)}
                      style={{
                        padding: '10px 20px', borderRadius: 10,
                        background: '#F1F5F9', color: C.textMuted, border: 'none',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
                      }}>
                      Iptal
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      type="submit" disabled={savingBld}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '10px 22px', borderRadius: 10,
                        background: C.teal, color: 'white', border: 'none',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                        opacity: savingBld ? 0.7 : 1,
                        boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
                      }}>
                      <Check style={{ width: 15, height: 15 }} />
                      {savingBld ? 'Kaydediliyor...' : 'Kaydet'}
                    </motion.button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ APARTMENT POPUP ═══ */}
      <AnimatePresence>
        {showAptPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowAptPopup(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
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
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 28px', borderBottom: `1px solid ${C.borderLight}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: C.green, color: '#03363D',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Home style={{ width: 18, height: 18 }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, fontFamily: font }}>
                    {editAptId ? 'Daireyi Duzenle' : 'Yeni Daire Ekle'}
                  </h3>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAptPopup(false)}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#F1F5F9', border: 'none', cursor: 'pointer', color: C.textMuted
                  }}>
                  <X style={{ width: 18, height: 18 }} />
                </motion.button>
              </div>

              <form onSubmit={handleAptSave}>
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Bina select (zorunlu) */}
                  <div>
                    <label style={labelStyle}>Bina *</label>
                    <select
                      required
                      value={aptForm.building_id}
                      onChange={e => {
                        if (e.target.value === '__new__') { openBldAdd(); return }
                        updateAptForm('building_id', e.target.value)
                      }}
                      style={{ ...inputStyle, cursor: 'pointer', ...selectStyle, background: '#FAFBFC', minWidth: 'auto' }}
                    >
                      <option value="">Bina seciniz...</option>
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                      <option value="__new__">+ Yeni Bina Ekle</option>
                    </select>
                  </div>

                  {/* Unit no + Type */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Daire No *</label>
                      <input style={inputStyle} type="text" required placeholder="20"
                        value={aptForm.unit_no} onChange={e => updateAptForm('unit_no', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Mulk Tipi</label>
                      <select style={{ ...inputStyle, cursor: 'pointer' }}
                        value={aptForm.property_type} onChange={e => updateAptForm('property_type', e.target.value)}>
                        {Object.entries(PROPERTY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Oda, Kat, m2, Depozito */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Oda Sayisi</label>
                      <input style={inputStyle} type="text" placeholder="2+1"
                        value={aptForm.room_count} onChange={e => updateAptForm('room_count', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Kat</label>
                      <input style={inputStyle} type="text" placeholder="2"
                        value={aptForm.floor_no} onChange={e => updateAptForm('floor_no', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Depozito (₺)</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0"
                        value={aptForm.deposit} onChange={e => updateAptForm('deposit', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Brut m²</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="120"
                        value={aptForm.m2_gross} onChange={e => updateAptForm('m2_gross', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Net m²</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="100"
                        value={aptForm.m2_net} onChange={e => updateAptForm('m2_net', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <input type="checkbox" checked={aptForm.furnished}
                          onChange={e => updateAptForm('furnished', e.target.checked)}
                          style={{ width: 18, height: 18, accentColor: C.teal, cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Esyali</span>
                      </label>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={labelStyle}>Notlar</label>
                    <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} rows={2}
                      placeholder="Opsiyonel notlar..."
                      value={aptForm.notes} onChange={e => updateAptForm('notes', e.target.value)}
                      onFocus={e => e.target.style.borderColor = C.teal}
                      onBlur={e => e.target.style.borderColor = C.border} />
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
                  padding: '16px 28px', borderTop: `1px solid ${C.borderLight}`
                }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="button" onClick={() => setShowAptPopup(false)}
                    style={{
                      padding: '10px 20px', borderRadius: 10,
                      background: '#F1F5F9', color: C.textMuted, border: 'none',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
                    }}>
                    Iptal
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit" disabled={savingApt}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '10px 22px', borderRadius: 10,
                      background: C.teal, color: 'white', border: 'none',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                      opacity: savingApt ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
                    }}>
                    <Check style={{ width: 15, height: 15 }} />
                    {savingApt ? 'Kaydediliyor...' : 'Kaydet'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ TENANT POPUP ═══ */}
      <AnimatePresence>
        {showTenantPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowTenantPopup(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
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

              <form onSubmit={handleTenantSave}>
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Ad Soyad *</label>
                      <input style={inputStyle} required placeholder="Ahmet Yilmaz"
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
