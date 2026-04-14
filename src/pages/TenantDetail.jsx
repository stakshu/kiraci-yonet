/* ── KiraciYonet — Kiracı Detay — Full Page + Inline Edit ── */
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import {
  ArrowLeft, Phone, Mail, IdCard, Shield, CreditCard, Users,
  Home, CalendarDays, Clock, CheckCircle, AlertTriangle,
  Banknote, Heart, Baby, UserPlus, StickyNote,
  TrendingUp, Building2, Pencil, Save, X
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"
const money = n => Number(n).toLocaleString('tr-TR')

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

function daysDiff(dateStr) {
  if (!dateStr) return 0
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(dateStr); d.setHours(0,0,0,0)
  return Math.ceil((d - today) / 864e5)
}

const C = {
  teal: '#025864', green: '#00D47E', red: '#DC2626', amber: '#D97706',
  text: '#0F172A', textMuted: '#64748B', textFaint: '#94A3B8',
  border: '#E5E7EB', borderLight: '#F1F5F9', card: '#FFFFFF'
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } }
}
const fadeItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
}

const cardBox = {
  background: C.card, borderRadius: 16,
  boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
  overflow: 'hidden'
}

const sectionTitle = {
  fontSize: 11, fontWeight: 700, color: C.teal,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7
}

const infoIcon = { width: 15, height: 15, color: C.textFaint, flexShrink: 0 }

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 10,
  border: `1.5px solid ${C.border}`, fontSize: 13, fontWeight: 500,
  fontFamily: font, color: C.text, outline: 'none',
  background: '#FAFBFC', transition: 'border-color 0.2s'
}

const inputSmall = {
  ...inputStyle, padding: '6px 10px', fontSize: 13
}

function buildForm(t) {
  const h = t.household_info || {}
  return {
    full_name: t.full_name || '', phone: t.phone || '', email: t.email || '',
    tc_no: t.tc_no || '', rent: t.rent || '', deposit: t.deposit || '',
    iban: t.iban || '', lease_start: t.lease_start || '', lease_end: t.lease_end || '',
    notes: t.notes || '',
    emergency_contact_name: t.emergency_contact_name || '',
    emergency_contact_phone: t.emergency_contact_phone || '',
    household_spouse: h.spouse || 0, household_children: h.children || 0,
    household_roommate: h.roommate || 0
  }
}

export default function TenantDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadTenant() }, [id])

  const loadTenant = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tenants')
      .select('*, apartments(building, unit_no)')
      .eq('id', id)
      .single()
    if (error || !data) {
      showToast('Kiracı bulunamadı.', 'error')
      navigate('/tenants/list')
      return
    }
    setTenant(data)
    setLoading(false)
    loadPayments(data.id)
  }

  const loadPayments = async (tenantId) => {
    setLoadingPayments(true)
    const { data } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('due_date', { ascending: false })
    setPayments(data || [])
    setLoadingPayments(false)
  }

  const startEdit = () => {
    setForm(buildForm(tenant))
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setForm({})
  }

  const handleSave = async () => {
    setSaving(true)
    const record = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(), email: form.email.trim(),
      tc_no: form.tc_no.trim(), rent: parseFloat(form.rent) || 0,
      deposit: parseFloat(form.deposit) || 0, iban: form.iban.trim(),
      lease_start: form.lease_start || null, lease_end: form.lease_end || null,
      notes: form.notes.trim(),
      emergency_contact_name: form.emergency_contact_name.trim(),
      emergency_contact_phone: form.emergency_contact_phone.trim(),
      household_info: {
        spouse: parseInt(form.household_spouse) || 0,
        children: parseInt(form.household_children) || 0,
        roommate: parseInt(form.household_roommate) || 0
      }
    }
    const { error } = await supabase.from('tenants').update(record).eq('id', id)
    if (error) {
      showToast('Hata: ' + error.message, 'error')
      setSaving(false)
      return
    }
    showToast('Kiracı bilgileri güncellendi.', 'success')
    setEditing(false)
    setSaving(false)
    loadTenant()
  }

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const stats = useMemo(() => {
    if (!payments.length) return { totalPaid: 0, totalOverdue: 0, successRate: 0, paidCount: 0, overdueCount: 0 }
    const paid = payments.filter(p => p.status === 'paid')
    const overdue = payments.filter(p => p.status !== 'paid' && daysDiff(p.due_date) < 0)
    const totalPaid = paid.reduce((s, p) => s + Number(p.amount), 0)
    const totalOverdue = overdue.reduce((s, p) => s + Number(p.amount), 0)
    const total = payments.filter(p => daysDiff(p.due_date) < 0 || p.status === 'paid').length
    const successRate = total > 0 ? Math.round((paid.length / total) * 100) : 0
    return { totalPaid, totalOverdue, successRate, paidCount: paid.length, overdueCount: overdue.length }
  }, [payments])

  const last12Payments = useMemo(() => {
    const now = new Date()
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 12, 1)
    return payments.filter(p => new Date(p.due_date) >= cutoff)
  }, [payments])

  const getPaymentStatus = (p) => {
    if (p.status === 'paid') return { label: 'Ödendi', bg: '#ECFDF5', color: '#059669' }
    if (daysDiff(p.due_date) < 0) return { label: 'Gecikti', bg: '#FEF2F2', color: '#DC2626' }
    return { label: 'Bekliyor', bg: '#FFFBEB', color: '#D97706' }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, fontFamily: font }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${C.teal}`, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!tenant) return null

  const isActive = !!tenant.apartment_id
  const initials = tenant.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const apt = tenant.apartments ? `${tenant.apartments.building} ${tenant.apartments.unit_no}` : '—'
  const household = tenant.household_info || {}
  const hasHousehold = (household.spouse || 0) + (household.children || 0) + (household.roommate || 0) > 0
  const hasEmergency = tenant.emergency_contact_name || tenant.emergency_contact_phone

  const leaseRemaining = () => {
    if (!tenant.lease_end) return null
    const diff = daysDiff(tenant.lease_end)
    if (diff < 0) return { text: `${Math.abs(diff)} gün geçti`, color: C.red, urgent: true }
    if (diff === 0) return { text: 'Bugün bitiyor', color: C.red, urgent: true }
    if (diff <= 30) return { text: `${diff} gün kaldı`, color: C.amber, urgent: true }
    if (diff <= 90) return { text: `${diff} gün kaldı`, color: C.textMuted, urgent: false }
    const months = Math.floor(diff / 30)
    return { text: `~${months} ay kaldı`, color: C.textMuted, urgent: false }
  }
  const remaining = leaseRemaining()

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ fontFamily: font, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ═══ BACK + HEADER ═══ */}
      <motion.div variants={fadeItem} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/tenants/list')}
          style={{
            width: 40, height: 40, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'white', border: `1.5px solid ${C.border}`,
            cursor: 'pointer', color: C.textMuted, flexShrink: 0
          }}>
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </motion.button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: 0 }}>
            {tenant.full_name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
              background: isActive ? '#ECFDF5' : '#F1F5F9',
              color: isActive ? '#059669' : C.textMuted,
              border: `1px solid ${isActive ? '#A7F3D0' : '#E2E8F0'}`
            }}>
              {isActive ? 'Aktif Kiracı' : 'Eski Kiracı'}
            </span>
            {isActive && apt !== '—' && (
              <span style={{ fontSize: 12, fontWeight: 600, color: C.teal, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Building2 style={{ width: 13, height: 13 }} /> {apt}
              </span>
            )}
          </div>
        </div>
        {!editing ? (
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={startEdit}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12,
              background: C.teal, color: 'white', border: 'none',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2,88,100,0.18)'
            }}>
            <Pencil style={{ width: 14, height: 14 }} />
            Düzenle
          </motion.button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={cancelEdit} disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 12,
                background: 'white', color: C.textMuted, border: `1.5px solid ${C.border}`,
                fontSize: 13, fontWeight: 700, cursor: 'pointer'
              }}>
              <X style={{ width: 14, height: 14 }} />
              İptal
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={handleSave} disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 12,
                background: C.green, color: 'white', border: 'none',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(0,212,126,0.25)'
              }}>
              <Save style={{ width: 14, height: 14 }} />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* ═══ MAIN GRID ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Kişisel Bilgiler */}
          <motion.div variants={fadeItem} style={{ ...cardBox, ...(editing ? { border: `2px solid ${C.teal}20` } : {}) }}>
            <div style={{ padding: '20px 24px' }}>
              <div style={sectionTitle}>
                <Users style={{ width: 13, height: 13 }} /> Kişisel Bilgiler
              </div>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>Ad Soyad</label>
                    <input style={inputStyle} value={form.full_name} onChange={e => f('full_name', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>TC No</label>
                    <input style={inputStyle} value={form.tc_no} onChange={e => f('tc_no', e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>Telefon</label>
                      <input style={inputStyle} value={form.phone} onChange={e => f('phone', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>E-posta</label>
                      <input style={inputStyle} value={form.email} onChange={e => f('email', e.target.value)} />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                      background: isActive
                        ? 'linear-gradient(135deg, #025864 0%, #03363D 100%)'
                        : '#E2E8F0',
                      color: isActive ? 'white' : C.textMuted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 800
                    }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{tenant.full_name}</div>
                      {tenant.tc_no && (
                        <div style={{ fontSize: 12, color: C.textFaint, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <IdCard style={{ width: 12, height: 12 }} /> {tenant.tc_no}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tenant.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <Phone style={infoIcon} />
                        <span style={{ fontWeight: 500, color: C.text }}>{tenant.phone}</span>
                      </div>
                    )}
                    {tenant.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <Mail style={infoIcon} />
                        <span style={{ fontWeight: 500, color: C.text }}>{tenant.email}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* Acil Durum Kişisi */}
          <motion.div variants={fadeItem} style={{ ...cardBox, ...(editing ? { border: `2px solid ${C.teal}20` } : {}) }}>
            <div style={{ padding: '20px 24px' }}>
              <div style={sectionTitle}>
                <Shield style={{ width: 13, height: 13 }} /> Acil Durum Kişisi
              </div>
              {editing ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>Ad Soyad</label>
                    <input style={inputStyle} value={form.emergency_contact_name} onChange={e => f('emergency_contact_name', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>Telefon</label>
                    <input style={inputStyle} value={form.emergency_contact_phone} onChange={e => f('emergency_contact_phone', e.target.value)} />
                  </div>
                </div>
              ) : hasEmergency ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tenant.emergency_contact_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <Users style={infoIcon} />
                      <span style={{ fontWeight: 600, color: C.text }}>{tenant.emergency_contact_name}</span>
                    </div>
                  )}
                  {tenant.emergency_contact_phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <Phone style={infoIcon} />
                      <span style={{ fontWeight: 500, color: C.text }}>{tenant.emergency_contact_phone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: C.textFaint, fontStyle: 'italic' }}>Belirtilmemiş</div>
              )}
            </div>
          </motion.div>

          {/* Hane Bilgisi */}
          <motion.div variants={fadeItem} style={{ ...cardBox, ...(editing ? { border: `2px solid ${C.teal}20` } : {}) }}>
            <div style={{ padding: '20px 24px' }}>
              <div style={sectionTitle}>
                <Home style={{ width: 13, height: 13 }} /> Hane Bilgisi
              </div>
              {editing ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>Eş</label>
                    <input type="number" min="0" style={inputStyle} value={form.household_spouse} onChange={e => f('household_spouse', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>Çocuk</label>
                    <input type="number" min="0" style={inputStyle} value={form.household_children} onChange={e => f('household_children', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>Oda Ark.</label>
                    <input type="number" min="0" style={inputStyle} value={form.household_roommate} onChange={e => f('household_roommate', e.target.value)} />
                  </div>
                </div>
              ) : hasHousehold ? (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {(household.spouse || 0) > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px', borderRadius: 10,
                      background: '#FDF2F8', border: '1px solid #FBCFE8',
                      fontSize: 13, fontWeight: 600, color: '#BE185D'
                    }}>
                      <Heart style={{ width: 13, height: 13 }} />
                      Eş: {household.spouse}
                    </div>
                  )}
                  {(household.children || 0) > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px', borderRadius: 10,
                      background: '#EFF6FF', border: '1px solid #BFDBFE',
                      fontSize: 13, fontWeight: 600, color: '#1D4ED8'
                    }}>
                      <Baby style={{ width: 13, height: 13 }} />
                      Çocuk: {household.children}
                    </div>
                  )}
                  {(household.roommate || 0) > 0 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px', borderRadius: 10,
                      background: '#F5F3FF', border: '1px solid #DDD6FE',
                      fontSize: 13, fontWeight: 600, color: '#6D28D9'
                    }}>
                      <UserPlus style={{ width: 13, height: 13 }} />
                      Oda Ark.: {household.roommate}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: C.textFaint, fontStyle: 'italic' }}>Belirtilmemiş</div>
              )}
            </div>
          </motion.div>

          {/* Notlar */}
          <motion.div variants={fadeItem} style={{ ...cardBox, ...(editing ? { border: `2px solid ${C.teal}20` } : {}) }}>
            <div style={{ padding: '20px 24px' }}>
              <div style={sectionTitle}>
                <StickyNote style={{ width: 13, height: 13 }} /> Notlar
              </div>
              {editing ? (
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                  value={form.notes} onChange={e => f('notes', e.target.value)} />
              ) : tenant.notes ? (
                <div style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: '#FFFBEB', border: '1px solid #FDE68A',
                  fontSize: 13, fontWeight: 500, color: C.text,
                  lineHeight: 1.6, whiteSpace: 'pre-wrap'
                }}>
                  {tenant.notes}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: C.textFaint, fontStyle: 'italic' }}>Not eklenmemiş</div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Finansal Bilgiler */}
          <motion.div variants={fadeItem} style={{ ...cardBox, ...(editing ? { border: `2px solid ${C.teal}20` } : {}) }}>
            <div style={{ padding: '20px 24px' }}>
              <div style={sectionTitle}>
                <CreditCard style={{ width: 13, height: 13 }} /> Finansal Bilgiler
              </div>
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>Aylık Kira (₺)</label>
                      <input type="number" style={inputStyle} value={form.rent} onChange={e => f('rent', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>Depozito (₺)</label>
                      <input type="number" style={inputStyle} value={form.deposit} onChange={e => f('deposit', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>IBAN</label>
                    <input style={inputStyle} value={form.iban} onChange={e => f('iban', e.target.value)} placeholder="TR..." />
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{
                      padding: '14px 16px', borderRadius: 12,
                      background: '#F8FAFC', border: `1px solid ${C.borderLight}`
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4 }}>Aylık Kira</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
                        {tenant.rent ? money(tenant.rent) + ' ₺' : '—'}
                      </div>
                    </div>
                    <div style={{
                      padding: '14px 16px', borderRadius: 12,
                      background: '#F8FAFC', border: `1px solid ${C.borderLight}`
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4 }}>Depozito</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
                        {tenant.deposit ? money(tenant.deposit) + ' ₺' : '—'}
                      </div>
                    </div>
                  </div>
                  {tenant.iban ? (
                    <div style={{
                      marginTop: 12, padding: '12px 16px', borderRadius: 12,
                      background: '#F8FAFC', border: `1px solid ${C.borderLight}`,
                      display: 'flex', alignItems: 'center', gap: 10
                    }}>
                      <Banknote style={{ width: 16, height: 16, color: C.textFaint, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.textFaint }}>IBAN</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
                          {tenant.iban}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 10, fontSize: 12, color: C.textFaint, fontStyle: 'italic' }}>IBAN belirtilmemiş</div>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Kira & Sözleşme */}
          <motion.div variants={fadeItem} style={{ ...cardBox, ...(editing ? { border: `2px solid ${C.teal}20` } : {}) }}>
            <div style={{ padding: '20px 24px' }}>
              <div style={sectionTitle}>
                <CalendarDays style={{ width: 13, height: 13 }} />
                {isActive ? 'Kira & Sözleşme' : 'Geçmiş Sözleşme'}
              </div>
              {!isActive && apt !== '—' && (
                <div style={{
                  marginBottom: 12, padding: '8px 14px', borderRadius: 10,
                  background: '#F8FAFC', border: `1px solid ${C.borderLight}`,
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: 13, fontWeight: 500, color: C.textMuted
                }}>
                  <Building2 style={{ width: 14, height: 14 }} />
                  Son daire: {apt}
                </div>
              )}
              {editing ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>Başlangıç</label>
                    <input type="date" style={inputStyle} value={form.lease_start} onChange={e => f('lease_start', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>Bitiş</label>
                    <input type="date" style={inputStyle} value={form.lease_end} onChange={e => f('lease_end', e.target.value)} />
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4 }}>Başlangıç</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{formatDate(tenant.lease_start)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4 }}>Bitiş</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{formatDate(tenant.lease_end)}</div>
                    </div>
                  </div>
                  {isActive && remaining && (
                    <div style={{
                      marginTop: 12, padding: '10px 14px', borderRadius: 10,
                      background: remaining.urgent ? (remaining.color === C.red ? '#FEF2F2' : '#FFFBEB') : '#F8FAFC',
                      border: `1px solid ${remaining.urgent ? (remaining.color === C.red ? '#FECACA' : '#FDE68A') : C.borderLight}`,
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 13, fontWeight: 600, color: remaining.color
                    }}>
                      {remaining.urgent && <AlertTriangle style={{ width: 14, height: 14 }} />}
                      <Clock style={{ width: 14, height: 14 }} />
                      {remaining.text}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>

          {/* Ödeme Özeti */}
          <motion.div variants={fadeItem} style={cardBox}>
            <div style={{ padding: '20px 24px' }}>
              <div style={sectionTitle}>
                <TrendingUp style={{ width: 13, height: 13 }} /> Ödeme Özeti
              </div>
              {loadingPayments ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${C.teal}`, borderTopColor: 'transparent' }} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div style={{
                    padding: '14px 12px', borderRadius: 12, textAlign: 'center',
                    background: '#ECFDF5', border: '1px solid #A7F3D0'
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', marginBottom: 4 }}>Ödenen</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#059669' }}>{money(stats.totalPaid)} ₺</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#059669', marginTop: 2 }}>{stats.paidCount} ödeme</div>
                  </div>
                  <div style={{
                    padding: '14px 12px', borderRadius: 12, textAlign: 'center',
                    background: stats.totalOverdue > 0 ? '#FEF2F2' : '#F8FAFC',
                    border: `1px solid ${stats.totalOverdue > 0 ? '#FECACA' : C.borderLight}`
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: stats.totalOverdue > 0 ? '#DC2626' : C.textFaint, marginBottom: 4 }}>Geciken</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: stats.totalOverdue > 0 ? '#DC2626' : C.textMuted }}>{money(stats.totalOverdue)} ₺</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: stats.totalOverdue > 0 ? '#DC2626' : C.textFaint, marginTop: 2 }}>{stats.overdueCount} ödeme</div>
                  </div>
                  <div style={{
                    padding: '14px 12px', borderRadius: 12, textAlign: 'center',
                    background: '#F0FDFA', border: '1px solid #99F6E4'
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.teal, marginBottom: 4 }}>Başarı</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.teal }}>%{stats.successRate}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: C.teal, marginTop: 2 }}>ödeme oranı</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ═══ PAYMENT HISTORY — FULL WIDTH ═══ */}
      <motion.div variants={fadeItem} style={cardBox}>
        <div style={{ padding: '20px 24px' }}>
          <div style={sectionTitle}>
            <Banknote style={{ width: 13, height: 13 }} /> Ödeme Geçmişi
            <span style={{ fontSize: 11, fontWeight: 500, color: C.textFaint, marginLeft: 4 }}>
              (Son 12 ay)
            </span>
          </div>
          {loadingPayments ? (
            <div style={{ fontSize: 13, color: C.textFaint }}>Yükleniyor...</div>
          ) : last12Payments.length === 0 ? (
            <div style={{ fontSize: 13, color: C.textFaint, fontStyle: 'italic' }}>Henüz ödeme kaydı bulunmuyor</div>
          ) : (
            <div style={{ borderRadius: 12, border: `1px solid ${C.borderLight}`, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 100px',
                padding: '10px 16px', background: '#FAFBFC',
                borderBottom: `1px solid ${C.borderLight}`
              }}>
                {['Vade Tarihi', 'Ödeme Tarihi', 'Tutar', 'Durum'].map((h, i) => (
                  <div key={i} style={{
                    fontSize: 11, fontWeight: 700, color: C.textFaint,
                    textTransform: 'uppercase', letterSpacing: '0.06em'
                  }}>{h}</div>
                ))}
              </div>
              {/* Rows */}
              {last12Payments.map((p, i) => {
                const st = getPaymentStatus(p)
                return (
                  <div key={p.id} style={{
                    display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 100px',
                    padding: '11px 16px', alignItems: 'center',
                    borderBottom: i < last12Payments.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                    background: i % 2 === 0 ? 'white' : '#FAFBFC'
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{formatDate(p.due_date)}</div>
                    <div style={{ fontSize: 13, color: p.paid_date ? '#059669' : C.textFaint }}>
                      {p.paid_date ? formatDate(p.paid_date) : '—'}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                      {money(p.amount)} ₺
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                      background: st.bg, color: st.color, textAlign: 'center',
                      display: 'inline-block'
                    }}>
                      {st.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
