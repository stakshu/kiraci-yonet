/* ── KiraciYonet — Mulk Detay — Complete Redesign ── */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import {
  ArrowLeft, Building2, MapPin, Home, BedDouble, Armchair,
  Layers, Maximize2, Clock, ChevronDown, Check, Undo2,
  FileText, StickyNote, CreditCard, ScrollText, CalendarDays,
  Mail, Phone, IdCard, DollarSign, Shield
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
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
}

const TABS = [
  { key: 'payments', label: 'Odeme Akisi', icon: CreditCard },
  { key: 'details', label: 'Mulk Detaylari', icon: Building2 },
  { key: 'lease', label: 'Kira Sozlesmesi Bilgileri', icon: ScrollText },
  { key: 'documents', label: 'Belgeler', icon: FileText },
  { key: 'notes', label: 'Notlar', icon: StickyNote }
]

export default function PropertyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [apt, setApt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('details')
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  useEffect(() => { loadProperty() }, [id])
  useEffect(() => { if (tab === 'payments' && apt) loadPayments() }, [tab, apt])

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
      .from('rent_payments')
      .select('*')
      .eq('apartment_id', id)
      .order('due_date', { ascending: false })
    setPayments(data || [])
    setPaymentsLoading(false)
  }

  const markAsPaid = async (paymentId) => {
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('rent_payments')
      .update({ status: 'paid', paid_date: today })
      .eq('id', paymentId)
    if (error) { showToast('Hata: ' + error.message, 'error'); return }
    showToast('Odeme kaydedildi.', 'success')
    loadPayments()
  }

  const markAsUnpaid = async (paymentId) => {
    const { error } = await supabase
      .from('rent_payments')
      .update({ status: 'pending', paid_date: null })
      .eq('id', paymentId)
    if (error) { showToast('Hata: ' + error.message, 'error'); return }
    showToast('Odeme geri alindi.', 'success')
    loadPayments()
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

  /* ═══ Summary cards data ═══ */
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

  /* ═══ Detail rows ═══ */
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

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ fontFamily: font, display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ═══ BACK BUTTON ═══ */}
      <motion.div variants={item}>
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
      <motion.div variants={item} style={{
        display: 'flex', gap: 0, borderBottom: `2px solid ${C.borderLight}`,
        overflowX: 'auto'
      }}>
        {TABS.map(t => {
          const Icon = t.icon
          const isActive = tab === t.key
          return (
            <motion.button key={t.key}
              whileHover={{ color: C.teal }}
              onClick={() => setTab(t.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '12px 20px', fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? C.teal : C.textMuted,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: font, whiteSpace: 'nowrap', position: 'relative',
                borderBottom: isActive ? `2px solid ${C.teal}` : '2px solid transparent',
                marginBottom: -2,
                transition: 'color 0.2s'
              }}>
              <Icon style={{ width: 15, height: 15 }} />
              {t.label}
            </motion.button>
          )
        })}
      </motion.div>

      {/* ═══ TAB CONTENT ═══ */}

      {/* ── MULK DETAYLARI ── */}
      {tab === 'details' && (
        <>
          {/* Mulk Ozeti — Icon cards */}
          <motion.div variants={item}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 16px', letterSpacing: '-0.01em' }}>
              Mulk Ozeti
            </h2>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
              background: C.card, borderRadius: 16,
              boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
              overflow: 'hidden'
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
            </div>
          </motion.div>

          {/* Temel Bilgiler — Table */}
          <motion.div variants={item}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 16px', letterSpacing: '-0.01em' }}>
              Temel Bilgiler
            </h2>
            <div style={{
              background: C.card, borderRadius: 16,
              boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
              overflow: 'hidden'
            }}>
              {detailRows.map((r, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.03, duration: 0.35 }}
                  style={{
                    display: 'grid', gridTemplateColumns: '200px 1fr',
                    padding: '14px 24px',
                    borderBottom: i < detailRows.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                    alignItems: 'center'
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>{r.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{r.value}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {/* ── ODEME AKISI ── */}
      {tab === 'payments' && (
        <motion.div variants={item} style={{
          background: C.card, borderRadius: 16,
          boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
          overflow: 'hidden'
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1fr 100px',
            padding: '14px 24px', background: '#FAFBFC',
            borderBottom: `1px solid ${C.borderLight}`
          }}>
            {['Vade Tarihi', 'Tutar', 'Durum', 'Odeme Tarihi', ''].map((h, i) => (
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
            <div style={{ textAlign: 'center', padding: 60, color: C.textFaint, fontSize: 14 }}>
              Odeme kaydi bulunamadi.
            </div>
          ) : payments.map((p, i) => {
            const isPaid = p.status === 'paid'
            const diff = daysDiff(p.due_date)
            const isOverdue = !isPaid && diff < 0

            return (
              <motion.div key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                style={{
                  display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr 1fr 100px',
                  padding: '14px 24px', alignItems: 'center',
                  borderBottom: `1px solid ${C.borderLight}`
                }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {formatDate(p.due_date)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                  {money(p.amount)} ₺
                </div>
                <div>
                  <span style={{
                    padding: '4px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 700,
                    background: isPaid ? '#ECFDF5' : isOverdue ? '#FEF2F2' : '#FFF7ED',
                    color: isPaid ? '#059669' : isOverdue ? '#DC2626' : '#D97706'
                  }}>
                    {isPaid ? 'Odendi' : isOverdue ? 'Gecikti' : 'Bekliyor'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: C.textMuted }}>
                  {p.paid_date ? formatDate(p.paid_date) : '—'}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {isPaid ? (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => markAsUnpaid(p.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 8,
                        fontSize: 12, fontWeight: 600, fontFamily: font,
                        background: '#F1F5F9', color: C.textMuted,
                        border: 'none', cursor: 'pointer'
                      }}>
                      <Undo2 style={{ width: 12, height: 12 }} /> Geri Al
                    </motion.button>
                  ) : (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={() => markAsPaid(p.id)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', borderRadius: 8,
                        fontSize: 12, fontWeight: 600, fontFamily: font,
                        background: C.teal, color: 'white',
                        border: 'none', cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(2,88,100,0.2)'
                      }}>
                      <Check style={{ width: 12, height: 12 }} /> Odendi
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {/* ── KIRA SOZLESMESI BILGILERI ── */}
      {tab === 'lease' && (
        <motion.div variants={item}>
          {tenant ? (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 16px', letterSpacing: '-0.01em' }}>
                Kiraci & Sozlesme Bilgileri
              </h2>
              <div style={{
                background: C.card, borderRadius: 16,
                boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
                overflow: 'hidden'
              }}>
                {[
                  { icon: IdCard, label: 'Ad Soyad', value: tenant.full_name },
                  { icon: Mail, label: 'E-posta', value: tenant.email || '—' },
                  { icon: Phone, label: 'Telefon', value: tenant.phone || '—' },
                  { icon: Shield, label: 'TC No', value: tenant.tc_no || '—' },
                  { icon: CalendarDays, label: 'Sozlesme Baslangic', value: formatDate(tenant.lease_start) },
                  { icon: CalendarDays, label: 'Sozlesme Bitis', value: formatDate(tenant.lease_end) },
                  { icon: DollarSign, label: 'Aylik Kira', value: tenant.rent ? money(tenant.rent) + ' ₺' : '—' },
                  { icon: DollarSign, label: 'Depozito', value: tenant.deposit ? money(tenant.deposit) + ' ₺' : '—' }
                ].map((r, i, arr) => {
                  const Icon = r.icon
                  return (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.03, duration: 0.35 }}
                      style={{
                        display: 'grid', gridTemplateColumns: '44px 200px 1fr',
                        padding: '14px 24px', alignItems: 'center',
                        borderBottom: i < arr.length - 1 ? `1px solid ${C.borderLight}` : 'none'
                      }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: '#F0FDFA',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Icon style={{ width: 15, height: 15, color: C.teal }} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>{r.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{r.value}</div>
                    </motion.div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{
              background: C.card, borderRadius: 16,
              boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
              textAlign: 'center', padding: 60, color: C.textFaint, fontSize: 14
            }}>
              Bu mulkte kiraci bulunmuyor.
            </div>
          )}
        </motion.div>
      )}

      {/* ── BELGELER ── */}
      {tab === 'documents' && (
        <motion.div variants={item} style={{
          background: C.card, borderRadius: 16,
          boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
          textAlign: 'center', padding: 60
        }}>
          <FileText style={{ width: 32, height: 32, color: C.textFaint, marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: C.textMuted }}>
            Belge yonetimi yakin zamanda eklenecek.
          </div>
          <div style={{ fontSize: 13, color: C.textFaint, marginTop: 4 }}>
            Kira sozlesmesi, tapu ve diger belgeleri buradan yukleyebileceksiniz.
          </div>
        </motion.div>
      )}

      {/* ── NOTLAR ── */}
      {tab === 'notes' && (
        <motion.div variants={item} style={{
          background: C.card, borderRadius: 16,
          boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '18px 24px', borderBottom: `1px solid ${C.borderLight}`
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>Notlar</h3>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {/* Mulk notlari */}
            {apt.notes ? (
              <div style={{ marginBottom: tenant?.notes ? 24 : 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: C.textFaint,
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8
                }}>Mulk Notu</div>
                <div style={{
                  fontSize: 14, color: C.text, lineHeight: 1.7,
                  padding: '14px 18px', background: '#FAFBFC',
                  borderRadius: 12, border: `1px solid ${C.borderLight}`
                }}>
                  {apt.notes}
                </div>
              </div>
            ) : null}

            {/* Kiraci notlari */}
            {tenant?.notes ? (
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: C.textFaint,
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8
                }}>Kiraci Notu</div>
                <div style={{
                  fontSize: 14, color: C.text, lineHeight: 1.7,
                  padding: '14px 18px', background: '#FAFBFC',
                  borderRadius: 12, border: `1px solid ${C.borderLight}`
                }}>
                  {tenant.notes}
                </div>
              </div>
            ) : null}

            {!apt.notes && !tenant?.notes && (
              <div style={{ textAlign: 'center', padding: 40, color: C.textFaint, fontSize: 14 }}>
                Henuz not eklenmemis.
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
