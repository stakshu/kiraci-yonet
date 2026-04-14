/* ── KiraciYonet — Mulk Detay — Full Featured ── */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import {
  ArrowLeft, Building2, MapPin, Home, BedDouble, Armchair,
  Layers, Maximize2, Clock, Check, Undo2, Pencil, X, Save,
  FileText, StickyNote, CreditCard, ScrollText, CalendarDays,
  Mail, Phone, IdCard, DollarSign, Shield, Upload, Trash2,
  Download, Plus, FileUp, ChevronDown, ChevronRight, Users, User,
  AlertTriangle, UserMinus
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"
const money = n => Number(n).toLocaleString('tr-TR')

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

function daysDiff(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.ceil((target - today) / 864e5)
}

const PROPERTY_TYPES = {
  daire: 'Daire', mustakil: 'Mustakil Ev', villa: 'Villa',
  dukkan: 'Dukkan', ofis: 'Ofis', arsa: 'Arsa', diger: 'Diger'
}

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
  { key: 'details', label: 'Mulk Detaylari', icon: Building2 },
  { key: 'payments', label: 'Odeme Akisi', icon: CreditCard },
  { key: 'lease', label: 'Kira Sozlesmesi Bilgileri', icon: ScrollText },
  { key: 'documents', label: 'Belgeler', icon: FileText },
  { key: 'notes', label: 'Notlar', icon: StickyNote }
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
  const fileRef = useRef(null)

  const [apt, setApt] = useState(null)
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
      .select('*, tenants(id, full_name, email, phone, tc_no, lease_start, lease_end, rent, deposit, notes)')
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
      .from('rent_payments').select('*')
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
    const t = apt?.tenants?.[0]
    if (!t) return
    setEndingLease(true)
    const { error } = await supabase
      .from('tenants')
      .update({ apartment_id: null })
      .eq('id', t.id)
    setEndingLease(false)
    if (error) { showToast('Hata: ' + error.message, 'error'); return }
    showToast(`${t.full_name} sözleşmesi sonlandırıldı.`, 'success')
    setShowEndLease(false)
    loadProperty()
    // Refresh past tenants if lease tab is active
    if (tab === 'lease') loadPastTenants()
  }

  const loadDocuments = async () => {
    const { data } = await supabase.storage
      .from('documents')
      .list(`apartments/${id}`, { sortBy: { column: 'created_at', order: 'desc' } })
    setDocuments(data || [])
  }

  /* ── Detail edit ── */
  const startEditDetails = () => {
    setDetailForm({
      building: apt.building || '', unit_no: apt.unit_no || '',
      city: apt.city || '', district: apt.district || '',
      address: apt.address || '', property_type: apt.property_type || 'daire',
      room_count: apt.room_count || '', floor_no: apt.floor_no || '',
      m2_gross: apt.m2_gross || '', m2_net: apt.m2_net || '',
      furnished: apt.furnished || false, building_age: apt.building_age ?? '',
      deposit: apt.deposit || ''
    })
    setEditingDetails(true)
  }

  const saveDetails = async () => {
    setSavingDetails(true)
    const { error } = await supabase.from('apartments').update({
      building: detailForm.building.trim(),
      unit_no: detailForm.unit_no.trim(),
      city: detailForm.city.trim(),
      district: detailForm.district.trim(),
      address: detailForm.address.trim(),
      property_type: detailForm.property_type,
      room_count: detailForm.room_count.toString().trim(),
      floor_no: detailForm.floor_no.toString().trim(),
      m2_gross: parseFloat(detailForm.m2_gross) || null,
      m2_net: parseFloat(detailForm.m2_net) || null,
      furnished: detailForm.furnished,
      building_age: parseInt(detailForm.building_age) || null,
      deposit: parseFloat(detailForm.deposit) || 0
    }).eq('id', id)
    setSavingDetails(false)
    if (error) { showToast('Hata: ' + error.message, 'error'); return }
    showToast('Mulk bilgileri guncellendi.', 'success')
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
      if (error) { showToast('Hata: ' + error.message, 'error'); setSavingNote(false); return }
    } else {
      const t = apt.tenants?.[0]
      if (t) {
        const { error } = await supabase.from('tenants').update({ notes: noteText.trim() }).eq('id', t.id)
        if (error) { showToast('Hata: ' + error.message, 'error'); setSavingNote(false); return }
      }
    }
    setSavingNote(false)
    showToast('Not kaydedildi.', 'success')
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
    if (error) { showToast('Yukleme hatasi: ' + error.message, 'error'); return }
    showToast('Belge yuklendi.', 'success')
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
    if (!confirm(`${name} silinsin mi?`)) return
    const { error } = await supabase.storage
      .from('documents')
      .remove([`apartments/${id}/${name}`])
    if (error) { showToast('Hata: ' + error.message, 'error'); return }
    showToast('Belge silindi.', 'success')
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
  const location = [apt.city, apt.district].filter(Boolean).join(', ')

  const summaryCards = [
    { icon: Building2, label: 'Mulk adi', value: `${apt.building}${apt.unit_no ? ' - No: ' + apt.unit_no : ''}` },
    { icon: MapPin, label: 'Lokasyon', value: location || '—' },
    { icon: Home, label: 'Mulk tipi', value: PROPERTY_TYPES[apt.property_type] || apt.property_type || '—' },
    { icon: BedDouble, label: 'Oda sayisi', value: apt.room_count || '—' },
    { icon: Armchair, label: 'Esyali', value: apt.furnished ? 'Evet' : 'Hayir' },
    { icon: Layers, label: 'Bulundugu kat', value: apt.floor_no || '—' },
    { icon: Maximize2, label: 'm2 (Net)', value: apt.m2_net || '—' },
    { icon: Clock, label: 'Bina yasi', value: apt.building_age != null ? apt.building_age : '—' }
  ]

  const detailRows = [
    { label: 'Adresi', value: apt.address ? `${apt.address}${location ? ', ' + location : ''}` : location || '—' },
    { label: 'Mulk tipi', value: PROPERTY_TYPES[apt.property_type] || '—' },
    { label: 'm2 (Brut)', value: apt.m2_gross || '—' },
    { label: 'm2 (Net)', value: apt.m2_net || '—' },
    { label: 'Oda sayisi', value: apt.room_count || '—' },
    { label: 'Bulundugu kat', value: apt.floor_no || '—' },
    { label: 'Bina yasi', value: apt.building_age != null ? apt.building_age : '—' },
    { label: 'Esyali', value: apt.furnished ? 'Evet' : 'Hayir' },
    { label: 'Depozito', value: apt.deposit ? money(apt.deposit) + ' ₺' : '—' }
  ]

  const DF = (field, val) => setDetailForm(p => ({ ...p, [field]: val }))

  /* Helper: render tenant info card (used for both current and past) */
  const renderTenantInfo = (t) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
      {[
        { icon: IdCard, label: 'Ad Soyad', value: t.full_name },
        { icon: Mail, label: 'E-posta', value: t.email || '—' },
        { icon: Phone, label: 'Telefon', value: t.phone || '—' },
        { icon: Shield, label: 'TC No', value: t.tc_no || '—' },
        { icon: CalendarDays, label: 'Sozlesme Baslangic', value: formatDate(t.lease_start) },
        { icon: CalendarDays, label: 'Sozlesme Bitis', value: formatDate(t.lease_end) },
        { icon: DollarSign, label: 'Aylik Kira', value: t.rent ? money(t.rent) + ' ₺' : '—' },
        { icon: DollarSign, label: 'Depozito', value: t.deposit ? money(t.deposit) + ' ₺' : '—' }
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
          Mulklerime Don
        </motion.button>
      </motion.div>

      {/* ═══ TABS ═══ */}
      <motion.div variants={fadeItem} style={{
        display: 'flex', gap: 0,
        justifyContent: 'center',
        borderBottom: `2px solid ${C.borderLight}`,
        flexShrink: 0
      }}>
        {TABS.map(t => {
          const Icon = t.icon
          const isActive = tab === t.key
          return (
            <button key={t.key}
              onClick={() => setTab(t.key)}
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
              {t.label}
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
              Mulk Ozeti
            </h2>
            {!editingDetails && (
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={startEditDetails}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 10,
                  background: '#F1F5F9', color: C.textMuted, border: 'none',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font
                }}>
                <Pencil style={{ width: 13, height: 13 }} /> Duzenle
              </motion.button>
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
                  Temel Bilgiler
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>Mulk Adi / Bina</label>
                    <input style={inputStyle} value={detailForm.building} onChange={e => DF('building', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>No / Daire</label>
                    <input style={inputStyle} value={detailForm.unit_no} onChange={e => DF('unit_no', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>Mulk Tipi</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={detailForm.property_type} onChange={e => DF('property_type', e.target.value)}>
                      {Object.entries(PROPERTY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>Sehir</label>
                    <input style={inputStyle} value={detailForm.city} onChange={e => DF('city', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>Ilce</label>
                    <input style={inputStyle} value={detailForm.district} onChange={e => DF('district', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>Adres</label>
                  <input style={inputStyle} value={detailForm.address} onChange={e => DF('address', e.target.value)} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>Oda Sayisi</label>
                    <input style={inputStyle} value={detailForm.room_count} onChange={e => DF('room_count', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>Kat</label>
                    <input style={inputStyle} value={detailForm.floor_no} onChange={e => DF('floor_no', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>Brut m²</label>
                    <input style={inputStyle} type="number" value={detailForm.m2_gross} onChange={e => DF('m2_gross', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>Net m²</label>
                    <input style={inputStyle} type="number" value={detailForm.m2_net} onChange={e => DF('m2_net', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>Bina Yasi</label>
                    <input style={inputStyle} type="number" value={detailForm.building_age} onChange={e => DF('building_age', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }}>Depozito (₺)</label>
                    <input style={inputStyle} type="number" value={detailForm.deposit} onChange={e => DF('deposit', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="furn" checked={detailForm.furnished}
                    onChange={e => DF('furnished', e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: C.teal, cursor: 'pointer' }} />
                  <label htmlFor="furn" style={{ fontSize: 13, fontWeight: 600, color: C.text, cursor: 'pointer' }}>Esyali</label>
                </div>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'flex-end', gap: 10,
                padding: '16px 24px', borderTop: `1px solid ${C.borderLight}`
              }}>
                <button onClick={() => setEditingDetails(false)}
                  style={{ padding: '9px 18px', borderRadius: 10, background: '#F1F5F9', color: C.textMuted, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>
                  Iptal
                </button>
                <button onClick={saveDetails} disabled={savingDetails}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 20px', borderRadius: 10, background: C.teal, color: 'white', border: 'none',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                    opacity: savingDetails ? 0.7 : 1, boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
                  }}>
                  <Save style={{ width: 14, height: 14 }} />
                  {savingDetails ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ── ODEME AKISI (info-only log) ── */}
      {tab === 'payments' && (
        <motion.div variants={fadeItem}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 16px', letterSpacing: '-0.01em' }}>
            Odeme Gecmisi
          </h2>
          <div style={cardBox}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1fr',
              padding: '14px 24px', background: '#FAFBFC',
              borderBottom: `1px solid ${C.borderLight}`
            }}>
              {['Vade Tarihi', 'Tutar', 'Durum', 'Odeme Tarihi'].map((h, i) => (
                <div key={i} style={{
                  fontSize: 11, fontWeight: 700, color: C.textFaint,
                  textTransform: 'uppercase', letterSpacing: '0.06em'
                }}>{h}</div>
              ))}
            </div>

            {paymentsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.teal}`, borderTopColor: 'transparent' }} />
              </div>
            ) : payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 24px', color: C.textFaint, fontSize: 14 }}>
                Odeme kaydi bulunamadi.
              </div>
            ) : payments.map((p, i) => {
              const isPaid = p.status === 'paid'
              const diff = daysDiff(p.due_date)
              const isOverdue = !isPaid && diff < 0
              return (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1fr',
                  padding: '14px 24px', alignItems: 'center',
                  borderBottom: i < payments.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                  background: i % 2 === 0 ? 'white' : '#FAFBFC'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{formatDate(p.due_date)}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{money(p.amount)} ₺</div>
                  <div>
                    <span style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: isPaid ? '#ECFDF5' : isOverdue ? '#FEF2F2' : '#FFF7ED',
                      color: isPaid ? '#059669' : isOverdue ? '#DC2626' : '#D97706'
                    }}>
                      {isPaid ? 'Odendi' : isOverdue ? 'Gecikti' : 'Bekliyor'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: p.paid_date ? '#059669' : C.textFaint }}>{p.paid_date ? formatDate(p.paid_date) : '—'}</div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ── KIRA SOZLESMESI BILGILERI ── */}
      {tab === 'lease' && (
        <motion.div variants={fadeItem}>
          {/* ── Güncel Kiracı ── */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 16px', letterSpacing: '-0.01em' }}>
            Guncel Kiraci Bilgileri
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
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', marginTop: 1 }}>Aktif Kiraci</div>
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
                    Sozlesmeyi Sonlandir
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/tenants/list/${tenant.id}`)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 8,
                      background: C.teal, color: 'white', border: 'none',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font
                    }}>
                    Detaya Git
                  </motion.button>
                </div>
              </div>
              {renderTenantInfo(tenant)}
            </div>
          ) : (
            <div style={{ ...cardBox, textAlign: 'center', padding: '32px 24px', color: C.textFaint, fontSize: 14 }}>
              Bu mulkte guncel kiraci bulunmuyor.
            </div>
          )}

          {/* ── Geçmiş Kiracılar ── */}
          <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '32px 0 16px', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users style={{ width: 18, height: 18, color: C.textMuted }} />
            Gecmis Kiracilar
          </h2>
          {pastTenantsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${C.teal}`, borderTopColor: 'transparent' }} />
            </div>
          ) : pastTenants.length === 0 ? (
            <div style={{ ...cardBox, textAlign: 'center', padding: '28px 24px', color: C.textFaint, fontSize: 14 }}>
              Gecmis kiraci kaydi bulunamadi.
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
                          {formatDate(pt.lease_start)} — {formatDate(pt.lease_end)}
                          {pt.rent ? ` · ${money(pt.rent)} ₺/ay` : ''}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                        background: '#F1F5F9', color: C.textMuted, border: '1px solid #E2E8F0'
                      }}>
                        Eski Kiraci
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
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.01em' }}>Belgeler</h2>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 10, background: C.teal, color: 'white',
                border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                opacity: uploading ? 0.7 : 1, boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
              }}>
              <Upload style={{ width: 14, height: 14 }} />
              {uploading ? 'Yukleniyor...' : 'Belge Yukle'}
            </button>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }}
              onChange={handleFileUpload} />
          </div>

          <div style={cardBox}>
            {documents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                <FileUp style={{ width: 28, height: 28, color: C.textFaint, marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: C.textMuted }}>Henuz belge yuklenmemis.</div>
                <div style={{ fontSize: 12, color: C.textFaint, marginTop: 4 }}>
                  PDF, Word veya gorsel dosyalarini yukleyebilirsiniz.
                </div>
              </div>
            ) : (
              <>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 120px 80px',
                  padding: '14px 24px', background: '#FAFBFC',
                  borderBottom: `1px solid ${C.borderLight}`
                }}>
                  {['Dosya Adi', 'Boyut', 'Tarih', ''].map((h, i) => (
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
                        {doc.created_at ? formatDate(doc.created_at.split('T')[0]) : '—'}
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
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Mulk Notu</div>
                {editingNote !== 'property' && (
                  <button onClick={() => startEditNote('property')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '6px 14px', borderRadius: 8, background: '#F1F5F9', color: C.textMuted,
                      border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font
                    }}>
                    {apt.notes ? <><Pencil style={{ width: 12, height: 12 }} /> Duzenle</> : <><Plus style={{ width: 12, height: 12 }} /> Not Ekle</>}
                  </button>
                )}
              </div>
              <div style={{ padding: '16px 24px' }}>
                {editingNote === 'property' ? (
                  <div>
                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                      placeholder="Mulk hakkinda not yazin..."
                      style={{
                        ...inputStyle, resize: 'vertical', minHeight: 100,
                        lineHeight: 1.7
                      }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                      <button onClick={() => setEditingNote(null)}
                        style={{ padding: '8px 16px', borderRadius: 8, background: '#F1F5F9', color: C.textMuted, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>
                        Iptal
                      </button>
                      <button onClick={saveNote} disabled={savingNote}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '8px 16px', borderRadius: 8, background: C.teal, color: 'white', border: 'none',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                          opacity: savingNote ? 0.7 : 1
                        }}>
                        <Save style={{ width: 12, height: 12 }} /> Kaydet
                      </button>
                    </div>
                  </div>
                ) : apt.notes ? (
                  <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>{apt.notes}</div>
                ) : (
                  <div style={{ fontSize: 13, color: C.textFaint }}>Henuz not eklenmemis.</div>
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
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Kiraci Notu — {tenant.full_name}</div>
                  {editingNote !== 'tenant' && (
                    <button onClick={() => startEditNote('tenant')}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 14px', borderRadius: 8, background: '#F1F5F9', color: C.textMuted,
                        border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font
                      }}>
                      {tenant.notes ? <><Pencil style={{ width: 12, height: 12 }} /> Duzenle</> : <><Plus style={{ width: 12, height: 12 }} /> Not Ekle</>}
                    </button>
                  )}
                </div>
                <div style={{ padding: '16px 24px' }}>
                  {editingNote === 'tenant' ? (
                    <div>
                      <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                        placeholder="Kiraci hakkinda not yazin..."
                        style={{
                          ...inputStyle, resize: 'vertical', minHeight: 100,
                          lineHeight: 1.7
                        }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                        <button onClick={() => setEditingNote(null)}
                          style={{ padding: '8px 16px', borderRadius: 8, background: '#F1F5F9', color: C.textMuted, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>
                          Iptal
                        </button>
                        <button onClick={saveNote} disabled={savingNote}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '8px 16px', borderRadius: 8, background: C.teal, color: 'white', border: 'none',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                            opacity: savingNote ? 0.7 : 1
                          }}>
                          <Save style={{ width: 12, height: 12 }} /> Kaydet
                        </button>
                      </div>
                    </div>
                  ) : tenant.notes ? (
                    <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>{tenant.notes}</div>
                  ) : (
                    <div style={{ fontSize: 13, color: C.textFaint }}>Henuz not eklenmemis.</div>
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
              display: 'flex', alignItems: 'center', justifyContent: 'center'
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
                Sozlesmeyi Sonlandir
              </h3>
              <p style={{
                fontSize: 14, color: C.textMuted, textAlign: 'center',
                margin: '0 0 24px', lineHeight: 1.6
              }}>
                <strong style={{ color: C.text }}>{tenant?.full_name}</strong> adli kiraci
                bu daireden cikarilacaktir. Kiraci gecmis kiracilar listesine tasinacaktir.
                <br />Bu islemi onayliyor musunuz?
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
                  Vazgec
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
                  {endingLease ? 'Isleniyor...' : 'Evet, Sonlandir'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
