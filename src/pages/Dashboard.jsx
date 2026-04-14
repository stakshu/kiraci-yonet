/* ── KiraciYonet — Dashboard v4 — Helvetica · Minimal · Purpose-built ── */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowRight, Plus, AlertTriangle, Mail, UserPlus, Building2 } from 'lucide-react'

const MO = ['Oca','Sub','Mar','Nis','May','Haz','Tem','Agu','Eyl','Eki','Kas','Ara']
const MO_FULL = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']

const ago = d => {
  const ms = Date.now() - new Date(d)
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'Az once'
  if (m < 60) return `${m} dk`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} sa`
  const dy = Math.floor(h / 24)
  return dy === 1 ? 'Dun' : `${dy} gun`
}

const greet = () => {
  const h = new Date().getHours()
  return h < 6 ? 'Iyi geceler' : h < 12 ? 'Gunaydin' : h < 18 ? 'Iyi gunler' : 'Iyi aksamlar'
}

const dDiff = d => {
  const a = new Date(); a.setHours(0,0,0,0)
  const b = new Date(d); b.setHours(0,0,0,0)
  return Math.ceil((b - a) / 864e5)
}

const money = n => Number(n).toLocaleString('tr-TR')

const font = "'Plus Jakarta Sans', system-ui, sans-serif"

/* Animations */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } }
}
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
}

/* Styles */
const S = {
  card: {
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)'
  },
  teal: '#025864',
  green: '#00D47E',
  red: '#EF4444',
  amber: '#F59E0B'
}

const CTip = ({ active, payload, label }) => {
  if (!active || !payload?.[0]) return null
  return (
    <div style={{ fontFamily: font, background: '#0F172A', borderRadius: 8, padding: '8px 14px' }}>
      <div style={{ color: '#94A3B8', fontSize: 11 }}>{label}</div>
      <div style={{ color: 'white', fontWeight: 700, fontSize: 14, marginTop: 2 }}>
        {money(payload[0].value)} ₺
      </div>
    </div>
  )
}

export default function Dashboard() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [apts, setApts] = useState([])
  const [pays, setPays] = useState([])
  const [tens, setTens] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensurePayments().then(() => {
      Promise.all([
        supabase.from('apartments').select('*, tenants(id, full_name, rent)').order('created_at', { ascending: false }),
        supabase.from('rent_payments').select('*, tenants(full_name, email), apartments(building, unit_no)').order('due_date', { ascending: false }),
        supabase.from('tenants').select('id, full_name, apartment_id, lease_end').order('created_at', { ascending: false })
      ]).then(([a, p, t]) => {
        setApts(a.data || [])
        setPays(p.data || [])
        setTens(t.data || [])
        setReady(true)
      })
    })
  }, [])

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

  const now = new Date()
  const cm = now.getMonth(), cy = now.getFullYear()
  const name = user?.email?.split('@')[0] || 'Kullanici'

  const monthPays = pays.filter(p => { const d = new Date(p.due_date); return d.getMonth() === cm && d.getFullYear() === cy })
  const paidThisMonth = monthPays.filter(p => p.status === 'paid')
  const collectedSum = paidThisMonth.reduce((s, p) => s + Number(p.amount), 0)
  const paidAptCount = new Set(paidThisMonth.map(p => p.apartment_id).filter(Boolean)).size

  /* This month's overdue (unpaid + past due within this month) */
  const overdueThisMonth = monthPays.filter(p => p.status !== 'paid' && dDiff(p.due_date) < 0)
  const overdueMonthSum = overdueThisMonth.reduce((s, p) => s + Number(p.amount), 0)
  const overdueMonthAptCount = new Set(overdueThisMonth.map(p => p.apartment_id).filter(Boolean)).size

  /* This month's upcoming (unpaid + not yet due within this month) */
  const upcomingThisMonth = monthPays.filter(p => p.status !== 'paid' && dDiff(p.due_date) >= 0)
  const upcomingMonthSum = upcomingThisMonth.reduce((s, p) => s + Number(p.amount), 0)
  const upcomingMonthAptCount = new Set(upcomingThisMonth.map(p => p.apartment_id).filter(Boolean)).size

  /* All overdue payments (for the list below, not cards) */
  const overdueAll = pays.filter(p => p.status !== 'paid' && dDiff(p.due_date) < 0)

  const aptTotal = apts.length
  const aptOcc = apts.filter(a => a.tenants?.[0]).length
  const aptVac = aptTotal - aptOcc

  /* Unpaid tenants list — only overdue payments (due_date < today) */
  const unpaidTenants = useMemo(() => {
    const groups = {}

    overdueAll.forEach(p => {
      if (!p.tenant_id) return
      if (!groups[p.tenant_id]) {
        groups[p.tenant_id] = {
          name: p.tenants?.full_name || '—',
          email: p.tenants?.email || '',
          apt: p.apartments ? `${p.apartments.building} ${p.apartments.unit_no}` : '—',
          amount: 0,
          daysLate: 0
        }
      }
      groups[p.tenant_id].amount += Number(p.amount)
      groups[p.tenant_id].daysLate = Math.max(groups[p.tenant_id].daysLate, Math.abs(dDiff(p.due_date)))
    })

    return Object.values(groups).sort((a, b) => b.daysLate - a.daysLate || b.amount - a.amount)
  }, [overdueAll])

  /* Trend chart */
  const trendData = useMemo(() => {
    const d = []
    for (let i = 11; i >= 0; i--) {
      const m = (cm - i + 12) % 12
      const y = cm - i < 0 ? cy - 1 : cy
      const t = pays.filter(p => { const dt = new Date(p.due_date); return dt.getMonth() === m && dt.getFullYear() === y && p.status === 'paid' })
        .reduce((s, p) => s + Number(p.amount), 0)
      d.push({ m: MO[m], v: t || null })
    }
    return d
  }, [pays, cm, cy])

  if (!ready) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, fontFamily: font }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${S.teal}`, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: font }}>

      {/* ═══ HEADER ═══ */}
      <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em', margin: 0 }}>
            {greet()}, {name}
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 3 }}>
            {now.getDate()} {MO_FULL[cm]} {cy}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => nav('/tenants/list')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              borderRadius: 12, background: '#F0FDFA', color: S.teal, border: `1.5px solid #CCE4E8`,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
            }}>
            <UserPlus style={{ width: 14, height: 14 }} /> Kiraci Ekle
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => nav('/properties')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              borderRadius: 12, background: '#F8FAFC', color: '#475569', border: `1.5px solid #E2E8F0`,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
            }}>
            <Building2 style={{ width: 14, height: 14 }} /> Mulk Ekle
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => nav('/payments/rent')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              borderRadius: 12, background: S.teal, color: 'white', border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
              boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
            }}>
            <Plus style={{ width: 14, height: 14 }} /> Tahsilat Ekle
          </motion.button>
        </div>
      </motion.div>

      {/* ═══ KPI CARDS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {[
          {
            title: 'Gerceklesen Odemeler',
            value: `${money(collectedSum)} ₺`,
            sub: paidAptCount > 0 ? `${paidAptCount} Mulk'ten gelen` : 'Henuz odeme yok',
            color: '#FFFFFF',
            titleColor: 'rgba(255,255,255,0.8)',
            subColor: 'rgba(255,255,255,0.65)',
            buAyColor: 'rgba(255,255,255,0.5)',
            bg: 'linear-gradient(135deg, #019671 0%, #026f69 100%)',
            borderColor: 'transparent'
          },
          {
            title: 'Geciken Odemeler',
            value: `${money(overdueMonthSum)} ₺`,
            sub: overdueMonthAptCount > 0 ? `${overdueMonthAptCount} Mulk'ten geciken` : 'Geciken odeme yok',
            color: overdueThisMonth.length > 0 ? '#DC2626' : '#0F172A',
            borderColor: overdueThisMonth.length > 0 ? '#FECACA' : '#E2E8F0'
          },
          {
            title: 'Gelecek Odemeler',
            value: `${money(upcomingMonthSum)} ₺`,
            sub: upcomingMonthAptCount > 0 ? `${upcomingMonthAptCount} Mulk'ten beklenen` : 'Bekleyen odeme yok',
            color: '#025864',
            borderColor: '#CCE4E8'
          }
        ].map((k, i) => (
          <motion.div key={i} variants={item}
            whileHover={{ y: -3, boxShadow: '0 0 0 1px rgba(2,88,100,0.1), 0 12px 32px rgba(15,23,42,0.1)' }}
            style={{
              ...S.card,
              padding: '20px 22px',
              borderLeft: k.bg ? 'none' : `3px solid ${k.borderColor}`,
              background: k.bg || S.card.background,
              cursor: 'default',
              transition: 'box-shadow 0.2s'
            }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: k.titleColor || '#64748B', letterSpacing: '0.01em' }}>
              {k.title}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 500, color: k.buAyColor || '#94A3B8',
              marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>
              Bu Ay
            </div>
            <div style={{
              fontSize: 26, fontWeight: 800, color: k.color,
              letterSpacing: '-0.02em', lineHeight: 1,
              marginTop: 8
            }}>
              {k.value}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 500, color: k.subColor || '#94A3B8',
              marginTop: 8
            }}>
              {k.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ MIDDLE ROW: Unpaid List + Trend ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Kirasını ödemeyen kiracılar */}
        <motion.div variants={item} style={{ ...S.card, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '18px 22px', borderBottom: '1px solid #F1F5F9'
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
              Geciken Kiralar
            </div>
            <motion.button whileHover={{ x: 3 }}
              onClick={() => nav('/payments/rent')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600, color: S.teal, background: 'none',
                border: 'none', cursor: 'pointer', fontFamily: font
              }}>
              Tumu <ArrowRight style={{ width: 13, height: 13 }} />
            </motion.button>
          </div>

          {unpaidTenants.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 13, color: '#94A3B8' }}>
              Geciken odeme yok.
            </div>
          ) : (
            <div>
              {unpaidTenants.slice(0, 6).map((t, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 22px',
                    borderBottom: '1px solid #F8FAFC',
                    background: '#FFFBEB'
                  }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: '#FEF2F2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <AlertTriangle style={{ width: 14, height: 14, color: '#DC2626' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                      {t.apt} · {t.daysLate} gun gecikme
                    </div>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: '#DC2626',
                    fontVariantNumeric: 'tabular-nums', flexShrink: 0
                  }}>
                    {money(t.amount)} ₺
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Tahsilat Trendi */}
        <motion.div variants={item} style={{ ...S.card, padding: '22px 22px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Tahsilat Trendi</div>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>12 ay</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#025864" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#025864" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: font }} dy={8} interval={1} />
              <Tooltip content={<CTip />} />
              <Area type="monotone" dataKey="v" stroke="#025864" strokeWidth={2}
                fill="url(#tealGrad)" dot={false} connectNulls
                activeDot={{ r: 4, fill: '#025864', stroke: 'white', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ═══ BOTTOM ROW: Son Hareketler + Mülk Durumu ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>

        {/* Son Hareketler */}
        <motion.div variants={item} style={{ ...S.card, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '18px 22px', borderBottom: '1px solid #F1F5F9'
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Son Hareketler</div>
            <motion.button whileHover={{ x: 3 }}
              onClick={() => nav('/payments/rent')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600, color: S.teal, background: 'none',
                border: 'none', cursor: 'pointer', fontFamily: font
              }}>
              Tumu <ArrowRight style={{ width: 13, height: 13 }} />
            </motion.button>
          </div>

          {(() => {
            const recent = pays.filter(p => p.status === 'paid' && p.paid_date)
              .sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date)).slice(0, 5)
            return recent.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: '#94A3B8' }}>
                Henuz odeme yok.
              </div>
            ) : recent.map((p, i) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05, duration: 0.4 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 22px',
                  borderBottom: '1px solid #F8FAFC',
                  background: i % 2 === 1 ? '#FAFBFC' : 'white'
                }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: '#059669'
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                    {p.tenants?.full_name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                    {p.apartments ? `${p.apartments.building} — ${p.apartments.unit_no}` : '—'}
                    {' · '}{ago(p.paid_date)}
                  </div>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: '#059669',
                  fontVariantNumeric: 'tabular-nums', flexShrink: 0
                }}>
                  +{money(p.amount)} ₺
                </div>
              </motion.div>
            ))
          })()}
        </motion.div>

        {/* Mülk Durumu — Simple */}
        <motion.div variants={item} style={{ ...S.card, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>
            Mulk Durumu
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Dolu */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px',
              background: '#F0FDFA',
              borderRadius: '12px 12px 0 0',
              borderBottom: '1px solid #E6F3F5'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: S.teal }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#0F172A' }}>Dolu</span>
              </div>
              <span style={{ fontSize: 22, fontWeight: 800, color: S.teal }}>{aptOcc}</span>
            </div>

            {/* Boş */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px',
              background: '#F8FAFC',
              borderRadius: '0 0 12px 12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#CBD5E1', border: '2px solid #94A3B8' }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>Bos</span>
              </div>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#64748B' }}>{aptVac}</span>
            </div>
          </div>

          {/* Bar visual */}
          <div style={{
            display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden',
            marginTop: 16, background: '#E2E8F0'
          }}>
            {aptTotal > 0 && (
              <div style={{
                width: `${(aptOcc / aptTotal) * 100}%`,
                background: S.teal,
                borderRadius: 4,
                transition: 'width 0.6s ease'
              }} />
            )}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 8, fontSize: 11, color: '#94A3B8'
          }}>
            <span>{aptTotal} toplam mulk</span>
            <span>%{aptTotal > 0 ? Math.round((aptOcc / aptTotal) * 100) : 0} doluluk</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
