/* ── KiraciYonet — Tenant Detail Drawer ── */
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import {
  X, Phone, Mail, IdCard, Shield, CreditCard, Users,
  Home, CalendarDays, Clock, CheckCircle, AlertTriangle,
  Banknote, Heart, Baby, UserPlus, StickyNote,
  TrendingUp, ChevronRight
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

const sectionTitle = {
  fontSize: 11, fontWeight: 700, color: C.teal,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7
}

const infoRow = {
  display: 'flex', alignItems: 'center', gap: 10,
  fontSize: 13, color: C.text, padding: '6px 0'
}

const infoIcon = {
  width: 15, height: 15, color: C.textFaint, flexShrink: 0
}

const sectionBox = {
  padding: '18px 24px',
  borderBottom: `1px solid ${C.borderLight}`
}

export default function TenantDetail({ tenant, onClose, visible }) {
  const [payments, setPayments] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(false)

  useEffect(() => {
    if (visible && tenant?.id) {
      loadPayments()
    } else {
      setPayments([])
    }
  }, [visible, tenant?.id])

  const loadPayments = async () => {
    setLoadingPayments(true)
    const { data } = await supabase
      .from('rent_payments')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('due_date', { ascending: false })
    setPayments(data || [])
    setLoadingPayments(false)
  }

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

  const isActive = !!tenant?.apartment_id
  const household = tenant?.household_info || {}
  const hasHousehold = (household.spouse || 0) + (household.children || 0) + (household.roommate || 0) > 0
  const hasEmergency = tenant?.emergency_contact_name || tenant?.emergency_contact_phone

  const leaseRemaining = () => {
    if (!tenant?.lease_end) return null
    const diff = daysDiff(tenant.lease_end)
    if (diff < 0) return { text: `${Math.abs(diff)} gün geçti`, color: C.red, urgent: true }
    if (diff === 0) return { text: 'Bugün bitiyor', color: C.red, urgent: true }
    if (diff <= 30) return { text: `${diff} gün kaldı`, color: C.amber, urgent: true }
    if (diff <= 90) return { text: `${diff} gün kaldı`, color: C.textMuted, urgent: false }
    const months = Math.floor(diff / 30)
    return { text: `~${months} ay kaldı`, color: C.textMuted, urgent: false }
  }

  const remaining = leaseRemaining()

  const getPaymentStatus = (p) => {
    if (p.status === 'paid') return { label: 'Ödendi', bg: '#ECFDF5', color: '#059669' }
    if (daysDiff(p.due_date) < 0) return { label: 'Gecikti', bg: '#FEF2F2', color: '#DC2626' }
    return { label: 'Bekliyor', bg: '#FFFBEB', color: '#D97706' }
  }

  if (!tenant) return null

  const initials = tenant.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
  const apt = tenant.apartments ? `${tenant.apartments.building} ${tenant.apartments.unit_no}` : '—'

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(4px)'
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: 520, maxWidth: '90vw',
              background: 'white', zIndex: 1001,
              boxShadow: '-8px 0 40px rgba(15,23,42,0.12)',
              display: 'flex', flexDirection: 'column',
              fontFamily: font
            }}
          >
            {/* ═══ HEADER ═══ */}
            <div style={{
              padding: '24px 24px 20px', background: '#F8FFFE',
              borderBottom: `1px solid ${C.borderLight}`,
              position: 'relative'
            }}>
              {/* Close button */}
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={onClose}
                style={{
                  position: 'absolute', top: 16, right: 16,
                  width: 36, height: 36, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(2,88,100,0.06)', border: 'none', cursor: 'pointer',
                  color: C.teal
                }}>
                <X style={{ width: 18, height: 18 }} />
              </motion.button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Avatar */}
                <div style={{
                  width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                  background: isActive
                    ? 'linear-gradient(135deg, #025864 0%, #03363D 100%)'
                    : '#E2E8F0',
                  color: isActive ? 'white' : C.textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em'
                }}>
                  {initials}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
                    {tenant.full_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                      background: isActive ? '#ECFDF5' : '#F1F5F9',
                      color: isActive ? '#059669' : C.textMuted,
                      border: `1px solid ${isActive ? '#A7F3D0' : '#E2E8F0'}`
                    }}>
                      {isActive ? 'Aktif Kiracı' : 'Eski Kiracı'}
                    </span>
                    {isActive && apt !== '—' && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: C.teal,
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <Home style={{ width: 12, height: 12 }} /> {apt}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
                {tenant.phone && (
                  <div style={{ ...infoRow, padding: 0 }}>
                    <Phone style={infoIcon} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{tenant.phone}</span>
                  </div>
                )}
                {tenant.email && (
                  <div style={{ ...infoRow, padding: 0 }}>
                    <Mail style={infoIcon} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{tenant.email}</span>
                  </div>
                )}
                {tenant.tc_no && (
                  <div style={{ ...infoRow, padding: 0 }}>
                    <IdCard style={infoIcon} />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{tenant.tc_no}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ SCROLLABLE CONTENT ═══ */}
            <div style={{ flex: 1, overflowY: 'auto' }}>

              {/* ── Acil Durum Kişisi ── */}
              <div style={sectionBox}>
                <div style={sectionTitle}>
                  <Shield style={{ width: 13, height: 13 }} /> Acil Durum Kişisi
                </div>
                {hasEmergency ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {tenant.emergency_contact_name && (
                      <div style={infoRow}>
                        <Users style={infoIcon} />
                        <span style={{ fontWeight: 600 }}>{tenant.emergency_contact_name}</span>
                      </div>
                    )}
                    {tenant.emergency_contact_phone && (
                      <div style={infoRow}>
                        <Phone style={infoIcon} />
                        <span>{tenant.emergency_contact_phone}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: C.textFaint, fontStyle: 'italic' }}>Belirtilmemiş</div>
                )}
              </div>

              {/* ── Finansal Bilgiler ── */}
              <div style={sectionBox}>
                <div style={sectionTitle}>
                  <CreditCard style={{ width: 13, height: 13 }} /> Finansal Bilgiler
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: '#F8FAFC', border: `1px solid ${C.borderLight}`
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4 }}>Aylık Kira</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
                      {tenant.rent ? money(tenant.rent) + ' ₺' : '—'}
                    </div>
                  </div>
                  <div style={{
                    padding: '12px 14px', borderRadius: 12,
                    background: '#F8FAFC', border: `1px solid ${C.borderLight}`
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, marginBottom: 4 }}>Depozito</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
                      {tenant.deposit ? money(tenant.deposit) + ' ₺' : '—'}
                    </div>
                  </div>
                </div>
                {tenant.iban ? (
                  <div style={{
                    marginTop: 12, padding: '10px 14px', borderRadius: 10,
                    background: '#F8FAFC', border: `1px solid ${C.borderLight}`,
                    display: 'flex', alignItems: 'center', gap: 10
                  }}>
                    <Banknote style={{ width: 15, height: 15, color: C.textFaint, flexShrink: 0 }} />
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
              </div>

              {/* ── Hane Bilgisi ── */}
              <div style={sectionBox}>
                <div style={sectionTitle}>
                  <Home style={{ width: 13, height: 13 }} /> Hane Bilgisi
                </div>
                {hasHousehold ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {(household.spouse || 0) > 0 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 10,
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
                        padding: '6px 14px', borderRadius: 10,
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
                        padding: '6px 14px', borderRadius: 10,
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

              {/* ── Kira & Sözleşme ── */}
              <div style={sectionBox}>
                <div style={sectionTitle}>
                  <CalendarDays style={{ width: 13, height: 13 }} />
                  {isActive ? 'Kira & Sözleşme' : 'Geçmiş Sözleşme'}
                </div>
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
                    marginTop: 12, padding: '8px 14px', borderRadius: 10,
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
                {!isActive && apt !== '—' && (
                  <div style={{
                    marginTop: 12, padding: '8px 14px', borderRadius: 10,
                    background: '#F8FAFC', border: `1px solid ${C.borderLight}`,
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 13, fontWeight: 500, color: C.textMuted
                  }}>
                    <Home style={{ width: 14, height: 14 }} />
                    Son daire: {apt}
                  </div>
                )}
              </div>

              {/* ── Ödeme Özeti ── */}
              <div style={sectionBox}>
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
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>{money(stats.totalPaid)} ₺</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: '#059669', marginTop: 2 }}>{stats.paidCount} ödeme</div>
                    </div>
                    <div style={{
                      padding: '14px 12px', borderRadius: 12, textAlign: 'center',
                      background: stats.totalOverdue > 0 ? '#FEF2F2' : '#F8FAFC',
                      border: `1px solid ${stats.totalOverdue > 0 ? '#FECACA' : C.borderLight}`
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: stats.totalOverdue > 0 ? '#DC2626' : C.textFaint, marginBottom: 4 }}>Geciken</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: stats.totalOverdue > 0 ? '#DC2626' : C.textMuted }}>{money(stats.totalOverdue)} ₺</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: stats.totalOverdue > 0 ? '#DC2626' : C.textFaint, marginTop: 2 }}>{stats.overdueCount} ödeme</div>
                    </div>
                    <div style={{
                      padding: '14px 12px', borderRadius: 12, textAlign: 'center',
                      background: '#F0FDFA', border: '1px solid #99F6E4'
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.teal, marginBottom: 4 }}>Başarı</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.teal }}>%{stats.successRate}</div>
                      <div style={{ fontSize: 11, fontWeight: 500, color: C.teal, marginTop: 2 }}>ödeme oranı</div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Ödeme Geçmişi ── */}
              <div style={sectionBox}>
                <div style={sectionTitle}>
                  <Banknote style={{ width: 13, height: 13 }} /> Ödeme Geçmişi
                </div>
                {loadingPayments ? (
                  <div style={{ fontSize: 13, color: C.textFaint }}>Yükleniyor...</div>
                ) : last12Payments.length === 0 ? (
                  <div style={{ fontSize: 13, color: C.textFaint, fontStyle: 'italic' }}>Henüz ödeme kaydı bulunmuyor</div>
                ) : (
                  <div style={{ maxHeight: 320, overflowY: 'auto', borderRadius: 12, border: `1px solid ${C.borderLight}` }}>
                    {last12Payments.map((p, i) => {
                      const st = getPaymentStatus(p)
                      return (
                        <div key={p.id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderBottom: i < last12Payments.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                          background: i % 2 === 0 ? '#FAFBFC' : 'white'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: st.color, flexShrink: 0
                            }} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                                {formatDate(p.due_date)}
                              </div>
                              {p.paid_date && p.status === 'paid' && (
                                <div style={{ fontSize: 11, color: '#059669', marginTop: 1 }}>
                                  Ödeme: {formatDate(p.paid_date)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                              {money(p.amount)} ₺
                            </div>
                            <span style={{
                              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                              background: st.bg, color: st.color
                            }}>
                              {st.label}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── Notlar ── */}
              <div style={{ ...sectionBox, borderBottom: 'none' }}>
                <div style={sectionTitle}>
                  <StickyNote style={{ width: 13, height: 13 }} /> Notlar
                </div>
                {tenant.notes ? (
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
