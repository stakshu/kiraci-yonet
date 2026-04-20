/* ── KiraciYonet — Bina Detay + Daireler ── */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { unitLabel } from '../lib/apartmentLabel'
import {
  Building2, Plus, Pencil, Trash2, X, Check,
  ArrowLeft, AlertCircle, UserPlus, Home
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"
const money = n => Number(n).toLocaleString('tr-TR')

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const months = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran','Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

const PROPERTY_TYPES = {
  daire: 'Daire', mustakil: 'Mustakil Ev', villa: 'Villa',
  dukkan: 'Dukkan', ofis: 'Ofis', arsa: 'Arsa', diger: 'Diger'
}

const EMPTY_APT_FORM = {
  building_id: '', unit_no: '', property_type: 'daire',
  room_count: '', floor_no: '',
  m2_gross: '', m2_net: '', furnished: false,
  deposit: '', notes: ''
}

const EMPTY_BLD_FORM = {
  name: '', city: '', district: '', address: '',
  building_age: '', notes: ''
}

const C = {
  teal: '#025864', green: '#00D47E', red: '#EF4444',
  bg: '#F0F2F5', card: '#FFFFFF',
  border: '#E5E7EB', borderLight: '#F1F5F9',
  text: '#0F172A', textMuted: '#64748B', textFaint: '#94A3B8'
}

export default function BuildingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [building, setBuilding] = useState(null)
  const [apartments, setApartments] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    setLoading(true); setError(null)
    const [bldRes, aptRes, payRes] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', id).maybeSingle(),
      supabase.from('apartments')
        .select('*, tenants(id, full_name, email, lease_start, lease_end, rent)')
        .eq('building_id', id)
        .order('floor_no', { ascending: true })
        .order('unit_no', { ascending: true }),
      supabase.from('rent_payments').select('id, tenant_id, due_date, status, amount')
    ])
    if (bldRes.error) { setError(bldRes.error.message); setLoading(false); return }
    if (!bldRes.data) {
      showToast('Bina bulunamadi.', 'error')
      navigate('/properties', { replace: true })
      return
    }
    setBuilding(bldRes.data)
    setApartments(aptRes.data || [])
    setPayments(payRes.data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 28, height: 28, borderRadius: '50%', border: `2.5px solid ${C.teal}`, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (error) {
    return <div style={{ padding: 40, color: C.red }}>Hata: {error}</div>
  }

  return (
    <div style={{ fontFamily: font, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.textMuted }}>
        <motion.button whileHover={{ x: -3 }} onClick={() => navigate('/properties')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer', color: C.teal,
            fontWeight: 600, fontFamily: font, fontSize: 13, padding: 0
          }}>
          <ArrowLeft style={{ width: 14, height: 14 }} /> Mulklerim
        </motion.button>
        <span style={{ color: C.textFaint }}>/</span>
        <span style={{ color: C.text, fontWeight: 600 }}>{building.name}</span>
      </div>

      <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>
        Bina: {building.name} — {apartments.length} daire (UI sonraki adimda)
      </div>
    </div>
  )
}
