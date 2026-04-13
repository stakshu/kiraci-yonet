/* ── KiraciYonet — Dashboard — Tailwind + shadcn/ui + Motion ── */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Clock, AlertTriangle, Building2, Users, CreditCard,
  TrendingUp, ArrowUpRight, ArrowRight, Plus, CircleDot
} from 'lucide-react'

const MONTHS = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']

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

/* ── Stagger animation variants ── */
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
}
const slideUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } }
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
    .slice(0, 6)

  const expiringTenants = tenants
    .filter(t => {
      if (!t.lease_end) return false
      const d = daysDiff(t.lease_end)
      return d >= 0 && d <= 30
    })
    .sort((a, b) => new Date(a.lease_end) - new Date(b.lease_end))

  const occupiedPct = totalApartments > 0 ? Math.round((occupiedApartments / totalApartments) * 100) : 0
  const vacantPct = 100 - occupiedPct

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="dashboard"
    >
      {/* ═══ Header ═══ */}
      <motion.div variants={item} className="dash-header">
        <div>
          <h2 className="dash-title" style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            {getGreeting()}, <span className="text-teal-700">{userName}</span>
          </h2>
          <p className="dash-greeting" style={{ marginTop: 4 }}>
            Mulk yonetim panelinize hos geldiniz.
          </p>
        </div>
        <div className="dash-header-date">
          {now.getDate()} {MONTHS[currentMonth]} {currentYear}
        </div>
      </motion.div>

      {/* ═══ Hero Card ═══ */}
      <motion.div variants={slideUp} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-800 via-teal-700 to-teal-600 p-8 text-white shadow-2xl shadow-teal-900/30"
        whileHover={{ scale: 1.005 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-teal-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-white/60 uppercase tracking-widest mb-2">Bu Ay Toplam Tahsilat</p>
            <div className="flex items-baseline gap-4">
              <span className="text-5xl font-black tracking-tighter leading-none">
                {collectedThisMonth.toLocaleString('tr-TR')}
              </span>
              <span className="text-2xl font-bold text-white/70">{'\u20BA'}</span>
              <Badge className="bg-emerald-400/20 text-emerald-300 border-emerald-400/30 text-sm px-3 py-1">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                {collectionRate}%
              </Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="accent"
              size="default"
              className="rounded-xl shadow-lg shadow-emerald-900/30"
              onClick={() => navigate('/payments/rent')}
            >
              <Plus className="w-4 h-4" />
              Tahsilat
            </Button>
            <Button
              variant="outline"
              size="default"
              className="rounded-xl border-white/20 text-white hover:bg-white/10"
              onClick={() => navigate('/tenants/list')}
            >
              <Users className="w-4 h-4" />
              Kiracilar
            </Button>
            <Button
              variant="outline"
              size="default"
              className="rounded-xl border-white/20 text-white hover:bg-white/10"
              onClick={() => navigate('/properties')}
            >
              <Building2 className="w-4 h-4" />
              Mulkler
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ═══ Stat Cards — 3 columns ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
        {[
          {
            icon: Clock,
            iconBg: 'bg-teal-50',
            iconColor: 'text-teal-700',
            label: 'Bekleyen Odeme',
            period: 'Bu Ay',
            value: `${pendingThisMonth.toLocaleString('tr-TR')} \u20BA`,
            badge: unpaidCount > 0 ? { text: `${unpaidCount} bekliyor`, variant: 'warning' } : null,
            sub: `${paidCount + unpaidCount} odemeden`,
            onClick: () => navigate('/payments/rent')
          },
          {
            icon: AlertTriangle,
            iconBg: 'bg-red-50',
            iconColor: 'text-red-500',
            label: 'Geciken Odeme',
            period: 'Toplam',
            value: `${overdueTotal.toLocaleString('tr-TR')} \u20BA`,
            badge: overdueAll.length > 0 ? { text: `${overdueAll.length} gecikme`, variant: 'danger' } : null,
            sub: 'Vadesi gecen odemeler',
            onClick: () => navigate('/payments/rent')
          },
          {
            icon: Building2,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            label: 'Doluluk Orani',
            period: `${totalApartments} mulk`,
            value: `%${occupiedPct}`,
            badge: { text: 'Doluluk', variant: 'success' },
            sub: `${occupiedApartments} dolu — ${vacantApartments} bos`,
            onClick: () => navigate('/properties')
          }
        ].map((stat, i) => (
          <motion.div
            key={i}
            variants={item}
            whileHover={{ y: -4, boxShadow: '0 12px 32px rgba(2,88,100,0.12)' }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="bg-white rounded-xl border border-gray-100 p-5 cursor-pointer hover:border-teal-200 transition-colors"
            onClick={stat.onClick}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md">
                {stat.period}
              </span>
            </div>
            <div className="text-2xl font-extrabold text-gray-900 tracking-tight leading-none mb-1">
              {stat.value}
            </div>
            <div className="text-[13px] font-medium text-gray-500 mb-3">{stat.label}</div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {stat.badge && <Badge variant={stat.badge.variant}>{stat.badge.text}</Badge>}
              <span>{stat.sub}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ Main Grid — Activity + Side Column ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mt-6">

        {/* ── Son Hareketler ── */}
        <motion.div variants={slideUp} className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">Son Hareketler</h3>
              <button
                className="text-xs font-semibold text-teal-700 hover:text-teal-600 flex items-center gap-1 transition-colors"
                onClick={() => navigate('/payments/rent')}
              >
                Tumunu Gor
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {recentPaid.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Henuz odeme hareketi yok.
                </div>
              ) : recentPaid.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900 truncate">
                        {p.tenants?.full_name || '\u2014'}
                      </span>
                      <span className="text-sm font-bold text-gray-900 tabular-nums ml-3">
                        {Number(p.amount).toLocaleString('tr-TR')} {'\u20BA'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-gray-400 truncate">
                        {p.apartments ? `${p.apartments.building} — No: ${p.apartments.unit_no}` : '\u2014'}
                      </span>
                      <span className="text-[11px] text-gray-400 ml-3">{timeAgo(p.paid_date)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Sag Kolon ── */}
        <motion.div variants={slideUp} className="lg:col-span-2 flex flex-col gap-5">

          {/* Mulk Dagilimi */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="text-[15px] font-bold text-gray-900 tracking-tight mb-5">Mulk Dagilimi</h3>
            <div className="flex items-center gap-6">
              {/* Donut */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-24 h-24 rounded-full"
                  style={{
                    background: totalApartments > 0
                      ? `conic-gradient(#025864 0deg ${occupiedPct * 3.6}deg, #e5e7eb ${occupiedPct * 3.6}deg 360deg)`
                      : '#e5e7eb'
                  }}
                >
                  <div className="absolute inset-2 rounded-full bg-white flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-gray-900">{totalApartments}</span>
                    <span className="text-[10px] text-gray-400 font-medium">Toplam</span>
                  </div>
                </div>
              </div>
              {/* Legend */}
              <div className="flex flex-col gap-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-teal-700" />
                    <span className="text-sm text-gray-600">Kirada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{occupiedApartments}</span>
                    <span className="text-xs text-gray-400">{occupiedPct}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                    <span className="text-sm text-gray-600">Bosta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{vacantApartments}</span>
                    <span className="text-xs text-gray-400">{vacantPct}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hizli Bakis */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">Hizli Bakis</h3>
            </div>
            <div className="divide-y divide-gray-50">
              <div
                className="flex items-center gap-3 px-6 py-3.5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => navigate('/tenants/list')}
              >
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 flex-1">Toplam Kiraci</span>
                <span className="text-sm font-bold text-gray-900">{totalTenants}</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3.5">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 flex-1">Sozlesmesi Biten</span>
                <span className={`text-sm font-bold ${expiringTenants.length > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                  {expiringTenants.length}
                </span>
              </div>
              {expiringTenants.map(t => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between px-6 py-2.5 bg-red-50/50"
                >
                  <span className="text-xs font-medium text-gray-700">{t.full_name}</span>
                  <Badge variant="danger">{daysDiff(t.lease_end)} gun</Badge>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
