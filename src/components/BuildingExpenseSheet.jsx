/* ── KiraciYonet — Toplu Gider Giriş Sheet'i ──
 *
 * İki mod:
 *   · locked: bina sabit (Ay Gideri butonu). scope/bina/daire seçici yok.
 *   · free  : kullanıcı önce scope (bina/daire) ve hedefi seçer (Gider Ekle).
 *
 * Tüm Bina scope'ta her satır için dağıtım anahtarı seçilir; kWh/m³ ise
 * dairelerin sayaç değerleri inline doldurulur ve abrechnung'da orantısal
 * dağıtılır. Tek Daire scope'ta dağıtım anahtarı görünmez (her satır o
 * daireye atılır).
 */
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import {
  DISTRIBUTION_KEY_ORDER, getDistributionKey, isConsumptionKey, DISTRIBUTION_KEYS,
} from '../lib/distributionKeys'
import { formatMoney, formatMonthYear } from '../i18n/formatters'
import {
  X, Check, Building2, Home, Calendar, Layers,
  Receipt, Landmark, Droplets, Waves, Flame, Thermometer,
  ArrowUpDown, Trash2, Trash, SprayCan, TreePine, Lightbulb,
  Wind, ShieldCheck, UserCheck, Tv, MoreHorizontal, Wrench,
  Briefcase, FileText, Euro, Filter,
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"

const C = {
  teal: '#025864', green: '#00D47E', darkTeal: '#03363D',
  red: '#DC2626', amber: '#D97706',
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

const labelSmall = {
  display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6,
}

const aptShortLabel = (a) => {
  if (!a) return '—'
  const f = a.floor_no, u = a.unit_no
  if (f && u) return `${f} · ${u}`
  return f || u || '—'
}

export default function BuildingExpenseSheet({
  isOpen,
  onClose,
  onSaved,
  // Locked mode (per-building "Ay Gideri" butonundan)
  building,
  apartmentCount,
  // Free mode (top "Gider Ekle" butonundan) — scope/hedef kullanıcı seçer
  freeMode = false,
  buildings = [],          // free mode için bina listesi
  allApartments = [],      // hem free hem locked: bina dairelerini bulmak için
  // Ortak
  categories,
  initialMonth,
  initialYear,
}) {
  const { t } = useTranslation()
  const { showToast } = useToast()

  // ── Scope & hedef state'i ──
  const [scope, setScope] = useState('building')   // 'building' | 'apartment'
  const [buildingId, setBuildingId] = useState(null)
  const [apartmentId, setApartmentId] = useState(null)

  // Locked mode'da scope = building, buildingId = building.id
  useEffect(() => {
    if (!freeMode && building?.id) {
      setScope('building')
      setBuildingId(building.id)
      setApartmentId(null)
    }
  }, [freeMode, building?.id, isOpen])

  const [month, setMonth] = useState(initialMonth || new Date().getMonth() + 1)
  const [year, setYear] = useState(initialYear || new Date().getFullYear())

  // rows: { [categoryId]: { amount, distKey, isBillable, existingId, meterReadings } }
  const [rows, setRows] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Bina değişince apartmentId'yi sıfırla
  useEffect(() => {
    if (scope === 'apartment' && apartmentId) {
      const apt = allApartments.find(a => a.id === apartmentId)
      if (!apt || (buildingId && apt.building_id !== buildingId)) setApartmentId(null)
    }
  }, [scope, buildingId, apartmentId, allApartments])

  // Mevcut bina dairelerini hesapla (kWh/m³ sayaç input listesi için)
  const buildingApts = useMemo(() => {
    if (!buildingId) return []
    return allApartments.filter(a => a.building_id === buildingId)
  }, [buildingId, allApartments])

  // Apartment scope için bina seçimine göre filtrelenmiş daire listesi
  const aptOptions = useMemo(() => {
    if (!buildingId) return allApartments
    return allApartments.filter(a => a.building_id === buildingId)
  }, [buildingId, allApartments])

  // ── Dönem/scope/hedef değişince mevcut kayıtları yükle ──
  useEffect(() => {
    if (!isOpen) return
    // Hedef yoksa rows'u sıfırla — picker bekliyor
    if (scope === 'building' && !buildingId) { setRows({}); return }
    if (scope === 'apartment' && !apartmentId) { setRows({}); return }

    let cancelled = false

    async function loadExisting() {
      setLoading(true)
      const expenseDate = `${year}-${String(month).padStart(2, '0')}-01`

      let query = supabase
        .from('property_expenses')
        .select('id, category_id, amount, distribution_key, is_tenant_billed, expense_meter_readings(apartment_id, reading)')
        .eq('period_year', year)
        .eq('period_month', month)

      if (scope === 'building') {
        query = query.is('apartment_id', null).eq('building_id', buildingId)
      } else {
        query = query.eq('apartment_id', apartmentId)
      }

      const { data, error } = await query
      if (cancelled) return
      if (error) {
        showToast(error.message, 'error')
        setLoading(false)
        return
      }

      const init = {}
      categories.forEach(c => {
        init[c.id] = {
          amount: '',
          distKey: c.default_distribution_key || 'units',
          isBillable: !!c.is_tenant_billable,
          existingId: null,
          meterReadings: {},
        }
      })
      ;(data || []).forEach(r => {
        const readings = (r.expense_meter_readings || []).reduce((acc, x) => {
          acc[x.apartment_id] = x.reading
          return acc
        }, {})
        if (init[r.category_id]) {
          init[r.category_id] = {
            amount: String(r.amount ?? ''),
            distKey: r.distribution_key || 'units',
            isBillable: !!r.is_tenant_billed,
            existingId: r.id,
            meterReadings: readings,
          }
        }
      })

      setRows(init)
      setLoading(false)
    }

    loadExisting()
    return () => { cancelled = true }
  }, [isOpen, scope, buildingId, apartmentId, month, year, categories])

  const updateRow = (catId, patch) => {
    setRows(prev => ({ ...prev, [catId]: { ...prev[catId], ...patch } }))
  }

  const updateReading = (catId, aptId, value) => {
    setRows(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        meterReadings: { ...(prev[catId]?.meterReadings || {}), [aptId]: value },
      },
    }))
  }

  const summary = useMemo(() => {
    const filled = Object.entries(rows).filter(([, r]) => r && r.amount !== '' && Number(r.amount) > 0)
    const total = filled.reduce((s, [, r]) => s + Number(r.amount), 0)
    return { count: filled.length, total }
  }, [rows])

  const handleSaveAll = async () => {
    if (scope === 'building' && !buildingId) return
    if (scope === 'apartment' && !apartmentId) return
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); return }

    const expenseDate = `${year}-${String(month).padStart(2, '0')}-01`
    const inserts = []
    const updates = []
    const deletes = []
    // expense_id -> meter_readings array (insert sonrası id'ler doldurulur)
    const pendingReadings = []

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

      const isBuilding = scope === 'building'
      const distKey = isBuilding ? (row.distKey || 'units') : 'units'
      const payload = {
        user_id: session.user.id,
        apartment_id: isBuilding ? null : apartmentId,
        building_id: isBuilding ? buildingId : null,
        category_id: cat.id,
        amount: amt,
        expense_date: expenseDate,
        period_month: month,
        period_year: year,
        is_tenant_billed: row.isBillable,
        distribution_key: distKey,
        notes: '',
      }

      // Sayaç okumaları yalnızca building scope + kwh/m³
      const readings = (isBuilding && isConsumptionKey(distKey))
        ? Object.entries(row.meterReadings || {})
            .filter(([, v]) => v !== '' && v != null && Number(v) > 0)
            .map(([apartment_id, reading]) => ({ apartment_id, reading: Number(reading) || 0 }))
        : []

      if (row.existingId) {
        updates.push({ id: row.existingId, payload, readings })
      } else {
        inserts.push({ payload, readings })
      }
    })

    try {
      // Inserts
      if (inserts.length > 0) {
        const { data: insRows, error } = await supabase
          .from('property_expenses')
          .insert(inserts.map(x => x.payload))
          .select('id')
        if (error) throw error
        insRows.forEach((r, i) => {
          if (inserts[i].readings.length > 0) {
            pendingReadings.push({ expense_id: r.id, rows: inserts[i].readings })
          }
        })
      }

      // Updates
      for (const u of updates) {
        const { error } = await supabase
          .from('property_expenses')
          .update(u.payload)
          .eq('id', u.id)
        if (error) throw error
        // Mevcut readings'i sil ve yeniden yaz (ya da boş bırak)
        await supabase.from('expense_meter_readings').delete().eq('expense_id', u.id)
        if (u.readings.length > 0) {
          pendingReadings.push({ expense_id: u.id, rows: u.readings })
        }
      }

      // Meter readings batch insert
      if (pendingReadings.length > 0) {
        const flat = pendingReadings.flatMap(p => p.rows.map(r => ({
          expense_id: p.expense_id,
          apartment_id: r.apartment_id,
          reading: r.reading,
        })))
        if (flat.length > 0) {
          const { error } = await supabase.from('expense_meter_readings').insert(flat)
          if (error) throw error
        }
      }

      // Deletes
      if (deletes.length > 0) {
        const { error } = await supabase.from('property_expenses').delete().in('id', deletes)
        if (error) throw error
      }

      const savedCount = inserts.length + updates.length
      showToast(
        deletes.length
          ? t('buildingExpenseSheet.toasts.savedWithDeletes', { saved: savedCount, deleted: deletes.length })
          : t('buildingExpenseSheet.toasts.saved', { saved: savedCount }),
        'success'
      )
      onSaved?.(scope === 'building' ? buildingId : null)
      onClose()
    } catch (e) {
      showToast(e.message || t('buildingExpenseSheet.toasts.saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return [y - 2, y - 1, y, y + 1]
  }, [])

  if (!isOpen) return null

  // Locked mode header
  const lockedSubtitle = !freeMode && apartmentCount != null
    ? t('buildingExpenseSheet.subtitle', { count: apartmentCount })
    : t('buildingExpenseSheet.subtitleUnknownCount')

  // Free mode picker'lar görünür mü
  const showPickers = freeMode
  const targetReady = (scope === 'building' && buildingId) || (scope === 'apartment' && apartmentId)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          paddingLeft: 'var(--sb-w)',
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
            background: C.card, borderRadius: 20, width: 860,
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
                <Layers size={20} color="#fff" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px' }}>
                  {freeMode
                    ? t('buildingExpenseSheet.freeTitle')
                    : (building?.name || t('buildingExpenseSheet.fallbackBuilding'))}
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                  {freeMode ? t('buildingExpenseSheet.freeSubtitle') : lockedSubtitle}
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

          {/* Free mode: scope + hedef picker'ları — tek satır, simetrik dağılım */}
          {showPickers && (
            <div style={{
              padding: '18px 28px', borderBottom: `1px solid ${C.borderLight}`,
              background: '#FAFBFC',
              display: 'grid',
              gridTemplateColumns: scope === 'apartment'
                ? '300px 1fr 1fr'
                : '300px 1fr',
              gap: 16, alignItems: 'end',
            }}>
              {/* Kapsam toggle */}
              <div>
                <label style={labelSmall}>
                  {t('buildingExpenseSheet.scopeHeader')}
                </label>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
                  background: '#fff', border: `1.5px solid ${C.border}`,
                  borderRadius: 10, padding: 4,
                }}>
                  {[
                    { key: 'building', label: t('buildingExpenseSheet.scopeBuilding'), Icon: Building2 },
                    { key: 'apartment', label: t('buildingExpenseSheet.scopeApartment'), Icon: Home },
                  ].map(opt => {
                    const active = scope === opt.key
                    const Icon = opt.Icon
                    return (
                      <motion.button
                        key={opt.key} type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setScope(opt.key); setApartmentId(null) }}
                        style={{
                          fontFamily: font, fontSize: 12, fontWeight: 700,
                          padding: '8px 12px', borderRadius: 8, border: 'none',
                          cursor: 'pointer',
                          background: active ? C.teal : 'transparent',
                          color: active ? '#fff' : C.textMuted,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          transition: 'all 0.15s',
                        }}
                      >
                        <Icon size={14} />
                        {opt.label}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Bina */}
              <div>
                <label style={labelSmall}>
                  {t('buildingExpenseSheet.buildingLabel')}
                </label>
                <select
                  value={buildingId || ''}
                  onChange={e => setBuildingId(e.target.value || null)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">{t('buildingExpenseSheet.selectPlaceholder')}</option>
                  {buildings.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Daire — sadece apartment scope'ta */}
              {scope === 'apartment' && (
                <div>
                  <label style={labelSmall}>
                    {t('buildingExpenseSheet.apartmentLabel')}
                  </label>
                  <select
                    value={apartmentId || ''}
                    onChange={e => setApartmentId(e.target.value || null)}
                    disabled={!buildingId}
                    style={{ ...inputStyle, cursor: buildingId ? 'pointer' : 'not-allowed', opacity: buildingId ? 1 : 0.6 }}
                  >
                    <option value="">{t('buildingExpenseSheet.selectPlaceholder')}</option>
                    {aptOptions.map(a => (
                      <option key={a.id} value={a.id}>{aptShortLabel(a)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Period picker */}
          <div style={{
            padding: '14px 28px', borderBottom: `1px solid ${C.borderLight}`,
            display: 'flex', gap: 14, alignItems: 'center', background: '#F8FAFC',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={15} color={C.teal} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('buildingExpenseSheet.period')}
              </span>
            </div>
            <select
              value={month} onChange={e => setMonth(Number(e.target.value))}
              style={{ ...inputStyle, width: 160, cursor: 'pointer' }}
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i + 1}>{formatMonthYear(i + 1, year).split(' ')[0]}</option>
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
                {t('buildingExpenseSheet.loadingExisting')}
              </span>
            )}
          </div>

          {/* Table veya hedef bekleme */}
          {!targetReady ? (
            <div style={{
              flex: 1, padding: '60px 28px', textAlign: 'center',
              color: C.textFaint, fontSize: 13,
            }}>
              {scope === 'building'
                ? t('buildingExpenseSheet.pickBuildingHint')
                : t('buildingExpenseSheet.pickApartmentHint')}
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto', padding: '0 28px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: scope === 'building'
                  ? '1.6fr 1fr 1.2fr 110px'
                  : '1.6fr 1fr 110px',
                padding: '12px 0', borderBottom: `1px solid ${C.borderLight}`,
                fontSize: 10, fontWeight: 700, color: C.textFaint,
                textTransform: 'uppercase', letterSpacing: '0.6px',
                position: 'sticky', top: 0, background: '#fff', zIndex: 1,
              }}>
                <div>{t('buildingExpenseSheet.tableHeader.category')}</div>
                <div style={{ textAlign: 'right' }}>{t('buildingExpenseSheet.tableHeader.amount')}</div>
                {scope === 'building' && <div>{t('buildingExpenseSheet.tableHeader.distKey')}</div>}
                <div style={{ textAlign: 'center' }}>{t('buildingExpenseSheet.tableHeader.billable')}</div>
              </div>

              {categories.map(cat => {
                const row = rows[cat.id] || { amount: '', distKey: 'units', isBillable: false, meterReadings: {} }
                const keyInfo = getDistributionKey(row.distKey)
                const hasAmount = row.amount !== '' && Number(row.amount) > 0
                const showMeter = scope === 'building' && hasAmount && isConsumptionKey(row.distKey) && buildingApts.length > 0
                const dkInfo = DISTRIBUTION_KEYS[row.distKey]

                return (
                  <div
                    key={cat.id}
                    style={{
                      borderBottom: `1px solid ${C.borderLight}`,
                      background: hasAmount ? 'rgba(0,212,126,0.03)' : 'transparent',
                    }}
                  >
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: scope === 'building'
                        ? '1.6fr 1fr 1.2fr 110px'
                        : '1.6fr 1fr 110px',
                      padding: '10px 0', alignItems: 'center',
                    }}>
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

                      {scope === 'building' && (
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
                                {t(`distributionKeys.${k}.label`)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => updateRow(cat.id, { isBillable: !row.isBillable })}
                          style={{
                            width: 42, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                            background: row.isBillable ? C.green : C.border,
                            position: 'relative', transition: 'background 0.2s',
                          }}
                          aria-label={row.isBillable ? t('buildingExpenseSheet.billableOn') : t('buildingExpenseSheet.billableOff')}
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

                    {/* Inline meter readings (kWh/m³ + Bina kapsamı) */}
                    {showMeter && (() => {
                      const totalReading = buildingApts.reduce((s, a) => s + (Number(row.meterReadings?.[a.id]) || 0), 0)
                      const amount = Number(row.amount) || 0
                      return (
                        <div style={{
                          padding: '10px 16px 14px 50px',
                          background: 'rgba(2,88,100,0.03)',
                          borderTop: `1px dashed ${C.border}`,
                        }}>
                          <div style={{
                            fontSize: 10, fontWeight: 700, color: C.teal,
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                            marginBottom: 8,
                          }}>
                            {t('buildingExpenseSheet.meterReadingsLabel', { unit: dkInfo.unit })}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {buildingApts.map(a => {
                              const v = row.meterReadings?.[a.id] ?? ''
                              const r = Number(v) || 0
                              const share = totalReading > 0 && r > 0 && amount > 0
                                ? (amount * (r / totalReading))
                                : null
                              return (
                                <div key={a.id} style={{
                                  display: 'grid', gridTemplateColumns: '1.2fr 110px 90px',
                                  gap: 10, alignItems: 'center',
                                }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text,
                                    minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {aptShortLabel(a)}
                                  </div>
                                  <input
                                    type="number" min="0" step="0.001" placeholder="0"
                                    value={v}
                                    onChange={e => updateReading(cat.id, a.id, e.target.value)}
                                    style={{ ...inputStyle, padding: '6px 10px', fontSize: 12 }}
                                  />
                                  <div style={{
                                    fontSize: 11, fontWeight: 600,
                                    color: share != null ? C.teal : C.textFaint,
                                    fontVariantNumeric: 'tabular-nums', textAlign: 'right',
                                  }}>
                                    {share != null ? share.toFixed(2) : '—'}
                                  </div>
                                </div>
                              )
                            })}
                            <div style={{
                              display: 'grid', gridTemplateColumns: '1.2fr 110px 90px',
                              gap: 10, paddingTop: 6, marginTop: 2,
                              borderTop: `1px dashed ${C.border}`,
                              fontSize: 11, fontWeight: 700, color: C.textMuted,
                            }}>
                              <div>{t('buildingExpenseSheet.meterTotal', { unit: dkInfo.unit })}</div>
                              <div style={{ textAlign: 'left' }}>{totalReading.toFixed(2)}</div>
                              <div style={{ textAlign: 'right', color: C.teal }}>
                                {amount > 0 ? amount.toFixed(2) : '—'}
                              </div>
                            </div>
                            {totalReading === 0 && (
                              <div style={{ fontSize: 10, color: C.amber, marginTop: 2 }}>
                                {t('buildingExpenseSheet.meterEmptyHint')}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          )}

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
                  {t('buildingExpenseSheet.summary')}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                  {t('buildingExpenseSheet.summaryLine', { count: summary.count, total: formatMoney(summary.total) })}
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
                {t('buildingExpenseSheet.cancel')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={handleSaveAll}
                disabled={saving || summary.count === 0 || !targetReady}
                style={{
                  fontFamily: font, fontSize: 13, fontWeight: 700,
                  padding: '10px 20px', borderRadius: 10,
                  background: (summary.count === 0 || !targetReady)
                    ? '#CBD5E1'
                    : 'linear-gradient(135deg, #00D47E, #059669)',
                  color: '#fff', border: 'none',
                  cursor: (saving || summary.count === 0 || !targetReady) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: summary.count > 0 ? '0 4px 12px rgba(0,212,126,0.3)' : 'none',
                }}
              >
                <Check size={16} />
                {saving
                  ? t('buildingExpenseSheet.saving')
                  : (summary.count > 0
                      ? t('buildingExpenseSheet.saveAllCount', { count: summary.count })
                      : t('buildingExpenseSheet.saveAll'))}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
