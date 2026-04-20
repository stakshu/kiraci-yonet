# Binalar Listesi → Bina Detay Drill-Down — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Mülklerim from a filtered apartment table into a compact buildings list that drills into per-building detail pages.

**Architecture:**
- `/properties` → buildings table (rewritten `Properties.jsx`).
- `/properties/building/:id` → new `BuildingDetail.jsx` with the building header, stat strip, and that building's apartment table (ported from current Properties.jsx).
- `/properties/:apartmentId` → unchanged `PropertyDetail.jsx`.
- Route for `building/:id` MUST be registered before `:id` catch-all so the static `building` segment matches first.

**Tech Stack:** React 19 + Vite 8, React Router v6, Motion (framer-motion), Lucide icons, Supabase. No test framework in the project — verification is `npm run build` + manual browser walkthrough per CLAUDE.md.

**Spec reference:** [docs/superpowers/specs/2026-04-21-buildings-list-drilldown-design.md](../specs/2026-04-21-buildings-list-drilldown-design.md)

---

## File Structure

| File | Role |
|---|---|
| `src/pages/BuildingDetail.jsx` **(new)** | Bina detay sayfası — bina bilgi header, mini stat strip, o binanın daire tablosu + daire/kiracı/bina modalları. ~700 satır, Properties.jsx'in apartment tablosu + modal mantığının taşınmış hali. |
| `src/pages/Properties.jsx` **(rewrite)** | Binalar listesi — 5 stat kartı, arama, bina tablosu (tıklanabilir satırlar), sadece "bina ekle" modal'ı. ~400 satır (eskisinden küçük). |
| `src/App.jsx` **(1 satır değişir)** | Yeni route eklenir: `/properties/building/:id`. |

Properties.jsx bugün ~1250 satır ve 3 modal + 2 dropdown + stat cards + apartment table içeriyor. Bu dosyayı ikiye bölmek temizler; listeleme mantığı Properties'te kalır, yönetim/detay mantığı BuildingDetail'e gider.

---

## Task 1: Add Route for Building Detail

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add the import at the top of App.jsx (after existing page imports)**

Edit `src/App.jsx`, find the `PropertyDetail` import line and add `BuildingDetail` right after:

```jsx
import PropertyDetail from './pages/PropertyDetail'
import BuildingDetail from './pages/BuildingDetail'
```

- [ ] **Step 2: Register the route BEFORE `/properties/:id`**

In the `<Routes>` block, between `<Route path="/properties" ...>` and `<Route path="/properties/:id" ...>`, add:

```jsx
<Route path="/properties" element={<Properties />} />
<Route path="/properties/building/:id" element={<BuildingDetail />} />
<Route path="/properties/:id" element={<PropertyDetail />} />
```

Order matters — React Router matches top-down; the `building` static segment must win over `:id`.

- [ ] **Step 3: Commit (app won't build yet — BuildingDetail.jsx comes next; don't run build)**

Wait to commit until Task 2 lands so the tree stays green.

---

## Task 2: Create BuildingDetail.jsx Skeleton

**Files:**
- Create: `src/pages/BuildingDetail.jsx`

- [ ] **Step 1: Create the file with imports, constants, and a minimal component**

```jsx
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
```

- [ ] **Step 2: Run build to verify the tree compiles**

Run: `npm run build`
Expected: PASS. The new page renders a placeholder; real UI lands in Tasks 3–5.

- [ ] **Step 3: Commit Tasks 1+2 together**

```bash
git add src/App.jsx src/pages/BuildingDetail.jsx
git commit -m "feat: scaffold BuildingDetail route and skeleton"
```

---

## Task 3: Bina Header + Mini Stat Strip + Building Edit/Delete Modal

**Files:**
- Modify: `src/pages/BuildingDetail.jsx`

- [ ] **Step 1: Add building modal state and handlers inside the component**

Insert these state hooks right after the existing `useState` block in `BuildingDetail`:

```jsx
const [showBldPopup, setShowBldPopup] = useState(false)
const [bldForm, setBldForm] = useState(EMPTY_BLD_FORM)
const [savingBld, setSavingBld] = useState(false)

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
```

Also add shared style consts used by the modal:

```jsx
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
```

- [ ] **Step 2: Compute stats and replace placeholder with bina header + stat strip**

Between the breadcrumb and the closing `</div>` of the outer container, add:

```jsx
{/* Stats */}
const occupied = apartments.filter(a => a.tenants?.[0]).length
const vacant = apartments.length - occupied
const monthlyIncome = apartments.reduce((s, a) => s + Number(a.tenants?.[0]?.rent || 0), 0)
```

*(These go inside the component, right before the `return` statement — alongside the other derived values.)*

Replace the placeholder `<div>` that reads "Bina: ... — N daire" with:

```jsx
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
```

- [ ] **Step 3: Add the building modal JSX before the component's closing `</div>`**

Copy the `AnimatePresence`/`motion.div` building modal block verbatim from `src/pages/Properties.jsx` (starts with the comment `{/* ═══ BUILDING POPUP ═══ */}` and ends at its closing `</AnimatePresence>`). **Change the two lines**:
- `{editBldId ? 'Binayi Duzenle' : 'Yeni Bina Ekle'}` → `Binayi Duzenle`
- Remove the whole `{editBldId && ( ... Binayi Sil ... )}` button block from the modal footer (delete lives on the header now).

- [ ] **Step 4: Build & manual smoke test**

Run: `npm run build`
Expected: PASS.
Run: `npm run dev`. Navigate to a building from Properties (use current dropdown temporarily, or hand-craft URL `/properties/building/<uuid>` from devtools). Verify: header renders, stat strip renders, Edit opens modal, Delete prompts confirm + navigates back on success.

- [ ] **Step 5: Commit**

```bash
git add src/pages/BuildingDetail.jsx
git commit -m "feat: BuildingDetail header + stat strip + edit/delete"
```

---

## Task 4: Port Apartment Table + Apartment Modal + Tenant Modal

**Files:**
- Modify: `src/pages/BuildingDetail.jsx`

The current `Properties.jsx` already has working apartment-table, apartment-modal, and tenant-modal code — it is the reference implementation. Port it into `BuildingDetail.jsx` with three adjustments:
1. Apartment rows display `unitLabel(apt)` (no bina name — the header shows it once).
2. "+ Daire Ekle" button pre-fills `building_id: id` (the URL param).
3. Stats computed in Task 3 drive the strip; **do not** re-compute inside the table block.

- [ ] **Step 1: Add apartment + tenant state & handlers inside the component**

Paste these into `BuildingDetail` (right after the building-modal state block from Task 3). Compared to `Properties.jsx`: `openAptAdd` ignores `buildings.length === 0` branch (we already have one — `building`); it pre-fills `building_id: id`; queries are unchanged.

```jsx
/* Apartment popup */
const [showAptPopup, setShowAptPopup] = useState(false)
const [editAptId, setEditAptId] = useState(null)
const [aptForm, setAptForm] = useState(EMPTY_APT_FORM)
const [savingApt, setSavingApt] = useState(false)

/* Tenant popup */
const [showTenantPopup, setShowTenantPopup] = useState(false)
const [tenantAptId, setTenantAptId] = useState(null)
const [tenantAptName, setTenantAptName] = useState('')
const [tenantForm, setTenantForm] = useState({
  full_name: '', email: '', phone: '', tc_no: '',
  lease_start: '', lease_end: '', rent: '', deposit: ''
})
const [savingTenant, setSavingTenant] = useState(false)

const openAptAdd = () => {
  setEditAptId(null)
  setAptForm({ ...EMPTY_APT_FORM, building_id: id })
  setShowAptPopup(true)
}

const openAptEdit = async (e, aptId) => {
  e.stopPropagation()
  const { data } = await supabase.from('apartments').select('*').eq('id', aptId).single()
  if (!data) { showToast('Daire bulunamadi.', 'error'); return }
  setEditAptId(aptId)
  setAptForm({
    building_id: data.building_id || id,
    unit_no: data.unit_no || '',
    property_type: data.property_type || 'daire',
    room_count: data.room_count || '', floor_no: data.floor_no || '',
    m2_gross: data.m2_gross ?? '', m2_net: data.m2_net ?? '',
    furnished: !!data.furnished,
    deposit: data.deposit ?? '', notes: data.notes || ''
  })
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
  const result = editAptId
    ? await supabase.from('apartments').update(record).eq('id', editAptId)
    : await supabase.from('apartments').insert(record)
  setSavingApt(false)
  if (result.error) { showToast('Hata: ' + result.error.message, 'error'); return }
  showToast(editAptId ? 'Daire guncellendi.' : 'Daire eklendi.', 'success')
  setShowAptPopup(false)
  loadData()
}

const handleAptDelete = async (e, aptId, name) => {
  e.stopPropagation()
  if (!confirm(name + ' silinsin mi?')) return
  const { error: err } = await supabase.from('apartments').delete().eq('id', aptId)
  if (err) { showToast('Hata: ' + err.message, 'error'); return }
  showToast('Daire silindi.', 'success'); loadData()
}

const openTenantAdd = (e, aptId, aptName) => {
  e.stopPropagation()
  setTenantAptId(aptId)
  setTenantAptName(aptName)
  setTenantForm({ full_name: '', email: '', phone: '', tc_no: '', lease_start: '', lease_end: '', rent: '', deposit: '' })
  setShowTenantPopup(true)
}

const handleTenantSave = async (e) => {
  e.preventDefault(); setSavingTenant(true)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { showToast('Oturum suresi dolmus.', 'error'); setSavingTenant(false); return }
  const record = {
    user_id: session.user.id, full_name: tenantForm.full_name.trim(),
    email: tenantForm.email.trim(), phone: tenantForm.phone.trim(),
    tc_no: tenantForm.tc_no.trim(), apartment_id: tenantAptId,
    lease_start: tenantForm.lease_start || null,
    lease_end: tenantForm.lease_end || null,
    rent: parseFloat(tenantForm.rent) || 0,
    deposit: parseFloat(tenantForm.deposit) || 0
  }
  const result = await supabase.from('tenants').insert(record).select()
  if (result.error) { showToast('Hata: ' + result.error.message, 'error'); setSavingTenant(false); return }
  if (result.data?.[0] && record.rent > 0) {
    const tenantId = result.data[0].id
    const paymentRecords = []
    const startDate = record.lease_start ? new Date(record.lease_start) : new Date()
    const now = new Date()
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    for (let i = 0; i < 120; i++) {
      const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, startDate.getDate())
      if (dueDate > endOfNextMonth) break
      paymentRecords.push({
        user_id: session.user.id, tenant_id: tenantId, apartment_id: tenantAptId,
        due_date: dueDate.toISOString().split('T')[0], amount: record.rent, status: 'pending'
      })
    }
    if (paymentRecords.length > 0) await supabase.from('rent_payments').insert(paymentRecords)
  }
  setSavingTenant(false)
  showToast('Kiraci eklendi.', 'success')
  setShowTenantPopup(false)
  loadData()
}

const updateAptForm = (f, v) => setAptForm(prev => ({ ...prev, [f]: v }))
const updateTenantForm = (f, v) => setTenantForm(prev => ({ ...prev, [f]: v }))

const getNextPayment = (tenantId) => {
  if (!tenantId) return null
  const upcoming = payments
    .filter(p => p.tenant_id === tenantId && p.status !== 'paid')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
  return upcoming[0] || null
}

const selectStyle = {
  fontFamily: font, fontSize: 13, fontWeight: 500,
  padding: '10px 34px 10px 14px',
  borderRadius: 10, border: `1.5px solid ${C.border}`,
  background: 'white', color: C.text,
  cursor: 'pointer', outline: 'none',
  appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  minWidth: 200
}
```

- [ ] **Step 2: Add "+ Daire Ekle" button and apartment table below the mini stat strip**

Insert after the stat strip `</div>` and before the modals:

```jsx
{/* + Daire Ekle */}
<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={openAptAdd}
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

{/* Daire tablosu */}
<div style={{
  background: C.card, borderRadius: 16,
  boxShadow: '0 0 0 1px rgba(15,23,42,0.05), 0 4px 16px rgba(15,23,42,0.06)',
  overflow: 'hidden'
}}>
  <div style={{
    display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px',
    padding: '14px 24px', borderBottom: `1px solid ${C.borderLight}`,
    background: '#FAFBFC'
  }}>
    {['Daire', 'Kiraci', 'Siradaki Odeme', 'Sozlesme Bitis', ''].map((h, i) => (
      <div key={i} style={{
        fontSize: 11, fontWeight: 700, color: C.textFaint,
        textTransform: 'uppercase', letterSpacing: '0.06em'
      }}>{h}</div>
    ))}
  </div>

  {apartments.length === 0 ? (
    <div style={{ textAlign: 'center', padding: 60, color: C.textFaint, fontSize: 14 }}>
      Bu binada henuz daire yok. "+ Daire Ekle" ile ekleyebilirsiniz.
    </div>
  ) : (
    apartments.map((apt, i) => {
      const tenant = apt.tenants?.[0]
      const isOccupied = !!tenant
      const nextPay = tenant ? getNextPayment(tenant.id) : null
      const label = unitLabel(apt)

      return (
        <motion.div key={apt.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => navigate(`/properties/${apt.id}`)}
          whileHover={{ backgroundColor: '#F8FAFC' }}
          style={{
            display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 80px',
            padding: '16px 24px', alignItems: 'center',
            borderBottom: `1px solid ${C.borderLight}`,
            cursor: 'pointer', transition: 'background 0.15s'
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div style={{
              padding: '4px 10px', borderRadius: 6,
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              background: isOccupied ? '#ECFDF5' : '#FEF2F2',
              color: isOccupied ? '#059669' : '#DC2626'
            }}>
              {isOccupied ? 'Kirada' : 'Bosta'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{label}</div>
          </div>
          <div>
            {tenant ? (
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{tenant.full_name}</div>
            ) : (
              <div onClick={(e) => openTenantAdd(e, apt.id, label)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 12, fontWeight: 600, color: C.teal, cursor: 'pointer'
                }}>
                <UserPlus style={{ width: 13, height: 13 }} /> Kiraci Ekle
              </div>
            )}
          </div>
          <div>
            {tenant ? (
              nextPay ? (
                <div style={{
                  fontSize: 13, fontWeight: 500,
                  color: new Date(nextPay.due_date) < new Date() ? C.red : C.text
                }}>{formatDate(nextPay.due_date)}</div>
              ) : (
                <div style={{ fontSize: 12, color: C.textFaint }}>Odeme kaydi yok</div>
              )
            ) : (
              <div style={{ fontSize: 12, color: C.textFaint }}>—</div>
            )}
          </div>
          <div>
            {tenant?.lease_end ? (
              <div style={{
                fontSize: 13, fontWeight: 500,
                color: new Date(tenant.lease_end) < new Date() ? C.red : C.text
              }}>{formatDate(tenant.lease_end)}</div>
            ) : tenant ? (
              <div onClick={(e) => { e.stopPropagation(); navigate(`/properties/${apt.id}`) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 600, color: C.teal, cursor: 'pointer'
                }}>Sozlesme Ekle</div>
            ) : (
              <div style={{ fontSize: 12, color: C.textFaint }}>—</div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={(e) => openAptEdit(e, apt.id)}
              style={{
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted
              }}>
              <Pencil style={{ width: 14, height: 14 }} />
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={(e) => handleAptDelete(e, apt.id, label)}
              style={{
                width: 32, height: 32, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', cursor: 'pointer', color: C.textMuted
              }}>
              <Trash2 style={{ width: 14, height: 14 }} />
            </motion.button>
          </div>
        </motion.div>
      )
    })
  )}
</div>
```

- [ ] **Step 3: Paste the apartment modal and tenant modal from Properties.jsx**

Copy verbatim these two blocks from the existing `src/pages/Properties.jsx` into the end of `BuildingDetail.jsx` (before the outer `</div>`):
- `{/* ═══ APARTMENT POPUP ═══ */}` — its full `<AnimatePresence>...</AnimatePresence>`.
- `{/* ═══ TENANT POPUP ═══ */}` — its full `<AnimatePresence>...</AnimatePresence>`.

**Then** inside the apartment modal, remove the `<option value="__new__">+ Yeni Bina Ekle</option>` line and the associated `if (e.target.value === '__new__') { openBldAdd(); return }` handler branch — inside BuildingDetail there is no `openBldAdd`, and the user already has a building context. Keep the plain `buildings.map(...)` → but since BuildingDetail doesn't fetch the full buildings list, replace the select options with a single option:

```jsx
<select required value={aptForm.building_id}
  onChange={e => updateAptForm('building_id', e.target.value)}
  style={{ ...inputStyle, cursor: 'pointer', ...selectStyle, background: '#FAFBFC', minWidth: 'auto' }}
>
  <option value={id}>{building.name}</option>
</select>
```

(This locks the daire to the current bina. Moving a daire between binalar is an advanced op not in scope.)

- [ ] **Step 4: Build and manually smoke test**

Run: `npm run build`
Expected: PASS.
Run: `npm run dev`. On the building detail page: verify the daire table renders, "+ Daire Ekle" opens modal with bina locked, Edit/Delete/Add Tenant flows behave like the current Properties page.

- [ ] **Step 5: Commit**

```bash
git add src/pages/BuildingDetail.jsx
git commit -m "feat: BuildingDetail apartment table + apartment/tenant modals"
```

---

## Task 5: Rewrite Properties.jsx as Buildings List

**Files:**
- Modify: `src/pages/Properties.jsx` (full rewrite)

- [ ] **Step 1: Replace the entire file with the new buildings-list implementation**

Full content for `src/pages/Properties.jsx`:

```jsx
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
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS, chunk-size warning only (per CLAUDE.md — not a blocker).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Properties.jsx
git commit -m "feat: rewrite Properties as buildings list with search"
```

---

## Task 6: End-to-End Manual Verification + Final Commit

**Files:** none (manual).

- [ ] **Step 1: Run the dev server**

Run: `npm run dev`

- [ ] **Step 2: Walk the full flow**

In the browser, verify each point:

1. `/properties` opens → 5 stat cards + search + buildings table with chevrons at row end.
2. Search for a partial match on bina name/city → table filters live.
3. Click a bina row → URL changes to `/properties/building/<uuid>`, breadcrumb shows `← Mulklerim / <BinaName>`, info header + stat strip + apartment table render.
4. Click `Duzenle` on bina header → edit modal opens, change name, save → header updates.
5. Click `Sil` → confirm with cascade warning, confirm → redirected to `/properties`, bina gone, toast shown.
6. On a bina detail, click `+ Daire Ekle` → modal, bina locked, fill unit_no, save → daire appears in table.
7. Click daire row → `/properties/<aptId>` (PropertyDetail) opens — existing page, unchanged.
8. Browser back → bina detail; back again → buildings list.
9. On `/properties`, `+ Bina Ekle` → modal, save → redirected to the new bina's detail page.
10. On `/properties`, `+ Daire Ekle` (no bina selected yet) → first building is pre-selected in modal; user can change; save → redirected to that bina's detail.
11. Visit `/properties/building/00000000-0000-0000-0000-000000000000` (invalid UUID) → toast "Bina bulunamadi" + redirect to `/properties`.
12. Dashboard, Kiracilar, Odemeler, Muhasebe, Giderler sayfalari hala calisir (apartment+building joins etkilenmedi).

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: `built in <Ns>`; no errors (chunk size warning acceptable).

- [ ] **Step 4: Push to origin**

```bash
git push origin master
```

Vercel auto-deploy ile yayina gider.

---

## Self-Review Notes

- **Spec coverage:** Section `/properties`, section `/properties/building/:id`, route order, unchanged pages list, verification list — each spec bullet maps to Task 1/2/3/4/5/6.
- **Placeholder scan:** No TBD, TODO, or "similar to…" references. All copy-over instructions name exact source markers (the `{/* ═══ ... ═══ */}` comment banners) and specify diffs.
- **Type consistency:** `apartments` shape (`{ id, building_id, tenants[] }`), `buildings` shape, `rent_payments` columns — all consistent with the existing Supabase tables from `011_buildings_and_refactor.sql` and current Properties.jsx usage.
- **Order-of-operations:** Task 1 alone leaves the tree broken (imports missing component); Task 2 ships the stub so the build passes. Commit for Task 1 is explicitly deferred to bundle with Task 2's commit.
