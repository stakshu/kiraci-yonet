/* ── KiraciYonet — Bina Aylık Gider Tablosu (toplu giriş) ── */
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { DISTRIBUTION_KEYS, DISTRIBUTION_KEY_ORDER, getDistributionKey } from '../lib/distributionKeys'
import {
  X, Check, Building2, Calendar, Layers,
  Receipt, Landmark, Droplets, Waves, Flame, Thermometer,
  ArrowUpDown, Trash2, Trash, SprayCan, TreePine, Lightbulb,
  Wind, ShieldCheck, UserCheck, Tv, MoreHorizontal, Wrench,
  Briefcase, FileText, Euro, Filter
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"
const money = (n) => Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const MONTH_NAMES = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

const C = {
  teal: '#025864', green: '#00D47E', darkTeal: '#03363D',
  red: '#DC2626',
  text: '#0F172A', textMuted: '#64748B', textFaint: '#94A3B8',
  border: '#E5E7EB', borderLight: '#F1F5F9', card: '#FFFFFF',
}

const ICON_MAP = {
  Receipt, Landmark, Droplets, Waves, Flame, Thermometer,
  ArrowUpDown, Trash2, Trash, SprayCan, TreePine, Lightbulb,
  Wind, ShieldCheck, UserCheck, Tv, MoreHorizontal, Wrench,
  Briefcase, FileText, Building2, Euro, Filter, Calendar,
}
function CatIcon({ name, size = 14, color = C.textMuted }) {
  const I = ICON_MAP[name] || Receipt
  return <I size={size} color={color} />
}

const inputStyle = {
  fontFamily: font, fontSize: 13, padding: '8px 12px',
  borderRadius: 8, border: `1.5px solid ${C.border}`,
  background: '#fff', color: C.text, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

/**
 * Tek bir modalda bina için ay+yıl dönemi gider kalemlerini toplu girmek içindir.
 * Açıldığında DB'deki mevcut building-scope kayıtları çeker ve form'a prefill eder.
 * "Tümünü Kaydet" sırasında INSERT (yeni), UPDATE (değişen), DELETE (boşaltılan) diff uygular.
 */
export default function BuildingExpenseSheet({
  isOpen,
  onClose,
  onSaved,
  building,           // { id, name }
  apartmentCount,     // o binadaki daire sayısı (bilgi chip'i için)
  categories,         // [{ id, name, icon, color, is_tenant_billable, default_distribution_key, sort_order }]
  initialMonth,       // 1-12
  initialYear,        // number
}) {
  const { showToast } = useToast()

  const [month, setMonth] = useState(initialMonth || new Date().getMonth() + 1)
  const [year, setYear] = useState(initialYear || new Date().getFullYear())

  // rows: { [categoryId]: { amount, distKey, isBillable, existingId } }
  const [rows, setRows] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Her ay/yıl/bina değişiminde mevcut kayıtları yükle
  useEffect(() => {
    if (!isOpen || !building?.id) return
    let cancelled = false

    async function loadExisting() {
      setLoading(true)
      const { data, error } = await supabase
        .from('property_expenses')
        .select('id, category_id, amount, distribution_key, is_tenant_billed')
        .is('apartment_id', null)
        .eq('building_id', building.id)
        .eq('period_year', year)
        .eq('period_month', month)

      if (cancelled) return
      if (error) {
        showToast(error.message, 'error')
        setLoading(false)
        return
      }

      // Her kategori için default row, üstüne DB'den gelenler override.
      const init = {}
      categories.forEach(c => {
        init[c.id] = {
          amount: '',
          distKey: c.default_distribution_key || 'equal',
          isBillable: !!c.is_tenant_billable,
          existingId: null,
        }
      })
      ;(data || []).forEach(r => {
        if (init[r.category_id]) {
          init[r.category_id] = {
            amount: String(r.amount ?? ''),
            distKey: r.distribution_key || 'equal',
            isBillable: !!r.is_tenant_billed,
            existingId: r.id,
          }
        }
      })

      setRows(init)
      setLoading(false)
    }

    loadExisting()
    return () => { cancelled = true }
  }, [isOpen, building?.id, month, year, categories])

  const updateRow = (catId, patch) => {
    setRows(prev => ({ ...prev, [catId]: { ...prev[catId], ...patch } }))
  }

  // Özet
  const summary = useMemo(() => {
    const filled = Object.entries(rows).filter(([, r]) => r && r.amount !== '' && Number(r.amount) > 0)
    const total = filled.reduce((s, [, r]) => s + Number(r.amount), 0)
    return { count: filled.length, total }
  }, [rows])

  const handleSaveAll = async () => {
    if (!building?.id) return
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); return }

    const expenseDate = `${year}-${String(month).padStart(2, '0')}-01`

    const inserts = []
    const updates = []
    const deletes = []

    categories.forEach(cat => {
      const row = rows[cat.id]
      if (!row) return
      const amt = Number(row.amount)
      const hasAmount = row.amount !== '' && !Number.isNaN(amt) && amt > 0

      if (!hasAmount && row.existingId) {
        deletes.push(row.existingId)
        return
      }
      if (!hasAmount) return

      const payload = {
        user_id: session.user.id,
        apartment_id: null,
        building_id: building.id,
        category_id: cat.id,
        amount: amt,
        expense_date: expenseDate,
        period_month: month,
        period_year: year,
        is_tenant_billed: row.isBillable,
        distribution_key: row.distKey || 'equal',
        notes: '',
      }

      if (row.existingId) {
        updates.push({ id: row.existingId, ...payload })
      } else {
        inserts.push(payload)
      }
    })

    try {
      if (inserts.length > 0) {
        const { error } = await supabase.from('property_expenses').insert(inserts)
        if (error) throw error
      }
      for (const u of updates) {
        const { id, ...rest } = u
        const { error } = await supabase.from('property_expenses').update(rest).eq('id', id)
        if (error) throw error
      }
      if (deletes.length > 0) {
        const { error } = await supabase.from('property_expenses').delete().in('id', deletes)
        if (error) throw error
      }
      showToast(
        `${inserts.length + updates.length} kalem kaydedildi${deletes.length ? `, ${deletes.length} silindi` : ''}.`,
        'success'
      )
      onSaved?.(building.id)
      onClose()
    } catch (e) {
      showToast(e.message || 'Kaydetme sırasında hata.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return [y - 2, y - 1, y, y + 1]
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1050, backdropFilter: 'blur(4px)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: C.card, borderRadius: 20, width: 780,
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.2)', overflow: 'hidden',
            fontFamily: font,
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #025864, #03363D)',
            padding: '22px 28px', color: '#fff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Building2 size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px' }}>
                  {building?.name || 'Bina'}
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  Aylık bina gider tablosu · {apartmentCount ?? '—'} daire
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none',
                cursor: 'pointer', padding: 8, borderRadius: 8,
              }}
            >
              <X size={18} color="#fff" />
            </motion.button>
          </div>

          {/* Period picker */}
          <div style={{
            padding: '16px 28px', borderBottom: `1px solid ${C.borderLight}`,
            display: 'flex', gap: 16, alignItems: 'center', background: '#F8FAFC',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={15} color={C.teal} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Dönem
              </span>
            </div>
            <select
              value={month} onChange={e => setMonth(Number(e.target.value))}
              style={{ ...inputStyle, width: 140, cursor: 'pointer' }}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year} onChange={e => setYear(Number(e.target.value))}
              style={{ ...inputStyle, width: 100, cursor: 'pointer' }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            {loading && (
              <span style={{ fontSize: 12, color: C.textFaint, fontStyle: 'italic' }}>
                Mevcut kayıtlar yükleniyor...
              </span>
            )}
          </div>

          {/* Table */}
          <div style={{
            flex: 1, overflow: 'auto', padding: '0 28px',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.2fr 110px',
              padding: '12px 0', borderBottom: `1px solid ${C.borderLight}`,
              fontSize: 10, fontWeight: 700, color: C.textFaint,
              textTransform: 'uppercase', letterSpacing: '0.6px',
              position: 'sticky', top: 0, background: '#fff', zIndex: 1,
            }}>
              <div>Kategori</div>
              <div style={{ textAlign: 'right' }}>Tutar (₺)</div>
              <div>Dağıtım Anahtarı</div>
              <div style={{ textAlign: 'center' }}>Yansıtılır</div>
            </div>

            {categories.map(cat => {
              const row = rows[cat.id] || { amount: '', distKey: 'equal', isBillable: false }
              const keyInfo = getDistributionKey(row.distKey)
              const hasAmount = row.amount !== '' && Number(row.amount) > 0
              return (
                <div
                  key={cat.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1.6fr 1fr 1.2fr 110px',
                    padding: '10px 0', alignItems: 'center',
                    borderBottom: `1px solid ${C.borderLight}`,
                    background: hasAmount ? 'rgba(0,212,126,0.03)' : 'transparent',
                  }}
                >
                  {/* Category */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: `${cat.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <CatIcon name={cat.icon} size={15} color={cat.color} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                      {cat.name}
                    </span>
                  </div>

                  {/* Amount */}
                  <div style={{ paddingRight: 12 }}>
                    <input
                      type="number" step="0.01" min="0"
                      value={row.amount}
                      onChange={e => updateRow(cat.id, { amount: e.target.value })}
                      placeholder="—"
                      style={{
                        ...inputStyle,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: hasAmount ? 700 : 400,
                        color: hasAmount ? C.text : C.textMuted,
                      }}
                    />
                  </div>

                  {/* Distribution Key */}
                  <div style={{ paddingRight: 12 }}>
                    <select
                      value={row.distKey}
                      onChange={e => updateRow(cat.id, { distKey: e.target.value })}
                      style={{
                        ...inputStyle, cursor: 'pointer',
                        background: keyInfo.chipBg,
                        color: keyInfo.chipFg,
                        fontWeight: 700,
                        border: `1.5px solid transparent`,
                      }}
                    >
                      {DISTRIBUTION_KEY_ORDER.map(k => (
                        <option key={k} value={k}>
                          {DISTRIBUTION_KEYS[k].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Billable toggle */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => updateRow(cat.id, { isBillable: !row.isBillable })}
                      style={{
                        width: 42, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                        background: row.isBillable ? C.green : C.border,
                        position: 'relative', transition: 'background 0.2s',
                      }}
                      aria-label={row.isBillable ? 'Yansıtılır' : 'Yansıtılmaz'}
                    >
                      <motion.div
                        animate={{ x: row.isBillable ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{
                          width: 18, height: 18, borderRadius: 9, background: '#fff',
                          position: 'absolute', top: 2, left: 2,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                        }}
                      />
                    </motion.button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 28px', borderTop: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#F8FAFC',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'rgba(0,212,126,0.12)', color: C.green,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Layers size={16} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textFaint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Özet
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {summary.count} kalem · ₺{money(summary.total)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={onClose}
                disabled={saving}
                style={{
                  fontFamily: font, fontSize: 13, fontWeight: 600,
                  padding: '10px 20px', borderRadius: 10,
                  background: '#fff', color: C.textMuted, border: `1.5px solid ${C.border}`,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                İptal
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleSaveAll}
                disabled={saving || summary.count === 0}
                style={{
                  fontFamily: font, fontSize: 13, fontWeight: 700,
                  padding: '10px 20px', borderRadius: 10,
                  background: summary.count === 0
                    ? '#CBD5E1'
                    : 'linear-gradient(135deg, #00D47E, #059669)',
                  color: '#fff', border: 'none',
                  cursor: (saving || summary.count === 0) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: summary.count > 0 ? '0 4px 12px rgba(0,212,126,0.3)' : 'none',
                }}
              >
                <Check size={16} /> {saving ? 'Kaydediliyor...' : `Tümünü Kaydet${summary.count > 0 ? ` (${summary.count})` : ''}`}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
