/* ── KiraciYonet — Kira Ödemeleri — Redesigned ── */
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import {
  DollarSign, Clock, XCircle, CreditCard, Search,
  ChevronDown, Check, Mail, TrendingUp, Building2,
  User, CalendarDays, AlertTriangle, Undo2, Filter
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
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.ceil((target - today) / (1000*60*60*24))
}

function realStatus(payment) {
  if (payment.status === 'paid') return 'paid'
  return daysDiff(payment.due_date) < 0 ? 'overdue' : 'pending'
}

const C = {
  teal: '#025864', green: '#00D47E', darkTeal: '#03363D',
  red: '#DC2626', amber: '#D97706',
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

export default function RentPayments() {
  const { showToast } = useToast()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [expandedTenant, setExpandedTenant] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => { cleanupFuturePayments().then(() => { loadPayments(); checkMissingPayments() }) }, [])

  const cleanupFuturePayments = async () => {
    const now = new Date()
    const monthAfterNext = new Date(now.getFullYear(), now.getMonth() + 2, 1)
    const cutoff = monthAfterNext.toISOString().split('T')[0]
    await supabase
      .from('rent_payments')
      .delete()
      .gte('due_date', cutoff)
      .eq('status', 'pending')
  }

  const checkMissingPayments = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: tenants } = await supabase
      .from('tenants').select('id, apartment_id, lease_start, rent')
      .eq('user_id', session.user.id).not('apartment_id', 'is', null)
    if (!tenants || tenants.length === 0) return
    const { data: existingPayments } = await supabase
      .from('rent_payments').select('tenant_id, due_date').eq('user_id', session.user.id)

    const existingKeys = new Set(
      (existingPayments || []).map(p => `${p.tenant_id}_${p.due_date.slice(0, 7)}`)
    )

    const now = new Date()
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    const newPayments = []

    for (const t of tenants) {
      const rentAmount = Number(t.rent) || 0
      if (rentAmount <= 0 || !t.apartment_id) continue
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
    if (newPayments.length > 0) { await supabase.from('rent_payments').insert(newPayments); loadPayments() }
  }

  const loadPayments = async () => {
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('rent_payments').select('*, tenants(full_name, email, apartment_id), apartments(building, unit_no)')
      .order('due_date', { ascending: true })
    if (err) { setError(err.message); setLoading(false); return }
    const activeOnly = (data || []).filter(p => p.tenants?.apartment_id != null)
    setPayments(activeOnly); setLoading(false)
  }

  const getTenantGroups = () => {
    const groups = {}
    payments.forEach(p => {
      const key = p.tenant_id
      if (!key) return
      if (!groups[key]) {
        groups[key] = {
          tenantId: key, tenantName: p.tenants?.full_name || '—',
          tenantEmail: p.tenants?.email || '',
          aptName: p.apartments ? `${p.apartments.building} ${p.apartments.unit_no}` : '—',
          currentPayment: null, overduePayments: [], paidPayments: []
        }
      }
      const st = realStatus(p)
      if (st === 'overdue') groups[key].overduePayments.push(p)
      else if (st === 'paid') groups[key].paidPayments.push(p)
      else if (!groups[key].currentPayment) groups[key].currentPayment = p
    })
    Object.values(groups).forEach(g => {
      g.paidPayments.sort((a, b) => new Date(b.paid_date || b.due_date) - new Date(a.paid_date || a.due_date))
    })
    return Object.values(groups)
  }

  const tenantGroups = loading ? [] : getTenantGroups()
  const filtered = tenantGroups.filter(g => {
    if (filter === 'overdue') return g.overduePayments.length > 0
    if (filter === 'pending') return g.currentPayment
    if (filter === 'paid') return g.paidPayments.length > 0 && !g.currentPayment && g.overduePayments.length === 0
    return true
  }).filter(g => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return g.tenantName.toLowerCase().includes(q) || g.aptName.toLowerCase().includes(q)
  })
  const sorted = [...filtered].sort((a, b) => {
    return (a.overduePayments.length > 0 ? 0 : 1) - (b.overduePayments.length > 0 ? 0 : 1)
  })

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const thisMonthAll = payments.filter(p => {
    const d = new Date(p.due_date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  const totalCollected = thisMonthAll.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const totalPending = thisMonthAll.filter(p => realStatus(p) === 'pending').reduce((s, p) => s + Number(p.amount), 0)
  const overdueCount = payments.filter(p => realStatus(p) === 'overdue').length
  const totalAll = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)

  const sendEmail = async (payment, type) => {
    const tenantEmail = payment.tenants?.email
    if (!tenantEmail) { showToast('Kiracının e-posta adresi bulunamadı.', 'error'); return false }
    const { data: { session } } = await supabase.auth.getSession()
    const landlordName = session?.user?.email?.split('@')[0] || 'Mülk Sahibi'
    const diff = daysDiff(payment.due_date)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, tenantName: payment.tenants?.full_name, tenantEmail,
          amount: payment.amount, dueDate: formatDate(payment.due_date),
          paidDate: formatDate(new Date().toISOString()),
          daysLate: Math.abs(diff), landlordName
        })
      })
      const result = await res.json()
      await supabase.from('email_logs').insert({
        user_id: session.user.id, tenant_id: payment.tenant_id,
        payment_id: payment.id, email_type: type, recipient: tenantEmail,
        subject: type === 'reminder' ? 'Kira Hatırlatması' : type === 'overdue' ? 'Geciken Ödeme' : 'Ödeme Onay',
        status: result.success ? 'sent' : 'failed', error_message: result.error || null
      })
      if (result.success) { showToast(`Mail gönderildi: ${tenantEmail}`, 'success'); return true }
      showToast('Mail gönderilemedi: ' + (result.error || 'Bilinmeyen hata'), 'error'); return false
    } catch (err) { showToast('Mail gönderilemedi: ' + err.message, 'error'); return false }
  }

  const sendReminder = async (payment) => {
    await sendEmail(payment, realStatus(payment) === 'overdue' ? 'overdue' : 'reminder')
  }

  const markAsPaid = async (e, id) => {
    e.stopPropagation()
    const today = new Date().toISOString().split('T')[0]
    const { error: err } = await supabase.from('rent_payments').update({ status: 'paid', paid_date: today }).eq('id', id)
    if (err) { showToast('Hata: ' + err.message, 'error'); return }
    showToast('Ödeme kaydedildi.', 'success')
    const payment = payments.find(p => p.id === id)
    if (payment?.tenants?.email) sendEmail(payment, 'payment_received')
    loadPayments()
  }

  const markAsUnpaid = async (e, id) => {
    e.stopPropagation()
    const { error: err } = await supabase.from('rent_payments').update({ status: 'pending', paid_date: null }).eq('id', id)
    if (err) { showToast('Hata: ' + err.message, 'error'); return }
    showToast('Ödeme geri alındı.', 'success'); loadPayments()
  }

  const toggleExpand = (tenantId) => setExpandedTenant(prev => prev === tenantId ? null : tenantId)

  const getMainPayment = (group) => {
    if (group.overduePayments.length > 0) return group.overduePayments[0]
    return group.currentPayment
  }

  /* ── Loading spinner ── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, fontFamily: font }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${C.teal}`, borderTopColor: 'transparent' }} />
    </div>
  )

  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
  const monthLabel = months[currentMonth] + ' ' + currentYear

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: font }}>

      {/* ═══ HEADER ═══ */}
      <motion.div variants={fadeItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: 0 }}>
            Kira Ödemeleri
          </h1>
          <p style={{ fontSize: 13, color: C.textFaint, marginTop: 3 }}>
            {monthLabel} — Ödeme takibi ve tahsilat yönetimi
          </p>
        </div>
      </motion.div>

      {/* ═══ KPI CARDS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>

        {/* Bu Ay Tahsilat */}
        <motion.div variants={fadeItem}
          whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(1,150,113,0.25)' }}
          style={{
            ...cardBox, padding: '20px 22px',
            background: 'linear-gradient(135deg, #019671 0%, #026f69 100%)',
            cursor: 'default', transition: 'box-shadow 0.2s',
            position: 'relative', overflow: 'hidden'
          }}>
          <div style={{
            position: 'absolute', right: -18, top: -18,
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Bu Ay Tahsilat
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <TrendingUp style={{ width: 18, height: 18, color: '#FFFFFF' }} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {money(totalCollected)} ₺
            </div>
          </div>
        </motion.div>

        {/* Bekleyen Ödemeler */}
        <motion.div variants={fadeItem}
          whileHover={{ y: -3, boxShadow: '0 0 0 1px rgba(217,119,6,0.15), 0 12px 32px rgba(217,119,6,0.12)' }}
          style={{
            ...cardBox, padding: '20px 22px',
            borderLeft: `3px solid ${C.amber}`,
            cursor: 'default', transition: 'box-shadow 0.2s',
            position: 'relative', overflow: 'hidden'
          }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Bekleyen
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#FFFBEB',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Clock style={{ width: 18, height: 18, color: C.amber }} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {money(totalPending)} ₺
            </div>
          </div>
        </motion.div>

        {/* Geciken */}
        <motion.div variants={fadeItem}
          whileHover={{ y: -3, boxShadow: overdueCount > 0 ? '0 0 0 1px rgba(220,38,38,0.15), 0 12px 32px rgba(220,38,38,0.12)' : '0 0 0 1px rgba(15,23,42,0.08), 0 12px 32px rgba(15,23,42,0.08)' }}
          style={{
            ...cardBox, padding: '20px 22px',
            borderLeft: overdueCount > 0 ? `3px solid #FECACA` : `3px solid ${C.border}`,
            cursor: 'default', transition: 'box-shadow 0.2s',
            position: 'relative', overflow: 'hidden'
          }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Geciken
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: overdueCount > 0 ? '#FEF2F2' : '#F8FAFC',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <AlertTriangle style={{ width: 18, height: 18, color: overdueCount > 0 ? C.red : C.textFaint }} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: overdueCount > 0 ? C.red : C.text, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {overdueCount}
            </div>
            <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>ödeme</div>
          </div>
        </motion.div>

        {/* Toplam Tahsilat */}
        <motion.div variants={fadeItem}
          whileHover={{ y: -3, boxShadow: '0 0 0 1px rgba(2,88,100,0.1), 0 12px 32px rgba(15,23,42,0.1)' }}
          style={{
            ...cardBox, padding: '20px 22px',
            borderLeft: `3px solid ${C.teal}`,
            cursor: 'default', transition: 'box-shadow 0.2s',
            position: 'relative', overflow: 'hidden'
          }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Toplam Tahsilat
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#F0FDFA',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CreditCard style={{ width: 18, height: 18, color: C.teal }} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {money(totalAll)} ₺
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ CONTROLS BAR ═══ */}
      <motion.div variants={fadeItem} style={{
        display: 'flex', alignItems: 'center', gap: 12
      }}>
        {/* Search */}
        <div style={{
          flex: 1, maxWidth: 360, display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 12,
          background: C.card, border: `1.5px solid ${C.border}`,
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)'
        }}>
          <Search style={{ width: 16, height: 16, color: C.textFaint, flexShrink: 0 }} />
          <input
            type="text" placeholder="Kiracı veya daire ara..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, fontWeight: 500, color: C.text, fontFamily: font,
              width: '100%', padding: 0
            }}
          />
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[
            { key: '', label: 'Tümü' },
            { key: 'pending', label: 'Bekleyen' },
            { key: 'overdue', label: 'Geciken' },
            { key: 'paid', label: 'Ödenen' }
          ].map(f => (
            <motion.button key={f.key} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '8px 16px', borderRadius: 10,
                fontSize: 12, fontWeight: 600, fontFamily: font,
                cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: filter === f.key ? C.teal : '#F1F5F9',
                color: filter === f.key ? '#FFFFFF' : C.textMuted,
                boxShadow: filter === f.key ? '0 4px 12px rgba(2,88,100,0.25)' : 'none'
              }}>
              {f.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ═══ PAYMENT TABLE ═══ */}
      <motion.div variants={fadeItem} style={cardBox}>
        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 120px 100px 110px 140px 30px',
          padding: '14px 24px', background: '#FAFBFC',
          borderBottom: `1px solid ${C.borderLight}`
        }}>
          {['Kiracı', 'Daire', 'Tutar', 'Durum', 'Kalan', 'Aksiyon', ''].map((h, i) => (
            <div key={i} style={{
              fontSize: 11, fontWeight: 700, color: C.textFaint,
              textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {error ? (
          <div style={{ textAlign: 'center', padding: '32px 24px', color: C.red, fontSize: 14 }}>Hata: {error}</div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 24px', color: C.textFaint, fontSize: 14 }}>
            {searchQuery || filter ? 'Bu filtreye uygun ödeme bulunamadı.' : 'Henüz ödeme kaydı yok.'}
          </div>
        ) : sorted.map((group, idx) => {
          const mainPayment = getMainPayment(group)
          const isExpanded = expandedTenant === group.tenantId
          const hasPaidHistory = group.paidPayments.length > 0
          const hasExtraOverdue = group.overduePayments.length > 1
          const canExpand = hasPaidHistory || hasExtraOverdue
          const st = mainPayment ? realStatus(mainPayment) : 'paid'
          const diff = mainPayment ? daysDiff(mainPayment.due_date) : 0

          let dayLabel = ''
          if (!mainPayment) dayLabel = '—'
          else if (st === 'overdue') dayLabel = Math.abs(diff) + ' gün gecikti'
          else if (diff === 0) dayLabel = 'Bugün'
          else if (diff === 1) dayLabel = 'Yarın'
          else dayLabel = diff + ' gün kaldı'

          const initials = group.tenantName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

          const statusColor = st === 'overdue' ? C.red : st === 'pending' ? C.amber : C.green
          const statusBg = st === 'overdue' ? '#FEF2F2' : st === 'pending' ? '#FFFBEB' : '#F0FDF4'
          const statusLabel = st === 'overdue' ? 'Gecikti' : st === 'pending' ? 'Bekliyor' : 'Ödendi'

          return (
            <React.Fragment key={group.tenantId}>
              {/* ── Main Row ── */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.3 }}
                onClick={() => canExpand && toggleExpand(group.tenantId)}
                whileHover={{ backgroundColor: '#F8FAFC' }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 120px 100px 110px 140px 30px',
                  padding: '14px 24px', alignItems: 'center',
                  borderBottom: `1px solid ${C.borderLight}`,
                  cursor: canExpand ? 'pointer' : 'default',
                  transition: 'background 0.15s'
                }}
              >
                {/* Kiracı */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: '#F0FDFA', color: C.teal,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800
                  }}>{initials}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{group.tenantName}</span>
                      {group.overduePayments.length > 1 && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: C.red,
                          background: '#FEF2F2', borderRadius: 6, padding: '2px 6px',
                          border: '1px solid #FECACA'
                        }}>
                          +{group.overduePayments.length - 1}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.textFaint, marginTop: 1 }}>
                      {mainPayment ? formatDate(mainPayment.due_date) : ''}
                    </div>
                  </div>
                </div>

                {/* Daire */}
                <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{group.aptName}</div>

                {/* Tutar */}
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                  {mainPayment ? money(mainPayment.amount) + ' ₺' : '— ₺'}
                </div>

                {/* Durum */}
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '4px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 600,
                    background: statusBg, color: statusColor,
                    border: `1px solid ${statusColor}25`
                  }}>
                    {statusLabel}
                  </span>
                </div>

                {/* Kalan */}
                <div style={{
                  fontSize: 12, fontWeight: st === 'overdue' ? 700 : 500,
                  color: st === 'overdue' ? C.red : st === 'pending' && diff <= 3 ? C.amber : C.textFaint
                }}>
                  {dayLabel}
                </div>

                {/* Aksiyon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {mainPayment && st !== 'paid' && (
                    <>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={(e) => markAsPaid(e, mainPayment.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 12px', borderRadius: 8, border: 'none',
                          background: C.teal, color: '#FFFFFF',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: font
                        }}>
                        <Check style={{ width: 13, height: 13 }} /> Ödendi
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={(e) => { e.stopPropagation(); sendReminder(mainPayment) }}
                        title="Hatırlatma maili gönder"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '6px 10px', borderRadius: 8,
                          border: `1.5px solid ${C.border}`, background: C.card,
                          color: C.textMuted, fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', fontFamily: font
                        }}>
                        <Mail style={{ width: 13, height: 13 }} />
                      </motion.button>
                    </>
                  )}
                </div>

                {/* Expand chevron */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {canExpand && (
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.25 }}
                      style={{ color: C.textFaint }}
                    >
                      <ChevronDown style={{ width: 16, height: 16 }} />
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* ── Expanded Detail ── */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: 'hidden', borderBottom: `1px solid ${C.borderLight}` }}
                  >
                    <div style={{
                      padding: '16px 24px 20px',
                      background: '#FAFBFC'
                    }}>

                      {/* Extra overdue payments */}
                      {group.overduePayments.length > 1 && (
                        <div style={{ marginBottom: group.paidPayments.length > 0 ? 18 : 0 }}>
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: C.red,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6
                          }}>
                            <AlertTriangle style={{ width: 13, height: 13 }} />
                            Geciken Ödemeler
                          </div>
                          {/* Overdue header */}
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
                            gap: 16, padding: '6px 14px',
                            fontSize: 10, fontWeight: 600, color: C.textFaint,
                            textTransform: 'uppercase', letterSpacing: '0.06em'
                          }}>
                            <span>Vade Tarihi</span>
                            <span>Tutar</span>
                            <span>Gecikme</span>
                            <span style={{ minWidth: 140 }}></span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {group.overduePayments.slice(1).map(p => {
                              const d = daysDiff(p.due_date)
                              return (
                                <div key={p.id} style={{
                                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
                                  alignItems: 'center', gap: 16,
                                  padding: '10px 14px', borderRadius: 8,
                                  background: '#FFFFFF', borderBottom: `1px solid ${C.borderLight}`
                                }}>
                                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
                                    {formatDate(p.due_date)}
                                  </span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                                    {money(p.amount)} ₺
                                  </span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: C.red }}>
                                    {Math.abs(d)} gün gecikti
                                  </span>
                                  <div style={{ display: 'flex', gap: 6, minWidth: 140, justifyContent: 'flex-end' }}>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                      onClick={(e) => markAsPaid(e, p.id)}
                                      style={{
                                        padding: '5px 12px', borderRadius: 8, border: 'none',
                                        background: C.teal, color: '#FFFFFF',
                                        fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: font
                                      }}>
                                      Ödendi
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                      onClick={(e) => { e.stopPropagation(); sendReminder(p) }}
                                      style={{
                                        padding: '5px 12px', borderRadius: 8,
                                        border: `1.5px solid ${C.border}`, background: '#FFFFFF',
                                        color: C.textMuted, fontSize: 11, fontWeight: 600,
                                        cursor: 'pointer', fontFamily: font
                                      }}>
                                      Hatırla
                                    </motion.button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Payment history */}
                      {group.paidPayments.length > 0 && (
                        <div>
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: C.teal,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6
                          }}>
                            <Check style={{ width: 13, height: 13 }} />
                            Ödeme Geçmişi ({group.paidPayments.length})
                          </div>

                          {/* Column headers */}
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                            gap: 16, padding: '6px 14px',
                            fontSize: 10, fontWeight: 600, color: C.textFaint,
                            textTransform: 'uppercase', letterSpacing: '0.06em'
                          }}>
                            <span>Vade Tarihi</span>
                            <span>Tutar</span>
                            <span>Durum</span>
                            <span>Ödeme Tarihi</span>
                            <span style={{ minWidth: 70 }}></span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {group.paidPayments.map(p => {
                              const paidLate = p.paid_date && p.due_date && new Date(p.paid_date) > new Date(p.due_date)
                              return (
                                <div key={p.id} style={{
                                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                                  alignItems: 'center', gap: 16,
                                  padding: '10px 14px', borderRadius: 8,
                                  background: '#FFFFFF',
                                  borderBottom: `1px solid ${C.borderLight}`
                                }}>
                                  <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
                                    {formatDate(p.due_date)}
                                  </span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                                    {money(p.amount)} ₺
                                  </span>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', width: 'fit-content',
                                    padding: '3px 10px', borderRadius: 6,
                                    fontSize: 11, fontWeight: 600,
                                    background: paidLate ? '#FFFBEB' : '#F0FDF4',
                                    color: paidLate ? C.amber : '#059669',
                                    border: `1px solid ${paidLate ? '#FDE68A' : '#A7F3D0'}`
                                  }}>
                                    {paidLate ? 'Geç Ödendi' : 'Zamanında'}
                                  </span>
                                  <span style={{ fontSize: 13, fontWeight: 500, color: C.textMuted }}>
                                    {p.paid_date ? formatDate(p.paid_date) : ''}
                                  </span>
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={(e) => markAsUnpaid(e, p.id)}
                                    style={{
                                      padding: '5px 12px', borderRadius: 8, minWidth: 70,
                                      border: `1.5px solid ${C.border}`, background: '#FFFFFF',
                                      color: C.textMuted, fontSize: 11, fontWeight: 600,
                                      cursor: 'pointer', fontFamily: font,
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4
                                    }}>
                                    <Undo2 style={{ width: 12, height: 12 }} /> Geri Al
                                  </motion.button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {group.paidPayments.length === 0 && group.overduePayments.length <= 1 && (
                        <div style={{
                          padding: 16, textAlign: 'center',
                          fontSize: 13, color: C.textFaint, background: '#FFFFFF',
                          borderRadius: 8
                        }}>
                          Henüz ödeme geçmişi yok.
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </React.Fragment>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
