/* ── KiraciYonet — Mulklerim (Binalar listesi) ── */
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import {
  Building2, Plus, Search, X, Check, ChevronRight, AlertCircle, Home
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"
const money = n => Number(n).toLocaleString('tr-TR')

const EMPTY_BLD_FORM = {
  name: '', city: '', district: '', address: '',
  building_age: '', notes: ''
}

const EMPTY_APT_FORM = {
  building_id: '', unit_no: '', property_type: 'daire',
  room_count: '', floor_no: '',
  m2_gross: '', m2_net: '', furnished: false,
  deposit: '', notes: ''
}

const PROPERTY_TYPES = {
  daire: 'Daire', mustakil: 'Mustakil Ev', villa: 'Villa',
  dukkan: 'Dukkan', ofis: 'Ofis', arsa: 'Arsa', diger: 'Diger'
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } }
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
}

const C = {
  teal: '#025864', green: '#00D47E', red: '#EF4444',
  bg: '#F0F2F5', card: '#FFFFFF',
  border: '#E5E7EB', borderLight: '#F1F5F9',
  text: '#0F172A', textMuted: '#64748B', textFaint: '#94A3B8'
}

export default function Properties() {
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [buildings, setBuildings] = useState([])
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  /* Building popup */
  const [showBldPopup, setShowBldPopup] = useState(false)
  const [bldForm, setBldForm] = useState(EMPTY_BLD_FORM)
  const [savingBld, setSavingBld] = useState(false)

  /* Apartment popup */
  const [showAptPopup, setShowAptPopup] = useState(false)
  const [aptForm, setAptForm] = useState(EMPTY_APT_FORM)
  const [savingApt, setSavingApt] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true); setError(null)
    const [bldRes, aptRes] = await Promise.all([
      supabase.from('buildings').select('*').order('name', { ascending: true }),
      supabase.from('apartments').select('id, building_id, tenants(rent)')
    ])
    if (bldRes.error) { setError(bldRes.error.message); setLoading(false); return }
    setBuildings(bldRes.data || [])
    setApartments(aptRes.data || [])
    setLoading(false)
  }

  /* Per-building stats */
  const statsByBuilding = useMemo(() => {
    const m = {}
    for (const a of apartments) {
      if (!m[a.building_id]) m[a.building_id] = { total: 0, occupied: 0, income: 0 }
      m[a.building_id].total++
      const t = a.tenants?.[0]
      if (t) {
        m[a.building_id].occupied++
        m[a.building_id].income += Number(t.rent || 0)
      }
    }
    return m
  }, [apartments])

  /* Portfolio totals */
  const totals = useMemo(() => {
    const r = { bld: buildings.length, apt: 0, occ: 0, income: 0 }
    for (const s of Object.values(statsByBuilding)) {
      r.apt += s.total; r.occ += s.occupied; r.income += s.income
    }
    return r
  }, [buildings, statsByBuilding])

  /* Search filter */
  const filteredBuildings = useMemo(() => {
    if (!search.trim()) return buildings
    const q = search.toLowerCase()
    return buildings.filter(b =>
      (b.name || '').toLowerCase().includes(q) ||
      (b.city || '').toLowerCase().includes(q) ||
      (b.district || '').toLowerCase().includes(q) ||
      (b.address || '').toLowerCase().includes(q)
    )
  }, [buildings, search])

  /* Bina CRUD (add only — edit/delete live in BuildingDetail) */
  const openBldAdd = () => { setBldForm(EMPTY_BLD_FORM); setShowBldPopup(true) }

  const handleBldSave = async (e) => {
    e.preventDefault(); setSavingBld(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('Oturum suresi dolmus.', 'error'); setSavingBld(false); return }
    const record = {
      user_id: session.user.id,
      name: bldForm.name.trim(),
      city: bldForm.city.trim(),
      district: bldForm.district.trim(),
      address: bldForm.address.trim(),
      building_age: bldForm.building_age === '' ? null : parseInt(bldForm.building_age),
      notes: bldForm.notes.trim()
    }
    const { data, error: err } = await supabase.from('buildings').insert(record).select()
    setSavingBld(false)
    if (err) { showToast('Hata: ' + err.message, 'error'); return }
    showToast('Bina eklendi.', 'success')
    setShowBldPopup(false)
    await loadData()
    if (data?.[0]?.id) navigate(`/properties/building/${data[0].id}`)
  }

  /* Daire Ekle — buradan sadece modal; kullanici bina secer, kaydedince o binanin detayina gider */
  const openAptAdd = () => {
    if (buildings.length === 0) {
      showToast('Once bir bina ekleyiniz.', 'error')
      openBldAdd()
      return
    }
    setAptForm({ ...EMPTY_APT_FORM, building_id: buildings[0].id })
    setShowAptPopup(true)
  }

  const handleAptSave = async (e) => {
    e.preventDefault()
    if (!aptForm.building_id) { showToast('Bina seciniz.', 'error'); return }
    setSavingApt(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('Oturum suresi dolmus.', 'error'); setSavingApt(false); return }
    const record = {
      user_id: session.user.id,
      building_id: aptForm.building_id,
      unit_no: aptForm.unit_no.trim(),
      property_type: aptForm.property_type,
      room_count: aptForm.room_count.trim(),
      floor_no: aptForm.floor_no.trim(),
      m2_gross: aptForm.m2_gross === '' ? null : parseFloat(aptForm.m2_gross),
      m2_net: aptForm.m2_net === '' ? null : parseFloat(aptForm.m2_net),
      furnished: aptForm.furnished,
      deposit: aptForm.deposit === '' ? 0 : parseFloat(aptForm.deposit),
      notes: aptForm.notes.trim()
    }
    const { error: err } = await supabase.from('apartments').insert(record)
    setSavingApt(false)
    if (err) { showToast('Hata: ' + err.message, 'error'); return }
    showToast('Daire eklendi.', 'success')
    setShowAptPopup(false)
    navigate(`/properties/building/${aptForm.building_id}`)
  }

  const updateBldForm = (f, v) => setBldForm(prev => ({ ...prev, [f]: v }))
  const updateAptForm = (f, v) => setAptForm(prev => ({ ...prev, [f]: v }))

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
  const selectStyle = {
    fontFamily: font, fontSize: 13, fontWeight: 500,
    padding: '10px 34px 10px 14px',
    borderRadius: 10, border: `1.5px solid ${C.border}`,
    background: '#FAFBFC', color: C.text,
    cursor: 'pointer', outline: 'none',
    appearance: 'none', WebkitAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    width: '100%', boxSizing: 'border-box'
  }

  const vacant = totals.apt - totals.occ

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ fontFamily: font, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <motion.div variants={item}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: C.text,
          letterSpacing: '-0.02em', margin: 0
        }}>
          Mulklerim
          <span style={{ fontSize: 16, fontWeight: 600, color: C.textFaint, marginLeft: 8 }}>
            ({filteredBuildings.length})
          </span>
        </h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={openBldAdd}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', borderRadius: 12,
              background: 'white', color: C.teal, border: `1.5px solid ${C.teal}`,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
            }}>
            <Building2 style={{ width: 15, height: 15 }} /> Bina Ekle
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={openAptAdd}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 12,
              background: C.teal, color: 'white', border: 'none',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
              boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
            }}>
            <Plus style={{ width: 15, height: 15 }} /> Daire Ekle
          </motion.button>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {[
          { label: 'Toplam Bina', value: totals.bld, color: C.teal, borderColor: '#CCE4E8' },
          { label: 'Toplam Daire', value: totals.apt, color: C.teal, borderColor: '#CCE4E8' },
          { label: 'Kirada', value: totals.occ, color: '#059669', borderColor: '#D1FAE5' },
          { label: 'Bosta', value: vacant, color: '#DC2626', borderColor: '#FECACA' },
          { label: 'Aylik Gelir', value: `${money(totals.income)} ₺`, color: C.teal, borderColor: '#CCE4E8' }
        ].map((s, i) => (
          <motion.div key={i} variants={item}
            whileHover={{ y: -3, boxShadow: '0 0 0 1px rgba(2,88,100,0.1), 0 12px 32px rgba(15,23,42,0.1)' }}
            style={{
              background: 'white', borderRadius: 16,
              boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
              padding: '18px 20px',
              borderLeft: `3px solid ${s.borderColor}`,
              transition: 'box-shadow 0.2s'
            }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: '0.01em' }}>
              {s.label}
            </div>
            <div style={{
              fontSize: 24, fontWeight: 800, color: s.color,
              letterSpacing: '-0.02em', lineHeight: 1, marginTop: 8
            }}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <motion.div variants={item}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'white', borderRadius: 12, padding: '10px 16px',
          boxShadow: '0 0 0 1px rgba(15,23,42,0.05)'
        }}>
        <Search style={{ width: 16, height: 16, color: C.textFaint }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Bina / sehir / ilce / adres ara..."
          style={{
            border: 'none', outline: 'none', flex: 1, background: 'transparent',
            fontFamily: font, fontSize: 13, color: C.text
          }} />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        )}
      </motion.div>

      {/* Buildings table */}
      <motion.div variants={item} style={{
        background: C.card, borderRadius: 16,
        boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1.6fr 0.7fr 0.7fr 0.7fr 1.1fr 40px',
          padding: '14px 24px', borderBottom: `1px solid ${C.borderLight}`,
          background: '#FAFBFC'
        }}>
          {['Bina', 'Adres', 'Daire', 'Kirada', 'Bosta', 'Aylik Gelir', ''].map((h, i) => (
            <div key={i} style={{
              fontSize: 11, fontWeight: 700, color: C.textFaint,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              textAlign: i >= 2 && i <= 5 ? 'right' : 'left'
            }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ width: 24, height: 24, borderRadius: '50%', border: `2px solid ${C.teal}`, borderTopColor: 'transparent' }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.red, fontSize: 14 }}>
            <AlertCircle style={{ width: 20, height: 20, marginBottom: 8 }} />
            <div>Hata: {error}</div>
          </div>
        ) : filteredBuildings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.textFaint, fontSize: 14 }}>
            {buildings.length === 0
              ? 'Henuz bina eklenmemis. "+ Bina Ekle" ile baslayin.'
              : 'Aramayla eslesen bina bulunamadi.'}
          </div>
        ) : (
          filteredBuildings.map((b, i) => {
            const s = statsByBuilding[b.id] || { total: 0, occupied: 0, income: 0 }
            const vacantRow = s.total - s.occupied
            const location = [b.district, b.city].filter(Boolean).join(', ') || '—'
            return (
              <motion.div key={b.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => navigate(`/properties/building/${b.id}`)}
                whileHover={{ backgroundColor: '#F8FAFC' }}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.6fr 0.7fr 0.7fr 0.7fr 1.1fr 40px',
                  padding: '16px 24px', alignItems: 'center',
                  borderBottom: `1px solid ${C.borderLight}`,
                  cursor: 'pointer', transition: 'background 0.15s'
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(2,88,100,0.08)', color: C.teal,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <Building2 style={{ width: 17, height: 17 }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: C.text,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>{b.name}</div>
                    {b.building_age ? (
                      <div style={{ fontSize: 11, color: C.textFaint, marginTop: 2 }}>
                        {b.building_age} yasinda
                      </div>
                    ) : null}
                  </div>
                </div>
                <div style={{
                  fontSize: 12, color: C.textMuted,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {b.address ? `${b.address} · ${location}` : location}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, textAlign: 'right' }}>
                  {s.total}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#059669', textAlign: 'right' }}>
                  {s.occupied}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: vacantRow > 0 ? '#DC2626' : C.textFaint, textAlign: 'right'
                }}>
                  {vacantRow}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, textAlign: 'right' }}>
                  {money(s.income)} ₺
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', color: C.textFaint }}>
                  <ChevronRight style={{ width: 18, height: 18 }} />
                </div>
              </motion.div>
            )
          })
        )}
      </motion.div>

      {/* Bina modal (ekleme) */}
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
                width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto'
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
                    Yeni Bina Ekle
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
                      value={bldForm.name} onChange={e => updateBldForm('name', e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Sehir</label>
                      <input style={inputStyle} type="text" placeholder="Istanbul"
                        value={bldForm.city} onChange={e => updateBldForm('city', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Ilce</label>
                      <input style={inputStyle} type="text" placeholder="Kadikoy"
                        value={bldForm.district} onChange={e => updateBldForm('district', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Adres</label>
                    <input style={inputStyle} type="text" placeholder="Mahalle, Sokak, No"
                      value={bldForm.address} onChange={e => updateBldForm('address', e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Bina Yasi</label>
                      <input style={inputStyle} type="number" min="0" placeholder="5"
                        value={bldForm.building_age} onChange={e => updateBldForm('building_age', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Notlar</label>
                      <input style={inputStyle} type="text" placeholder="Opsiyonel"
                        value={bldForm.notes} onChange={e => updateBldForm('notes', e.target.value)} />
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
                  padding: '16px 28px', borderTop: `1px solid ${C.borderLight}`
                }}>
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
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daire modal (ekleme) */}
      <AnimatePresence>
        {showAptPopup && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowAptPopup(false) }}
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
                width: '100%', maxWidth: 680, maxHeight: '85vh', overflowY: 'auto'
              }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '20px 28px', borderBottom: `1px solid ${C.borderLight}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: C.green, color: '#03363D',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Home style={{ width: 18, height: 18 }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, fontFamily: font }}>
                    Yeni Daire Ekle
                  </h3>
                </div>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAptPopup(false)}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#F1F5F9', border: 'none', cursor: 'pointer', color: C.textMuted
                  }}>
                  <X style={{ width: 18, height: 18 }} />
                </motion.button>
              </div>

              <form onSubmit={handleAptSave}>
                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={labelStyle}>Bina *</label>
                    <select required value={aptForm.building_id}
                      onChange={e => updateAptForm('building_id', e.target.value)}
                      style={selectStyle}>
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Daire No *</label>
                      <input style={inputStyle} type="text" required placeholder="20"
                        value={aptForm.unit_no} onChange={e => updateAptForm('unit_no', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Mulk Tipi</label>
                      <select style={{ ...inputStyle, cursor: 'pointer' }}
                        value={aptForm.property_type} onChange={e => updateAptForm('property_type', e.target.value)}>
                        {Object.entries(PROPERTY_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Oda Sayisi</label>
                      <input style={inputStyle} type="text" placeholder="2+1"
                        value={aptForm.room_count} onChange={e => updateAptForm('room_count', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Kat</label>
                      <input style={inputStyle} type="text" placeholder="2"
                        value={aptForm.floor_no} onChange={e => updateAptForm('floor_no', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Depozito (₺)</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="0"
                        value={aptForm.deposit} onChange={e => updateAptForm('deposit', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Brut m²</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="120"
                        value={aptForm.m2_gross} onChange={e => updateAptForm('m2_gross', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Net m²</label>
                      <input style={inputStyle} type="number" min="0" step="0.01" placeholder="100"
                        value={aptForm.m2_net} onChange={e => updateAptForm('m2_net', e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <input type="checkbox" checked={aptForm.furnished}
                          onChange={e => updateAptForm('furnished', e.target.checked)}
                          style={{ width: 18, height: 18, accentColor: C.teal, cursor: 'pointer' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Esyali</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Notlar</label>
                    <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} rows={2}
                      placeholder="Opsiyonel notlar..."
                      value={aptForm.notes} onChange={e => updateAptForm('notes', e.target.value)} />
                  </div>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
                  padding: '16px 28px', borderTop: `1px solid ${C.borderLight}`
                }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="button" onClick={() => setShowAptPopup(false)}
                    style={{
                      padding: '10px 20px', borderRadius: 10,
                      background: '#F1F5F9', color: C.textMuted, border: 'none',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font
                    }}>
                    Iptal
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit" disabled={savingApt}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '10px 22px', borderRadius: 10,
                      background: C.teal, color: 'white', border: 'none',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: font,
                      opacity: savingApt ? 0.7 : 1,
                      boxShadow: '0 4px 14px rgba(2,88,100,0.25)'
                    }}>
                    <Check style={{ width: 15, height: 15 }} />
                    {savingApt ? 'Kaydediliyor...' : 'Kaydet'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
