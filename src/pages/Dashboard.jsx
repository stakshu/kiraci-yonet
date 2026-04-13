/* ── KiraciYonet — Dashboard — Stripe-style Clean & Minimal ── */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import {
  Clock, AlertTriangle, Building2, Users,
  TrendingUp, ArrowUpRight, ArrowRight, Plus,
  CheckCircle2
} from 'lucide-react'

const MONTHS = ['Oca','Sub','Mar','Nis','May','Haz','Tem','Agu','Eyl','Eki','Kas','Ara']
const MONTHS_FULL = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']

function timeAgo(dateStr) {
  const diffMs = new Date() - new Date(dateStr)
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Az once'
  if (diffMin < 60) return diffMin + ' dk once'
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return diffH + ' saat once'
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'Dun'
  return diffD + ' gun once'
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Iyi geceler'
  if (h < 12) return 'Gunaydin'
  if (h < 18) return 'Iyi gunler'
  return 'Iyi aksamlar'
}

function daysDiff(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.ceil((target - today) / (1000*60*60*24))
}

/* ── Animation variants ── */
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
}
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
}

/* ── Custom Tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'white', border: '1px solid #E5E7EB', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 13
    }}>
      <p style={{ color: '#6B7280', marginBottom: 4, fontWeight: 500 }}>{label}</p>
      <p style={{ color: '#025864', fontWeight: 700 }}>
        {Number(payload[0].value).toLocaleString('tr-TR')} ₺
      </p>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [apartments, setApartments] = useState([])
  const [payments, setPayments] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const [aptRes, payRes, tenRes] = await Promise.all([
      supabase.from('apartments').select('*, tenants(id, full_name, rent)').order('created_at', { ascending: false }),
      supabase.from('rent_payments').select('*, tenants(full_name), apartments(building, unit_no)').order('due_date', { ascending: false }),
      supabase.from('tenants').select('id, full_name, apartment_id, lease_end').order('created_at', { ascending: false })
    ])
    setApartments(aptRes.data || [])
    setPayments(payRes.data || [])
    setTenants(tenRes.data || [])
    setLoading(false)
  }

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const userName = user?.email?.split('@')[0] || 'Kullanici'

  const thisMonthPayments = payments.filter(p => {
    const d = new Date(p.due_date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  const collectedThisMonth = thisMonthPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const pendingThisMonth = thisMonthPayments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const paidCount = thisMonthPayments.filter(p => p.status === 'paid').length
  const unpaidCount = thisMonthPayments.filter(p => p.status !== 'paid').length
  const overdueAll = payments.filter(p => p.status !== 'paid' && daysDiff(p.due_date) < 0)
  const overdueTotal = overdueAll.reduce((s, p) => s + Number(p.amount), 0)

  const totalApartments = apartments.length
  const occupiedApartments = apartments.filter(a => a.tenants?.[0]).length
  const vacantApartments = totalApartments - occupiedApartments
  const totalTenants = tenants.length

  const totalExpected = collectedThisMonth + pendingThisMonth
  const collectionRate = totalExpected > 0 ? ((collectedThisMonth / totalExpected) * 100).toFixed(0) : 0

  const recentPaid = payments
    .filter(p => p.status === 'paid' && p.paid_date)
    .sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date))
    .slice(0, 5)

  const expiringTenants = tenants
    .filter(t => {
      if (!t.lease_end) return false
      const d = daysDiff(t.lease_end)
      return d >= 0 && d <= 30
    })
    .sort((a, b) => new Date(a.lease_end) - new Date(b.lease_end))

  const occupiedPct = totalApartments > 0 ? Math.round((occupiedApartments / totalApartments) * 100) : 0

  /* ── Chart data ── */
  const monthlyChartData = useMemo(() => {
    const data = []
    for (let i = 5; i >= 0; i--) {
      const m = (currentMonth - i + 12) % 12
      const y = currentMonth - i < 0 ? currentYear - 1 : currentYear
      const monthPayments = payments.filter(p => {
        const d = new Date(p.due_date)
        return d.getMonth() === m && d.getFullYear() === y && p.status === 'paid'
      })
      const total = monthPayments.reduce((s, p) => s + Number(p.amount), 0)
      data.push({ name: MONTHS[m], value: total })
    }
    return data
  }, [payments, currentMonth, currentYear])

  const donutData = useMemo(() => [
    { name: 'Dolu', value: occupiedApartments || 0 },
    { name: 'Bos', value: vacantApartments || 0 }
  ], [occupiedApartments, vacantApartments])

  const DONUT_COLORS = ['#025864', '#E5E7EB']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-full"
          style={{ border: '2px solid #025864', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-5"
    >
      {/* ═══ Greeting ═══ */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
          {getGreeting()}, <span className="font-semibold" style={{ color: '#111827' }}>{userName}</span>
        </p>
        <span className="text-sm" style={{ color: '#9CA3AF' }}>
          {now.getDate()} {MONTHS_FULL[currentMonth]} {currentYear}
        </span>
      </motion.div>

      {/* ═══ Hero Bar — Compact ═══ */}
      <motion.div
        variants={fadeUp}
        className="flex items-center justify-between rounded-2xl px-7 py-5"
        style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div className="flex items-center gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>
              Bu Ay Tahsilat
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight" style={{ color: '#111827' }}>
                {collectedThisMonth.toLocaleString('tr-TR')}
              </span>
              <span className="text-lg font-semibold" style={{ color: '#9CA3AF' }}>₺</span>
            </div>
          </div>
          <div className="w-px h-10" style={{ background: '#E5E7EB' }} />
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg" style={{ background: '#F0FDF9' }}>
            <TrendingUp className="w-4 h-4" style={{ color: '#059669' }} />
            <span className="text-sm font-bold" style={{ color: '#059669' }}>%{collectionRate}</span>
            <span className="text-xs" style={{ color: '#6B7280' }}>tahsilat</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/payments/rent')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer hover:opacity-90"
          style={{ background: '#025864', color: 'white' }}
        >
          <Plus className="w-4 h-4" /> Tahsilat Ekle
        </button>
      </motion.div>

      {/* ═══ Stat Cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Clock,
            iconBg: '#FEF3C7',
            iconColor: '#D97706',
            label: 'Bekleyen',
            value: `${pendingThisMonth.toLocaleString('tr-TR')} ₺`,
            sub: `${unpaidCount} odeme bekliyor`,
            onClick: () => navigate('/payments/rent')
          },
          {
            icon: AlertTriangle,
            iconBg: '#FEE2E2',
            iconColor: '#DC2626',
            label: 'Geciken',
            value: `${overdueTotal.toLocaleString('tr-TR')} ₺`,
            sub: `${overdueAll.length} odeme gecikti`,
            onClick: () => navigate('/payments/rent')
          },
          {
            icon: Building2,
            iconBg: '#E6F3F5',
            iconColor: '#025864',
            label: 'Doluluk',
            value: `%${occupiedPct}`,
            sub: `${occupiedApartments} dolu, ${vacantApartments} bos`,
            onClick: () => navigate('/properties')
          }
        ].map((stat, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="rounded-xl p-5 cursor-pointer"
            style={{
              background: 'white',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
            onClick={stat.onClick}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: stat.iconBg }}>
                <stat.icon className="w-[18px] h-[18px]" style={{ color: stat.iconColor }} />
              </div>
              <span className="text-sm font-medium" style={{ color: '#6B7280' }}>{stat.label}</span>
            </div>
            <div className="text-2xl font-extrabold tracking-tight" style={{ color: '#111827' }}>
              {stat.value}
            </div>
            <p className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ═══ Charts Row ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Aylık Tahsilat Bar Chart */}
        <motion.div
          variants={fadeUp}
          className="lg:col-span-3 rounded-xl p-6"
          style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Aylik Tahsilat</h3>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Son 6 ay</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyChartData} barSize={32}>
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                tickFormatter={v => v > 0 ? `${(v / 1000).toFixed(0)}k` : '0'}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F3F4F6', radius: 6 }} />
              <Bar dataKey="value" fill="#025864" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Doluluk Donut */}
        <motion.div
          variants={fadeUp}
          className="lg:col-span-2 rounded-xl p-6"
          style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#111827' }}>Mulk Dagilimi</h3>
          <div className="flex items-center justify-center">
            <div className="relative">
              <PieChart width={160} height={160}>
                <Pie
                  data={donutData}
                  cx={80}
                  cy={80}
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {donutData.map((_, idx) => (
                    <Cell key={idx} fill={DONUT_COLORS[idx]} />
                  ))}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black" style={{ color: '#111827' }}>{totalApartments}</span>
                <span className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>Toplam</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#025864' }} />
                <span className="text-sm" style={{ color: '#6B7280' }}>Kirada</span>
              </div>
              <span className="text-sm font-bold" style={{ color: '#111827' }}>{occupiedApartments}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#E5E7EB' }} />
                <span className="text-sm" style={{ color: '#6B7280' }}>Bosta</span>
              </div>
              <span className="text-sm font-bold" style={{ color: '#111827' }}>{vacantApartments}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ Bottom Row ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Son Hareketler */}
        <motion.div
          variants={fadeUp}
          className="lg:col-span-3 rounded-xl overflow-hidden"
          style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Son Hareketler</h3>
            <button
              className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
              style={{ color: '#025864' }}
              onClick={() => navigate('/payments/rent')}
            >
              Tumunu Gor <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            {recentPaid.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: '#9CA3AF' }}>
                Henuz odeme hareketi yok.
              </div>
            ) : recentPaid.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="flex items-center gap-4 px-6 py-3.5"
                style={{ borderBottom: '1px solid #F9FAFB' }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: '#F0FDF9' }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: '#059669' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate" style={{ color: '#111827' }}>
                      {p.tenants?.full_name || '—'}
                    </span>
                    <span className="text-sm font-bold ml-3 tabular-nums" style={{ color: '#111827' }}>
                      {Number(p.amount).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs truncate" style={{ color: '#9CA3AF' }}>
                      {p.apartments ? `${p.apartments.building} — No: ${p.apartments.unit_no}` : '—'}
                    </span>
                    <span className="text-[11px] ml-3" style={{ color: '#D1D5DB' }}>
                      {timeAgo(p.paid_date)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Hızlı Bakış */}
        <motion.div
          variants={fadeUp}
          className="lg:col-span-2 rounded-xl overflow-hidden"
          style={{ background: 'white', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Hizli Bakis</h3>
          </div>
          <div>
            <div
              className="flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-colors hover:bg-gray-50"
              style={{ borderBottom: '1px solid #F9FAFB' }}
              onClick={() => navigate('/tenants/list')}
            >
              <Users className="w-4 h-4" style={{ color: '#9CA3AF' }} />
              <span className="text-sm flex-1" style={{ color: '#6B7280' }}>Toplam Kiraci</span>
              <span className="text-sm font-bold" style={{ color: '#111827' }}>{totalTenants}</span>
            </div>
            <div
              className="flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-colors hover:bg-gray-50"
              style={{ borderBottom: '1px solid #F9FAFB' }}
              onClick={() => navigate('/properties')}
            >
              <Building2 className="w-4 h-4" style={{ color: '#9CA3AF' }} />
              <span className="text-sm flex-1" style={{ color: '#6B7280' }}>Toplam Mulk</span>
              <span className="text-sm font-bold" style={{ color: '#111827' }}>{totalApartments}</span>
            </div>
            <div
              className="flex items-center gap-3 px-6 py-3.5"
              style={{ borderBottom: expiringTenants.length > 0 ? '1px solid #F9FAFB' : 'none' }}
            >
              <Clock className="w-4 h-4" style={{ color: '#9CA3AF' }} />
              <span className="text-sm flex-1" style={{ color: '#6B7280' }}>Sozlesmesi Biten</span>
              <span className="text-sm font-bold" style={{ color: expiringTenants.length > 0 ? '#DC2626' : '#111827' }}>
                {expiringTenants.length}
              </span>
            </div>
            {expiringTenants.map(t => (
              <div key={t.id} className="flex items-center justify-between px-6 py-2.5"
                style={{ background: '#FEF2F2' }}>
                <span className="text-xs font-medium" style={{ color: '#111827' }}>{t.full_name}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded"
                  style={{ color: '#DC2626', background: 'rgba(239,68,68,0.1)' }}>
                  {daysDiff(t.lease_end)} gun
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
