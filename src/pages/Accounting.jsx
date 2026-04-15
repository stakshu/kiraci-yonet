/* ── KiraciYonet — Muhasebe — Gelir-Gider & Finansal Raporlama ── */
import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Receipt,
  BarChart3, Building2, ChevronDown, ArrowUpRight, ArrowDownRight
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"
const money = n => Number(n).toLocaleString('tr-TR')
const MO = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

const C = {
  teal: '#025864', green: '#00D47E', darkTeal: '#03363D',
  red: '#DC2626', amber: '#D97706',
  text: '#0F172A', textMuted: '#64748B', textFaint: '#94A3B8',
  border: '#E5E7EB', borderLight: '#F1F5F9', card: '#FFFFFF'
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } }
}
const fadeItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
}

const cardBox = {
  background: C.card, borderRadius: 16,
  boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
  overflow: 'hidden'
}

/* ── Custom Tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0F172A', borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)', border: 'none'
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 6, fontFamily: font }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < payload.length - 1 ? 4 : 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ fontSize: 12, color: '#E2E8F0', fontFamily: font }}>{p.name}:</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', fontFamily: font }}>₺{money(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div style={{
      background: '#0F172A', borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', fontFamily: font }}>{d.name}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', fontFamily: font, marginTop: 2 }}>₺{money(d.value)}</div>
    </div>
  )
}

export default function Accounting() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [yearOpen, setYearOpen] = useState(false)

  useEffect(() => {
    if (user) loadData()
  }, [user])

  const loadData = async () => {
    setLoading(true)
    const [paymentsRes, expensesRes, aptsRes] = await Promise.all([
      supabase.from('rent_payments')
        .select('id, amount, status, due_date, paid_date, type, apartment_id, apartments(building, unit_no)')
        .order('due_date', { ascending: true }),
      supabase.from('property_expenses')
        .select('id, amount, expense_date, apartment_id, category_id, is_tenant_billed, expense_categories(name, color, icon), apartments(building, unit_no)')
        .order('expense_date', { ascending: true }),
      supabase.from('apartments').select('id, building, unit_no')
    ])
    setPayments(paymentsRes.data || [])
    setExpenses(expensesRes.data || [])
    setApartments(aptsRes.data || [])
    setLoading(false)
  }

  /* ── Available years ── */
  const availableYears = useMemo(() => {
    const years = new Set()
    payments.forEach(p => years.add(new Date(p.due_date).getFullYear()))
    expenses.forEach(e => years.add(new Date(e.expense_date).getFullYear()))
    years.add(new Date().getFullYear())
    return [...years].sort((a, b) => b - a)
  }, [payments, expenses])

  /* ── Filtered data for selected year ── */
  const yearPayments = useMemo(() =>
    payments.filter(p => new Date(p.due_date).getFullYear() === selectedYear),
    [payments, selectedYear]
  )
  const yearExpenses = useMemo(() =>
    expenses.filter(e => new Date(e.expense_date).getFullYear() === selectedYear),
    [expenses, selectedYear]
  )

  /* ── KPI calculations ── */
  const totalIncome = useMemo(() =>
    yearPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
    [yearPayments]
  )
  const totalExpense = useMemo(() =>
    yearExpenses.reduce((s, e) => s + Number(e.amount), 0),
    [yearExpenses]
  )
  const netProfit = totalIncome - totalExpense
  const totalExpected = useMemo(() =>
    yearPayments.reduce((s, p) => s + Number(p.amount), 0),
    [yearPayments]
  )
  const collectionRate = totalExpected > 0 ? Math.round((totalIncome / totalExpected) * 100) : 0

  /* ── Monthly chart data ── */
  const monthlyData = useMemo(() => {
    const data = MO.map((m, i) => ({ name: m, Gelir: 0, Gider: 0 }))
    yearPayments.filter(p => p.status === 'paid').forEach(p => {
      const mi = new Date(p.due_date).getMonth()
      data[mi].Gelir += Number(p.amount)
    })
    yearExpenses.forEach(e => {
      const mi = new Date(e.expense_date).getMonth()
      data[mi].Gider += Number(e.amount)
    })
    return data
  }, [yearPayments, yearExpenses])

  /* ── Category breakdown ── */
  const categoryData = useMemo(() => {
    const map = {}
    yearExpenses.forEach(e => {
      const name = e.expense_categories?.name || 'Diğer'
      const color = e.expense_categories?.color || '#94A3B8'
      if (!map[name]) map[name] = { name, value: 0, color }
      map[name].value += Number(e.amount)
    })
    return Object.values(map).sort((a, b) => b.value - a.value)
  }, [yearExpenses])

  const categoryTotal = categoryData.reduce((s, c) => s + c.value, 0)

  /* ── Property profitability ── */
  const propertyData = useMemo(() => {
    const map = {}
    apartments.forEach(a => {
      map[a.id] = {
        id: a.id, name: `${a.building} ${a.unit_no}`,
        rentIncome: 0, aidatIncome: 0, expense: 0
      }
    })
    yearPayments.filter(p => p.status === 'paid').forEach(p => {
      if (!p.apartment_id || !map[p.apartment_id]) return
      if ((p.type || 'rent') === 'aidat') map[p.apartment_id].aidatIncome += Number(p.amount)
      else map[p.apartment_id].rentIncome += Number(p.amount)
    })
    yearExpenses.forEach(e => {
      if (!e.apartment_id || !map[e.apartment_id]) return
      map[e.apartment_id].expense += Number(e.amount)
    })
    return Object.values(map)
      .map(p => ({
        ...p,
        totalIncome: p.rentIncome + p.aidatIncome,
        netProfit: p.rentIncome + p.aidatIncome - p.expense,
        profitRate: (p.rentIncome + p.aidatIncome) > 0
          ? Math.round(((p.rentIncome + p.aidatIncome - p.expense) / (p.rentIncome + p.aidatIncome)) * 100)
          : 0
      }))
      .sort((a, b) => b.netProfit - a.netProfit)
  }, [apartments, yearPayments, yearExpenses])

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, fontFamily: font }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${C.teal}`, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: font }}>

      {/* ═══ HEADER ═══ */}
      <motion.div variants={fadeItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: 0 }}>
            Muhasebe
          </h1>
          <p style={{ fontSize: 13, color: C.textFaint, marginTop: 3 }}>
            Gelir-gider özeti ve finansal raporlama
          </p>
        </div>

        {/* Year selector */}
        <div style={{ position: 'relative' }}>
          <motion.button whileTap={{ scale: 0.96 }}
            onClick={() => setYearOpen(!yearOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 12,
              background: C.card, border: `1.5px solid ${C.border}`,
              fontSize: 14, fontWeight: 700, color: C.text,
              cursor: 'pointer', fontFamily: font,
              boxShadow: '0 2px 8px rgba(15,23,42,0.06)'
            }}>
            <BarChart3 style={{ width: 16, height: 16, color: C.teal }} />
            {selectedYear}
            <ChevronDown style={{ width: 14, height: 14, color: C.textFaint,
              transform: yearOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </motion.button>

          {yearOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6,
              background: C.card, borderRadius: 12, padding: 6,
              border: `1px solid ${C.border}`,
              boxShadow: '0 12px 32px rgba(15,23,42,0.12)',
              zIndex: 50, minWidth: 120
            }}>
              {availableYears.map(y => (
                <div key={y}
                  onClick={() => { setSelectedYear(y); setYearOpen(false) }}
                  style={{
                    padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 13, fontWeight: selectedYear === y ? 700 : 500,
                    color: selectedYear === y ? C.teal : C.text,
                    background: selectedYear === y ? '#F0FDFA' : 'transparent',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => { if (selectedYear !== y) e.currentTarget.style.background = '#F8FAFC' }}
                  onMouseLeave={e => { if (selectedYear !== y) e.currentTarget.style.background = 'transparent' }}
                >
                  {y}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ═══ KPI CARDS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>

        {/* Toplam Gelir */}
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
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.01em' }}>
                  Toplam Gelir
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {selectedYear}
                </div>
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
              {money(totalIncome)} ₺
            </div>
          </div>
        </motion.div>

        {/* Toplam Gider */}
        <motion.div variants={fadeItem}
          whileHover={{ y: -3, boxShadow: '0 0 0 1px rgba(220,38,38,0.15), 0 12px 32px rgba(220,38,38,0.12)' }}
          style={{
            ...cardBox, padding: '20px 22px',
            borderLeft: `3px solid #FECACA`,
            cursor: 'default', transition: 'box-shadow 0.2s',
            position: 'relative', overflow: 'hidden'
          }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Toplam Gider
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#FEF2F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Receipt style={{ width: 18, height: 18, color: C.red }} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {money(totalExpense)} ₺
            </div>
          </div>
        </motion.div>

        {/* Net Kâr */}
        <motion.div variants={fadeItem}
          whileHover={{ y: -3, boxShadow: '0 0 0 1px rgba(2,88,100,0.1), 0 12px 32px rgba(15,23,42,0.1)' }}
          style={{
            ...cardBox, padding: '20px 22px',
            borderLeft: `3px solid ${netProfit >= 0 ? '#BBF7D0' : '#FECACA'}`,
            cursor: 'default', transition: 'box-shadow 0.2s',
            position: 'relative', overflow: 'hidden'
          }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Net Kâr
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: netProfit >= 0 ? '#F0FDF4' : '#FEF2F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {netProfit >= 0
                  ? <TrendingUp style={{ width: 18, height: 18, color: '#059669' }} />
                  : <TrendingDown style={{ width: 18, height: 18, color: C.red }} />}
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: netProfit >= 0 ? '#059669' : C.red, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {netProfit >= 0 ? '' : '-'}{money(Math.abs(netProfit))} ₺
            </div>
          </div>
        </motion.div>

        {/* Tahsilat Oranı */}
        <motion.div variants={fadeItem}
          whileHover={{ y: -3, boxShadow: '0 0 0 1px rgba(217,119,6,0.15), 0 12px 32px rgba(217,119,6,0.12)' }}
          style={{
            ...cardBox, padding: '20px 22px',
            borderLeft: `3px solid #FDE68A`,
            cursor: 'default', transition: 'box-shadow 0.2s',
            position: 'relative', overflow: 'hidden'
          }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Tahsilat Oranı
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: '#FFFBEB',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Wallet style={{ width: 18, height: 18, color: C.amber }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', lineHeight: 1 }}>
                %{collectionRate}
              </div>
              <div style={{ fontSize: 11, color: C.textFaint, fontWeight: 500 }}>
                tahsil edildi
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ CHARTS ROW ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 14 }}>

        {/* Aylık Gelir-Gider */}
        <motion.div variants={fadeItem} style={{ ...cardBox, padding: '22px 22px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Aylık Gelir-Gider</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: C.teal }} />
                <span style={{ fontSize: 11, color: C.textFaint, fontWeight: 500 }}>Gelir</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: '#EF4444' }} />
                <span style={{ fontSize: 11, color: C.textFaint, fontWeight: 500 }}>Gider</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} barGap={3} barCategoryGap="20%">
              <XAxis dataKey="name" axisLine={false} tickLine={false}
                tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: font }} dy={8} />
              <YAxis axisLine={false} tickLine={false} width={60}
                tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: font }}
                tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}K` : v} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(2,88,100,0.04)', radius: 6 }} />
              <Bar dataKey="Gelir" fill={C.teal} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Gider" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gider Dağılımı */}
        <motion.div variants={fadeItem} style={{ ...cardBox, padding: '22px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Gider Dağılımı</div>

          {categoryData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: C.textFaint, fontSize: 13 }}>
              Bu yıl gider kaydı yok
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      dataKey="value" paddingAngle={2} strokeWidth={0}>
                      {categoryData.map((c, i) => (
                        <Cell key={i} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                {categoryData.slice(0, 8).map((cat, i) => {
                  const pct = categoryTotal > 0 ? Math.round((cat.value / categoryTotal) * 100) : 0
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cat.name}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        ₺{money(cat.value)}
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 600, color: C.textFaint,
                        background: '#F1F5F9', borderRadius: 4, padding: '2px 6px', flexShrink: 0
                      }}>
                        %{pct}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* ═══ PROPERTY PROFITABILITY TABLE ═══ */}
      <motion.div variants={fadeItem} style={cardBox}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: `1px solid ${C.borderLight}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 style={{ width: 18, height: 18, color: C.teal }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Mülk Bazlı Kârlılık</span>
          </div>
          <span style={{ fontSize: 11, color: C.textFaint }}>{selectedYear} yılı</span>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 100px',
          padding: '12px 24px', background: '#FAFBFC',
          borderBottom: `1px solid ${C.borderLight}`
        }}>
          {['Mülk', 'Kira Geliri', 'Aidat Geliri', 'Toplam Gider', 'Net Kâr', 'Kârlılık'].map((h, i) => (
            <div key={i} style={{
              fontSize: 10, fontWeight: 700, color: C.textFaint,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              textAlign: i > 0 ? 'right' : 'left'
            }}>{h}</div>
          ))}
        </div>

        {/* Table rows */}
        {propertyData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 24px', color: C.textFaint, fontSize: 13 }}>
            Henüz mülk kaydı yok.
          </div>
        ) : propertyData.map((p, idx) => (
          <motion.div key={p.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.3 }}
            whileHover={{ backgroundColor: '#F8FAFC' }}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 100px',
              padding: '14px 24px', alignItems: 'center',
              borderBottom: `1px solid ${C.borderLight}`,
              transition: 'background 0.15s'
            }}>
            {/* Mülk */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: '#F0FDFA', color: C.teal,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Building2 style={{ width: 15, height: 15 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{p.name}</span>
            </div>

            {/* Kira Geliri */}
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {p.rentIncome > 0 ? `₺${money(p.rentIncome)}` : '—'}
            </div>

            {/* Aidat Geliri */}
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {p.aidatIncome > 0 ? `₺${money(p.aidatIncome)}` : '—'}
            </div>

            {/* Toplam Gider */}
            <div style={{ fontSize: 13, fontWeight: 600, color: p.expense > 0 ? C.red : C.textFaint, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {p.expense > 0 ? `₺${money(p.expense)}` : '—'}
            </div>

            {/* Net Kâr */}
            <div style={{
              fontSize: 13, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
              color: p.netProfit >= 0 ? '#059669' : C.red,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4
            }}>
              {p.totalIncome > 0 && (
                p.netProfit >= 0
                  ? <ArrowUpRight style={{ width: 13, height: 13 }} />
                  : <ArrowDownRight style={{ width: 13, height: 13 }} />
              )}
              {p.totalIncome > 0 ? `₺${money(Math.abs(p.netProfit))}` : '—'}
            </div>

            {/* Kârlılık */}
            <div style={{ textAlign: 'right' }}>
              {p.totalIncome > 0 ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '4px 10px', borderRadius: 6,
                  fontSize: 11, fontWeight: 700,
                  background: p.profitRate >= 50 ? '#F0FDF4' : p.profitRate >= 0 ? '#FFFBEB' : '#FEF2F2',
                  color: p.profitRate >= 50 ? '#059669' : p.profitRate >= 0 ? C.amber : C.red,
                  border: `1px solid ${p.profitRate >= 50 ? '#BBF7D025' : p.profitRate >= 0 ? '#FDE68A25' : '#FECACA25'}`
                }}>
                  %{p.profitRate}
                </span>
              ) : (
                <span style={{ fontSize: 12, color: C.textFaint }}>—</span>
              )}
            </div>
          </motion.div>
        ))}

        {/* Total row */}
        {propertyData.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 100px',
            padding: '14px 24px', alignItems: 'center',
            background: '#F8FAFC', borderTop: `2px solid ${C.border}`
          }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.teal }}>TOPLAM</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              ₺{money(propertyData.reduce((s, p) => s + p.rentIncome, 0))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              ₺{money(propertyData.reduce((s, p) => s + p.aidatIncome, 0))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.red, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              ₺{money(totalExpense)}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: netProfit >= 0 ? '#059669' : C.red, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              ₺{money(Math.abs(netProfit))}
            </div>
            <div style={{ textAlign: 'right' }}>
              {totalIncome > 0 && (
                <span style={{
                  display: 'inline-flex', padding: '4px 10px', borderRadius: 6,
                  fontSize: 11, fontWeight: 700,
                  background: netProfit >= 0 ? '#F0FDF4' : '#FEF2F2',
                  color: netProfit >= 0 ? '#059669' : C.red
                }}>
                  %{totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0}
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
