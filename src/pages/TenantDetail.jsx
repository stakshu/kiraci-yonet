/* ── KiraciYonet — Kiracı Detay — Full Page + Inline Edit ── */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { apartmentLabel } from '../lib/apartmentLabel'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import {
  ArrowLeft, Phone, Mail, IdCard, Shield, CreditCard, Users,
  Home, CalendarDays, Clock, CheckCircle, AlertTriangle,
  Banknote, Heart, Baby, UserPlus, StickyNote,
  TrendingUp, Building2, Pencil, Save, X,
  FileText, Download, Calculator, Percent
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
    iban: t.iban || '', nebenkosten_vorauszahlung: t.nebenkosten_vorauszahlung || '',
    lease_start: t.lease_start || '', lease_end: t.lease_end || '',
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
      .select('*, apartments(unit_no, floor_no, buildings(name))')
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
      nebenkosten_vorauszahlung: parseFloat(form.nebenkosten_vorauszahlung) || 0,
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

  const [showRentCalc, setShowRentCalc] = useState(false)
  const [tufeRate, setTufeRate] = useState('')

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }))

  /* ── Contract PDF ── */
  const generateContract = useCallback(async () => {
    if (!tenant) return
    const t = tenant
    const apt = apartmentLabel(t.apartments)
    const m = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const today = formatDate(new Date().toISOString())
    const household = t.household_info || {}
    const totalMonthly = (Number(t.rent) || 0) + (Number(t.nebenkosten_vorauszahlung) || 0)

    const wrapper = document.createElement('div')
    wrapper.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: 794px; background: #fff;
      font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
      color: #0F172A; line-height: 1.6;
    `
    document.body.appendChild(wrapper)

    wrapper.innerHTML = `
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#025864,#03363D);padding:36px 48px 28px;position:relative;overflow:hidden">
        <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(0,212,126,0.08)"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">KiraciYonet</div>
            <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px">Kira Sözleşmesi</h1>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.6)">Konut Kira Sözleşmesi</p>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Sözleşme No</div>
            <div style="font-size:13px;font-weight:700;color:#fff">${Date.now().toString(36).toUpperCase()}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:6px">Düzenlenme: ${today}</div>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:32px 48px 40px">

        <!-- Taraflar -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
          <div style="width:4px;height:18px;border-radius:2px;background:#025864"></div>
          <h3 style="margin:0;font-size:15px;font-weight:700;color:#0F172A">Taraflar</h3>
        </div>
        <div style="display:flex;gap:16px;margin-bottom:28px">
          <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px">
            <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Kiraya Veren (Mal Sahibi)</div>
            <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:4px">Mülk Sahibi</div>
            <div style="font-size:12px;color:#64748B">Mülk: ${apt}</div>
          </div>
          <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px">
            <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Kiracı</div>
            <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:4px">${t.full_name}</div>
            ${t.tc_no ? `<div style="font-size:12px;color:#64748B">TC: ${t.tc_no}</div>` : ''}
            ${t.phone ? `<div style="font-size:12px;color:#64748B">Tel: ${t.phone}</div>` : ''}
            ${t.email ? `<div style="font-size:12px;color:#64748B">E-posta: ${t.email}</div>` : ''}
          </div>
        </div>

        <!-- Kiralanan -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
          <div style="width:4px;height:18px;border-radius:2px;background:#025864"></div>
          <h3 style="margin:0;font-size:15px;font-weight:700;color:#0F172A">Kiralanan Taşınmaz</h3>
        </div>
        <div style="background:#F0FDFA;border:1px solid #99F6E4;border-radius:10px;padding:16px 20px;margin-bottom:28px">
          <div style="font-size:16px;font-weight:800;color:#025864">${apt}</div>
          <div style="font-size:12px;color:#025864;margin-top:4px">Konut olarak kullanılmak üzere</div>
        </div>

        <!-- Sözleşme Süresi -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
          <div style="width:4px;height:18px;border-radius:2px;background:#025864"></div>
          <h3 style="margin:0;font-size:15px;font-weight:700;color:#0F172A">Sözleşme Süresi</h3>
        </div>
        <div style="display:flex;gap:16px;margin-bottom:28px">
          <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 20px">
            <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Başlangıç</div>
            <div style="font-size:15px;font-weight:700;color:#0F172A">${formatDate(t.lease_start)}</div>
          </div>
          <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 20px">
            <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Bitiş</div>
            <div style="font-size:15px;font-weight:700;color:#0F172A">${formatDate(t.lease_end)}</div>
          </div>
        </div>

        <!-- Finansal Koşullar -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
          <div style="width:4px;height:18px;border-radius:2px;background:#00D47E"></div>
          <h3 style="margin:0;font-size:15px;font-weight:700;color:#0F172A">Finansal Koşullar</h3>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;margin-bottom:28px">
          <tbody>
            <tr style="border-bottom:1px solid #F1F5F9">
              <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#64748B;width:50%">Aylık Kira Bedeli</td>
              <td style="padding:12px 20px;font-size:14px;font-weight:700;color:#0F172A;text-align:right;font-variant-numeric:tabular-nums">₺${m(t.rent || 0)}</td>
            </tr>
            ${Number(t.nebenkosten_vorauszahlung) > 0 ? `
            <tr style="border-bottom:1px solid #F1F5F9">
              <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#64748B">Aylık Aidat</td>
              <td style="padding:12px 20px;font-size:14px;font-weight:700;color:#0F172A;text-align:right;font-variant-numeric:tabular-nums">₺${m(t.nebenkosten_vorauszahlung)}</td>
            </tr>` : ''}
            <tr style="background:#F0FDF4;border-bottom:1px solid #BBF7D0">
              <td style="padding:12px 20px;font-size:13px;font-weight:700;color:#059669">Toplam Aylık Ödeme</td>
              <td style="padding:12px 20px;font-size:14px;font-weight:800;color:#059669;text-align:right;font-variant-numeric:tabular-nums">₺${m(totalMonthly)}</td>
            </tr>
            <tr>
              <td style="padding:12px 20px;font-size:13px;font-weight:600;color:#64748B">Depozito</td>
              <td style="padding:12px 20px;font-size:14px;font-weight:700;color:#0F172A;text-align:right;font-variant-numeric:tabular-nums">₺${m(t.deposit || 0)}</td>
            </tr>
          </tbody>
        </table>

        ${t.iban ? `
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 20px;margin-bottom:28px">
          <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Kiracı IBAN</div>
          <div style="font-size:14px;font-weight:700;color:#0F172A;font-variant-numeric:tabular-nums">${t.iban}</div>
        </div>` : ''}

        ${(household.spouse || household.children || household.roommate) ? `
        <!-- Hane Bilgisi -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
          <div style="width:4px;height:18px;border-radius:2px;background:#025864"></div>
          <h3 style="margin:0;font-size:15px;font-weight:700;color:#0F172A">Birlikte Yaşayanlar</h3>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:28px">
          ${household.spouse ? `<div style="padding:10px 20px;border-radius:10px;background:#FDF2F8;border:1px solid #FBCFE8;font-size:13px;font-weight:600;color:#BE185D">Eş: ${household.spouse}</div>` : ''}
          ${household.children ? `<div style="padding:10px 20px;border-radius:10px;background:#EFF6FF;border:1px solid #BFDBFE;font-size:13px;font-weight:600;color:#1D4ED8">Çocuk: ${household.children}</div>` : ''}
          ${household.roommate ? `<div style="padding:10px 20px;border-radius:10px;background:#F5F3FF;border:1px solid #DDD6FE;font-size:13px;font-weight:600;color:#6D28D9">Oda Ark.: ${household.roommate}</div>` : ''}
        </div>` : ''}

        <!-- İmza -->
        <div style="display:flex;gap:48px;margin-top:48px;padding-top:32px;border-top:2px solid #E5E7EB">
          <div style="flex:1;text-align:center">
            <div style="font-size:12px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:48px">Kiraya Veren</div>
            <div style="border-top:1.5px solid #CBD5E1;padding-top:8px">
              <div style="font-size:13px;font-weight:600;color:#0F172A">Ad Soyad / İmza</div>
              <div style="font-size:11px;color:#94A3B8;margin-top:2px">Tarih: ___/___/______</div>
            </div>
          </div>
          <div style="flex:1;text-align:center">
            <div style="font-size:12px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:48px">Kiracı</div>
            <div style="border-top:1.5px solid #CBD5E1;padding-top:8px">
              <div style="font-size:13px;font-weight:600;color:#0F172A">${t.full_name}</div>
              <div style="font-size:11px;color:#94A3B8;margin-top:2px">Tarih: ___/___/______</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #E5E7EB;padding:16px 48px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:10px;color:#94A3B8">Bu belge KiraciYonet sistemi tarafından oluşturulmuştur.</span>
        <span style="font-size:10px;color:#94A3B8">${today}</span>
      </div>
    `

    const canvas = await html2canvas(wrapper, {
      scale: 1.5, useCORS: true, backgroundColor: '#FFFFFF', logging: false
    })
    document.body.removeChild(wrapper)

    const imgData = canvas.toDataURL('image/jpeg', 0.82)
    const imgW = canvas.width
    const imgH = canvas.height
    const pdfW = 210
    const contentW = pdfW
    const contentH = (imgH * contentW) / imgW
    const pageH = 297
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

    if (contentH <= pageH) {
      doc.addImage(imgData, 'JPEG', 0, 0, contentW, contentH)
    } else {
      const pageContentPx = (pageH / contentH) * imgH
      let srcY = 0
      let page = 0
      while (srcY < imgH) {
        if (page > 0) doc.addPage()
        const sliceH = Math.min(pageContentPx, imgH - srcY)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = imgW
        sliceCanvas.height = sliceH
        const ctx = sliceCanvas.getContext('2d')
        ctx.drawImage(canvas, 0, srcY, imgW, sliceH, 0, 0, imgW, sliceH)
        const sliceMMH = (sliceH * contentW) / imgW
        doc.addImage(sliceCanvas.toDataURL('image/jpeg', 0.82), 'JPEG', 0, 0, contentW, sliceMMH)
        srcY += sliceH
        page++
      }
    }

    doc.save(`Kira_Sozlesmesi_${t.full_name.replace(/\s+/g, '_')}.pdf`)
    showToast('Sözleşme PDF olarak indirildi.', 'success')
  }, [tenant])

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
  const apt = apartmentLabel(tenant.apartments)
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
          onClick={() => navigate(-1)}
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
          <div style={{ display: 'flex', gap: 8 }}>
            {isActive && (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={generateContract}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 12,
                  background: 'white', color: C.teal, border: `1.5px solid ${C.border}`,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer'
                }}>
                <FileText style={{ width: 14, height: 14 }} />
                Sözleşme PDF
              </motion.button>
            )}
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
          </div>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>IBAN</label>
                      <input style={inputStyle} value={form.iban} onChange={e => f('iban', e.target.value)} placeholder="DE..." />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>Aylık Aidat (₺/ay)</label>
                      <input type="number" min="0" step="0.01" style={inputStyle} value={form.nebenkosten_vorauszahlung} onChange={e => f('nebenkosten_vorauszahlung', e.target.value)} placeholder="0,00" />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4 }}>Aylık Aidat</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
                        {tenant.nebenkosten_vorauszahlung ? money(tenant.nebenkosten_vorauszahlung) + ' ₺' : '—'}
                      </div>
                    </div>
                    <div style={{
                      padding: '14px 16px', borderRadius: 12,
                      background: '#F0FDF4', border: `1px solid #BBF7D0`
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#059669', marginBottom: 4 }}>Toplam (Kira + Aidat)</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>
                        ₺{money((Number(tenant.rent) || 0) + (Number(tenant.nebenkosten_vorauszahlung) || 0))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 12 }}>
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

          {/* Kira Artışı Hesaplayıcı */}
          {isActive && Number(tenant.rent) > 0 && (
            <motion.div variants={fadeItem} style={cardBox}>
              <div style={{ padding: '20px 24px' }}>
                <div style={{
                  ...sectionTitle, cursor: 'pointer', justifyContent: 'space-between'
                }} onClick={() => setShowRentCalc(!showRentCalc)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Calculator style={{ width: 13, height: 13 }} /> Kira Artışı Hesapla
                  </div>
                  <motion.div animate={{ rotate: showRentCalc ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </motion.div>
                </div>
                <AnimatePresence>
                  {showRentCalc && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ marginTop: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4, display: 'block' }}>
                          TÜFE Oranı (%)
                        </label>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <input type="number" step="0.01" min="0" max="200"
                              style={{ ...inputStyle, paddingRight: 32 }}
                              value={tufeRate}
                              onChange={e => setTufeRate(e.target.value)}
                              placeholder="Ör: 44.38"
                            />
                            <Percent style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: C.textFaint }} />
                          </div>
                        </div>
                        {tufeRate && Number(tufeRate) > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <div style={{
                              padding: '14px 16px', borderRadius: 12,
                              background: '#F0FDF4', border: '1px solid #BBF7D0'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: '#64748B' }}>Mevcut Kira</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                                  ₺{money(tenant.rent)}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: '#64748B' }}>Artış Tutarı (%{Number(tufeRate).toLocaleString('tr-TR')})</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: C.amber, fontVariantNumeric: 'tabular-nums' }}>
                                  +₺{money(Math.round(Number(tenant.rent) * Number(tufeRate) / 100))}
                                </span>
                              </div>
                              <div style={{ height: 1, background: '#BBF7D0', margin: '4px 0 8px' }} />
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>Yeni Kira</span>
                                <span style={{ fontSize: 16, fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                                  ₺{money(Math.round(Number(tenant.rent) * (1 + Number(tufeRate) / 100)))}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

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
