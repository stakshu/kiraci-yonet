/* ── KiraciYonet — Bina Detay + Daireler ── */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { getBuildingType, isMultiUnit } from '../lib/buildingTypes'
import { formatMoney, formatDate as fmtDate } from '../i18n/formatters'
import {
  Building2, Plus, Pencil, Trash2, X, Check,
  ArrowLeft, AlertCircle, UserPlus, Home, UserCheck
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"

const PROPERTY_TYPE_KEYS = ['daire', 'mustakil', 'villa', 'dukkan', 'ofis', 'arsa', 'diger']

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

const C = {
  teal: '#025864', green: '#00D47E', red: '#EF4444',
  bg: '#F0F2F5', card: '#FFFFFF',
  border: '#E5E7EB', borderLight: '#F1F5F9',
  text: '#0F172A', textMuted: '#64748B', textFaint: '#94A3B8'
}

export default function BuildingDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [building, setBuilding] = useState(null)
  const [apartments, setApartments] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showBldPopup, setShowBldPopup] = useState(false)
  const [bldForm, setBldForm] = useState(EMPTY_BLD_FORM)
  const [savingBld, setSavingBld] = useState(false)

  /* Apartment popup */
  const [showAptPopup, setShowAptPopup] = useState(false)
  const [editAptId, setEditAptId] = useState(null)
  const [aptForm, setAptForm] = useState(EMPTY_APT_FORM)
  const [savingApt, setSavingApt] = useState(false)

  /* Tenant popup */
  const [showTenantPopup, setShowTenantPopup] = useState(false)
  const [tenantAptId, setTenantAptId] = useState(null)
  const [tenantAptName, setTenantAptName] = useState('')
  const [tenantForm, setTenantForm] = useState({
    full_name: '', email: '', phone: '', tc_no: '',
    lease_start: '', lease_end: '', rent: '', deposit: ''
  })
  const [savingTenant, setSavingTenant] = useState(false)
  const [tenantMode, setTenantMode] = useState('new') // 'new' | 'existing'
  const [inactiveTenants, setInactiveTenants] = useState([])
  const [existingTenantId, setExistingTenantId] = useState('')

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    setLoading(true); setError(null)
    const [bldRes, aptRes, payRes] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', id).maybeSingle(),
      supabase.from('apartments')
        .select('*, tenants(id, full_name, email, lease_start, lease_end, rent)')
        .eq('building_id', id)
        .order('floor_no', { ascending: true })
        .order('unit_no', { ascending: true }),
      supabase.from('rent_payments').select('id, tenant_id, due_date, status, amount')
    ])
    if (bldRes.error) { setError(bldRes.error.message); setLoading(false); return }
    if (!bldRes.data) {
      showToast(t('buildingDetail.toasts.buildingNotFound'), 'error')
      navigate('/properties', { replace: true })
      return
    }
    setBuilding(bldRes.data)
    setApartments(aptRes.data || [])
    setPayments(payRes.data || [])
    setLoading(false)
  }

  const openBldEdit = () => {
    setBldForm({
      name: building.name || '', city: building.city || '',
      district: building.district || '', address: building.address || '',
      building_age: building.building_age ?? '', notes: building.notes || ''
    })
    setShowBldPopup(true)
  }

  const handleBldSave = async (e) => {
    e.preventDefault(); setSavingBld(true)
    const record = {
      name: bldForm.name.trim(),
      city: bldForm.city.trim(),
      district: bldForm.district.trim(),
      address: bldForm.address.trim(),
      building_age: bldForm.building_age === '' ? null : parseInt(bldForm.building_age),
      notes: bldForm.notes.trim()
    }
    const { error: err } = await supabase.from('buildings').update(record).eq('id', id)
    setSavingBld(false)
    if (err) { showToast(t('buildingDetail.toasts.errorPrefix', { msg: err.message }), 'error'); return }
    showToast(t('buildingDetail.toasts.buildingUpdated'), 'success')
    setShowBldPopup(false)
    loadData()
  }

  const handleBldDelete = async () => {
    const msg = apartments.length > 0
      ? t('buildingDetail.confirm.deleteMulti', { n: apartments.length })
      : t('buildingDetail.confirm.deleteSingle')
    if (!confirm(msg)) return
    const { error: err } = await supabase.from('buildings').delete().eq('id', id)
    if (err) { showToast(t('buildingDetail.toasts.errorPrefix', { msg: err.message }), 'error'); return }
    showToast(t('buildingDetail.toasts.buildingDeleted'), 'success')
    navigate('/properties', { replace: true })
  }

  const updateBldForm = (f, v) => setBldForm(prev => ({ ...prev, [f]: v }))

  const openAptAdd = () => {
    setEditAptId(null)
    setAptForm({ ...EMPTY_APT_FORM, building_id: id })
    setShowAptPopup(true)
  }

  const openAptEdit = async (e, aptId) => {
    e.stopPropagation()
    const { data } = await supabase.from('apartments').select('*').eq('id', aptId).single()
    if (!data) { showToast(t('buildingDetail.toasts.apartmentNotFound'), 'error'); return }
    setEditAptId(aptId)
    setAptForm({
      building_id: data.building_id || id,
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
    if (!aptForm.building_id) { showToast(t('buildingDetail.toasts.buildingRequired'), 'error'); return }
    setSavingApt(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast(t('buildingDetail.toasts.sessionExpired'), 'error'); setSavingApt(false); return }
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
    const result = editAptId
      ? await supabase.from('apartments').update(record).eq('id', editAptId)
      : await supabase.from('apartments').insert(record)
    setSavingApt(false)
    if (result.error) { showToast(t('buildingDetail.toasts.errorPrefix', { msg: result.error.message }), 'error'); return }
    showToast(editAptId ? t('buildingDetail.toasts.apartmentUpdated') : t('buildingDetail.toasts.apartmentAdded'), 'success')
    setShowAptPopup(false)
    loadData()
  }

  const handleAptDelete = async (e, aptId, name) => {
    e.stopPropagation()
    if (!confirm(t('buildingDetail.confirm.deleteApartment', { name }))) return
    const { error: err } = await supabase.from('apartments').delete().eq('id', aptId)
    if (err) { showToast(t('buildingDetail.toasts.errorPrefix', { msg: err.message }), 'error'); return }
    showToast(t('buildingDetail.toasts.apartmentDeleted'), 'success'); loadData()
  }

  const loadInactiveTenants = async () => {
    const { data } = await supabase
      .from('tenants')
      .select('id, full_name, phone, email, tc_no, rent, deposit, lease_start, lease_end')
      .eq('status', 'inactive')
      .order('full_name', { ascending: true })
    setInactiveTenants(data || [])
  }

  const openTenantAdd = (e, aptId, aptName) => {
    e.stopPropagation()
    setTenantAptId(aptId)
    setTenantAptName(aptName)
    setTenantForm({ full_name: '', email: '', phone: '', tc_no: '', lease_start: '', lease_end: '', rent: '', deposit: '' })
    setTenantMode('new')
    setExistingTenantId('')
    loadInactiveTenants()
    setShowTenantPopup(true)
  }

  const selectExistingTenant = (id) => {
    setExistingTenantId(id)
    const t = inactiveTenants.find(x => x.id === id)
    if (t) {
      setTenantForm({
        full_name: t.full_name || '', email: t.email || '',
        phone: t.phone || '', tc_no: t.tc_no || '',
        lease_start: t.lease_start || '', lease_end: t.lease_end || '',
        rent: t.rent ?? '', deposit: t.deposit ?? ''
      })
    }
  }

  const handleTenantSave = async (e) => {
    e.preventDefault(); setSavingTenant(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast(t('buildingDetail.toasts.sessionExpired'), 'error'); setSavingTenant(false); return }

    const rentAmount = parseFloat(tenantForm.rent) || 0
    const leaseStart = tenantForm.lease_start || null
    const leaseEnd = tenantForm.lease_end || null

    let tenantId = null

    if (tenantMode === 'existing') {
      if (!existingTenantId) { showToast(t('buildingDetail.toasts.selectInactiveRequired'), 'error'); setSavingTenant(false); return }
      const { error: updErr } = await supabase
        .from('tenants')
        .update({
          apartment_id: tenantAptId,
          lease_start: leaseStart,
          lease_end: leaseEnd,
          rent: rentAmount,
          deposit: parseFloat(tenantForm.deposit) || 0,
          status: 'active'
        })
        .eq('id', existingTenantId)
      if (updErr) { showToast(t('buildingDetail.toasts.errorPrefix', { msg: updErr.message }), 'error'); setSavingTenant(false); return }
      tenantId = existingTenantId
    } else {
      const record = {
        user_id: session.user.id, full_name: tenantForm.full_name.trim(),
        email: tenantForm.email.trim(), phone: tenantForm.phone.trim(),
        tc_no: tenantForm.tc_no.trim(), apartment_id: tenantAptId,
        lease_start: leaseStart, lease_end: leaseEnd,
        rent: rentAmount,
        deposit: parseFloat(tenantForm.deposit) || 0,
        status: 'active'
      }
      const result = await supabase.from('tenants').insert(record).select()
      if (result.error) { showToast(t('buildingDetail.toasts.errorPrefix', { msg: result.error.message }), 'error'); setSavingTenant(false); return }
      tenantId = result.data?.[0]?.id
    }

    // Daireyi dolu isaretle
    await supabase.from('apartments').update({ status: 'occupied' }).eq('id', tenantAptId)

    // 120 aylik bekleyen kira kayitlarini seed et
    if (tenantId && rentAmount > 0) {
      const paymentRecords = []
      const startDate = leaseStart ? new Date(leaseStart) : new Date()
      const now = new Date()
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
      for (let i = 0; i < 120; i++) {
        const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate())
        if (dueDate > endOfNextMonth) break
        paymentRecords.push({
          user_id: session.user.id, tenant_id: tenantId, apartment_id: tenantAptId,
          due_date: dueDate.toISOString().split('T')[0], amount: rentAmount, status: 'pending'
        })
      }
      if (paymentRecords.length > 0) await supabase.from('rent_payments').insert(paymentRecords)
    }

    setSavingTenant(false)
    showToast(tenantMode === 'existing' ? t('buildingDetail.toasts.tenantAssigned') : t('buildingDetail.toasts.tenantAdded'), 'success')
    setShowTenantPopup(false)
    loadData()
  }

  const updateAptForm = (f, v) => setAptForm(prev => ({ ...prev, [f]: v }))
  const updateTenantForm = (f, v) => setTenantForm(prev => ({ ...prev, [f]: v }))

  const getNextPayment = (tenantId) => {
    if (!tenantId) return null
    const upcoming = payments
      .filter(p => p.tenant_id === tenantId && p.status !== 'paid')
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    return upcoming[0] || null
  }

  const selectStyle = {
    fontFamily: font, fontSize: 13, fontWeight: 500,
    padding: '10px 34px 10px 14px',
    borderRadius: 10, border: `1.5px solid ${C.border}`,
    background: '#FAFBFC', color: C.text,
    cursor: 'pointer', outline: 'none',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    width: '100%', boxSizing: 'border-box'
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${C.teal}`, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error) {
    return <div style={{ padding: 40, color: C.red }}>{t('buildingDetail.toasts.errorPrefix', { msg: error })}</div>
  }

  const occupied = apartments.filter(a => a.tenants?.[0]).length
  const vacant = apartments.length - occupied
  const monthlyIncome = apartments.reduce((s, a) => s + Number(a.tenants?.[0]?.rent || 0), 0)
  const bt = getBuildingType(building.building_type)
  const HeaderIcon = bt.Icon
  const singleUnit = !isMultiUnit(building.building_type)

  return (
    <div style={{ fontFamily: font, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.textMuted }}>
        <motion.button whileHover={{ x: -3 }} onClick={() => navigate('/properties')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer', color: C.teal,
            fontWeight: 600, fontFamily: font, fontSize: 13, padding: 0
          }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> {t('buildingDetail.backToProperties')}
        </motion.button>
        <span style={{ color: C.textFaint }}>/</span>
        <span style={{ color: C.text, fontWeight: 600 }}>{building.name}</span>
      </div>

      {/* Bina header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, rgba(2,88,100,0.04), rgba(0,212,126,0.04))',
          border: '1px solid rgba(2,88,100,0.15)',
          borderRadius: 16, padding: '20px 24px',
          display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap'
        }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: C.teal, color: 'white', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <HeaderIcon style={{ width: 24, height: 24 }} />
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
              {building.name}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700,
              padding: '4px 10px', borderRadius: 999,
              background: bt.chipBg, color: bt.chipFg,
              letterSpacing: '0.02em'
            }}>{t(`buildingTypes.${building.building_type || 'apartman'}`)}</span>
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
            {[
              building.address,
              [building.district, building.city].filter(Boolean).join(', '),
              building.building_age ? t('properties.table.yearsOld', { n: building.building_age }) : null
            ].filter(Boolean).join(' • ') || t('buildingDetail.addressNotSet')}
          </div>
          {building.notes && (
            <div style={{ fontSize: 12, color: C.textFaint, marginTop: 8, fontStyle: 'italic' }}>
              "{building.notes}"
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={openBldEdit}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'white', color: C.teal, border: `1.5px solid ${C.teal}`,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
            }}>
            <Pencil style={{ width: 13, height: 13 }} /> {t('buildingDetail.editBuilding')}
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleBldDelete}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: '#FEF2F2', color: C.red, border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
            }}>
            <Trash2 style={{ width: 13, height: 13 }} /> {t('buildingDetail.deleteBuilding')}
          </motion.button>
        </div>
      </motion.div>

      {/* Mini stat strip */}
      <div style={{
        display: 'flex', gap: 24, padding: '14px 20px',
        background: 'white', borderRadius: 12,
        boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 2px 8px rgba(15,23,42,0.04)',
        flexWrap: 'wrap'
      }}>
        {[
          { label: singleUnit ? t('buildingDetail.stats.unit') : t('buildingDetail.stats.apartment'), value: apartments.length, color: C.teal },
          { label: t('buildingDetail.stats.occupied'), value: occupied, color: '#059669' },
          { label: t('buildingDetail.stats.vacant'), value: vacant, color: '#DC2626' },
          { label: t('buildingDetail.stats.monthly'), value: formatMoney(monthlyIncome), color: C.teal }
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {s.label}
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* + Daire Ekle — sadece apartman tipinde gosterilir */}
      {!singleUnit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={openAptAdd}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 12,
              background: C.teal, color: 'white', border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
              boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
            }}>
            <Plus style={{ width: 15, height: 15 }} /> {t('buildingDetail.addApartment')}
          </motion.button>
        </div>
      )}

      {/* Daire tablosu */}
      <div style={{
        background: C.card, borderRadius: 16,
        boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px',
          padding: '14px 24px', borderBottom: `1px solid ${C.borderLight}`,
          background: '#FAFBFC'
        }}>
          {[singleUnit ? t('buildingDetail.table.unit') : t('buildingDetail.table.apartment'), t('buildingDetail.table.tenant'), t('buildingDetail.table.nextPayment'), t('buildingDetail.table.leaseEnd'), ''].map((h, i) => (
            <div key={i} style={{
              fontSize: 11, fontWeight: 700, color: C.textFaint,
              textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>{h}</div>
          ))}
        </div>

        {apartments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.textFaint, fontSize: 14 }}>
            {singleUnit
              ? t('buildingDetail.empty.single')
              : t('buildingDetail.empty.multi')}
          </div>
        ) : (
          apartments.map((apt, i) => {
            const tenant = apt.tenants?.[0]
            const isOccupied = !!tenant
            const nextPay = tenant ? getNextPayment(tenant.id) : null
            // Bu ekranda bina bağlamı zaten belli — "Kat / Daire" gibi prefix'ler
            // gürültü oluyor. Kullanıcının floor_no / unit_no alanlarına girdiği ham
            // değeri göster: kiracılı satırda yalnız floor_no, boş satırda
            // floor_no · unit_no. Tekli bina tipinde üst etiket zaten anlamlı.
            const floorRaw = apt.floor_no || ''
            const unitRaw  = apt.unit_no || ''
            const rawFull  = floorRaw && unitRaw
              ? `${floorRaw} · ${unitRaw}`
              : (floorRaw || unitRaw || '—')
            const rawOccupied = floorRaw || unitRaw || '—'
            const label = singleUnit
              ? t(`buildingTypes.${building.building_type || 'apartman'}`)
              : (isOccupied ? rawOccupied : rawFull)

            return (
              <motion.div key={apt.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => navigate(`/properties/${apt.id}`)}
                whileHover={{ backgroundColor: '#F8FAFC' }}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px',
                  padding: '16px 24px', alignItems: 'center',
                  borderBottom: `1px solid ${C.borderLight}`,
                  cursor: 'pointer', transition: 'background 0.15s'
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <div style={{
                    padding: '4px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                    background: isOccupied ? '#ECFDF5' : '#FEF2F2',
                    color: isOccupied ? '#059669' : '#DC2626'
                  }}>
                    {isOccupied ? t('buildingDetail.table.occupied') : t('buildingDetail.table.vacant')}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{label}</div>
                </div>
                <div>
                  {tenant ? (
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{tenant.full_name}</div>
                  ) : (
                    <div onClick={(e) => openTenantAdd(e, apt.id, label)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 12, fontWeight: 600, color: C.teal, cursor: 'pointer'
                      }}>
                      <UserPlus style={{ width: 13, height: 13 }} /> {t('buildingDetail.table.addTenant')}
                    </div>
                  )}
                </div>
                <div>
                  {tenant ? (
                    nextPay ? (
                      <div style={{
                        fontSize: 13, fontWeight: 500,
                        color: new Date(nextPay.due_date) < new Date() ? C.red : C.text
                      }}>{fmtDate(nextPay.due_date)}</div>
                    ) : (
                      <div style={{ fontSize: 12, color: C.textFaint }}>{t('buildingDetail.table.noPaymentRecord')}</div>
                    )
                  ) : (
                    <div style={{ fontSize: 12, color: C.textFaint }}>—</div>
                  )}
                </div>
                <div>
                  {tenant?.lease_end ? (
                    <div style={{
                      fontSize: 13, fontWeight: 500,
                      color: new Date(tenant.lease_end) < new Date() ? C.red : C.text
                    }}>{fmtDate(tenant.lease_end)}</div>
                  ) : tenant ? (
                    <div onClick={(e) => { e.stopPropagation(); navigate(`/properties/${apt.id}`) }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, fontWeight: 600, color: C.teal, cursor: 'pointer'
                      }}>{t('buildingDetail.table.addLease')}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: C.textFaint }}>—</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={(e) => openAptEdit(e, apt.id)}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted
                    }}>
                    <Pencil style={{ width: 14, height: 14 }} />
                  </motion.button>
                  {!singleUnit && (
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={(e) => handleAptDelete(e, apt.id, label)}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted
                      }}>
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* ═══ BUILDING POPUP ═══ */}
      <AnimatePresence>
        {showBldPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowBldPopup(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20, paddingLeft: 'calc(20px + var(--sb-w))'
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
                    {t('buildingDetail.bldModal.title')}
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
                    <label style={labelStyle}>{t('buildingDetail.bldModal.name')}</label>
                    <input style={inputStyle} type="text" required
                      placeholder={t('buildingDetail.bldModal.namePh')}
                      value={bldForm.name} onChange={e => updateBldForm('name', e.target.value)}
                      onFocus={e => e.target.style.borderColor = C.teal}
                      onBlur={e => e.target.style.borderColor = C.border} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>{t('buildingDetail.bldModal.city')}</label>
                      <input style={inputStyle} type="text" placeholder={t('buildingDetail.bldModal.cityPh')}
                        value={bldForm.city} onChange={e => updateBldForm('city', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('buildingDetail.bldModal.district')}</label>
                      <input style={inputStyle} type="text" placeholder={t('buildingDetail.bldModal.districtPh')}
                        value={bldForm.district} onChange={e => updateBldForm('district', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('buildingDetail.bldModal.address')}</label>
                    <input style={inputStyle} type="text" placeholder={t('buildingDetail.bldModal.addressPh')}
                      value={bldForm.address} onChange={e => updateBldForm('address', e.target.value)}
                      onFocus={e => e.target.style.borderColor = C.teal}
                      onBlur={e => e.target.style.borderColor = C.border} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>{t('buildingDetail.bldModal.buildingAge')}</label>
                      <input style={inputStyle} type="number" min="0" placeholder="5"
                        value={bldForm.building_age} onChange={e => updateBldForm('building_age', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('buildingDetail.bldModal.notes')}</label>
                      <input style={inputStyle} type="text" placeholder={t('buildingDetail.bldModal.notesPh')}
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
                  <div></div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      type="button" onClick={() => setShowBldPopup(false)}
                      style={{
                        padding: '10px 20px', borderRadius: 10,
                        background: '#F1F5F9', color: C.textMuted, border: 'none',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
                      }}>
                      {t('common.cancel')}
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
                      {savingBld ? t('common.saving') : t('common.save')}
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
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20, paddingLeft: 'calc(20px + var(--sb-w))'
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
                    {editAptId ? t('buildingDetail.aptModal.titleEdit') : t('buildingDetail.aptModal.titleAdd')}
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
                    <label style={labelStyle}>{t('buildingDetail.aptModal.building')}</label>
                    <select required value={aptForm.building_id}
                      onChange={e => updateAptForm('building_id', e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer', ...selectStyle, background: '#FAFBFC', minWidth: 'auto' }}
                    >
                      <option value={id}>{building.name}</option>
                    </select>
                  </div>

                  {/* Unit no + Type */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>{t('buildingDetail.aptModal.unitNo')}</label>
                      <input style={inputStyle} type="text" required placeholder="20"
                        value={aptForm.unit_no} onChange={e => updateAptForm('unit_no', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('buildingDetail.aptModal.propertyType')}</label>
                      <select style={{ ...inputStyle, cursor: 'pointer' }}
                        value={aptForm.property_type} onChange={e => updateAptForm('property_type', e.target.value)}>
                        {PROPERTY_TYPE_KEYS.map(k => <option key={k} value={k}>{t(`propertyTypes.${k}`)}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Oda, Kat, m2, Depozito */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>{t('buildingDetail.aptModal.roomCount')}</label>
                      <input style={inputStyle} type="text" placeholder="2+1"
                        value={aptForm.room_count} onChange={e => updateAptForm('room_count', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('buildingDetail.aptModal.floor')}</label>
                      <input style={inputStyle} type="text" placeholder="2"
                        value={aptForm.floor_no} onChange={e => updateAptForm('floor_no', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('buildingDetail.aptModal.deposit')}</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0"
                        value={aptForm.deposit} onChange={e => updateAptForm('deposit', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('buildingDetail.aptModal.grossArea')}</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="120"
                        value={aptForm.m2_gross} onChange={e => updateAptForm('m2_gross', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('buildingDetail.aptModal.netArea')}</label>
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
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t('buildingDetail.aptModal.furnished')}</span>
                      </label>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={labelStyle}>{t('buildingDetail.aptModal.notes')}</label>
                    <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} rows={2}
                      placeholder={t('buildingDetail.aptModal.notesPh')}
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
                    {t('common.cancel')}
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
                    {savingApt ? t('common.saving') : t('common.save')}
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
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20, paddingLeft: 'calc(20px + var(--sb-w))'
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
                    {t('buildingDetail.tenantModal.title')}
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
                {/* Mode toggle */}
                <div style={{
                  padding: '14px 28px 0 28px',
                  display: 'flex', gap: 6
                }}>
                  {[
                    { key: 'new', label: t('buildingDetail.tenantModal.modeNew'), icon: UserPlus, count: null },
                    { key: 'existing', label: t('buildingDetail.tenantModal.modeExisting'), icon: UserCheck, count: inactiveTenants.length }
                  ].map(m => {
                    const MIcon = m.icon
                    const active = tenantMode === m.key
                    return (
                      <button key={m.key} type="button" onClick={() => setTenantMode(m.key)}
                        style={{
                          flex: 1,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          padding: '10px 14px', borderRadius: 10,
                          fontSize: 13, fontWeight: active ? 700 : 500,
                          color: active ? C.teal : C.textMuted,
                          background: active ? '#F0FDFA' : '#FAFBFC',
                          border: `1.5px solid ${active ? '#99D8DF' : C.border}`,
                          cursor: 'pointer', fontFamily: font,
                          transition: 'all 0.15s'
                        }}>
                        <MIcon style={{ width: 14, height: 14 }} />
                        {m.label}
                        {m.count !== null && (
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            background: active ? '#CCE4E8' : '#E2E8F0',
                            color: active ? C.teal : C.textFaint,
                            padding: '1px 7px', borderRadius: 6
                          }}>{m.count}</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div style={{ padding: '20px 28px 24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {tenantMode === 'existing' ? (
                    inactiveTenants.length === 0 ? (
                      <div style={{
                        padding: '32px 16px', textAlign: 'center',
                        background: '#FEF3C7', borderRadius: 12, border: '1px solid #FDE68A'
                      }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 14, background: '#FDE68A',
                          color: '#D97706', display: 'inline-flex', alignItems: 'center',
                          justifyContent: 'center', marginBottom: 10
                        }}>
                          <AlertCircle style={{ width: 22, height: 22 }} />
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
                          {t('buildingDetail.tenantModal.noInactiveTitle')}
                        </div>
                        <div style={{ fontSize: 12, color: '#92400E', marginBottom: 12 }}>
                          {t('buildingDetail.tenantModal.noInactiveSub')}
                        </div>
                        <button type="button" onClick={() => setTenantMode('new')}
                          style={{
                            padding: '8px 16px', borderRadius: 8,
                            background: C.teal, color: 'white', border: 'none',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font
                          }}>
                          {t('buildingDetail.tenantModal.createNewCta')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label style={labelStyle}>{t('buildingDetail.tenantModal.selectInactive')}</label>
                          <select style={{ ...selectStyle }} required
                            value={existingTenantId}
                            onChange={e => selectExistingTenant(e.target.value)}>
                            <option value="">{t('buildingDetail.tenantModal.selectInactivePh')}</option>
                            {inactiveTenants.map(ten => (
                              <option key={ten.id} value={ten.id}>
                                {ten.full_name}{ten.phone ? ` · ${ten.phone}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        {existingTenantId && (
                          <div style={{
                            padding: '12px 14px', borderRadius: 10,
                            background: '#F0FDFA', border: '1px solid #CCE4E8',
                            display: 'flex', flexDirection: 'column', gap: 4
                          }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.teal }}>
                              {tenantForm.full_name}
                            </div>
                            <div style={{ fontSize: 12, color: C.textMuted }}>
                              {tenantForm.phone || '—'} · {tenantForm.email || '—'}
                            </div>
                          </div>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <label style={labelStyle}>{t('buildingDetail.tenantModal.fullName')}</label>
                          <input style={inputStyle} required placeholder={t('buildingDetail.tenantModal.fullNamePh')}
                            value={tenantForm.full_name} onChange={e => updateTenantForm('full_name', e.target.value)}
                            onFocus={e => e.target.style.borderColor = C.teal}
                            onBlur={e => e.target.style.borderColor = C.border} />
                        </div>
                        <div>
                          <label style={labelStyle}>{t('buildingDetail.tenantModal.tcNo')}</label>
                          <input style={inputStyle} placeholder={t('buildingDetail.tenantModal.tcNoPh')}
                            value={tenantForm.tc_no} onChange={e => updateTenantForm('tc_no', e.target.value)}
                            onFocus={e => e.target.style.borderColor = C.teal}
                            onBlur={e => e.target.style.borderColor = C.border} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <label style={labelStyle}>{t('buildingDetail.tenantModal.phone')}</label>
                          <input style={inputStyle} placeholder={t('buildingDetail.tenantModal.phonePh')}
                            value={tenantForm.phone} onChange={e => updateTenantForm('phone', e.target.value)}
                            onFocus={e => e.target.style.borderColor = C.teal}
                            onBlur={e => e.target.style.borderColor = C.border} />
                        </div>
                        <div>
                          <label style={labelStyle}>{t('buildingDetail.tenantModal.email')}</label>
                          <input style={inputStyle} type="email" placeholder={t('buildingDetail.tenantModal.emailPh')}
                            value={tenantForm.email} onChange={e => updateTenantForm('email', e.target.value)}
                            onFocus={e => e.target.style.borderColor = C.teal}
                            onBlur={e => e.target.style.borderColor = C.border} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Ortak alanlar — hem yeni hem mevcut kiraci icin (inactive liste boş degilse) */}
                  {!(tenantMode === 'existing' && inactiveTenants.length === 0) && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <label style={labelStyle}>{t('buildingDetail.tenantModal.leaseStart')}</label>
                          <input style={inputStyle} type="date"
                            value={tenantForm.lease_start} onChange={e => updateTenantForm('lease_start', e.target.value)}
                            onFocus={e => e.target.style.borderColor = C.teal}
                            onBlur={e => e.target.style.borderColor = C.border} />
                        </div>
                        <div>
                          <label style={labelStyle}>{t('buildingDetail.tenantModal.leaseEnd')}</label>
                          <input style={inputStyle} type="date"
                            value={tenantForm.lease_end} onChange={e => updateTenantForm('lease_end', e.target.value)}
                            onFocus={e => e.target.style.borderColor = C.teal}
                            onBlur={e => e.target.style.borderColor = C.border} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <label style={labelStyle}>{t('buildingDetail.tenantModal.monthlyRent')}</label>
                          <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0"
                            value={tenantForm.rent} onChange={e => updateTenantForm('rent', e.target.value)}
                            onFocus={e => e.target.style.borderColor = C.teal}
                            onBlur={e => e.target.style.borderColor = C.border} />
                        </div>
                        <div>
                          <label style={labelStyle}>{t('buildingDetail.tenantModal.deposit')}</label>
                          <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0"
                            value={tenantForm.deposit} onChange={e => updateTenantForm('deposit', e.target.value)}
                            onFocus={e => e.target.style.borderColor = C.teal}
                            onBlur={e => e.target.style.borderColor = C.border} />
                        </div>
                      </div>
                    </>
                  )}
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
                    {t('common.cancel')}
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
                    {savingTenant
                      ? t('common.saving')
                      : (tenantMode === 'existing' ? t('buildingDetail.tenantModal.submitAssign') : t('buildingDetail.tenantModal.submitNew'))}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
