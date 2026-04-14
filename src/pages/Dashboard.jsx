/* ── KiraciYonet — Dashboard v3 — Built from scratch ── */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import {
  ArrowRight, Plus, ArrowUpRight, ExternalLink,
  Wallet, ShieldAlert, Home, UserCheck
} from 'lucide-react'

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════ */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } }
}
const item = {
  hidden: { opacity: 0, y: 32, filter: 'blur(4px)' },
  show: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
}

/* ═══════════════════════════════════════════════
   STYLES (inline objects for zero class conflicts)
   ═══════════════════════════════════════════════ */
const S = {
  card: {
    background: 'white',
    borderRadius: 20,
    border: 'none',
    boxShadow: '0 0 0 1px rgba(15,23,42,0.03), 0 2px 8px rgba(15,23,42,0.04)'
  },
  cardHover: {
    boxShadow: '0 0 0 1px rgba(2,88,100,0.08), 0 8px 24px rgba(15,23,42,0.08)'
  },
  label: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' },
  bigNum: { fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 },
  muted: { color: '#94A3B8', fontSize: 12 },
  teal: '#025864',
  green: '#00D47E',
  red: '#EF4444',
  amber: '#F59E0B'
}

/* Chart tooltip */
const CTip = ({ active, payload, label }) => {
  if (!active || !payload?.[0]) return null
  return (
    <div style={{ background: '#0F172A', borderRadius: 10, padding: '10px 16px', border: 'none' }}>
      <div style={{ color: '#94A3B8', fontSize: 11 }}>{label}</div>
      <div style={{ color: 'white', fontWeight: 800, fontSize: 15, marginTop: 2 }}>
        {money(payload[0].value)} ₺
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════ */
export default function Dashboard() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [apts, setApts] = useState([])
  const [pays, setPays] = useState([])
  const [tens, setTens] = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('apartments').select('*, tenants(id, full_name, rent)').order('created_at', { ascending: false }),
      supabase.from('rent_payments').select('*, tenants(full_name), apartments(building, unit_no)').order('due_date', { ascending: false }),
      supabase.from('tenants').select('id, full_name, apartment_id, lease_end').order('created_at', { ascending: false })
    ]).then(([a, p, t]) => {
      setApts(a.data || [])
      setPays(p.data || [])
      setTens(t.data || [])
      setReady(true)
    })
  }, [])

  /* ── Derived data ── */
  const now = new Date()
  const cm = now.getMonth(), cy = now.getFullYear()
  const name = user?.email?.split('@')[0] || 'Kullanici'

  const monthPays = pays.filter(p => { const d = new Date(p.due_date); return d.getMonth() === cm && d.getFullYear() === cy })
  const collected = monthPays.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const pending = monthPays.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const paidN = monthPays.filter(p => p.status === 'paid').length
  const unpaidN = monthPays.filter(p => p.status !== 'paid').length
  const overdue = pays.filter(p => p.status !== 'paid' && dDiff(p.due_date) < 0)
  const overdueSum = overdue.reduce((s, p) => s + Number(p.amount), 0)

  const aptTotal = apts.length
  const aptOcc = apts.filter(a => a.tenants?.[0]).length
  const aptVac = aptTotal - aptOcc
  const occPct = aptTotal > 0 ? Math.round((aptOcc / aptTotal) * 100) : 0
  const tenTotal = tens.length
  const total = collected + pending
  const rate = total > 0 ? Math.round((collected / total) * 100) : 0

  const recent = pays.filter(p => p.status === 'paid' && p.paid_date)
    .sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date)).slice(0, 5)

  const expiring = tens.filter(t => { if (!t.lease_end) return false; const d = dDiff(t.lease_end); return d >= 0 && d <= 30 })
    .sort((a, b) => new Date(a.lease_end) - new Date(b.lease_end))

  /* ── Charts ── */
  const barData = useMemo(() => {
    const d = []
    for (let i = 5; i >= 0; i--) {
      const m = (cm - i + 12) % 12
      const y = cm - i < 0 ? cy - 1 : cy
      const t = pays.filter(p => { const dt = new Date(p.due_date); return dt.getMonth() === m && dt.getFullYear() === y && p.status === 'paid' })
        .reduce((s, p) => s + Number(p.amount), 0)
      d.push({ month: MO[m], val: t })
    }
    return d
  }, [pays, cm, cy])

  const trendData = useMemo(() => {
    const d = []
    for (let i = 11; i >= 0; i--) {
      const m = (cm - i + 12) % 12
      const y = cm - i < 0 ? cy - 1 : cy
      const t = pays.filter(p => { const dt = new Date(p.due_date); return dt.getMonth() === m && dt.getFullYear() === y && p.status === 'paid' })
        .reduce((s, p) => s + Number(p.amount), 0)
      d.push({ m: MO[m], v: t })
    }
    return d
  }, [pays, cm, cy])

  /* ── Loading ── */
  if (!ready) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${S.teal}`, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ═══ 1. HEADER ═══ */}
      <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
            {greet()}, {name}
          </h1>
          <p style={{ ...S.muted, marginTop: 4 }}>
            {now.getDate()} {MO_FULL[cm]} {cy} — Mulk yonetim paneliniz
          </p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => nav('/payments/rent')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
            borderRadius: 14, background: S.teal, color: 'white', border: 'none',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(2,88,100,0.3)'
          }}>
          <Plus style={{ width: 16, height: 16 }} /> Tahsilat Ekle
        </motion.button>
      </motion.div>

      {/* ═══ 2. KPI ROW — 4 metric cards ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { icon: Wallet, label: 'Tahsilat', val: `${money(collected)} ₺`, sub: `%${rate} orani`, accent: S.teal, bg: '#E6F3F5' },
          { icon: ShieldAlert, label: 'Bekleyen', val: `${money(pending)} ₺`, sub: `${unpaidN} odeme`, accent: S.amber, bg: '#FEF9C3' },
          { icon: ShieldAlert, label: 'Geciken', val: overdue.length > 0 ? `${money(overdueSum)} ₺` : '0 ₺', sub: `${overdue.length} odeme`, accent: S.red, bg: '#FEE2E2' },
          { icon: Home, label: 'Doluluk', val: `%${occPct}`, sub: `${aptOcc}/${aptTotal} mulk`, accent: S.green, bg: '#DCFCE7' }
        ].map((k, i) => (
          <motion.div key={i} variants={item} whileHover={{ y: -4, ...S.cardHover }}
            style={{ ...S.card, padding: 24, cursor: 'default', transition: 'box-shadow 0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: k.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <k.icon style={{ width: 18, height: 18, color: k.accent }} />
              </div>
              <span style={S.label}>{k.label}</span>
            </div>
            <div style={{ ...S.bigNum, fontSize: 28 }}>{k.val}</div>
            <div style={{ ...S.muted, marginTop: 6 }}>{k.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* ═══ 3. CHARTS ROW ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Bar chart — Aylık */}
        <motion.div variants={item} style={{ ...S.card, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Aylik Tahsilat</div>
              <div style={{ ...S.muted, marginTop: 2 }}>Son 6 ay</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={36}>
              <XAxis dataKey="month" axisLine={false} tickLine={false}
                tick={{ fontSize: 12, fill: '#94A3B8', fontWeight: 500 }} dy={8} />
              <Tooltip content={<CTip />} cursor={{ fill: 'rgba(2,88,100,0.03)' }} />
              <Bar dataKey="val" radius={[8, 8, 3, 3]}>
                {barData.map((_, i) => (
                  <Cell key={i} fill={i === barData.length - 1 ? '#025864' : '#CBD5E1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Area chart — Trend */}
        <motion.div variants={item} style={{ ...S.card, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Tahsilat Trendi</div>
              <div style={{ ...S.muted, marginTop: 2 }}>12 aylik seyir</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#025864" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#025864" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: '#94A3B8' }} dy={8} interval={1} />
              <Tooltip content={<CTip />} />
              <Area type="monotone" dataKey="v" stroke="#025864" strokeWidth={2.5}
                fill="url(#tealGrad)" dot={false} activeDot={{ r: 5, fill: '#025864', stroke: 'white', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ═══ 4. BOTTOM ROW ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

        {/* Son Hareketler */}
        <motion.div variants={item} style={{ ...S.card, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '20px 24px', borderBottom: '1px solid #F1F5F9'
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Son Hareketler</div>
              <div style={{ ...S.muted, marginTop: 2 }}>Son odeme kayitlari</div>
            </div>
            <motion.button whileHover={{ x: 4 }}
              onClick={() => nav('/payments/rent')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600, color: S.teal, background: 'none',
                border: 'none', cursor: 'pointer'
              }}>
              Tumunu Gor <ArrowRight style={{ width: 14, height: 14 }} />
            </motion.button>
          </div>

          {recent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', ...S.muted }}>Henuz odeme yok.</div>
          ) : recent.map((p, i) => (
            <motion.div key={p.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 24px', borderBottom: '1px solid #F8FAFC'
              }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ArrowUpRight style={{ width: 16, height: 16, color: '#16A34A' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                  {p.tenants?.full_name || '—'}
                </div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>
                  {p.apartments ? `${p.apartments.building} — ${p.apartments.unit_no}` : '—'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                  +{money(p.amount)} ₺
                </div>
                <div style={{ fontSize: 11, color: '#CBD5E1', marginTop: 1 }}>{ago(p.paid_date)}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Sağ panel — Durum */}
        <motion.div variants={item} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Mülk Dağılımı mini */}
          <div style={{ ...S.card, padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 20 }}>Mulk Durumu</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <PieChart width={100} height={100}>
                  <Pie data={[{ v: aptOcc || 0 }, { v: aptVac || 0 }]}
                    cx={50} cy={50} innerRadius={32} outerRadius={44}
                    paddingAngle={4} dataKey="v" strokeWidth={0} startAngle={90} endAngle={-270}>
                    <Cell fill={S.teal} />
                    <Cell fill="#E2E8F0" />
                  </Pie>
                </PieChart>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#0F172A' }}>{aptTotal}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: S.teal }} />
                    <span style={{ fontSize: 13, color: '#64748B' }}>Kirada</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{aptOcc}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: '#E2E8F0' }} />
                    <span style={{ fontSize: 13, color: '#64748B' }}>Bosta</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{aptVac}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hızlı Erişim */}
          <div style={{ ...S.card, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Hizli Erisim</div>
            </div>
            {[
              { label: 'Kiracilar', count: tenTotal, path: '/tenants/list', icon: UserCheck },
              { label: 'Mulkler', count: aptTotal, path: '/properties', icon: Home },
              { label: 'Odemeler', count: pays.length, path: '/payments/rent', icon: Wallet }
            ].map((r, i) => (
              <motion.div key={i} whileHover={{ x: 4, backgroundColor: '#F8FAFC' }}
                onClick={() => nav(r.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 24px', borderBottom: '1px solid #F8FAFC',
                  cursor: 'pointer', transition: 'background 0.15s'
                }}>
                <r.icon style={{ width: 16, height: 16, color: '#CBD5E1' }} />
                <span style={{ fontSize: 14, color: '#64748B', flex: 1 }}>{r.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{r.count}</span>
                <ExternalLink style={{ width: 12, height: 12, color: '#CBD5E1' }} />
              </motion.div>
            ))}

            {/* Sözleşme Uyarıları */}
            {expiring.length > 0 && (
              <div style={{ margin: '12px 16px 16px', borderRadius: 12, overflow: 'hidden', background: '#FEF2F2' }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(239,68,68,0.06)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: S.red }}>
                    Sozlesme Uyarilari
                  </span>
                </div>
                {expiring.map(t => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px'
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#0F172A' }}>{t.full_name}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: S.red,
                      background: 'rgba(239,68,68,0.08)', padding: '2px 8px', borderRadius: 6
                    }}>
                      {dDiff(t.lease_end)} gun
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
