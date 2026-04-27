/* ── KiraciYonet — Arıza Kayıtları (Maintenance) ──
 *
 * Bina + (opsiyonel) daire bazında arıza/onarım takibi.
 * Tutar yalnızca burada yaşar — abrechnung/giderler tablosuna karışmaz.
 */
import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { formatMoney, formatDate } from '../i18n/formatters'
import {
  Wrench, Plus, X, Check, AlertTriangle, Pencil, Trash2,
  Search, ChevronDown, ChevronRight, Clock, CheckCircle2, Ban,
} from 'lucide-react'

const font = "'Plus Jakarta Sans', system-ui, sans-serif"

const C = {
  teal: '#025864', green: '#00D47E', darkTeal: '#03363D',
  red: '#DC2626', amber: '#D97706',
  text: '#0F172A', textMuted: '#64748B', textFaint: '#94A3B8',
  border: '#E5E7EB', borderLight: '#F1F5F9', card: '#FFFFFF',
}

// Eski 'in_progress' kayıtları DB'de hâlâ olabilir — UI'da onları "Açık" gibi
// göster, ama listeden seçtirme. Yeni akış: open → resolved (veya cancelled).
const STATUS_COLOR = {
  open:        { fg: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  in_progress: { fg: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
  resolved:    { fg: '#059669', bg: '#F0FDF4', border: '#A7F3D0' },
  cancelled:   { fg: '#64748B', bg: '#F1F5F9', border: '#CBD5E1' },
}

const PRIORITY_COLOR = {
  urgent: '#DC2626',
  high:   '#D97706',
  normal: '#64748B',
  low:    '#94A3B8',
}

const STATUS_FLOW = {
  open:        'resolved',
  in_progress: 'resolved',
  resolved:    null,
  cancelled:   null,
}

const PRIORITIES = ['low', 'normal', 'high', 'urgent']
const STATUSES   = ['open', 'resolved', 'cancelled']

const EMPTY_FORM = {
  building_id: '',
  apartment_id: '',
  title: '',
  description: '',
  priority: 'normal',
  status: 'open',
  reported_at: new Date().toISOString().split('T')[0],
  resolved_at: '',
  cost: '',
  assignee: '',
  notes: '',
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}
const fadeItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
}

const cardBox = {
  background: C.card, borderRadius: 16,
  boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
  overflow: 'hidden',
}

const inputStyle = {
  fontFamily: font, fontSize: 13, padding: '9px 12px',
  borderRadius: 9, border: `1.5px solid ${C.border}`,
  background: '#fff', color: C.text, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6,
}

const aptShortLabel = (a) => {
  if (!a) return '—'
  const f = a.floor_no, u = a.unit_no
  if (f && u) return `${f} · ${u}`
  return f || u || '—'
}

export default function MaintenanceIssues() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { showToast } = useToast()

  const [issues, setIssues] = useState([])
  const [buildings, setBuildings] = useState([])
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filterBuilding, setFilterBuilding] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { if (user) loadAll() }, [user])

  const loadAll = async () => {
    setLoading(true)
    const [issuesRes, bldRes, aptRes] = await Promise.all([
      supabase.from('maintenance_issues')
        .select('*, buildings(id, name), apartments(id, unit_no, floor_no)')
        .order('reported_at', { ascending: false }),
      supabase.from('buildings').select('id, name').order('name'),
      supabase.from('apartments').select('id, unit_no, floor_no, building_id').order('unit_no'),
    ])
    setIssues(issuesRes.data || [])
    setBuildings(bldRes.data || [])
    setApartments(aptRes.data || [])
    setLoading(false)
  }

  const updateForm = (f, v) => setForm(prev => ({ ...prev, [f]: v }))

  const openNew = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (issue) => {
    setEditingId(issue.id)
    setForm({
      building_id: issue.building_id || '',
      apartment_id: issue.apartment_id || '',
      title: issue.title || '',
      description: issue.description || '',
      priority: issue.priority || 'normal',
      status: issue.status || 'open',
      reported_at: issue.reported_at || new Date().toISOString().split('T')[0],
      resolved_at: issue.resolved_at || '',
      cost: issue.cost ?? '',
      assignee: issue.assignee || '',
      notes: issue.notes || '',
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e?.preventDefault()
    if (!form.building_id) { showToast(t('maintenance.modal.toasts.buildingRequired'), 'error'); return }
    if (!form.title.trim()) { showToast(t('maintenance.modal.toasts.titleRequired'), 'error'); return }
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); return }

    const record = {
      user_id: session.user.id,
      building_id: form.building_id,
      apartment_id: form.apartment_id || null,
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      status: form.status,
      reported_at: form.reported_at || null,
      resolved_at: form.status === 'resolved' ? (form.resolved_at || new Date().toISOString().split('T')[0]) : null,
      cost: form.cost === '' ? 0 : Number(form.cost),
      assignee: form.assignee.trim(),
      notes: form.notes.trim(),
    }

    let err
    if (editingId) {
      const res = await supabase.from('maintenance_issues').update(record).eq('id', editingId)
      err = res.error
    } else {
      const res = await supabase.from('maintenance_issues').insert(record)
      err = res.error
    }
    setSaving(false)
    if (err) {
      showToast(t('maintenance.modal.toasts.errorPrefix', { msg: err.message }), 'error')
      return
    }
    showToast(t(editingId ? 'maintenance.modal.toasts.updated' : 'maintenance.modal.toasts.saved'), 'success')
    setShowModal(false)
    loadAll()
  }

  const handleDelete = (issue) => {
    setConfirmDelete({
      id: issue.id,
      onConfirm: async () => {
        const { error } = await supabase.from('maintenance_issues').delete().eq('id', issue.id)
        if (error) {
          showToast(t('maintenance.modal.toasts.errorPrefix', { msg: error.message }), 'error')
          return
        }
        showToast(t('maintenance.modal.toasts.deleted'), 'success')
        setConfirmDelete(null)
        loadAll()
      },
    })
  }

  // Status'u ileri taşı (open → in_progress → resolved). Cancelled / resolved'da no-op.
  const advanceStatus = async (issue) => {
    const next = STATUS_FLOW[issue.status]
    if (!next) return
    const patch = { status: next }
    if (next === 'resolved') patch.resolved_at = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('maintenance_issues').update(patch).eq('id', issue.id)
    if (error) {
      showToast(t('maintenance.modal.toasts.errorPrefix', { msg: error.message }), 'error')
      return
    }
    loadAll()
  }

  // ── KPI hesabı ──
  const now = new Date()
  const ymCurrent = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const kpi = useMemo(() => {
    const k = { open: 0, totalResolved: 0, resolvedThisMonth: 0, totalCost: 0 }
    issues.forEach(i => {
      // Eski 'in_progress' kayıtları "Açık" sayılıyor.
      if (i.status === 'open' || i.status === 'in_progress') k.open++
      else if (i.status === 'resolved') {
        k.totalResolved++
        if ((i.resolved_at || '').startsWith(ymCurrent)) k.resolvedThisMonth++
      }
      if (i.status === 'resolved') k.totalCost += Number(i.cost) || 0
    })
    return k
  }, [issues, ymCurrent])

  // ── Filtreleme ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return issues.filter(i => {
      if (filterBuilding !== 'all' && i.building_id !== filterBuilding) return false
      if (filterStatus !== 'all' && i.status !== filterStatus) return false
      if (filterPriority !== 'all' && i.priority !== filterPriority) return false
      if (q && !`${i.title} ${i.description}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [issues, search, filterBuilding, filterStatus, filterPriority])

  // Apartment options for the modal: filter by selected building
  const aptOptionsForForm = useMemo(() => {
    if (!form.building_id) return []
    return apartments.filter(a => a.building_id === form.building_id)
  }, [apartments, form.building_id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, fontFamily: font }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${C.teal}`, borderTopColor: 'transparent' }} />
    </div>
  )

  const anyFilter = search || filterBuilding !== 'all' || filterStatus !== 'all' || filterPriority !== 'all'

  return (
    <motion.div variants={container} initial="hidden" animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: font }}>

      {/* ═══ HEADER ═══ */}
      <motion.div variants={fadeItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', margin: 0 }}>
            {t('maintenance.title')}
          </h1>
          <p style={{ fontSize: 13, color: C.textFaint, marginTop: 3 }}>
            {t('maintenance.subtitle')}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={openNew}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #00D47E, #059669)',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font,
            boxShadow: '0 4px 14px rgba(0,212,126,0.3)',
          }}
        >
          <Plus size={16} /> {t('maintenance.newIssue')}
        </motion.button>
      </motion.div>

      {/* ═══ KPI ═══ */}
      <motion.div variants={fadeItem} style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14,
      }}>
        <KpiCard label={t('maintenance.kpi.open')} value={kpi.open} color={STATUS_COLOR.open.fg} icon={AlertTriangle} bg="#FEF2F2" />
        <KpiCard label={t('maintenance.kpi.totalResolved')} value={kpi.totalResolved} color={STATUS_COLOR.resolved.fg} icon={CheckCircle2} bg="#F0FDF4" />
        <KpiCard label={t('maintenance.kpi.resolvedThisMonth')} value={kpi.resolvedThisMonth} color={STATUS_COLOR.resolved.fg} icon={Clock} bg="#F0FDF4" />
        <KpiCard label={t('maintenance.kpi.totalCost')} value={formatMoney(kpi.totalCost)} color={C.teal} icon={Wrench} bg="#F0FDFA" small />
      </motion.div>

      {/* ═══ FILTERS ═══ */}
      <motion.div variants={fadeItem} style={{
        ...cardBox, padding: '14px 18px',
        display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 12,
      }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textFaint }} />
          <input
            type="text" placeholder={t('maintenance.filters.searchPh')}
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <select value={filterBuilding} onChange={e => setFilterBuilding(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="all">{t('maintenance.filters.allBuildings')}</option>
          {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="all">{t('maintenance.status.all')}</option>
          {STATUSES.map(s => <option key={s} value={s}>{t(`maintenance.status.${s}`)}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="all">{t('maintenance.priority.all')}</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{t(`maintenance.priority.${p}`)}</option>)}
        </select>
      </motion.div>

      {/* ═══ LIST ═══ */}
      <motion.div variants={fadeItem} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ ...cardBox, padding: 60, textAlign: 'center', color: C.textFaint, fontSize: 14 }}>
            {anyFilter ? t('maintenance.list.emptyFiltered') : t('maintenance.list.empty')}
          </div>
        ) : filtered.map(issue => (
          <IssueCard
            key={issue.id} issue={issue} t={t}
            expanded={expandedId === issue.id}
            onToggle={() => setExpandedId(prev => prev === issue.id ? null : issue.id)}
            onEdit={() => openEdit(issue)}
            onDelete={() => handleDelete(issue)}
            onAdvance={() => advanceStatus(issue)}
          />
        ))}
      </motion.div>

      {/* ═══ MODAL ═══ */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !saving && setShowModal(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingLeft: 'var(--sb-w)', zIndex: 1100, backdropFilter: 'blur(4px)',
              fontFamily: font,
            }}
          >
            <motion.form
              onSubmit={handleSave}
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 16, width: 580, maxHeight: '90vh',
                overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{
                background: 'linear-gradient(135deg, #025864, #03363D)',
                padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: '#fff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Wrench size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
                      {t(editingId ? 'maintenance.modal.titleEdit' : 'maintenance.modal.titleNew')}
                    </h3>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  type="button" onClick={() => setShowModal(false)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8 }}
                >
                  <X size={16} color="#fff" />
                </motion.button>
              </div>

              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Bina + Daire */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>{t('maintenance.modal.building')}</label>
                    <select
                      value={form.building_id}
                      onChange={e => updateForm('building_id', e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                      required
                    >
                      <option value="">{t('maintenance.modal.buildingPlaceholder')}</option>
                      {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t('maintenance.modal.apartment')}</label>
                    <select
                      value={form.apartment_id}
                      onChange={e => updateForm('apartment_id', e.target.value)}
                      disabled={!form.building_id}
                      style={{ ...inputStyle, cursor: form.building_id ? 'pointer' : 'not-allowed', opacity: form.building_id ? 1 : 0.6 }}
                    >
                      <option value="">{t('maintenance.modal.apartmentPlaceholder')}</option>
                      {aptOptionsForForm.map(a => (
                        <option key={a.id} value={a.id}>{aptShortLabel(a)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Başlık */}
                <div>
                  <label style={labelStyle}>{t('maintenance.modal.issueTitle')}</label>
                  <input
                    type="text" required
                    placeholder={t('maintenance.modal.issueTitlePh')}
                    value={form.title}
                    onChange={e => updateForm('title', e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Öncelik */}
                <div>
                  <label style={labelStyle}>{t('maintenance.modal.priority')}</label>
                  <ChipGroup
                    options={PRIORITIES.map(p => ({ key: p, label: t(`maintenance.priority.${p}`), color: PRIORITY_COLOR[p] }))}
                    value={form.priority}
                    onChange={v => updateForm('priority', v)}
                  />
                </div>

                {/* Durum */}
                <div>
                  <label style={labelStyle}>{t('maintenance.modal.status')}</label>
                  <ChipGroup
                    options={STATUSES.map(s => ({ key: s, label: t(`maintenance.status.${s}`), color: STATUS_COLOR[s].fg }))}
                    value={form.status}
                    onChange={v => updateForm('status', v)}
                  />
                </div>

                {/* Tarihler */}
                <div style={{ display: 'grid', gridTemplateColumns: form.status === 'resolved' ? '1fr 1fr' : '1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>{t('maintenance.modal.reportedAt')}</label>
                    <input type="date" value={form.reported_at}
                      onChange={e => updateForm('reported_at', e.target.value)}
                      style={inputStyle} />
                  </div>
                  {form.status === 'resolved' && (
                    <div>
                      <label style={labelStyle}>{t('maintenance.modal.resolvedAt')}</label>
                      <input type="date" value={form.resolved_at}
                        onChange={e => updateForm('resolved_at', e.target.value)}
                        style={inputStyle} />
                    </div>
                  )}
                </div>

                {/* Maliyet + Sorumlu */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>{t('maintenance.modal.cost')}</label>
                    <input type="number" step="0.01" min="0"
                      placeholder={t('maintenance.modal.costPh')}
                      value={form.cost}
                      onChange={e => updateForm('cost', e.target.value)}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t('maintenance.modal.assignee')}</label>
                    <input type="text"
                      placeholder={t('maintenance.modal.assigneePh')}
                      value={form.assignee}
                      onChange={e => updateForm('assignee', e.target.value)}
                      style={inputStyle} />
                  </div>
                </div>

                {/* Açıklama */}
                <div>
                  <label style={labelStyle}>{t('maintenance.modal.description')}</label>
                  <textarea rows={3}
                    placeholder={t('maintenance.modal.descriptionPh')}
                    value={form.description}
                    onChange={e => updateForm('description', e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
                </div>

                {/* Notlar */}
                <div>
                  <label style={labelStyle}>{t('maintenance.modal.notes')}</label>
                  <textarea rows={2}
                    placeholder={t('maintenance.modal.notesPh')}
                    value={form.notes}
                    onChange={e => updateForm('notes', e.target.value)}
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 50 }} />
                </div>
              </div>

              <div style={{
                padding: '14px 24px', borderTop: `1px solid ${C.borderLight}`,
                background: '#FAFBFC', display: 'flex', justifyContent: 'flex-end', gap: 10,
              }}>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="button" onClick={() => setShowModal(false)} disabled={saving}
                  style={{
                    padding: '9px 18px', borderRadius: 9,
                    border: `1.5px solid ${C.border}`, background: '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 13, fontWeight: 600, color: C.textMuted, fontFamily: font,
                  }}
                >
                  {t('maintenance.modal.cancel')}
                </motion.button>
                <motion.button
                  whileHover={{ scale: saving ? 1 : 1.02 }} whileTap={{ scale: saving ? 1 : 0.98 }}
                  type="submit" disabled={saving}
                  style={{
                    padding: '9px 22px', borderRadius: 9, border: 'none',
                    background: `linear-gradient(135deg, ${C.teal}, ${C.darkTeal})`,
                    color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: font,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  <Check size={14} /> {t('maintenance.modal.save')}
                </motion.button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ DELETE CONFIRM ═══ */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setConfirmDelete(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingLeft: 'var(--sb-w)', zIndex: 1100, backdropFilter: 'blur(4px)',
              fontFamily: font,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 16, width: 400, overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{
                background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertTriangle size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>
                    {t('maintenance.confirmDelete.title')}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                    {t('maintenance.confirmDelete.subtitle')}
                  </p>
                </div>
              </div>
              <div style={{ padding: '22px 26px' }}>
                <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.55 }}>
                  {t('maintenance.confirmDelete.message')}
                </p>
              </div>
              <div style={{
                padding: '14px 26px', borderTop: `1px solid ${C.borderLight}`,
                display: 'flex', justifyContent: 'flex-end', gap: 10,
              }}>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    padding: '9px 18px', borderRadius: 9,
                    border: `1.5px solid ${C.border}`, background: '#fff',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.textMuted, fontFamily: font,
                  }}
                >
                  {t('maintenance.confirmDelete.cancel')}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={confirmDelete.onConfirm}
                  style={{
                    padding: '9px 22px', borderRadius: 9, border: 'none',
                    background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                    color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: font, cursor: 'pointer',
                  }}
                >
                  {t('maintenance.confirmDelete.confirm')}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, color, icon: Icon, bg, small }) {
  return (
    <motion.div whileHover={{ y: -2 }}
      style={{
        ...cardBox, padding: '18px 20px',
        borderLeft: `3px solid ${color}33`,
        cursor: 'default',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: 9, background: bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{
        fontSize: small ? 18 : 24, fontWeight: 800, color,
        letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </motion.div>
  )
}

/* ─── Tek bir arıza kartı ─── */
function IssueCard({ issue, t, expanded, onToggle, onEdit, onDelete, onAdvance }) {
  const sc = STATUS_COLOR[issue.status] || STATUS_COLOR.open
  const pColor = PRIORITY_COLOR[issue.priority] || PRIORITY_COLOR.normal
  const apt = issue.apartments
  const bldName = issue.buildings?.name || '—'
  const where = apt
    ? `${bldName} · ${aptShortLabel(apt)}`
    : `${bldName} · ${t('maintenance.list.wholeBuilding')}`
  const cost = Number(issue.cost) || 0
  const canAdvance = !!STATUS_FLOW[issue.status]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      style={{ ...cardBox, overflow: 'hidden' }}
    >
      {/* Üst satır */}
      <div
        onClick={onToggle}
        style={{
          padding: '14px 18px',
          display: 'grid',
          gridTemplateColumns: '20px 1.6fr auto auto auto auto',
          gap: 14, alignItems: 'center',
          cursor: 'pointer', transition: 'background 0.12s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Priority dot */}
        <div title={t(`maintenance.priority.${issue.priority}`)} style={{
          width: 10, height: 10, borderRadius: '50%', background: pColor, justifySelf: 'center',
          boxShadow: issue.priority === 'urgent' ? `0 0 0 3px ${pColor}33` : 'none',
        }} />

        {/* Title + place */}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: C.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {issue.title}
          </div>
          <div style={{ fontSize: 12, color: C.textFaint, marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {where}
          </div>
        </div>

        {/* Status badge */}
        <div style={{
          padding: '4px 10px', borderRadius: 7,
          background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`,
          fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          {t(`maintenance.status.${issue.status}`)}
        </div>

        {/* Reported date */}
        <div style={{ fontSize: 12, color: C.textMuted, fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right' }}>
          {issue.reported_at ? formatDate(issue.reported_at) : '—'}
        </div>

        {/* Cost */}
        <div style={{
          fontSize: 13, fontWeight: 700, color: cost > 0 ? C.text : C.textFaint,
          fontVariantNumeric: 'tabular-nums', minWidth: 100, textAlign: 'right',
        }}>
          {cost > 0 ? formatMoney(cost) : t('maintenance.list.noCost')}
        </div>

        {/* Chevron */}
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} style={{ color: C.textFaint }}>
          <ChevronDown size={16} />
        </motion.div>
      </div>

      {/* Detay */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden', borderTop: `1px solid ${C.borderLight}`, background: '#FAFBFC' }}
          >
            <div style={{ padding: '16px 22px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {issue.description && (
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                  {issue.description}
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: C.textMuted }}>
                {issue.assignee && (
                  <div><span style={{ fontWeight: 700, color: C.textFaint }}>{t('maintenance.list.assignee')}:</span> {issue.assignee}</div>
                )}
                {issue.resolved_at && (
                  <div><span style={{ fontWeight: 700, color: C.textFaint }}>{t('maintenance.list.resolvedOn')}:</span> {formatDate(issue.resolved_at)}</div>
                )}
                {issue.notes && (
                  <div style={{ width: '100%', fontStyle: 'italic', color: C.textFaint, marginTop: 4 }}>
                    {issue.notes}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                {canAdvance && (
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={(e) => { e.stopPropagation(); onAdvance() }}
                    style={{
                      padding: '7px 14px', borderRadius: 8, border: 'none',
                      background: STATUS_COLOR[STATUS_FLOW[issue.status]].fg,
                      color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: font,
                    }}
                  >
                    <ChevronRight size={13} /> {t(`maintenance.status.${STATUS_FLOW[issue.status]}`)}
                  </motion.button>
                )}
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={(e) => { e.stopPropagation(); onEdit() }}
                  style={{
                    padding: '7px 14px', borderRadius: 8,
                    border: `1.5px solid ${C.border}`, background: '#fff',
                    color: C.textMuted, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: font,
                  }}
                >
                  <Pencil size={12} /> {t('maintenance.list.edit')}
                </motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                  style={{
                    padding: '7px 14px', borderRadius: 8,
                    border: 'none', background: '#FEF2F2',
                    color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: font,
                  }}
                >
                  <Trash2 size={12} /> {t('maintenance.list.delete')}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Chip group (priority/status seçici) ─── */
function ChipGroup({ options, value, onChange }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: `repeat(${options.length}, 1fr)`, gap: 6,
      background: '#FAFBFC', border: `1.5px solid ${C.border}`,
      borderRadius: 10, padding: 4,
    }}>
      {options.map(opt => {
        const active = value === opt.key
        return (
          <motion.button
            key={opt.key} type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(opt.key)}
            style={{
              fontFamily: font, fontSize: 12, fontWeight: 700,
              padding: '7px 8px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: active ? opt.color : 'transparent',
              color: active ? '#fff' : C.textMuted,
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </motion.button>
        )
      })}
    </div>
  )
}
