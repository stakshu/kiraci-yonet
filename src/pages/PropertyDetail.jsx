/* ── KiraciYonet — Mulk Detay — Full Featured ── */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { apartmentLabel, unitLabel } from '../lib/apartmentLabel'
import { formatMoney, formatDate as fmtDate } from '../i18n/formatters'
import {
  ArrowLeft, Building2, MapPin, Home, BedDouble, Armchair,
  Layers, Maximize2, Clock, Check, Undo2, Pencil, X, Save,
  FileText, StickyNote, CreditCard, ScrollText, CalendarDays,
  Mail, Phone, IdCard, DollarSign, Shield, Upload, Trash2,
  Download, Plus, FileUp, ChevronDown, ChevronRight, Users, User,
  AlertTriangle, UserMinus
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"

function daysDiff(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.ceil((target - today) / 864e5)
}

const PROPERTY_TYPE_KEYS = ['daire', 'mustakil', 'villa', 'dukkan', 'ofis', 'arsa', 'diger']

const C = {
  teal: '#025864',
  green: '#00D47E',
  red: '#EF4444',
  amber: '#F59E0B',
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  border: '#E5E7EB',
  borderLight: '#F1F5F9',
  card: '#FFFFFF'
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } }
}
const fadeItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
}

const TABS = [
  { key: 'details', icon: Building2 },
  { key: 'payments', icon: CreditCard },
  { key: 'lease', icon: ScrollText },
  { key: 'documents', icon: FileText },
  { key: 'notes', icon: StickyNote }
]

const inputStyle = {
  fontFamily: font, fontSize: 13, padding: '9px 14px',
  borderRadius: 10, border: `1.5px solid ${C.border}`,
  background: '#FAFBFC', color: C.text, outline: 'none',
  width: '100%', boxSizing: 'border-box'
}

const cardBox = {
  background: C.card, borderRadius: 16,
  boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
  overflow: 'hidden'
}

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { t } = useTranslation()
  const fileRef = useRef(null)

  const [apt, setApt] = useState(null)
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('details')

  /* Payments */
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  /* Past tenants */
  const [pastTenants, setPastTenants] = useState([])
  const [pastTenantsLoading, setPastTenantsLoading] = useState(false)
  const [expandedPastTenant, setExpandedPastTenant] = useState(null)

  /* Edit modes */
  const [editingDetails, setEditingDetails] = useState(false)
  const [detailForm, setDetailForm] = useState({})
  const [savingDetails, setSavingDetails] = useState(false)

  /* Notes */
  const [editingNote, setEditingNote] = useState(null) // 'property' | 'tenant' | null
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  /* End lease confirmation */
  const [showEndLease, setShowEndLease] = useState(false)
  const [endingLease, setEndingLease] = useState(false)

  /* Delete property confirmation */
  const [showDeleteProperty, setShowDeleteProperty] = useState(false)
  const [deletingProperty, setDeletingProperty] = useState(false)

  /* Documents */
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => { loadProperty() }, [id])
  useEffect(() => {
    if (tab === 'payments' && apt) loadPayments()
    if (tab === 'documents' && apt) loadDocuments()
    if (tab === 'lease' && apt) loadPastTenants()
  }, [tab, apt])

  const loadProperty = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('apartments')
      .select('*, buildings(id, name, city, district, address, building_age), tenants(id, full_name, email, phone, tc_no, lease_start, lease_end, rent, deposit, notes)')
      .eq('id', id)
      .single()
    if (error || !data) {
      showToast(t('propertyDetail.toasts.propertyNotFound'), 'error')
      navigate('/properties')
      return
    }
    setApt(data)
    setLoading(false)
  }

  const loadBuildings = async () => {
    const { data } = await supabase
      .from('buildings')
      .select('id, name, city, district, address, building_age')
      .order('name', { ascending: true })
    setBuildings(data || [])
  }

  const loadPayments = async () => {
    setPaymentsLoading(true)
    const { data } = await supabase
      .from('rent_payments').select('*, tenants(id, full_name)')
      .eq('apartment_id', id)
      .order('due_date', { ascending: false })
    setPayments(data || [])
    setPaymentsLoading(false)
  }

  const loadPastTenants = async () => {
    setPastTenantsLoading(true)
    // Find all tenant_ids from payments for this apartment
    const { data: paymentData } = await supabase
      .from('rent_payments')
      .select('tenant_id')
      .eq('apartment_id', id)
    const tenantIds = [...new Set((paymentData || []).map(p => p.tenant_id).filter(Boolean))]
    // Exclude current tenant
    const currentTenantId = apt?.tenants?.[0]?.id
    const pastIds = tenantIds.filter(tid => tid !== currentTenantId)
    if (pastIds.length > 0) {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, full_name, email, phone, tc_no, lease_start, lease_end, rent, deposit, notes, emergency_contact_name, emergency_contact_phone, iban, household_info')
        .in('id', pastIds)
      setPastTenants(tenants || [])
    } else {
      setPastTenants([])
    }
    setPastTenantsLoading(false)
  }

  const confirmEndLease = async () => {
    const ten = apt?.tenants?.[0]
    if (!ten) return
    setEndingLease(true)
    const { error } = await supabase
      .from('tenants')
      .update({ apartment_id: null, status: 'former' })
      .eq('id', ten.id)
    setEndingLease(false)
    if (error) { showToast(t('propertyDetail.toasts.errorPrefix', { msg: error.message }), 'error'); return }
    showToast(t('propertyDetail.toasts.leaseEnded', { name: ten.full_name }), 'success')
    setShowEndLease(false)
    loadProperty()
    if (tab === 'lease') loadPastTenants()
  }

  const confirmDeleteProperty = async () => {
    setDeletingProperty(true)
    const { error } = await supabase.from('apartments').delete().eq('id', id)
    setDeletingProperty(false)
    if (error) { showToast(t('propertyDetail.toasts.errorPrefix', { msg: error.message }), 'error'); return }
    showToast(t('propertyDetail.toasts.propertyDeleted'), 'success')
    navigate('/properties')
  }

  const loadDocuments = async () => {
    const { data } = await supabase.storage
      .from('documents')
      .list(`apartments/${id}`, { sortBy: { column: 'created_at', order: 'desc' } })
    setDocuments(data || [])
  }

  /* ── Detail edit ── */
  const startEditDetails = () => {
    loadBuildings()
    setDetailForm({
      building_id: apt.building_id || '', unit_no: apt.unit_no || '',
      property_type: apt.property_type || 'daire',
      room_count: apt.room_count || '', floor_no: apt.floor_no || '',
      m2_gross: apt.m2_gross || '', m2_net: apt.m2_net || '',
      furnished: apt.furnished || false,
      deposit: apt.deposit || ''
    })
    setEditingDetails(true)
  }

  const saveDetails = async () => {
    if (!detailForm.building_id) { showToast(t('propertyDetail.toasts.buildingRequired'), 'error'); return }
    setSavingDetails(true)
    const { error } = await supabase.from('apartments').update({
      building_id: detailForm.building_id,
      unit_no: detailForm.unit_no.trim(),
      property_type: detailForm.property_type,
      room_count: detailForm.room_count.toString().trim(),
      floor_no: detailForm.floor_no.toString().trim(),
      m2_gross: parseFloat(detailForm.m2_gross) || null,
      m2_net: parseFloat(detailForm.m2_net) || null,
      furnished: detailForm.furnished,
      deposit: parseFloat(detailForm.deposit) || 0
    }).eq('id', id)
    setSavingDetails(false)
    if (error) { showToast(t('propertyDetail.toasts.errorPrefix', { msg: error.message }), 'error'); return }
    showToast(t('propertyDetail.toasts.propertyUpdated'), 'success')
    setEditingDetails(false)
    loadProperty()
  }

  /* ── Notes ── */
  const startEditNote = (type) => {
    if (type === 'property') setNoteText(apt.notes || '')
    else setNoteText(apt.tenants?.[0]?.notes || '')
    setEditingNote(type)
  }

  const saveNote = async () => {
    setSavingNote(true)
    if (editingNote === 'property') {
      const { error } = await supabase.from('apartments').update({ notes: noteText.trim() }).eq('id', id)
      if (error) { showToast(t('propertyDetail.toasts.errorPrefix', { msg: error.message }), 'error'); setSavingNote(false); return }
    } else {
      const ten = apt.tenants?.[0]
      if (ten) {
        const { error } = await supabase.from('tenants').update({ notes: noteText.trim() }).eq('id', ten.id)
        if (error) { showToast(t('propertyDetail.toasts.errorPrefix', { msg: error.message }), 'error'); setSavingNote(false); return }
      }
    }
    setSavingNote(false)
    showToast(t('propertyDetail.toasts.noteSaved'), 'success')
    setEditingNote(null)
    loadProperty()
  }

  /* ── Documents ── */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fileName = `${Date.now()}_${file.name}`
    const { error } = await supabase.storage
      .from('documents')
      .upload(`apartments/${id}/${fileName}`, file)
    setUploading(false)
    if (error) { showToast(t('propertyDetail.toasts.uploadError', { msg: error.message }), 'error'); return }
    showToast(t('propertyDetail.toasts.documentUploaded'), 'success')
    loadDocuments()
    if (fileRef.current) fileRef.current.value = ''
  }

  const downloadDoc = async (name) => {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(`apartments/${id}/${name}`, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const deleteDoc = async (name) => {
    if (!confirm(t('propertyDetail.toasts.confirmDeleteDoc', { name }))) return
    const { error } = await supabase.storage
      .from('documents')
      .remove([`apartments/${id}/${name}`])
    if (error) { showToast(t('propertyDetail.toasts.errorPrefix', { msg: error.message }), 'error'); return }
    showToast(t('propertyDetail.toasts.documentDeleted'), 'success')
    loadDocuments()
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, fontFamily: font }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${C.teal}`, borderTopColor: 'transparent' }} />
    </div>
  )
  if (!apt) return null

  const tenant = apt.tenants?.[0]
  const bld = apt.buildings || {}
  const location = [bld.city, bld.district].filter(Boolean).join(', ')

  const ptLabel = apt.property_type ? t(`propertyTypes.${apt.property_type}`) : '—'

  const summaryCards = [
    { icon: Building2, label: t('propertyDetail.fields.building'), value: bld.name || '—' },
    { icon: Home, label: t('propertyDetail.fields.apartment'), value: unitLabel(apt) },
    { icon: MapPin, label: t('propertyDetail.fields.location'), value: location || '—' },
    { icon: Home, label: t('propertyDetail.fields.propertyType'), value: ptLabel },
    { icon: BedDouble, label: t('propertyDetail.fields.roomCount'), value: apt.room_count || '—' },
    { icon: Armchair, label: t('propertyDetail.fields.furnished'), value: apt.furnished ? t('common.yes') : t('common.no') },
    { icon: Maximize2, label: t('propertyDetail.fields.m2Net'), value: apt.m2_net || '—' },
    { icon: Clock, label: t('propertyDetail.fields.buildingAge'), value: bld.building_age != null ? bld.building_age : '—' }
  ]

  const detailRows = [
    { label: t('propertyDetail.fields.building'), value: bld.name || '—' },
    { label: t('propertyDetail.fields.address'), value: bld.address ? `${bld.address}${location ? ', ' + location : ''}` : location || '—' },
    { label: t('propertyDetail.fields.propertyType'), value: ptLabel },
    { label: t('propertyDetail.fields.m2Gross'), value: apt.m2_gross || '—' },
    { label: t('propertyDetail.fields.m2Net'), value: apt.m2_net || '—' },
    { label: t('propertyDetail.fields.roomCount'), value: apt.room_count || '—' },
    { label: t('propertyDetail.fields.floor'), value: apt.floor_no || '—' },
    { label: t('propertyDetail.fields.buildingAge'), value: bld.building_age != null ? bld.building_age : '—' },
    { label: t('propertyDetail.fields.furnished'), value: apt.furnished ? t('common.yes') : t('common.no') },
    { label: t('propertyDetail.fields.deposit'), value: apt.deposit ? formatMoney(apt.deposit) : '—' }
  ]

  const DF = (field, val) => setDetailForm(p => ({ ...p, [field]: val }))

  /* Helper: render tenant info card (used for both current and past) */
  const renderTenantInfo = (ten) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
      {[
        { icon: IdCard, label: t('propertyDetail.tenantInfo.fullName'), value: ten.full_name },
        { icon: Mail, label: t('propertyDetail.tenantInfo.email'), value: ten.email || '—' },
        { icon: Phone, label: t('propertyDetail.tenantInfo.phone'), value: ten.phone || '—' },
        { icon: Shield, label: t('propertyDetail.tenantInfo.tcNo'), value: ten.tc_no || '—' },
        { icon: CalendarDays, label: t('propertyDetail.tenantInfo.leaseStart'), value: fmtDate(ten.lease_start) },
        { icon: CalendarDays, label: t('propertyDetail.tenantInfo.leaseEnd'), value: fmtDate(ten.lease_end) },
        { icon: DollarSign, label: t('propertyDetail.tenantInfo.monthlyRent'), value: ten.rent ? formatMoney(ten.rent) : '—' },
        { icon: DollarSign, label: t('propertyDetail.tenantInfo.deposit'), value: ten.deposit ? formatMoney(ten.deposit) : '—' }
      ].map((r, i, arr) => {
        const Icon = r.icon
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 22px',
            borderBottom: i < arr.length - 2 ? `1px solid ${C.borderLight}` : 'none',
            borderRight: i % 2 === 0 ? `1px solid ${C.borderLight}` : 'none'
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: '#F0FDFA', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon style={{ width: 14, height: 14, color: C.teal }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textFaint }}>{r.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 1 }}>{r.value}</div>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ fontFamily: font, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ═══ BACK BUTTON ═══ */}
      <motion.div variants={fadeItem}>
        <motion.button whileHover={{ x: -3 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/properties')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, color: C.textMuted,
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: font, padding: 0
          }}>
          <ArrowLeft style={{ width: 16, height: 16 }} />
          {t('propertyDetail.back')}
        </motion.button>
      </motion.div>

      {/* ═══ TABS ═══ */}
      <motion.div variants={fadeItem} style={{
        display: 'flex', gap: 0,
        justifyContent: 'center',
        borderBottom: `2px solid ${C.borderLight}`,
        flexShrink: 0
      }}>
        {TABS.map(tb => {
          const Icon = tb.icon
          const isActive = tab === tb.key
          return (
            <button key={tb.key}
              onClick={() => setTab(tb.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '12px 18px', fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? C.teal : C.textMuted,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: font, whiteSpace: 'nowrap',
                borderBottom: isActive ? `2px solid ${C.teal}` : '2px solid transparent',
                marginBottom: -2,
                transition: 'color 0.2s, border-color 0.2s'
              }}>
              <Icon style={{ width: 15, height: 15 }} />
              {t(`propertyDetail.tabs.${tb.key}`)}
            </button>
          )
        })}
      </motion.div>

      {/* ═══ TAB CONTENT ═══ */}

      {/* ── MULK DETAYLARI ── */}
      {tab === 'details' && (
        <>
          {/* Header with edit button */}
          <motion.div variants={fadeItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.01em' }}>
              {t('propertyDetail.summary.title')}
            </h2>
            {!editingDetails && (
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={startEditDetails}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 10,
                    background: C.teal, color: 'white', border: 'none',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                    boxShadow: '0 2px 8px rgba(2,88,100,0.18)'
                  }}>
                  <Pencil style={{ width: 13, height: 13 }} /> {t('propertyDetail.summary.edit')}
                </motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowDeleteProperty(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 10,
                    background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font
                  }}>
                  <Trash2 style={{ width: 13, height: 13 }} /> {t('propertyDetail.summary.delete')}
                </motion.button>
              </div>
            )}
          </motion.div>

          {!editingDetails ? (
            <>
              {/* Summary icon cards */}
              <motion.div variants={fadeItem} style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
                ...cardBox
              }}>
                {summaryCards.map((c, i) => {
                  const Icon = c.icon
                  return (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.04, duration: 0.4 }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '18px 22px',
                        borderRight: (i + 1) % 4 !== 0 ? `1px solid ${C.borderLight}` : 'none',
                        borderBottom: i < 4 ? `1px solid ${C.borderLight}` : 'none'
                      }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: '#F0FDFA',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Icon style={{ width: 18, height: 18, color: C.teal }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: C.textFaint }}>{c.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginTop: 2 }}>{c.value}</div>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>

              {/* Temel Bilgiler table */}
              <motion.div variants={fadeItem}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 16px', letterSpacing: '-0.01em' }}>
                  {t('propertyDetail.basics')}
                </h2>
                <div style={cardBox}>
                  {detailRows.map((r, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '200px 1fr',
                      padding: '14px 24px',
                      borderBottom: i < detailRows.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                      alignItems: 'center'
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>{r.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          ) : (
            /* ── Edit form ── */
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={cardBox}>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>{t('propertyDetail.edit.buildingLabel')}</label>
                    <select
                      style={{ ...inputStyle, cursor: 'pointer' }}
                      value={detailForm.building_id}
                      onChange={e => DF('building_id', e.target.value)}
                    >
                      <option value="">{t('propertyDetail.edit.buildingPh')}</option>
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>{t('propertyDetail.edit.unitNo')}</label>
                    <input style={inputStyle} value={detailForm.unit_no} onChange={e => DF('unit_no', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>{t('propertyDetail.edit.propertyType')}</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={detailForm.property_type} onChange={e => DF('property_type', e.target.value)}>
                      {PROPERTY_TYPE_KEYS.map(k => <option key={k} value={k}>{t(`propertyTypes.${k}`)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>{t('propertyDetail.edit.roomCount')}</label>
                    <input style={inputStyle} value={detailForm.room_count} onChange={e => DF('room_count', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>{t('propertyDetail.edit.floor')}</label>
                    <input style={inputStyle} value={detailForm.floor_no} onChange={e => DF('floor_no', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>{t('propertyDetail.edit.grossArea')}</label>
                    <input style={inputStyle} type="number" value={detailForm.m2_gross} onChange={e => DF('m2_gross', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>{t('propertyDetail.edit.netArea')}</label>
                    <input style={inputStyle} type="number" value={detailForm.m2_net} onChange={e => DF('m2_net', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>{t('propertyDetail.edit.deposit')}</label>
                    <input style={inputStyle} type="number" value={detailForm.deposit} onChange={e => DF('deposit', e.target.value)} />
                  </div>
                </div>
                <p style={{ fontSize: 12, color: C.textFaint, margin: 0, fontStyle: 'italic' }}>
                  {t('propertyDetail.edit.buildingScopeNote')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="furn" checked={detailForm.furnished}
                    onChange={e => DF('furnished', e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: C.teal, cursor: 'pointer' }} />
                  <label htmlFor="furn" style={{ fontSize: 13, fontWeight: 600, color: C.text, cursor: 'pointer' }}>{t('propertyDetail.edit.furnished')}</label>
                </div>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: 10,
                padding: '16px 24px', borderTop: `1px solid ${C.borderLight}`
              }}>
                <button onClick={() => setEditingDetails(false)}
                  style={{ padding: '9px 18px', borderRadius: 10, background: '#F1F5F9', color: C.textMuted, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>
                  {t('common.cancel')}
                </button>
                <button onClick={saveDetails} disabled={savingDetails}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 20px', borderRadius: 10, background: C.teal, color: 'white', border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                    opacity: savingDetails ? 0.7 : 1, boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
                  }}>
                  <Save style={{ width: 14, height: 14 }} />
                  {savingDetails ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ── ODEME AKISI (info-only log, grouped by tenant) ── */}
      {tab === 'payments' && (
        <motion.div variants={fadeItem}>
          {paymentsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.teal}`, borderTopColor: 'transparent' }} />
            </div>
          ) : payments.length === 0 ? (
            <div style={{ ...cardBox, textAlign: 'center', padding: '32px 24px', color: C.textFaint, fontSize: 14 }}>
              {t('propertyDetail.payments.empty')}
            </div>
          ) : (() => {
            // Group payments by tenant
            const currentTenantId = tenant?.id
            const grouped = {}
            payments.forEach(p => {
              const tid = p.tenant_id || 'unknown'
              if (!grouped[tid]) grouped[tid] = { name: p.tenants?.full_name || t('propertyDetail.payments.unknownTenant'), payments: [], isCurrent: tid === currentTenantId }
              grouped[tid].payments.push(p)
            })
            // Sort: current tenant first, then past tenants
            const sections = Object.values(grouped).sort((a, b) => {
              if (a.isCurrent && !b.isCurrent) return -1
              if (!a.isCurrent && b.isCurrent) return 1
              return 0
            })

            return sections.map((section, si) => (
              <div key={si} style={{ marginBottom: si < sections.length - 1 ? 20 : 0 }}>
                {/* Tenant header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: section.isCurrent
                      ? 'linear-gradient(135deg, #025864 0%, #03363D 100%)'
                      : '#E2E8F0',
                    color: section.isCurrent ? 'white' : C.textMuted,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800
                  }}>
                    {section.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{section.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: section.isCurrent ? '#059669' : C.textFaint }}>
                      {section.isCurrent ? t('propertyDetail.payments.currentTenant') : t('propertyDetail.payments.pastTenant')} · {t('propertyDetail.payments.paymentCount', { n: section.payments.length })}
                    </div>
                  </div>
                </div>

                <div style={cardBox}>
                  {/* Table header */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1fr',
                    padding: '12px 24px', background: '#FAFBFC',
                    borderBottom: `1px solid ${C.borderLight}`
                  }}>
                    {[t('propertyDetail.payments.thDueDate'), t('propertyDetail.payments.thAmount'), t('propertyDetail.payments.thStatus'), t('propertyDetail.payments.thPaidDate')].map((h, i) => (
                      <div key={i} style={{
                        fontSize: 11, fontWeight: 700, color: C.textFaint,
                        textTransform: 'uppercase', letterSpacing: '0.06em'
                      }}>{h}</div>
                    ))}
                  </div>
                  {/* Payment rows */}
                  {section.payments.map((p, i) => {
                    const isPaid = p.status === 'paid'
                    const diff = daysDiff(p.due_date)
                    const isOverdue = !isPaid && diff < 0
                    return (
                      <div key={p.id} style={{
                        display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1fr',
                        padding: '13px 24px', alignItems: 'center',
                        borderBottom: i < section.payments.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                        background: i % 2 === 0 ? 'white' : '#FAFBFC'
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmtDate(p.due_date)}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(p.amount)}</div>
                        <div>
                          <span style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: isPaid ? '#ECFDF5' : isOverdue ? '#FEF2F2' : '#FFF7ED',
                            color: isPaid ? '#059669' : isOverdue ? '#DC2626' : '#D97706'
                          }}>
                            {isPaid ? t('propertyDetail.payments.paid') : isOverdue ? t('propertyDetail.payments.overdue') : t('propertyDetail.payments.pending')}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: p.paid_date ? '#059669' : C.textFaint }}>{p.paid_date ? fmtDate(p.paid_date) : '—'}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          })()}
        </motion.div>
      )}

      {/* ── KIRA SOZLESMESI BILGILERI ── */}
      {tab === 'lease' && (
        <motion.div variants={fadeItem}>
          {/* ── Güncel Kiracı ── */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 16px', letterSpacing: '-0.01em' }}>
            {t('propertyDetail.lease.currentTitle')}
          </h2>
          {tenant ? (
            <div style={cardBox}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '16px 22px', borderBottom: `1px solid ${C.borderLight}`,
                background: '#F0FDFA'
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, #025864 0%, #03363D 100%)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800
                }}>
                  {tenant.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{tenant.full_name}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', marginTop: 1 }}>{t('propertyDetail.lease.activeTenant')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowEndLease(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 8,
                      background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font
                    }}>
                    <UserMinus style={{ width: 13, height: 13 }} />
                    {t('propertyDetail.lease.endLease')}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/tenants/list/${tenant.id}`)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 8,
                      background: C.teal, color: 'white', border: 'none',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font
                    }}>
                    {t('propertyDetail.lease.viewDetail')}
                  </motion.button>
                </div>
              </div>
              {renderTenantInfo(tenant)}
            </div>
          ) : (
            <div style={{ ...cardBox, textAlign: 'center', padding: '32px 24px', color: C.textFaint, fontSize: 14 }}>
              {t('propertyDetail.lease.noCurrent')}
            </div>
          )}

          {/* ── Geçmiş Kiracılar ── */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '32px 0 16px', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users style={{ width: 18, height: 18, color: C.textMuted }} />
            {t('propertyDetail.lease.pastTitle')}
          </h2>
          {pastTenantsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${C.teal}`, borderTopColor: 'transparent' }} />
            </div>
          ) : pastTenants.length === 0 ? (
            <div style={{ ...cardBox, textAlign: 'center', padding: '28px 24px', color: C.textFaint, fontSize: 14 }}>
              {t('propertyDetail.lease.noPast')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pastTenants.map(pt => {
                const isExpanded = expandedPastTenant === pt.id
                const initials = pt.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
                return (
                  <div key={pt.id} style={cardBox}>
                    {/* Clickable header */}
                    <button
                      onClick={() => setExpandedPastTenant(isExpanded ? null : pt.id)}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 22px', background: isExpanded ? '#F8FAFC' : 'white',
                        border: 'none', cursor: 'pointer', fontFamily: font, textAlign: 'left',
                        transition: 'background 0.2s'
                      }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: '#E2E8F0', color: C.textMuted,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{pt.full_name}</div>
                        <div style={{ fontSize: 12, color: C.textFaint, marginTop: 1 }}>
                          {fmtDate(pt.lease_start)} — {fmtDate(pt.lease_end)}
                          {pt.rent ? ` · ${formatMoney(pt.rent)}/${t('propertyDetail.lease.rentSuffix')}` : ''}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                        background: '#F1F5F9', color: C.textMuted, border: '1px solid #E2E8F0'
                      }}>
                        {t('propertyDetail.lease.formerTenant')}
                      </span>
                      {isExpanded
                        ? <ChevronDown style={{ width: 16, height: 16, color: C.textFaint }} />
                        : <ChevronRight style={{ width: 16, height: 16, color: C.textFaint }} />
                      }
                    </button>
                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          style={{ overflow: 'hidden', borderTop: `1px solid ${C.borderLight}` }}>
                          {renderTenantInfo(pt)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── BELGELER ── */}
      {tab === 'documents' && (
        <motion.div variants={fadeItem}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.01em' }}>{t('propertyDetail.documents.title')}</h2>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 10, background: C.teal, color: 'white',
                border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                opacity: uploading ? 0.7 : 1, boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
              }}>
              <Upload style={{ width: 14, height: 14 }} />
              {uploading ? t('propertyDetail.documents.uploading') : t('propertyDetail.documents.upload')}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }}
              onChange={handleFileUpload} />
          </div>

          <div style={cardBox}>
            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                <FileUp style={{ width: 28, height: 28, color: C.textFaint, marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: C.textMuted }}>{t('propertyDetail.documents.empty')}</div>
                <div style={{ fontSize: 12, color: C.textFaint, marginTop: 4 }}>
                  {t('propertyDetail.documents.emptyHint')}
                </div>
              </div>
            ) : (
              <>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px',
                  padding: '14px 24px', background: '#FAFBFC',
                  borderBottom: `1px solid ${C.borderLight}`
                }}>
                  {[t('propertyDetail.documents.thName'), t('propertyDetail.documents.thSize'), t('propertyDetail.documents.thDate'), ''].map((h, i) => (
                    <div key={i} style={{
                      fontSize: 11, fontWeight: 700, color: C.textFaint,
                      textTransform: 'uppercase', letterSpacing: '0.06em'
                    }}>{h}</div>
                  ))}
                </div>
                {documents.map((doc, i) => {
                  const displayName = doc.name.replace(/^\d+_/, '')
                  return (
                    <div key={doc.name} style={{
                      display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px',
                      padding: '14px 24px', alignItems: 'center',
                      borderBottom: `1px solid ${C.borderLight}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText style={{ width: 16, height: 16, color: C.teal, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayName}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{formatFileSize(doc.metadata?.size)}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>
                        {doc.created_at ? fmtDate(doc.created_at.split('T')[0]) : '—'}
                      </div>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button onClick={() => downloadDoc(doc.name)}
                          style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}>
                          <Download style={{ width: 14, height: 14 }} />
                        </button>
                        <button onClick={() => deleteDoc(doc.name)}
                          style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted }}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* ── NOTLAR ── */}
      {tab === 'notes' && (
        <motion.div variants={fadeItem} style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Mulk Notu */}
            <div style={cardBox}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderBottom: `1px solid ${C.borderLight}`
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t('propertyDetail.notes.propertyNote')}</div>
                {editingNote !== 'property' && (
                  <button onClick={() => startEditNote('property')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '6px 14px', borderRadius: 8, background: '#F1F5F9', color: C.textMuted,
                      border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font
                    }}>
                    {apt.notes ? <><Pencil style={{ width: 12, height: 12 }} /> {t('propertyDetail.notes.edit')}</> : <><Plus style={{ width: 12, height: 12 }} /> {t('propertyDetail.notes.add')}</>}
                  </button>
                )}
              </div>
              <div style={{ padding: '16px 24px' }}>
                {editingNote === 'property' ? (
                  <div>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                      placeholder={t('propertyDetail.notes.propertyPh')}
                      style={{
                        ...inputStyle, resize: 'vertical', minHeight: 100,
                        lineHeight: 1.7
                      }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                      <button onClick={() => setEditingNote(null)}
                        style={{ padding: '8px 16px', borderRadius: 8, background: '#F1F5F9', color: C.textMuted, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>
                        {t('common.cancel')}
                      </button>
                      <button onClick={saveNote} disabled={savingNote}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '8px 16px', borderRadius: 8, background: C.teal, color: 'white', border: 'none',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                          opacity: savingNote ? 0.7 : 1
                        }}>
                        <Save style={{ width: 12, height: 12 }} /> {t('common.save')}
                      </button>
                    </div>
                  </div>
                ) : apt.notes ? (
                  <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>{apt.notes}</div>
                ) : (
                  <div style={{ fontSize: 13, color: C.textFaint }}>{t('propertyDetail.notes.empty')}</div>
                )}
              </div>
            </div>

            {/* Kiraci Notu */}
            {tenant && (
              <div style={cardBox}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 24px', borderBottom: `1px solid ${C.borderLight}`
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t('propertyDetail.notes.tenantNote', { name: tenant.full_name })}</div>
                  {editingNote !== 'tenant' && (
                    <button onClick={() => startEditNote('tenant')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 14px', borderRadius: 8, background: '#F1F5F9', color: C.textMuted,
                        border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font
                      }}>
                      {tenant.notes ? <><Pencil style={{ width: 12, height: 12 }} /> {t('propertyDetail.notes.edit')}</> : <><Plus style={{ width: 12, height: 12 }} /> {t('propertyDetail.notes.add')}</>}
                    </button>
                  )}
                </div>
                <div style={{ padding: '16px 24px' }}>
                  {editingNote === 'tenant' ? (
                    <div>
                      <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                        placeholder={t('propertyDetail.notes.tenantPh')}
                        style={{
                          ...inputStyle, resize: 'vertical', minHeight: 100,
                          lineHeight: 1.7
                        }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                        <button onClick={() => setEditingNote(null)}
                          style={{ padding: '8px 16px', borderRadius: 8, background: '#F1F5F9', color: C.textMuted, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>
                          {t('common.cancel')}
                        </button>
                        <button onClick={saveNote} disabled={savingNote}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '8px 16px', borderRadius: 8, background: C.teal, color: 'white', border: 'none',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                            opacity: savingNote ? 0.7 : 1
                          }}>
                          <Save style={{ width: 12, height: 12 }} /> {t('common.save')}
                        </button>
                      </div>
                    </div>
                  ) : tenant.notes ? (
                    <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>{tenant.notes}</div>
                  ) : (
                    <div style={{ fontSize: 13, color: C.textFaint }}>{t('propertyDetail.notes.empty')}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
      {/* ═══ END LEASE CONFIRMATION MODAL ═══ */}
      <AnimatePresence>
        {showEndLease && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingLeft: 'var(--sb-w)'
            }}
            onClick={() => !endingLease && setShowEndLease(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 20, padding: '32px',
                maxWidth: 420, width: '90%',
                boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
                fontFamily: font
              }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: '#FEF2F2', border: '1px solid #FECACA',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <AlertTriangle style={{ width: 24, height: 24, color: '#DC2626' }} />
              </div>
              <h3 style={{
                fontSize: 18, fontWeight: 800, color: C.text,
                textAlign: 'center', margin: '0 0 8px', letterSpacing: '-0.01em'
              }}>
                {t('propertyDetail.endLeaseModal.title')}
              </h3>
              <p style={{
                fontSize: 14, color: C.textMuted, textAlign: 'center',
                margin: '0 0 24px', lineHeight: 1.6
              }}>
                {t('propertyDetail.endLeaseModal.body', { name: tenant?.full_name })}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowEndLease(false)}
                  disabled={endingLease}
                  style={{
                    flex: 1, padding: '11px 16px', borderRadius: 12,
                    background: '#F1F5F9', color: C.textMuted, border: 'none',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font
                  }}>
                  {t('propertyDetail.endLeaseModal.cancel')}
                </button>
                <button
                  onClick={confirmEndLease}
                  disabled={endingLease}
                  style={{
                    flex: 1, padding: '11px 16px', borderRadius: 12,
                    background: '#DC2626', color: 'white', border: 'none',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font,
                    opacity: endingLease ? 0.7 : 1,
                    boxShadow: '0 4px 14px rgba(220,38,38,0.3)'
                  }}>
                  {endingLease ? t('propertyDetail.endLeaseModal.processing') : t('propertyDetail.endLeaseModal.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ DELETE PROPERTY CONFIRMATION MODAL ═══ */}
      <AnimatePresence>
        {showDeleteProperty && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingLeft: 'var(--sb-w)'
            }}
            onClick={() => !deletingProperty && setShowDeleteProperty(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: 20, padding: '32px',
                maxWidth: 420, width: '90%',
                boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
                fontFamily: font
              }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: '#FEF2F2', border: '1px solid #FECACA',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Trash2 style={{ width: 24, height: 24, color: '#DC2626' }} />
              </div>
              <h3 style={{
                fontSize: 18, fontWeight: 800, color: C.text,
                textAlign: 'center', margin: '0 0 8px', letterSpacing: '-0.01em'
              }}>
                {t('propertyDetail.deletePropertyModal.title')}
              </h3>
              <p style={{
                fontSize: 14, color: C.textMuted, textAlign: 'center',
                margin: '0 0 24px', lineHeight: 1.6
              }}>
                {t('propertyDetail.deletePropertyModal.body', { label: apartmentLabel(apt) })}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowDeleteProperty(false)}
                  disabled={deletingProperty}
                  style={{
                    flex: 1, padding: '11px 16px', borderRadius: 12,
                    background: '#F1F5F9', color: C.textMuted, border: 'none',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font
                  }}>
                  {t('propertyDetail.deletePropertyModal.cancel')}
                </button>
                <button
                  onClick={confirmDeleteProperty}
                  disabled={deletingProperty}
                  style={{
                    flex: 1, padding: '11px 16px', borderRadius: 12,
                    background: '#DC2626', color: 'white', border: 'none',
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: font,
                    opacity: deletingProperty ? 0.7 : 1,
                    boxShadow: '0 4px 14px rgba(220,38,38,0.3)'
                  }}>
                  {deletingProperty ? t('propertyDetail.deletePropertyModal.deleting') : t('propertyDetail.deletePropertyModal.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
