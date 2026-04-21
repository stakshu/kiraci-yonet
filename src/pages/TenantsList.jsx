/* ── KiraciYonet — Kiracilar — Complete Redesign ── */
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { apartmentLabel, buildingLabel } from '../lib/apartmentLabel'
import { useNavigate } from 'react-router-dom'
import {
  Users, Plus, Pencil, Trash2, X, Check, Save,
  UserCheck, UserX, UserMinus, AlertTriangle, Search,
  Shield, CreditCard, Home as HomeIcon, ArrowRightLeft, Mail
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"
const money = n => Number(n).toLocaleString('tr-TR')

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

function leaseRemaining(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const end = new Date(dateStr); end.setHours(0,0,0,0)
  const diff = Math.ceil((end - today) / 864e5)
  if (diff < 0) return { text: `${Math.abs(diff)} gun gecti`, color: '#DC2626', urgent: true }
  if (diff === 0) return { text: 'Bugun bitiyor', color: '#DC2626', urgent: true }
  if (diff <= 30) return { text: `${diff} gun kaldi`, color: '#D97706', urgent: true }
  if (diff <= 90) return { text: `${diff} gun kaldi`, color: '#64748B', urgent: false }
  const months = Math.floor(diff / 30)
  return { text: `~${months} ay kaldi`, color: '#64748B', urgent: false }
}

const C = {
  teal: '#025864', green: '#00D47E', red: '#EF4444', amber: '#F59E0B',
  text: '#0F172A', textMuted: '#64748B', textFaint: '#94A3B8',
  border: '#E5E7EB', borderLight: '#F1F5F9', card: '#FFFFFF'
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } }
const cardBox = {
  background: C.card, borderRadius: 16,
  boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
  overflow: 'hidden'
}

const inputStyle = {
  fontFamily: font, fontSize: 13, padding: '10px 14px',
  borderRadius: 10, border: `1.5px solid ${C.border}`,
  background: '#FAFBFC', color: C.text, outline: 'none',
  width: '100%', boxSizing: 'border-box'
}
const labelStyle = { fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 6, display: 'block' }

const EMPTY_FORM = {
  full_name: '', email: '', phone: '', tc_no: '',
  apartment_id: '', lease_start: '', lease_end: '',
  rent: '', deposit: '', notes: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  iban: '', nebenkosten_vorauszahlung: '',
  household_spouse: 0, household_children: 0, household_roommate: 0
}

export default function TenantsList() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tenants, setTenants] = useState([])
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('active')
  const [search, setSearch] = useState('')

  /* ── Daire Ata / Değiştir modal state ── */
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignMode, setAssignMode] = useState('assign') // 'assign' | 'move'
  const [assignTenant, setAssignTenant] = useState(null)
  const [assignForm, setAssignForm] = useState({ apartment_id: '', lease_start: '', lease_end: '', rent: '' })
  const [assignSaving, setAssignSaving] = useState(false)

  useEffect(() => { loadTenants(); loadApartments() }, [])

  const loadTenants = async () => {
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('tenants').select('*, apartments(unit_no, floor_no, buildings(name))')
      .order('created_at', { ascending: false })
    if (err) { setError(err.message); setLoading(false); return }
    setTenants(data || []); setLoading(false)
  }

  const loadApartments = async () => {
    const { data } = await supabase
      .from('apartments').select('id, unit_no, floor_no, buildings(name), tenants(id)')
      .order('unit_no', { ascending: true })
    setApartments(data || [])
  }

  const vacantApartments = apartments.filter(a => !a.tenants?.[0])

  /* Split into active/inactive/former (status kolonu ile) */
  const activeTenants   = tenants.filter(t => t.status === 'active')
  const inactiveTenants = tenants.filter(t => t.status === 'inactive')
  const formerTenants   = tenants.filter(t => t.status === 'former')

  const expiringCount = activeTenants.filter(t => {
    if (!t.lease_end) return false
    const diff = (new Date(t.lease_end) - new Date()) / 864e5
    return diff >= 0 && diff <= 30
  }).length

  /* Filter by search */
  const currentList = tab === 'active' ? activeTenants : tab === 'inactive' ? inactiveTenants : formerTenants
  const filtered = currentList.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return t.full_name.toLowerCase().includes(q) || (t.phone || '').includes(q) ||
      buildingLabel(t.apartments).toLowerCase().includes(q)
  })

  const openAdd = () => { setEditId(null); setForm(EMPTY_FORM); setShowPopup(true) }

  const openEdit = async (id) => {
    const { data, error: err } = await supabase.from('tenants').select('*').eq('id', id).single()
    if (err || !data) { showToast('Kiraci bulunamadi.', 'error'); return }
    setEditId(id)
    setForm({
      full_name: data.full_name || '', email: data.email || '',
      phone: data.phone || '', tc_no: data.tc_no || '',
      apartment_id: data.apartment_id || '', lease_start: data.lease_start || '',
      lease_end: data.lease_end || '', rent: data.rent || '',
      deposit: data.deposit || '', notes: data.notes || '',
      emergency_contact_name: data.emergency_contact_name || '',
      emergency_contact_phone: data.emergency_contact_phone || '',
      iban: data.iban || '',
      nebenkosten_vorauszahlung: data.nebenkosten_vorauszahlung || '',
      household_spouse: data.household_info?.spouse || 0,
      household_children: data.household_info?.children || 0,
      household_roommate: data.household_info?.roommate || 0
    })
    setShowPopup(true)
  }

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('Oturum suresi dolmus.', 'error'); setSaving(false); return }
    const hasApt = !!form.apartment_id
    const record = {
      user_id: session.user.id, full_name: form.full_name.trim(),
      email: form.email.trim(), phone: form.phone.trim(), tc_no: form.tc_no.trim(),
      apartment_id: form.apartment_id || null,
      status: hasApt ? 'active' : (editId ? 'former' : 'inactive'),
      lease_start: form.lease_start || null, lease_end: form.lease_end || null,
      rent: parseFloat(form.rent) || 0, deposit: parseFloat(form.deposit) || 0,
      notes: form.notes.trim(),
      emergency_contact_name: form.emergency_contact_name.trim(),
      emergency_contact_phone: form.emergency_contact_phone.trim(),
      iban: form.iban.trim(),
      nebenkosten_vorauszahlung: parseFloat(form.nebenkosten_vorauszahlung) || 0,
      household_info: {
        spouse: parseInt(form.household_spouse) || 0,
        children: parseInt(form.household_children) || 0,
        roommate: parseInt(form.household_roommate) || 0
      }
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
        const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
        for (let i = 0; i < 120; i++) {
          const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate())
          if (dueDate > endOfNextMonth) break
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
    if (!confirm(name + ' silinsin mi? Bu islem geri alinamaz.')) return
    const { error: err } = await supabase.from('tenants').delete().eq('id', id)
    if (err) { showToast('Silme hatasi: ' + err.message, 'error'); return }
    showToast('Kiraci silindi.', 'success'); loadTenants(); loadApartments()
  }

  const moveToPast = async (id, name) => {
    if (!confirm(`${name} eski kiracilara tasinsin mi?`)) return
    const { error } = await supabase.from('tenants').update({ apartment_id: null, status: 'former' }).eq('id', id)
    if (error) { showToast('Hata: ' + error.message, 'error'); return }
    showToast('Kiraci eski kiracilara tasindi.', 'success'); loadTenants(); loadApartments()
  }

  const openAssign = (tenant, mode) => {
    setAssignMode(mode)
    setAssignTenant(tenant)
    setAssignForm({
      apartment_id: mode === 'move' ? (tenant.apartment_id || '') : '',
      lease_start: tenant.lease_start || '',
      lease_end: tenant.lease_end || '',
      rent: tenant.rent || ''
    })
    setAssignOpen(true)
  }

  const handleAssignSave = async (e) => {
    e.preventDefault()
    if (!assignTenant) return
    if (!assignForm.apartment_id) { showToast('Daire secin.', 'error'); return }
    if (assignMode === 'move' && assignForm.apartment_id === assignTenant.apartment_id) {
      showToast('Yeni daire mevcut daireyle ayni.', 'error'); return
    }
    setAssignSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('Oturum suresi dolmus.', 'error'); setAssignSaving(false); return }

    const oldApartmentId = assignTenant.apartment_id
    const newApartmentId = assignForm.apartment_id
    const rentAmount = parseFloat(assignForm.rent) || 0

    // 1) Tasima modunda: eski daireye ait bekleyen kira kayitlari silinir
    if (assignMode === 'move' && oldApartmentId) {
      const { error: delErr } = await supabase
        .from('rent_payments')
        .delete()
        .eq('tenant_id', assignTenant.id)
        .eq('apartment_id', oldApartmentId)
        .eq('status', 'pending')
      if (delErr) { showToast('Eski odemeler silinemedi: ' + delErr.message, 'error'); setAssignSaving(false); return }
      await supabase.from('apartments').update({ status: 'empty' }).eq('id', oldApartmentId)
    }

    // 2) Kiraci guncelle
    const { error: updErr } = await supabase
      .from('tenants')
      .update({
        apartment_id: newApartmentId,
        lease_start: assignForm.lease_start || null,
        lease_end: assignForm.lease_end || null,
        rent: rentAmount,
        status: 'active'
      })
      .eq('id', assignTenant.id)
    if (updErr) { showToast('Guncelleme hatasi: ' + updErr.message, 'error'); setAssignSaving(false); return }

    // 3) Yeni daireyi dolu isaretle
    await supabase.from('apartments').update({ status: 'occupied' }).eq('id', newApartmentId)

    // 4) 120 aylik bekleyen kira kayitlarini seed et
    if (rentAmount > 0) {
      const startDate = assignForm.lease_start ? new Date(assignForm.lease_start) : new Date()
      const now = new Date()
      const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
      const paymentRecords = []
      for (let i = 0; i < 120; i++) {
        const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate())
        if (dueDate > endOfNextMonth) break
        paymentRecords.push({
          user_id: session.user.id,
          tenant_id: assignTenant.id,
          apartment_id: newApartmentId,
          due_date: dueDate.toISOString().split('T')[0],
          amount: rentAmount,
          status: 'pending'
        })
      }
      if (paymentRecords.length > 0) {
        await supabase.from('rent_payments').insert(paymentRecords)
      }
    }

    setAssignSaving(false)
    showToast(assignMode === 'move' ? 'Kiraci yeni daireye tasindi.' : 'Daire kiraciya atandi.', 'success')
    setAssignOpen(false)
    loadTenants()
    loadApartments()
  }

  const UF = (field, val) => setForm(p => ({ ...p, [field]: val }))
  const UA = (field, val) => setAssignForm(p => ({ ...p, [field]: val }))

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ fontFamily: font, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ═══ HEADER ═══ */}
      <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: 0 }}>
          Kiracilar
          <span style={{ fontSize: 16, fontWeight: 600, color: C.textFaint, marginLeft: 8 }}>
            ({tenants.length})
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
          <Plus style={{ width: 15, height: 15 }} /> Kiraci Ekle
        </motion.button>
      </motion.div>

      {/* ═══ STAT CARDS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { label: 'Toplam Kiraci', value: tenants.length, color: C.teal, borderColor: '#CCE4E8' },
          { label: 'Aktif Kiraci', value: activeTenants.length, color: '#059669', borderColor: '#D1FAE5' },
          { label: 'Inaktif Kiraci', value: inactiveTenants.length, color: '#7C3AED', borderColor: '#E9D5FF' },
          { label: 'Eski Kiraci', value: formerTenants.length, color: C.textMuted, borderColor: '#E2E8F0' },
          { label: 'Suresi Dolan (30 gun)', value: expiringCount, color: expiringCount > 0 ? '#D97706' : C.text, borderColor: expiringCount > 0 ? '#FDE68A' : '#E2E8F0' }
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
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: '0.01em' }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 10 }}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ TABS + SEARCH ═══ */}
      <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${C.borderLight}` }}>
          {[
            { key: 'active',   label: 'Aktif Kiracilar',   icon: UserCheck,  count: activeTenants.length },
            { key: 'inactive', label: 'Inaktif Kiracilar', icon: UserMinus,  count: inactiveTenants.length },
            { key: 'former',   label: 'Eski Kiracilar',    icon: UserX,      count: formerTenants.length }
          ].map(t => {
            const Icon = t.icon
            const isActive = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '10px 20px', fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? C.teal : C.textMuted,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: font, whiteSpace: 'nowrap',
                  borderBottom: isActive ? `2px solid ${C.teal}` : '2px solid transparent',
                  marginBottom: -2, transition: 'color 0.2s, border-color 0.2s'
                }}>
                <Icon style={{ width: 15, height: 15 }} />
                {t.label}
                <span style={{
                  fontSize: 11, fontWeight: 700, marginLeft: 2,
                  background: isActive ? '#F0FDFA' : '#F1F5F9',
                  color: isActive ? C.teal : C.textFaint,
                  padding: '2px 7px', borderRadius: 6
                }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 10,
          border: `1.5px solid ${C.border}`, background: 'white', width: 220
        }}>
          <Search style={{ width: 14, height: 14, color: C.textFaint, flexShrink: 0 }} />
          <input type="text" placeholder="Kiraci ara..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: 'none', outline: 'none', fontSize: 13, fontFamily: font,
              color: C.text, background: 'transparent', width: '100%'
            }} />
        </div>
      </motion.div>

      {/* ═══ TABLE ═══ */}
      <motion.div variants={item} style={cardBox}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: tab === 'active'
            ? '1.5fr 1fr 1fr 1fr 1fr 140px'
            : '1.5fr 1fr 1fr 1fr 110px',
          padding: '14px 24px', background: '#FAFBFC',
          borderBottom: `1px solid ${C.borderLight}`
        }}>
          {(tab === 'active'
            ? ['Kiraci', 'Telefon', 'Daire', 'Sozlesme Bitis', 'Kira', '']
            : tab === 'inactive'
              ? ['Kiraci', 'Telefon', 'E-posta', 'Referans Kira', '']
              : ['Kiraci', 'Telefon', 'Son Daire', 'Son Kira', '']
          ).map((h, i) => (
            <div key={i} style={{
              fontSize: 11, fontWeight: 700, color: C.textFaint,
              textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.teal}`, borderTopColor: 'transparent' }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '32px 24px', color: C.red, fontSize: 14 }}>Hata: {error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 24px', color: C.textFaint, fontSize: 14 }}>
            {search
              ? 'Arama sonucu bulunamadi.'
              : tab === 'active' ? 'Aktif kiraci bulunmuyor.'
              : tab === 'inactive' ? 'Inaktif kiraci bulunmuyor.'
              : 'Eski kiraci bulunmuyor.'}
          </div>
        ) : filtered.map((t, i) => {
          const apt = apartmentLabel(t.apartments)
          const rentVal = t.rent ? money(t.rent) + ' ₺' : '—'
          const remaining = leaseRemaining(t.lease_end)
          const initials = t.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

          return (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              onClick={() => navigate(`/tenants/list/${t.id}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: tab === 'active'
                  ? '1.5fr 1fr 1fr 1fr 1fr 140px'
                  : '1.5fr 1fr 1fr 1fr 110px',
                padding: '14px 24px', alignItems: 'center',
                borderBottom: `1px solid ${C.borderLight}`,
                transition: 'background 0.15s',
                cursor: 'pointer'
              }}
              whileHover={{ backgroundColor: '#F8FAFC' }}
            >
              {/* Kiraci */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: tab === 'active' ? '#F0FDFA' : '#F1F5F9',
                  color: tab === 'active' ? C.teal : C.textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800
                }}>{initials}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t.full_name}</div>
              </div>

              {/* Telefon */}
              <div style={{ fontSize: 13, color: C.textMuted }}>{t.phone || '—'}</div>

              {/* 3. sutun: Daire (active/former) veya E-posta (inactive) */}
              {tab === 'inactive' ? (
                <div style={{ fontSize: 13, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.email || '—'}
                </div>
              ) : (
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{apt}</div>
              )}

              {tab === 'active' ? (
                <>
                  {/* Sozlesme Bitis */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{formatDate(t.lease_end)}</div>
                    {remaining && (
                      <div style={{
                        fontSize: 11, fontWeight: 600, color: remaining.color, marginTop: 2,
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        {remaining.urgent && <AlertTriangle style={{ width: 10, height: 10 }} />}
                        {remaining.text}
                      </div>
                    )}
                  </div>

                  {/* Kira */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                    {rentVal}
                  </div>
                </>
              ) : (
                /* Referans Kira (inactive) veya Son Kira (former) */
                <div style={{ fontSize: 13, color: C.textMuted }}>{rentVal}</div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); openEdit(t.id) }}
                  title="Duzenle"
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted
                  }}>
                  <Pencil style={{ width: 13, height: 13 }} />
                </motion.button>
                {tab === 'active' && (
                  <>
                    <motion.button whileHover={{ scale: 1.1, color: C.teal }} whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); openAssign(t, 'move') }}
                      title="Daire degistir"
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted
                      }}>
                      <ArrowRightLeft style={{ width: 13, height: 13 }} />
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); moveToPast(t.id, t.full_name) }}
                      title="Eski kiracilara tasi"
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted
                      }}>
                      <UserX style={{ width: 13, height: 13 }} />
                    </motion.button>
                  </>
                )}
                {(tab === 'inactive' || tab === 'former') && (
                  <motion.button whileHover={{ scale: 1.1, color: C.green }} whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); openAssign(t, 'assign') }}
                    title="Daire ata"
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted
                    }}>
                    <HomeIcon style={{ width: 13, height: 13 }} />
                  </motion.button>
                )}
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.id, t.full_name) }}
                  title="Sil"
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted
                  }}>
                  <Trash2 style={{ width: 13, height: 13 }} />
                </motion.button>
              </div>
            </motion.div>
          )
        })}
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
                width: '100%', maxWidth: 640,
                maxHeight: '85vh', overflowY: 'auto'
              }}>
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 28px', borderBottom: `1px solid ${C.borderLight}`
              }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, fontFamily: font }}>
                  {editId ? 'Kiraci Duzenle' : 'Yeni Kiraci Ekle'}
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

              {/* Form */}
              <form onSubmit={handleSave}>
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Ad Soyad *</label>
                      <input style={inputStyle} type="text" placeholder="Ahmet Yilmaz" required
                        value={form.full_name} onChange={e => UF('full_name', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>E-posta</label>
                      <input style={inputStyle} type="email" placeholder="ornek@mail.com"
                        value={form.email} onChange={e => UF('email', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Telefon</label>
                      <input style={inputStyle} type="text" placeholder="0532 123 4567"
                        value={form.phone} onChange={e => UF('phone', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>TC Kimlik</label>
                      <input style={inputStyle} type="text" placeholder="Opsiyonel" maxLength={11}
                        value={form.tc_no} onChange={e => UF('tc_no', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Daire</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }}
                      value={form.apartment_id} onChange={e => UF('apartment_id', e.target.value)}>
                      <option value="">Daire secin...</option>
                      {(editId ? apartments.filter(a => !a.tenants?.[0] || a.id === form.apartment_id) : vacantApartments).map(a => (
                        <option key={a.id} value={a.id}>{apartmentLabel(a)}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Sozlesme Baslangic</label>
                      <input style={inputStyle} type="date" value={form.lease_start} onChange={e => UF('lease_start', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Sozlesme Bitis</label>
                      <input style={inputStyle} type="date" value={form.lease_end} onChange={e => UF('lease_end', e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Aylik Kira (₺)</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0"
                        value={form.rent} onChange={e => UF('rent', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Depozito (₺)</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0"
                        value={form.deposit} onChange={e => UF('deposit', e.target.value)} />
                    </div>
                  </div>
                  {/* ── Acil Durum Kişisi ── */}
                  <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 16, marginTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Shield style={{ width: 13, height: 13 }} /> Acil Durum Kişisi
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={labelStyle}>Ad Soyad</label>
                        <input style={inputStyle} type="text" placeholder="Kişi adı"
                          value={form.emergency_contact_name} onChange={e => UF('emergency_contact_name', e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Telefon</label>
                        <input style={inputStyle} type="text" placeholder="0532 000 0000"
                          value={form.emergency_contact_phone} onChange={e => UF('emergency_contact_phone', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* ── IBAN ── */}
                  <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 16, marginTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CreditCard style={{ width: 13, height: 13 }} /> Finansal Bilgiler
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={labelStyle}>IBAN</label>
                        <input style={inputStyle} type="text" placeholder="DE00 0000 0000 0000 0000 00"
                          value={form.iban} onChange={e => UF('iban', e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Aylık Aidat (₺/ay)</label>
                        <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0,00"
                          value={form.nebenkosten_vorauszahlung} onChange={e => UF('nebenkosten_vorauszahlung', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* ── Hane Bilgisi ── */}
                  <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 16, marginTop: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HomeIcon style={{ width: 13, height: 13 }} /> Hane Bilgisi
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                      <div>
                        <label style={labelStyle}>Eş</label>
                        <input style={inputStyle} type="number" min="0" placeholder="0"
                          value={form.household_spouse} onChange={e => UF('household_spouse', e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Çocuk</label>
                        <input style={inputStyle} type="number" min="0" placeholder="0"
                          value={form.household_children} onChange={e => UF('household_children', e.target.value)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Oda Arkadaşı</label>
                        <input style={inputStyle} type="number" min="0" placeholder="0"
                          value={form.household_roommate} onChange={e => UF('household_roommate', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>Notlar</label>
                    <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} rows={2}
                      placeholder="Opsiyonel notlar..."
                      value={form.notes} onChange={e => UF('notes', e.target.value)} />
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
                  padding: '16px 28px', borderTop: `1px solid ${C.borderLight}`
                }}>
                  <button type="button" onClick={() => setShowPopup(false)}
                    style={{ padding: '10px 20px', borderRadius: 10, background: '#F1F5F9', color: C.textMuted, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>
                    Iptal
                  </button>
                  <button type="submit" disabled={saving}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '10px 22px', borderRadius: 10,
                      background: C.teal, color: 'white', border: 'none',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                      opacity: saving ? 0.7 : 1, boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
                    }}>
                    <Check style={{ width: 15, height: 15 }} />
                    {saving ? 'Kaydediliyor...' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ DAIRE ATA / DEGISTIR MODAL ═══ */}
      <AnimatePresence>
        {assignOpen && assignTenant && (() => {
          const pool = assignMode === 'move'
            ? apartments.filter(a => !a.tenants?.[0] || a.id === assignTenant.apartment_id)
            : vacantApartments
          const vacantOnly = assignMode === 'move'
            ? apartments.filter(a => !a.tenants?.[0])
            : vacantApartments
          const noVacant = vacantOnly.length === 0
          const currentApt = assignMode === 'move'
            ? apartments.find(a => a.id === assignTenant.apartment_id)
            : null
          const Icon = assignMode === 'move' ? ArrowRightLeft : HomeIcon
          const title = assignMode === 'move' ? 'Daire Degistir' : 'Daire Ata'
          const subtitle = assignMode === 'move'
            ? `${assignTenant.full_name} · Mevcut: ${apartmentLabel(currentApt)}`
            : `${assignTenant.full_name} icin bos bir daire secin`
          const accent = assignMode === 'move' ? C.teal : C.green
          return (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={(e) => { if (e.target === e.currentTarget) setAssignOpen(false) }}
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
                  width: '100%', maxWidth: 520,
                  maxHeight: '85vh', overflowY: 'auto'
                }}>
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '20px 28px', borderBottom: `1px solid ${C.borderLight}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: accent === C.green ? '#ECFDF5' : '#F0FDFA',
                      color: accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon style={{ width: 18, height: 18 }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: 0, fontFamily: font, letterSpacing: '-0.01em' }}>
                        {title}
                      </h3>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{subtitle}</div>
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setAssignOpen(false)}
                    style={{
                      width: 36, height: 36, borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#F1F5F9', border: 'none', cursor: 'pointer', color: C.textMuted
                    }}>
                    <X style={{ width: 18, height: 18 }} />
                  </motion.button>
                </div>

                {noVacant ? (
                  <div style={{ padding: '40px 28px', textAlign: 'center' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 16, background: '#FEF3C7',
                      color: '#D97706', display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', marginBottom: 14
                    }}>
                      <AlertTriangle style={{ width: 24, height: 24 }} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                      Uygun bos daire yok
                    </div>
                    <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 340, margin: '0 auto' }}>
                      Once bir daire ekleyin veya mevcut bir kiraciyi eski kiracilara tasiyin.
                    </div>
                    <button type="button" onClick={() => setAssignOpen(false)}
                      style={{
                        marginTop: 20, padding: '10px 24px', borderRadius: 10,
                        background: '#F1F5F9', color: C.textMuted, border: 'none',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
                      }}>
                      Kapat
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAssignSave}>
                    <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {assignMode === 'move' && (
                        <div style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '12px 14px', borderRadius: 10,
                          background: '#FEF3C7', border: '1px solid #FDE68A'
                        }}>
                          <AlertTriangle style={{ width: 14, height: 14, color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                          <div style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                            Eski daireye ait <strong>bekleyen</strong> kira kayitlari silinir. Odenmis kayitlar tarihcede kalir.
                          </div>
                        </div>
                      )}
                      <div>
                        <label style={labelStyle}>
                          {assignMode === 'move' ? 'Yeni Daire *' : 'Daire *'}
                        </label>
                        <select style={{ ...inputStyle, cursor: 'pointer' }}
                          value={assignForm.apartment_id} onChange={e => UA('apartment_id', e.target.value)}
                          required>
                          <option value="">Daire secin...</option>
                          {pool.map(a => (
                            <option key={a.id} value={a.id}>
                              {apartmentLabel(a)}
                              {assignMode === 'move' && a.id === assignTenant.apartment_id ? ' (mevcut)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div>
                          <label style={labelStyle}>Sozlesme Baslangic</label>
                          <input style={inputStyle} type="date"
                            value={assignForm.lease_start} onChange={e => UA('lease_start', e.target.value)} />
                        </div>
                        <div>
                          <label style={labelStyle}>Sozlesme Bitis</label>
                          <input style={inputStyle} type="date"
                            value={assignForm.lease_end} onChange={e => UA('lease_end', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Aylik Kira (₺)</label>
                        <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0"
                          value={assignForm.rent} onChange={e => UA('rent', e.target.value)} />
                        <div style={{ fontSize: 11, color: C.textFaint, marginTop: 6 }}>
                          Sozlesme baslangicindan itibaren 120 aya kadar bekleyen kira kayitlari otomatik olusturulur.
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
                      padding: '16px 28px', borderTop: `1px solid ${C.borderLight}`
                    }}>
                      <button type="button" onClick={() => setAssignOpen(false)}
                        style={{
                          padding: '10px 20px', borderRadius: 10, background: '#F1F5F9',
                          color: C.textMuted, border: 'none', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', fontFamily: font
                        }}>
                        Iptal
                      </button>
                      <button type="submit" disabled={assignSaving}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '10px 22px', borderRadius: 10,
                          background: accent, color: 'white', border: 'none',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                          opacity: assignSaving ? 0.7 : 1,
                          boxShadow: accent === C.green
                            ? '0 4px 14px rgba(0,212,126,0.3)'
                            : '0 4px 14px rgba(2,88,100,0.25)'
                        }}>
                        <Check style={{ width: 15, height: 15 }} />
                        {assignSaving ? 'Kaydediliyor...' : (assignMode === 'move' ? 'Tasi' : 'Ata')}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </motion.div>
  )
}
