/* ── KiraciYonet — Dashboard — Tailwind + Motion ── */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Clock, AlertTriangle, Building2, Users,
  TrendingUp, ArrowUpRight, ArrowRight, Plus
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

/* ── Animation variants ── */
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } }
}
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
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
      {/* ═══ Header ═══ */}
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text)' }}>
            {getGreeting()}, <span style={{ color: '#025864' }}>{userName}</span>
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Mulk yonetim panelinize hos geldiniz.
          </p>
        </div>
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          {now.getDate()} {MONTHS[currentMonth]} {currentYear}
        </span>
      </motion.div>

      {/* ═══ Hero Card ═══ */}
      <motion.div
        variants={fadeUp}
        whileHover={{ scale: 1.003 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="relative overflow-hidden rounded-2xl p-7 text-white"
        style={{
          background: 'linear-gradient(135deg, #03363D 0%, #025864 40%, #037A8E 100%)',
          boxShadow: '0 20px 60px -15px rgba(2,88,100,0.4)'
        }}
      >
        {/* Decorative orbs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #00D47E 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #00D47E 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Bu Ay Toplam Tahsilat
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black tracking-tighter leading-none">
                {collectedThisMonth.toLocaleString('tr-TR')}
              </span>
              <span className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{'\u20BA'}</span>
              <span className="inline-flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-lg"
                style={{ background: 'rgba(0,212,126,0.15)', color: '#00D47E' }}>
                <TrendingUp className="w-3.5 h-3.5" />
                {collectionRate}%
              </span>
            </div>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <button
              onClick={() => navigate('/payments/rent')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              style={{ background: '#00D47E', color: '#03363D', boxShadow: '0 4px 14px rgba(0,212,126,0.3)' }}
            >
              <Plus className="w-4 h-4" /> Tahsilat
            </button>
            <button
              onClick={() => navigate('/tenants/list')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <Users className="w-4 h-4" /> Kiracilar
            </button>
            <button
              onClick={() => navigate('/properties')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <Building2 className="w-4 h-4" /> Mulkler
            </button>
          </div>
        </div>
      </motion.div>

      {/* ═══ Stat Cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Clock,
            iconBg: '#E6F3F5',
            iconColor: '#025864',
            label: 'Bekleyen Odeme',
            period: 'Bu Ay',
            value: `${pendingThisMonth.toLocaleString('tr-TR')} \u20BA`,
            badge: unpaidCount > 0 ? { text: `${unpaidCount} bekliyor`, color: '#D97706', bg: '#FFFBEB' } : null,
            sub: `${paidCount + unpaidCount} odemeden`,
            onClick: () => navigate('/payments/rent')
          },
          {
            icon: AlertTriangle,
            iconBg: '#FEF2F2',
            iconColor: '#EF4444',
            label: 'Geciken Odeme',
            period: 'Toplam',
            value: `${overdueTotal.toLocaleString('tr-TR')} \u20BA`,
            badge: overdueAll.length > 0 ? { text: `${overdueAll.length} gecikme`, color: '#DC2626', bg: '#FEF2F2' } : null,
            sub: 'Vadesi gecen odemeler',
            onClick: () => navigate('/payments/rent')
          },
          {
            icon: Building2,
            iconBg: '#EDFCF4',
            iconColor: '#059669',
            label: 'Doluluk Orani',
            period: `${totalApartments} mulk`,
            value: `%${occupiedPct}`,
            badge: { text: 'Doluluk', color: '#059669', bg: '#EDFCF4' },
            sub: `${occupiedApartments} dolu — ${vacantApartments} bos`,
            onClick: () => navigate('/properties')
          }
        ].map((stat, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="rounded-xl p-5 cursor-pointer transition-all"
            style={{
              background: 'white',
              border: '1px solid var(--border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
            onClick={stat.onClick}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: stat.iconBg }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.iconColor }} />
              </div>
              <span className="text-[11px] font-medium px-2.5 py-1 rounded-md"
                style={{ color: 'var(--text-muted)', background: 'var(--bg)' }}>
                {stat.period}
              </span>
            </div>
            <div className="text-[26px] font-extrabold tracking-tight leading-none mb-1"
              style={{ color: 'var(--text)' }}>
              {stat.value}
            </div>
            <div className="text-[13px] font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              {stat.label}
            </div>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              {stat.badge && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded"
                  style={{ color: stat.badge.color, background: stat.badge.bg }}>
                  {stat.badge.text}
                </span>
              )}
              <span>{stat.sub}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── Son Hareketler ── */}
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <div className="rounded-xl overflow-hidden"
            style={{ background: 'white', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                Son Hareketler
              </h3>
              <button
                className="text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                style={{ color: '#025864' }}
                onClick={() => navigate('/payments/rent')}
              >
                Tumunu Gor
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              {recentPaid.length === 0 ? (
                <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Henuz odeme hareketi yok.
                </div>
              ) : recentPaid.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="flex items-center gap-4 px-6 py-3.5 transition-colors"
                  style={{ borderBottom: '1px solid #f8f9fa' }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#EDFCF4' }}>
                    <ArrowUpRight className="w-4 h-4" style={{ color: '#059669' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {p.tenants?.full_name || '\u2014'}
                      </span>
                      <span className="text-sm font-bold ml-3" style={{ color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                        {Number(p.amount).toLocaleString('tr-TR')} {'\u20BA'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {p.apartments ? `${p.apartments.building} — No: ${p.apartments.unit_no}` : '\u2014'}
                      </span>
                      <span className="text-[11px] ml-3" style={{ color: 'var(--text-muted)' }}>
                        {timeAgo(p.paid_date)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Sag Kolon ── */}
        <motion.div variants={fadeUp} className="lg:col-span-2 flex flex-col gap-5">

          {/* Mulk Dagilimi */}
          <div className="rounded-xl p-6" style={{ background: 'white', border: '1px solid var(--border)' }}>
            <h3 className="text-[15px] font-bold tracking-tight mb-5" style={{ color: 'var(--text)' }}>
              Mulk Dagilimi
            </h3>
            <div className="flex items-center gap-6">
              <div className="relative flex-shrink-0 w-24 h-24">
                <div className="w-full h-full rounded-full"
                  style={{
                    background: totalApartments > 0
                      ? `conic-gradient(#025864 0deg ${occupiedPct * 3.6}deg, #e5e7eb ${occupiedPct * 3.6}deg 360deg)`
                      : '#e5e7eb'
                  }}
                />
                <div className="absolute inset-2 rounded-full flex flex-col items-center justify-center"
                  style={{ background: 'white' }}>
                  <span className="text-xl font-black" style={{ color: 'var(--text)' }}>{totalApartments}</span>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Toplam</span>
                </div>
              </div>
              <div className="flex flex-col gap-3 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#025864' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Kirada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{occupiedApartments}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{occupiedPct}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#e5e7eb' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Bosta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{vacantApartments}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{vacantPct}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hizli Bakis */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'white', border: '1px solid var(--border)' }}>
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                Hizli Bakis
              </h3>
            </div>
            <div>
              <div
                className="flex items-center gap-3 px-6 py-3.5 cursor-pointer transition-colors"
                style={{ borderBottom: '1px solid #f8f9fa' }}
                onClick={() => navigate('/tenants/list')}
              >
                <Users className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>Toplam Kiraci</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{totalTenants}</span>
              </div>
              <div className="flex items-center gap-3 px-6 py-3.5"
                style={{ borderBottom: expiringTenants.length > 0 ? '1px solid #f8f9fa' : 'none' }}>
                <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <span className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>Sozlesmesi Biten</span>
                <span className="text-sm font-bold" style={{ color: expiringTenants.length > 0 ? '#EF4444' : 'var(--text)' }}>
                  {expiringTenants.length}
                </span>
              </div>
              {expiringTenants.map(t => (
                <div key={t.id} className="flex items-center justify-between px-6 py-2.5"
                  style={{ background: '#FEF2F2' }}>
                  <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{t.full_name}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded"
                    style={{ color: '#DC2626', background: 'rgba(239,68,68,0.1)' }}>
                    {daysDiff(t.lease_end)} gun
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
