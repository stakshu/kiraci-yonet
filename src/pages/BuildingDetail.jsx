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

  const [showBldPopup, setShowBldPopup] = useState(false)
  const [bldForm, setBldForm] = useState(EMPTY_BLD_FORM)
  const [savingBld, setSavingBld] = useState(false)

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

  const openBldEdit = () => {
    setBldForm({
      name: building.name || '', city: building.city || '',
      district: building.district || '', address: building.address || '',
      building_age: building.building_age ?? '', notes: building.notes || ''
    })
    setShowBldPopup(true)
  }

  const handleBldSave = async (e) => {
    e.preventDefault(); setSavingBld(true)
    const record = {
      name: bldForm.name.trim(),
      city: bldForm.city.trim(),
      district: bldForm.district.trim(),
      address: bldForm.address.trim(),
      building_age: bldForm.building_age === '' ? null : parseInt(bldForm.building_age),
      notes: bldForm.notes.trim()
    }
    const { error: err } = await supabase.from('buildings').update(record).eq('id', id)
    setSavingBld(false)
    if (err) { showToast('Hata: ' + err.message, 'error'); return }
    showToast('Bina guncellendi.', 'success')
    setShowBldPopup(false)
    loadData()
  }

  const handleBldDelete = async () => {
    const msg = apartments.length > 0
      ? `Bu bina ve icindeki ${apartments.length} daire (+ bagli kiracilar ve odemeler) silinecek. Emin misiniz?`
      : 'Bina silinsin mi?'
    if (!confirm(msg)) return
    const { error: err } = await supabase.from('buildings').delete().eq('id', id)
    if (err) { showToast('Hata: ' + err.message, 'error'); return }
    showToast('Bina silindi.', 'success')
    navigate('/properties', { replace: true })
  }

  const updateBldForm = (f, v) => setBldForm(prev => ({ ...prev, [f]: v }))

  const inputStyle = {
    fontFamily: font, fontSize: 13, padding: '10px 14px',
    borderRadius: 10, border: `1.5px solid ${C.border}`,
    background: '#FAFBFC', color: C.text, outline: 'none',
    width: '100%', boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  }
  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: C.textMuted,
    marginBottom: 6, display: 'block'
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

  const occupied = apartments.filter(a => a.tenants?.[0]).length
  const vacant = apartments.length - occupied
  const monthlyIncome = apartments.reduce((s, a) => s + Number(a.tenants?.[0]?.rent || 0), 0)

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

      {/* Bina header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: 'linear-gradient(135deg, rgba(2,88,100,0.04), rgba(0,212,126,0.04))',
          border: '1px solid rgba(2,88,100,0.15)',
          borderRadius: 16, padding: '20px 24px',
          display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap'
        }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: C.teal, color: 'white', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Building2 style={{ width: 24, height: 24 }} />
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>
            {building.name}
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
            {[
              building.address,
              [building.district, building.city].filter(Boolean).join(', '),
              building.building_age ? `${building.building_age} yasinda` : null
            ].filter(Boolean).join(' • ') || 'Adres bilgisi girilmemis'}
          </div>
          {building.notes && (
            <div style={{ fontSize: 12, color: C.textFaint, marginTop: 8, fontStyle: 'italic' }}>
              "{building.notes}"
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={openBldEdit}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: 'white', color: C.teal, border: `1.5px solid ${C.teal}`,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
            }}>
            <Pencil style={{ width: 13, height: 13 }} /> Duzenle
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleBldDelete}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10,
              background: '#FEF2F2', color: C.red, border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
            }}>
            <Trash2 style={{ width: 13, height: 13 }} /> Sil
          </motion.button>
        </div>
      </motion.div>

      {/* Mini stat strip */}
      <div style={{
        display: 'flex', gap: 24, padding: '14px 20px',
        background: 'white', borderRadius: 12,
        boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 2px 8px rgba(15,23,42,0.04)',
        flexWrap: 'wrap'
      }}>
        {[
          { label: 'Daire', value: apartments.length, color: C.teal },
          { label: 'Kirada', value: occupied, color: '#059669' },
          { label: 'Bosta', value: vacant, color: '#DC2626' },
          { label: 'Aylik', value: `${money(monthlyIncome)} ₺`, color: C.teal }
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {s.label}
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: s.color, letterSpacing: '-0.02em' }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* ═══ BUILDING POPUP ═══ */}
      <AnimatePresence>
        {showBldPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowBldPopup(false) }}
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
            }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: 'white', borderRadius: 20,
                boxShadow: '0 25px 60px rgba(15,23,42,0.2)',
                width: '100%', maxWidth: 560,
                maxHeight: '85vh', overflowY: 'auto'
              }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 28px', borderBottom: `1px solid ${C.borderLight}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: C.teal, color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Building2 style={{ width: 18, height: 18 }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, fontFamily: font }}>
                    Binayi Duzenle
                  </h3>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setShowBldPopup(false)}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#F1F5F9', border: 'none', cursor: 'pointer', color: C.textMuted
                  }}>
                  <X style={{ width: 18, height: 18 }} />
                </motion.button>
              </div>

              <form onSubmit={handleBldSave}>
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Bina Adi *</label>
                    <input style={inputStyle} type="text" required
                      placeholder="Cömertkent Sitesi H1 Blok"
                      value={bldForm.name} onChange={e => updateBldForm('name', e.target.value)}
                      onFocus={e => e.target.style.borderColor = C.teal}
                      onBlur={e => e.target.style.borderColor = C.border} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Sehir</label>
                      <input style={inputStyle} type="text" placeholder="Istanbul"
                        value={bldForm.city} onChange={e => updateBldForm('city', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Ilce</label>
                      <input style={inputStyle} type="text" placeholder="Kadikoy"
                        value={bldForm.district} onChange={e => updateBldForm('district', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Adres</label>
                    <input style={inputStyle} type="text" placeholder="Mahalle, Sokak, No"
                      value={bldForm.address} onChange={e => updateBldForm('address', e.target.value)}
                      onFocus={e => e.target.style.borderColor = C.teal}
                      onBlur={e => e.target.style.borderColor = C.border} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Bina Yasi</label>
                      <input style={inputStyle} type="number" min="0" placeholder="5"
                        value={bldForm.building_age} onChange={e => updateBldForm('building_age', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                    <div>
                      <label style={labelStyle}>Notlar</label>
                      <input style={inputStyle} type="text" placeholder="Opsiyonel"
                        value={bldForm.notes} onChange={e => updateBldForm('notes', e.target.value)}
                        onFocus={e => e.target.style.borderColor = C.teal}
                        onBlur={e => e.target.style.borderColor = C.border} />
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 28px', borderTop: `1px solid ${C.borderLight}`
                }}>
                  <div></div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      type="button" onClick={() => setShowBldPopup(false)}
                      style={{
                        padding: '10px 20px', borderRadius: 10,
                        background: '#F1F5F9', color: C.textMuted, border: 'none',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
                      }}>
                      Iptal
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      type="submit" disabled={savingBld}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '10px 22px', borderRadius: 10,
                        background: C.teal, color: 'white', border: 'none',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                        opacity: savingBld ? 0.7 : 1,
                        boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
                      }}>
                      <Check style={{ width: 15, height: 15 }} />
                      {savingBld ? 'Kaydediliyor...' : 'Kaydet'}
                    </motion.button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
