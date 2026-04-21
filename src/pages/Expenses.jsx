/* ── KiraciYonet — Gider Yönetimi (Betriebskosten / Nebenkostenabrechnung) ── */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../components/Toast'
import { apartmentLabel } from '../lib/apartmentLabel'
import BuildingExpenseSheet from '../components/BuildingExpenseSheet'
import { DISTRIBUTION_KEYS, DISTRIBUTION_KEY_ORDER, getDistributionKey } from '../lib/distributionKeys'
import { computeApartmentRollup, computeBuildingRollup } from '../lib/abrechnungCalc'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import {
  Receipt, Plus, Pencil, Trash2, X, Check, Search,
  Settings2, ChevronDown, ChevronRight, Building2,
  TrendingUp, TrendingDown, Filter, Calendar,
  Landmark, Droplets, Waves, Flame, Thermometer,
  ArrowUpDown, Trash, TreePine, Lightbulb, Wind,
  ShieldCheck, UserCheck, Tv, MoreHorizontal, Wrench,
  Briefcase, FileText, SprayCan, AlertTriangle, Euro,
  Download, Home, Layers, Ruler, Users, Divide
} from 'lucide-react'

/* ── Design Tokens ── */
const font = "'Plus Jakarta Sans', system-ui, sans-serif"
const money = n => Number(n).toLocaleString('tr-TR')
const money2 = n => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
  const d = new Date(dateStr)
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear()
}

const MONTH_NAMES = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const MONTH_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

const C = {
  teal: '#025864', green: '#00D47E', darkTeal: '#03363D',
  red: '#DC2626', amber: '#D97706', blue: '#2563EB',
  text: '#0F172A', textMuted: '#64748B', textFaint: '#94A3B8',
  border: '#E5E7EB', borderLight: '#F1F5F9', card: '#FFFFFF',
  pageBg: '#F0F2F5'
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } }
}
const fadeItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
}

const cardBox = {
  background: 'var(--card)', borderRadius: 16,
  boxShadow: 'var(--card-shadow)',
  overflow: 'hidden'
}

const inputStyle = {
  fontFamily: font, fontSize: 13, padding: '10px 14px',
  borderRadius: 10, border: '1.5px solid var(--input-border)',
  background: 'var(--input-bg)', color: 'var(--text)', outline: 'none',
  width: '100%', boxSizing: 'border-box'
}
const labelStyle = { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }

/* ── Icon Map ── */
const ICON_MAP = {
  Receipt, Landmark, Droplets, Waves, Flame, Thermometer,
  ArrowUpDown, Trash2, Trash, SprayCan, TreePine, Lightbulb,
  Wind, ShieldCheck, UserCheck, Tv, MoreHorizontal, Wrench,
  Briefcase, FileText, Building2, Euro, Filter, Calendar
}

function CategoryIcon({ name, size = 16, color = C.textMuted }) {
  const Icon = ICON_MAP[name] || Receipt
  return <Icon size={size} color={color} />
}

/* ── Default BetrKV Categories ── */
const DEFAULT_CATEGORIES = [
  { name: 'Emlak Vergisi', icon: 'Landmark', color: '#14B8A6', is_tenant_billable: true, is_recurring: false, sort_order: 1, default_distribution_key: 'area' },
  { name: 'Su', icon: 'Droplets', color: '#0EA5E9', is_tenant_billable: true, is_recurring: true, sort_order: 2, default_distribution_key: 'persons' },
  { name: 'Kanalizasyon', icon: 'Waves', color: '#06B6D4', is_tenant_billable: true, is_recurring: true, sort_order: 3, default_distribution_key: 'persons' },
  { name: 'Isıtma', icon: 'Flame', color: '#F97316', is_tenant_billable: true, is_recurring: true, sort_order: 4, default_distribution_key: 'area' },
  { name: 'Sıcak Su', icon: 'Thermometer', color: '#EF4444', is_tenant_billable: true, is_recurring: true, sort_order: 5, default_distribution_key: 'persons' },
  { name: 'Asansör', icon: 'ArrowUpDown', color: '#8B5CF6', is_tenant_billable: true, is_recurring: true, sort_order: 6, default_distribution_key: 'units' },
  { name: 'Sokak Temizliği', icon: 'Trash2', color: '#A855F7', is_tenant_billable: true, is_recurring: false, sort_order: 7, default_distribution_key: 'persons' },
  { name: 'Çöp Toplama', icon: 'Trash', color: '#78716C', is_tenant_billable: true, is_recurring: true, sort_order: 8, default_distribution_key: 'persons' },
  { name: 'Bina Temizliği', icon: 'SprayCan', color: '#EC4899', is_tenant_billable: true, is_recurring: true, sort_order: 9, default_distribution_key: 'area' },
  { name: 'Bahçe Bakımı', icon: 'TreePine', color: '#22C55E', is_tenant_billable: true, is_recurring: false, sort_order: 10, default_distribution_key: 'area' },
  { name: 'Ortak Alan Aydınlatma', icon: 'Lightbulb', color: '#EAB308', is_tenant_billable: true, is_recurring: true, sort_order: 11, default_distribution_key: 'area' },
  { name: 'Baca Temizliği', icon: 'Wind', color: '#64748B', is_tenant_billable: true, is_recurring: false, sort_order: 12, default_distribution_key: 'units' },
  { name: 'Bina Sigortası', icon: 'ShieldCheck', color: '#6366F1', is_tenant_billable: true, is_recurring: false, sort_order: 13, default_distribution_key: 'area' },
  { name: 'Kapıcı / Görevli', icon: 'UserCheck', color: '#0D9488', is_tenant_billable: true, is_recurring: true, sort_order: 14, default_distribution_key: 'area' },
  { name: 'Kablo TV / Anten', icon: 'Tv', color: '#7C3AED', is_tenant_billable: true, is_recurring: true, sort_order: 15, default_distribution_key: 'units' },
  { name: 'Diğer Giderler', icon: 'MoreHorizontal', color: '#94A3B8', is_tenant_billable: true, is_recurring: false, sort_order: 16, default_distribution_key: 'equal' },
  { name: 'Tamirat / Onarım', icon: 'Wrench', color: '#DC2626', is_tenant_billable: false, is_recurring: false, sort_order: 17, description: 'Kiracıya yansıtılamaz', default_distribution_key: 'equal' },
  { name: 'Yönetim Giderleri', icon: 'Briefcase', color: '#475569', is_tenant_billable: false, is_recurring: false, sort_order: 18, description: 'Kiracıya yansıtılamaz', default_distribution_key: 'equal' },
]

/* ── Empty Form ── */
const EMPTY_EXPENSE = {
  scope: 'building', // 'apartment' | 'building'
  apartment_id: '', building_id: '', category_id: '', amount: '',
  distribution_key: 'equal',
  expense_date: new Date().toISOString().split('T')[0],
  period_month: new Date().getMonth() + 1,
  period_year: new Date().getFullYear(),
  is_tenant_billed: false, notes: ''
}

const EMPTY_CATEGORY = {
  name: '', icon: 'Receipt', color: '#64748B',
  is_tenant_billable: false, is_recurring: false, description: ''
}

/* ══════════════════════════════════════════ */
/*           MAIN COMPONENT                  */
/* ══════════════════════════════════════════ */
export default function Expenses() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  /* ── Theme-aware palette (shadows module-level C inside this component) ── */
  const C = useMemo(() => ({
    teal:      isDark ? '#00B4C7' : '#025864',
    green:     '#00D47E',
    darkTeal:  '#03363D',
    red:       isDark ? '#F87171' : '#DC2626',
    amber:     isDark ? '#FBBF24' : '#D97706',
    blue:      isDark ? '#60A5FA' : '#2563EB',
    text:      isDark ? '#E8EEF5' : '#0F172A',
    textMuted: isDark ? '#98A4B5' : '#64748B',
    textFaint: isDark ? '#64748B' : '#94A3B8',
    border:    isDark ? '#283544' : '#E5E7EB',
    borderLight: isDark ? '#1F2A36' : '#F1F5F9',
    card:      isDark ? '#161E27' : '#FFFFFF',
    pageBg:    isDark ? '#0B1117' : '#F0F2F5',
    // Status pill backgrounds (auto-translucent in dark)
    greenBg:   isDark ? 'rgba(52,211,153,0.14)' : '#ECFDF5',
    greenFg:   isDark ? '#6EE7B7' : '#059669',
    redBg:     isDark ? 'rgba(248,113,113,0.14)' : '#FEF2F2',
    redFg:     isDark ? '#FCA5A5' : '#DC2626',
  }), [isDark])

  /* ── State ── */
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [apartments, setApartments] = useState([])
  const [buildings, setBuildings] = useState([])
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)

  // Expense CRUD
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE)

  // Category management
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY)

  // Abrechnung
  const [showAbrechnung, setShowAbrechnung] = useState(false)
  const [abrechnungScope, setAbrechnungScope] = useState('building') // 'apartment' | 'building'
  const [abrechnungApt, setAbrechnungApt] = useState('')
  const [abrechnungBld, setAbrechnungBld] = useState('')
  const [abrechnungStart, setAbrechnungStart] = useState(`${new Date().getFullYear()}-01-01`)
  const [abrechnungEnd, setAbrechnungEnd] = useState(`${new Date().getFullYear()}-12-31`)
  const reportRef = useRef(null)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(null) // { message, onConfirm }

  // Filters
  const [filterBuilding, setFilterBuilding] = useState('')
  const [filterApartment, setFilterApartment] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterMonth, setFilterMonth] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Accordion state
  const [expandedBuildings, setExpandedBuildings] = useState(() => new Set())
  const [expandedApartments, setExpandedApartments] = useState(() => new Set())
  const [expandedAbrechnungCats, setExpandedAbrechnungCats] = useState(() => new Set())

  // Building monthly expense sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetCtx, setSheetCtx] = useState({ building: null, apartmentCount: 0, month: null, year: null })

  /* ── Data Loading ── */
  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadExpenses(), loadCategories(), loadApartments(), loadBuildings(), loadTenants()])
    setLoading(false)
  }

  const loadExpenses = async () => {
    // apartments!property_expenses_apartment_id_fkey join still works for NULL apartment_id
    // (returns null), and we additionally join buildings!property_expenses_building_id_fkey
    // so building-scope rows carry their building reference explicitly.
    const { data } = await supabase
      .from('property_expenses')
      .select(`
        *,
        expense_categories(id, name, icon, color, is_tenant_billable),
        apartments(unit_no, floor_no, building_id, buildings(id, name)),
        buildings!property_expenses_building_id_fkey(id, name)
      `)
      .order('expense_date', { ascending: false })
    setExpenses(data || [])
  }

  const loadCategories = async () => {
    let { data } = await supabase.from('expense_categories').select('*').order('sort_order', { ascending: true })
    if (!data || data.length === 0) {
      await seedDefaultCategories()
      const res = await supabase.from('expense_categories').select('*').order('sort_order', { ascending: true })
      data = res.data
    } else {
      // Migrate German category names to Turkish if detected
      const germanToTurkish = {
        'Grundsteuer': 'Emlak Vergisi', 'Wasserversorgung': 'Su', 'Entwässerung': 'Kanalizasyon',
        'Heizung': 'Isıtma', 'Warmwasser': 'Sıcak Su', 'Aufzug': 'Asansör',
        'Straßenreinigung': 'Sokak Temizliği', 'Müllbeseitigung': 'Çöp Toplama',
        'Gebäudereinigung': 'Bina Temizliği', 'Gartenpflege': 'Bahçe Bakımı',
        'Beleuchtung': 'Ortak Alan Aydınlatma', 'Schornsteinreinigung': 'Baca Temizliği',
        'Versicherung': 'Bina Sigortası', 'Hauswart': 'Kapıcı / Görevli',
        'Kabelanschluss': 'Kablo TV / Anten', 'Waschraum': 'Çamaşırhane',
        'Sonstige': 'Diğer Giderler', 'Reparaturen (nicht umlagefähig)': 'Tamirat / Onarım',
        'Verwaltungskosten': 'Yönetim Giderleri'
      }
      const toUpdate = data.filter(c => germanToTurkish[c.name])
      if (toUpdate.length > 0) {
        for (const cat of toUpdate) {
          await supabase.from('expense_categories').update({ name: germanToTurkish[cat.name] }).eq('id', cat.id)
        }
        const res = await supabase.from('expense_categories').select('*').order('sort_order', { ascending: true })
        data = res.data
      }
    }
    setCategories(data || [])
  }

  const loadApartments = async () => {
    const { data } = await supabase
      .from('apartments')
      .select('id, unit_no, floor_no, m2_net, m2_gross, building_id, buildings(name)')
      .order('unit_no')
    setApartments(data || [])
  }

  const loadBuildings = async () => {
    const { data } = await supabase.from('buildings').select('id, name').order('name')
    setBuildings(data || [])
  }

  const loadTenants = async () => {
    const { data } = await supabase
      .from('tenants')
      .select('id, full_name, apartment_id, rent, nebenkosten_vorauszahlung, lease_start, lease_end, household_info')
      .not('apartment_id', 'is', null)
    setTenants(data || [])
  }

  const seedDefaultCategories = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const records = DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: session.user.id }))
    await supabase.from('expense_categories').insert(records)
  }

  /* ── Expense CRUD ── */
  const openAddExpense = () => {
    setEditingExpense(null)
    setExpenseForm(EMPTY_EXPENSE)
    setShowExpenseModal(true)
  }

  const openEditExpense = (expense) => {
    const isBuildingScope = expense.apartment_id == null
    setEditingExpense(expense)
    setExpenseForm({
      scope: isBuildingScope ? 'building' : 'apartment',
      apartment_id: expense.apartment_id || '',
      building_id: expense.building_id || expense.apartments?.buildings?.id || '',
      category_id: expense.category_id || '',
      amount: expense.amount || '',
      distribution_key: expense.distribution_key || 'equal',
      expense_date: expense.expense_date || '',
      period_month: expense.period_month || '',
      period_year: expense.period_year || '',
      is_tenant_billed: expense.is_tenant_billed || false,
      notes: expense.notes || ''
    })
    setShowExpenseModal(true)
  }

  const handleSaveExpense = async () => {
    if (!expenseForm.category_id || !expenseForm.amount) {
      showToast('Kategori ve tutar zorunludur.', 'error'); return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const base = {
      user_id: session.user.id,
      category_id: expenseForm.category_id,
      amount: Number(expenseForm.amount),
      distribution_key: expenseForm.distribution_key || 'equal',
      expense_date: expenseForm.expense_date,
      period_month: Number(expenseForm.period_month) || null,
      period_year: Number(expenseForm.period_year) || null,
      is_tenant_billed: expenseForm.is_tenant_billed,
      notes: expenseForm.notes
    }

    const isBuilding = expenseForm.scope === 'building'

    if (isBuilding && !expenseForm.building_id) {
      showToast('Bina seçin.', 'error'); return
    }
    if (!isBuilding && !expenseForm.apartment_id) {
      showToast('Mülk seçin.', 'error'); return
    }

    const record = isBuilding
      ? { ...base, apartment_id: null, building_id: expenseForm.building_id }
      : { ...base, apartment_id: expenseForm.apartment_id, building_id: null }

    if (editingExpense) {
      const { error } = await supabase.from('property_expenses').update(record).eq('id', editingExpense.id)
      if (error) { showToast(error.message, 'error'); return }
      showToast('Gider güncellendi.', 'success')
      setShowExpenseModal(false)
      loadExpenses()
      return
    }

    const { error } = await supabase.from('property_expenses').insert(record)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Gider eklendi.', 'success')
    setShowExpenseModal(false)
    loadExpenses()
  }

  const handleDeleteExpense = (id) => {
    setConfirmDelete({
      message: 'Bu gideri silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      onConfirm: async () => {
        const { error } = await supabase.from('property_expenses').delete().eq('id', id)
        if (error) { showToast(error.message, 'error'); return }
        showToast('Gider silindi.', 'success')
        loadExpenses()
        setConfirmDelete(null)
      }
    })
  }

  /* ── Category CRUD ── */
  const openAddCategory = () => {
    setEditingCategory(null)
    setCategoryForm(EMPTY_CATEGORY)
  }

  const openEditCategory = (cat) => {
    setEditingCategory(cat)
    setCategoryForm({
      name: cat.name, icon: cat.icon, color: cat.color,
      is_tenant_billable: cat.is_tenant_billable,
      is_recurring: cat.is_recurring, description: cat.description || ''
    })
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) { showToast('Kategori adı zorunludur.', 'error'); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const record = {
      user_id: session.user.id,
      name: categoryForm.name.trim(),
      icon: categoryForm.icon,
      color: categoryForm.color,
      is_tenant_billable: categoryForm.is_tenant_billable,
      is_recurring: categoryForm.is_recurring,
      description: categoryForm.description,
      sort_order: editingCategory?.sort_order || categories.length + 1
    }

    let err
    if (editingCategory) {
      const res = await supabase.from('expense_categories').update(record).eq('id', editingCategory.id)
      err = res.error
    } else {
      const res = await supabase.from('expense_categories').insert(record)
      err = res.error
    }
    if (err) { showToast(err.message, 'error'); return }
    showToast(editingCategory ? 'Kategori güncellendi.' : 'Kategori eklendi.', 'success')
    setEditingCategory(null)
    setCategoryForm(EMPTY_CATEGORY)
    loadCategories()
  }

  const handleDeleteCategory = (id) => {
    setConfirmDelete({
      message: 'Bu kategoriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      onConfirm: async () => {
        const { error } = await supabase.from('expense_categories').delete().eq('id', id)
        if (error) { showToast(error.message, 'error'); return }
        showToast('Kategori silindi.', 'success')
        loadCategories()
        setConfirmDelete(null)
      }
    })
  }

  /* ── When category is selected in expense form, auto-fill is_tenant_billed + distribution key ── */
  const onCategorySelect = (catId) => {
    const cat = categories.find(c => c.id === catId)
    setExpenseForm(prev => ({
      ...prev,
      category_id: catId,
      is_tenant_billed: cat ? cat.is_tenant_billable : false,
      distribution_key: cat?.default_distribution_key || prev.distribution_key || 'equal'
    }))
  }

  /* Derive the expense's home building id — apartment-scope uses the apt's building,
   * building-scope uses the direct building_id. */
  const expenseBuildingId = (e) =>
    e.apartment_id == null
      ? (e.building_id || e.buildings?.id || null)
      : (e.apartments?.building_id || e.apartments?.buildings?.id || null)

  const expenseBuildingName = (e) =>
    e.apartment_id == null
      ? (e.buildings?.name || 'Bilinmeyen Bina')
      : (e.apartments?.buildings?.name || 'Bilinmeyen Bina')

  /* ── Tenant lookup ── */
  const tenantsByApt = useMemo(() => {
    const map = {}
    tenants.forEach(t => { if (t.apartment_id) map[t.apartment_id] = t })
    return map
  }, [tenants])

  /* ── Computed: Filtered & KPI ── */
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const eBid = expenseBuildingId(e)
      if (filterBuilding && eBid !== filterBuilding) return false
      // Apartment filter: only apply to apartment-scope rows (building-scope shown when building matches)
      if (filterApartment) {
        if (e.apartment_id == null) {
          // building-scope row — show only if its building matches the filtered apt's building
          const apt = apartments.find(a => a.id === filterApartment)
          if (!apt || eBid !== apt.building_id) return false
        } else if (e.apartment_id !== filterApartment) {
          return false
        }
      }
      if (filterCategory && e.category_id !== filterCategory) return false
      if (filterYear && e.period_year && e.period_year !== filterYear) return false
      if (filterMonth && e.period_month && e.period_month !== Number(filterMonth)) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const catName = e.expense_categories?.name?.toLowerCase() || ''
        const aptName = e.apartment_id == null
          ? (expenseBuildingName(e) + ' bina geneli').toLowerCase()
          : apartmentLabel(e.apartments).toLowerCase()
        const notes = (e.notes || '').toLowerCase()
        if (!catName.includes(q) && !aptName.includes(q) && !notes.includes(q)) return false
      }
      return true
    })
  }, [expenses, filterBuilding, filterApartment, filterCategory, filterYear, filterMonth, searchQuery, apartments])

  /* Two-level grouping for the accordion: building → (buildingScope rows + apartment groups) */
  const groupedByBuilding = useMemo(() => {
    const groups = {}
    filteredExpenses.forEach(e => {
      const bid = expenseBuildingId(e) || 'unknown'
      const bname = expenseBuildingName(e)
      if (!groups[bid]) {
        groups[bid] = {
          key: bid,
          building: { id: bid, name: bname },
          buildingScope: [],
          aptMap: {},
          total: 0,
          count: 0,
        }
      }
      groups[bid].total += Number(e.amount)
      groups[bid].count += 1
      if (e.apartment_id == null) {
        groups[bid].buildingScope.push(e)
      } else {
        const aid = e.apartment_id
        if (!groups[bid].aptMap[aid]) {
          groups[bid].aptMap[aid] = {
            apt: apartments.find(a => a.id === aid) || {
              id: aid,
              unit_no: e.apartments?.unit_no,
              floor_no: e.apartments?.floor_no,
              building_id: bid,
            },
            tenant: tenantsByApt[aid] || null,
            rows: [],
            total: 0,
          }
        }
        groups[bid].aptMap[aid].rows.push(e)
        groups[bid].aptMap[aid].total += Number(e.amount)
      }
    })
    return Object.values(groups)
      .map(g => ({
        ...g,
        apartmentGroups: Object.values(g.aptMap).sort((a, b) =>
          (a.apt?.unit_no || '').localeCompare(b.apt?.unit_no || '', 'tr', { numeric: true })
        ),
      }))
      .sort((a, b) => a.building.name.localeCompare(b.building.name, 'tr'))
  }, [filteredExpenses, apartments, tenantsByApt])

  /* Auto-expand buildings when <=3, collapse when more. Also auto-expand filtered building. */
  useEffect(() => {
    if (groupedByBuilding.length === 0) return
    setExpandedBuildings(prev => {
      const next = new Set(prev)
      // If nothing explicitly expanded yet and the list is small, open all
      if (prev.size === 0 && groupedByBuilding.length <= 3) {
        groupedByBuilding.forEach(g => next.add(g.key))
      }
      if (filterBuilding) next.add(filterBuilding)
      return next
    })
  }, [groupedByBuilding.length, filterBuilding])

  const toggleBuilding = (bid) => {
    setExpandedBuildings(prev => {
      const next = new Set(prev)
      if (next.has(bid)) next.delete(bid); else next.add(bid)
      return next
    })
  }
  const toggleApartment = (aid) => {
    setExpandedApartments(prev => {
      const next = new Set(prev)
      if (next.has(aid)) next.delete(aid); else next.add(aid)
      return next
    })
  }

  const openBuildingSheet = (building, apartmentCount) => {
    setSheetCtx({
      building,
      apartmentCount,
      month: filterMonth ? Number(filterMonth) : (new Date().getMonth() + 1),
      year: filterYear || new Date().getFullYear(),
    })
    setSheetOpen(true)
  }

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const thisMonthExpenses = expenses.filter(e =>
    e.period_month === currentMonth && e.period_year === currentYear
  )
  const totalThisMonth = thisMonthExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalBillableThisMonth = thisMonthExpenses.filter(e => e.is_tenant_billed).reduce((s, e) => s + Number(e.amount), 0)
  const totalNonBillableThisMonth = totalThisMonth - totalBillableThisMonth
  const totalAll = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0)

  /* Category distribution */
  const categoryDistribution = useMemo(() => {
    const dist = {}
    filteredExpenses.forEach(e => {
      const catId = e.category_id
      if (!catId) return
      if (!dist[catId]) {
        dist[catId] = {
          id: catId,
          name: e.expense_categories?.name || 'Diğer',
          color: e.expense_categories?.color || '#94A3B8',
          icon: e.expense_categories?.icon || 'Receipt',
          total: 0
        }
      }
      dist[catId].total += Number(e.amount)
    })
    return Object.values(dist).sort((a, b) => b.total - a.total)
  }, [filteredExpenses])

  const maxCategoryTotal = categoryDistribution.length > 0 ? categoryDistribution[0].total : 1

  /* ── Abrechnung Calculation ──
   * Hesap artık src/lib/abrechnungCalc.js içinde. Apartment-scope satırlar tam tutarla,
   * building-scope satırlar runtime'da o anki m²/kişi'ye göre apartmentShare ile bölünür.
   * Her kategori satırı: { name, icon, color, distKey, keyLabel, totalCost, share, isBuildingScope }.
   */
  const abrechnungData = useMemo(() => {
    if (!showAbrechnung) return null
    if (abrechnungScope === 'apartment' && !abrechnungApt) return null
    if (abrechnungScope === 'building' && !abrechnungBld) return null

    const start = new Date(abrechnungStart)
    const end = new Date(abrechnungEnd)

    if (abrechnungScope === 'apartment') {
      const roll = computeApartmentRollup({
        aptId: abrechnungApt, apartments, expenses, tenantsByApt, start, end,
      })
      if (!roll) return null
      return { mode: 'apartment', ...roll }
    }

    return computeBuildingRollup({
      buildingId: abrechnungBld, buildings, apartments, expenses, tenantsByApt, start, end,
    })
  }, [showAbrechnung, abrechnungScope, abrechnungApt, abrechnungBld, abrechnungStart, abrechnungEnd, expenses, apartments, buildings, tenantsByApt])

  /* ── PDF Export ── */
  const formatDateTR = (ds) => new Date(ds).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const generatePDF = useCallback(async () => {
    if (!abrechnungData) return
    const d = abrechnungData
    const m = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    // Build off-screen document
    const wrapper = document.createElement('div')
    wrapper.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: 794px; background: #fff;
      font-family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
      color: #0F172A; line-height: 1.5;
    `
    document.body.appendChild(wrapper)

    const isBuilding = d.mode === 'building'
    const aptLabel = isBuilding ? '—' : apartmentLabel(d.apt)
    const tenantLabel = isBuilding ? '—' : (d.tenant?.full_name || 'Aktif kiracı yok')
    const periodLabel = `${formatDateTR(abrechnungStart)} — ${formatDateTR(abrechnungEnd)}`

    const diffSign = d.difference > 0 ? '+' : ''
    const diffLabel = d.difference > 0 ? 'Ek Ödeme Gerekli' : d.difference < 0 ? 'Kiracıya İade' : 'Dengede'
    const diffSub = d.difference > 0 ? 'Kiracı fark tutarını ek olarak ödemelidir.' : d.difference < 0 ? 'Fazla ödenen tutar kiracıya iade edilmelidir.' : 'Aidat ödemeleri ile giderler dengelenmiştir.'
    const diffBg = d.difference > 0 ? '#FEF2F2' : d.difference < 0 ? '#F0FDF4' : '#F8FAFC'
    const diffBorder = d.difference > 0 ? '#FECACA' : d.difference < 0 ? '#BBF7D0' : '#E2E8F0'
    const diffColor = d.difference > 0 ? '#DC2626' : d.difference < 0 ? '#059669' : '#0F172A'

    // Apartment mode uses 4 columns (Kategori / Anahtar / Toplam / Pay), building mode 2 columns
    const isApartmentMode = d.mode === 'apartment'

    const billableHeaderCells = isApartmentMode ? `
      <th style="padding:14px 18px;font-size:10px;font-weight:800;color:#B45309;text-align:left;text-transform:uppercase;letter-spacing:1px;background:#FFFBF5;border-bottom:1px solid #FCD9A8">Kalem</th>
      <th style="padding:14px 18px;font-size:10px;font-weight:800;color:#B45309;text-align:left;text-transform:uppercase;letter-spacing:1px;background:#FFFBF5;border-bottom:1px solid #FCD9A8">Anahtar</th>
      <th style="padding:14px 18px;font-size:10px;font-weight:800;color:#B45309;text-align:right;text-transform:uppercase;letter-spacing:1px;background:#FFFBF5;border-bottom:1px solid #FCD9A8">Toplam (₺)</th>
      <th style="padding:14px 18px;font-size:10px;font-weight:800;color:#B45309;text-align:right;text-transform:uppercase;letter-spacing:1px;background:#FFFBF5;border-bottom:1px solid #FCD9A8">Sizin Payınız (₺)</th>
    ` : `
      <th style="padding:14px 18px;font-size:10px;font-weight:800;color:#B45309;text-align:left;text-transform:uppercase;letter-spacing:1px;background:#FFFBF5;border-bottom:1px solid #FCD9A8">Gider Kalemi</th>
      <th style="padding:14px 18px;font-size:10px;font-weight:800;color:#B45309;text-align:right;text-transform:uppercase;letter-spacing:1px;background:#FFFBF5;border-bottom:1px solid #FCD9A8">Tutar (₺)</th>
    `

    const dkFullLabel = (k) => ({ equal: 'Eşit Pay', area: 'Konut Alanı (m²)', persons: 'Kişi Sayısı', units: 'Daire Sayısı' })[k] || 'Eşit Pay'
    const anahtarText = (cat) => cat.keyLabel === 'Daire özel'
      ? 'Daire Özel'
      : `${dkFullLabel(cat.distKey)} · ${cat.keyLabel || ''}`

    const billableRows = d.byCategory.length > 0
      ? (isApartmentMode
          ? d.byCategory.map(cat => `
              <tr>
                <td style="padding:14px 18px;font-size:13px;font-weight:500;color:#0F172A;border-bottom:1px solid #F1F5F9">${cat.name}</td>
                <td style="padding:14px 18px;font-size:12px;font-style:italic;color:#8A7A5E;border-bottom:1px solid #F1F5F9">${anahtarText(cat)}</td>
                <td style="padding:14px 18px;font-size:13px;text-align:right;color:#475569;font-weight:500;border-bottom:1px solid #F1F5F9;font-variant-numeric:tabular-nums">${m(cat.totalCost)} ₺</td>
                <td style="padding:14px 18px;font-size:13px;text-align:right;font-weight:700;color:#0F172A;border-bottom:1px solid #F1F5F9;font-variant-numeric:tabular-nums">${m(cat.share)} ₺</td>
              </tr>`).join('')
          : d.byCategory.map(cat => `
              <tr>
                <td style="padding:14px 18px;font-size:13px;border-bottom:1px solid #F1F5F9">${cat.name}</td>
                <td style="padding:14px 18px;font-size:13px;text-align:right;font-weight:600;border-bottom:1px solid #F1F5F9;font-variant-numeric:tabular-nums">${m(cat.total)} ₺</td>
              </tr>`).join(''))
      : `<tr><td colspan="${isApartmentMode ? 4 : 2}" style="padding:20px;text-align:center;color:#94A3B8;font-size:13px;font-style:italic">Bu dönemde yansıtılabilir gider bulunamadı</td></tr>`

    const billableTotalRow = isApartmentMode ? `
      <tr style="background:#F0FDF4">
        <td style="padding:14px 18px;font-size:13px;font-weight:800;color:#059669;border-top:2px solid #BBF7D0">Toplam Pay</td>
        <td style="padding:14px 18px;border-top:2px solid #BBF7D0"></td>
        <td style="padding:14px 18px;border-top:2px solid #BBF7D0"></td>
        <td style="padding:14px 18px;font-size:14px;font-weight:800;color:#059669;text-align:right;border-top:2px solid #BBF7D0;font-variant-numeric:tabular-nums">${m(d.totalBillable)} ₺</td>
      </tr>
    ` : `
      <tr style="background:#F0FDF4">
        <td style="padding:14px 18px;font-size:14px;font-weight:700;color:#059669;border-top:2px solid #BBF7D0">Toplam Yansıtılabilir</td>
        <td style="padding:14px 18px;font-size:14px;font-weight:700;color:#059669;text-align:right;border-top:2px solid #BBF7D0;font-variant-numeric:tabular-nums">${m(d.totalBillable)} ₺</td>
      </tr>
    `

    // Non-billable rows
    const nbColSpan = isApartmentMode ? 2 : 2
    const nbAmount = (cat) => isApartmentMode ? cat.share : cat.total
    const nonBillableSection = d.nonBillableByCategory.length > 0 ? `
      <div style="margin-top:28px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <div style="width:4px;height:18px;border-radius:2px;background:#DC2626"></div>
          <h3 style="margin:0;font-size:14px;font-weight:700;color:#64748B">Yansıtılamaz Giderler (Referans)</h3>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden">
          ${d.nonBillableByCategory.map(cat => `
            <tr>
              <td style="padding:10px 16px;font-size:13px;border-bottom:1px solid #F1F5F9">${cat.name}</td>
              <td style="padding:10px 16px;font-size:13px;text-align:right;font-weight:600;border-bottom:1px solid #F1F5F9;font-variant-numeric:tabular-nums">₺${m(nbAmount(cat))}</td>
            </tr>`).join('')}
          <tr style="background:#FEF2F2">
            <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#DC2626;border-top:1px solid #E5E7EB">Toplam yansıtılamaz</td>
            <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#DC2626;text-align:right;border-top:1px solid #E5E7EB;font-variant-numeric:tabular-nums">₺${m(d.totalNonBillable)}</td>
          </tr>
        </table>
      </div>` : ''

    wrapper.innerHTML = `
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#025864,#03363D);padding:36px 48px 28px;position:relative;overflow:hidden">
        <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(0,212,126,0.08)"></div>
        <div style="position:absolute;bottom:-20px;right:60px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.04)"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">KiraciYonet</div>
            <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px">Yan Gider Hesap Kesimi</h1>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.6)">Dönemsel Gider Raporu</p>
          </div>
          <div style="text-align:right">
            <div style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Belge No</div>
            <div style="font-size:13px;font-weight:700;color:#fff">${Date.now().toString(36).toUpperCase()}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:6px">Oluşturma: ${formatDateTR(new Date().toISOString())}</div>
          </div>
        </div>
      </div>

      <!-- Date Range Bar -->
      <div style="background:#F0FDF4;border-bottom:2px solid #BBF7D0;padding:14px 48px;display:flex;justify-content:center;align-items:center;gap:12px">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span style="font-size:15px;font-weight:700;color:#059669;letter-spacing:0.3px">${periodLabel}</span>
        <span style="font-size:12px;color:#059669;opacity:0.7">(${d.monthsInPeriod} Ay)</span>
      </div>

      <!-- Body -->
      <div style="padding:32px 48px 40px">
        <!-- Property / Building Info Cards -->
        <div style="display:flex;gap:16px;margin-bottom:32px">
          ${isBuilding ? `
            <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px">
              <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Bina</div>
              <div style="font-size:16px;font-weight:800;color:#0F172A">${d.building?.name || '—'}</div>
            </div>
            <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px">
              <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Daire Sayısı</div>
              <div style="font-size:16px;font-weight:800;color:#0F172A">${d.apartmentRows.length}</div>
            </div>
            <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px">
              <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Toplam Aidat</div>
              <div style="font-size:16px;font-weight:800;color:#0F172A">₺${m(d.totalVorauszahlung)}</div>
            </div>
          ` : `
            <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px">
              <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Mülk</div>
              <div style="font-size:16px;font-weight:800;color:#0F172A">${aptLabel}</div>
            </div>
            <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px">
              <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Kiracı</div>
              <div style="font-size:16px;font-weight:800;color:#0F172A">${tenantLabel}</div>
            </div>
            <div style="flex:1;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 20px">
              <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Aylık Aidat</div>
              <div style="font-size:16px;font-weight:800;color:#0F172A">₺${m(d.vorauszahlung)}</div>
            </div>
          `}
        </div>

        ${isBuilding ? `
          <!-- Daire Bazlı Dağılım -->
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <div style="width:4px;height:18px;border-radius:2px;background:#025864"></div>
            <h3 style="margin:0;font-size:14px;font-weight:700;color:#0F172A">Daire Bazlı Dağılım</h3>
          </div>
          <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:24px">
            <thead>
              <tr style="background:#F8FAFC">
                <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#94A3B8;text-align:left;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB">Daire</th>
                <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#94A3B8;text-align:left;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB">Kiracı</th>
                <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#94A3B8;text-align:right;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB">Yansıtılabilir</th>
                <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#94A3B8;text-align:right;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB">Aidat</th>
                <th style="padding:10px 14px;font-size:10px;font-weight:700;color:#94A3B8;text-align:right;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #E5E7EB">Fark</th>
              </tr>
            </thead>
            <tbody>
              ${d.apartmentRows.map(r => {
                const floor = r.apt?.floor_no ? `Kat ${r.apt.floor_no} ` : ''
                const label = `${floor}Daire ${r.apt?.unit_no || '—'}`
                const dColor = r.difference > 0 ? '#DC2626' : r.difference < 0 ? '#059669' : '#0F172A'
                const dSign = r.difference > 0 ? '+' : ''
                return `
                  <tr>
                    <td style="padding:10px 14px;font-size:12px;font-weight:700;border-bottom:1px solid #F1F5F9">${label}</td>
                    <td style="padding:10px 14px;font-size:12px;border-bottom:1px solid #F1F5F9;color:${r.tenant ? '#0F172A' : '#94A3B8'}">${r.tenant?.full_name || '— boş —'}</td>
                    <td style="padding:10px 14px;font-size:12px;text-align:right;font-weight:600;border-bottom:1px solid #F1F5F9;font-variant-numeric:tabular-nums">₺${m(r.totalBillable)}</td>
                    <td style="padding:10px 14px;font-size:12px;text-align:right;font-weight:600;color:#64748B;border-bottom:1px solid #F1F5F9;font-variant-numeric:tabular-nums">₺${m(r.totalVorauszahlung)}</td>
                    <td style="padding:10px 14px;font-size:12px;text-align:right;font-weight:800;color:${dColor};border-bottom:1px solid #F1F5F9;font-variant-numeric:tabular-nums">${dSign}₺${m(Math.abs(r.difference))}</td>
                  </tr>`
              }).join('')}
              <tr style="background:#F0FDF4">
                <td colspan="2" style="padding:12px 14px;font-size:13px;font-weight:800;color:#059669;border-top:2px solid #BBF7D0">Bina Toplamı</td>
                <td style="padding:12px 14px;font-size:13px;text-align:right;font-weight:800;color:#059669;border-top:2px solid #BBF7D0;font-variant-numeric:tabular-nums">₺${m(d.totalBillable)}</td>
                <td style="padding:12px 14px;font-size:13px;text-align:right;font-weight:800;color:#059669;border-top:2px solid #BBF7D0;font-variant-numeric:tabular-nums">₺${m(d.totalVorauszahlung)}</td>
                <td style="padding:12px 14px;font-size:13px;text-align:right;font-weight:800;color:${d.difference > 0 ? '#DC2626' : d.difference < 0 ? '#059669' : '#0F172A'};border-top:2px solid #BBF7D0;font-variant-numeric:tabular-nums">${d.difference > 0 ? '+' : ''}₺${m(Math.abs(d.difference))}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        <!-- Billable Expenses -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <div style="width:4px;height:18px;border-radius:2px;background:#00D47E"></div>
          <h3 style="margin:0;font-size:14px;font-weight:700;color:#0F172A">Kiracıya Yansıtılabilir Giderler</h3>
        </div>
        ${isApartmentMode ? '<p style="margin:0 0 10px;font-size:11px;color:#64748B">Kiracı ile mutabık kalınan dağıtım anahtarlarına göre hesaplanmıştır.</p>' : ''}
        <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:8px">
          <thead>
            <tr style="background:#F8FAFC">
              ${billableHeaderCells}
            </tr>
          </thead>
          <tbody>
            ${billableRows}
            ${billableTotalRow}
          </tbody>
        </table>

        <!-- Aidat -->
        <div style="border:1px solid #E5E7EB;border-radius:10px;padding:14px 20px;margin:20px 0;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:14px;font-weight:600;color:#0F172A">${isBuilding ? 'Bina Toplam Aidat' : 'Aylık Aidat Ödemeleri'}</div>
            <div style="font-size:12px;color:#94A3B8;margin-top:2px">${isBuilding ? `${d.apartmentRows.length} daireden ${d.monthsInPeriod} aylık dönem` : `${d.monthsInPeriod} ay × ₺${m(d.vorauszahlung)} / ay`}</div>
          </div>
          <div style="font-size:16px;font-weight:800;color:#0F172A;font-variant-numeric:tabular-nums">₺${m(d.totalVorauszahlung)}</div>
        </div>

        <!-- Difference Box -->
        <div style="background:${diffBg};border:2px solid ${diffBorder};border-radius:12px;padding:20px 24px;margin:24px 0;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:18px;font-weight:800;color:${diffColor}">${diffLabel}</div>
            <div style="font-size:12px;color:#64748B;margin-top:4px">${diffSub}</div>
          </div>
          <div style="font-size:32px;font-weight:800;color:${diffColor};font-variant-numeric:tabular-nums;letter-spacing:-1px">${diffSign}₺${m(Math.abs(d.difference))}</div>
        </div>

        ${nonBillableSection}
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #E5E7EB;padding:16px 48px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:10px;color:#94A3B8">Bu belge KiraciYonet sistemi tarafından otomatik oluşturulmuştur.</span>
        <span style="font-size:10px;color:#94A3B8">${formatDateTR(new Date().toISOString())} • Sayfa 1/1</span>
      </div>
    `

    const canvas = await html2canvas(wrapper, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: false
    })
    document.body.removeChild(wrapper)

    const imgData = canvas.toDataURL('image/jpeg', 0.82)
    const imgW = canvas.width
    const imgH = canvas.height
    const pdfW = 210
    const pdfMargin = 0
    const contentW = pdfW
    const contentH = (imgH * contentW) / imgW
    const pageH = 297
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })

    if (contentH <= pageH) {
      doc.addImage(imgData, 'JPEG', pdfMargin, 0, contentW, contentH)
    } else {
      const pageContentPx = (pageH / contentH) * imgH
      let srcY = 0
      let page = 0
      while (srcY < imgH) {
        if (page > 0) doc.addPage()
        const sliceH = Math.min(pageContentPx, imgH - srcY)
        const sliceCanvas = document.createElement('canvas')
        sliceCanvas.width = imgW
        sliceCanvas.height = sliceH
        const ctx = sliceCanvas.getContext('2d')
        ctx.drawImage(canvas, 0, srcY, imgW, sliceH, 0, 0, imgW, sliceH)
        const sliceMMH = (sliceH * contentW) / imgW
        doc.addImage(sliceCanvas.toDataURL('image/jpeg', 0.82), 'JPEG', pdfMargin, 0, contentW, sliceMMH)
        srcY += sliceH
        page++
      }
    }

    const reportName = isBuilding
      ? `Bina_${d.building?.name || 'rapor'}`
      : (d.apt ? `${d.apt.buildings?.name || ''}_${d.apt.unit_no || ''}`.replace(/^_|_$/g, '') || 'rapor' : 'rapor')
    doc.save(`Hesap_Kesimi_${reportName}_${abrechnungStart}_${abrechnungEnd}.pdf`.replace(/\s+/g, '_'))
  }, [abrechnungData, abrechnungStart, abrechnungEnd])

  /* ── Available years for filter ── */
  const availableYears = useMemo(() => {
    const years = new Set(expenses.map(e => e.period_year).filter(Boolean))
    years.add(currentYear)
    return [...years].sort((a, b) => b - a)
  }, [expenses])

  /* ── ICON picker colors for category modal ── */
  const ICON_CHOICES = ['Receipt','Landmark','Droplets','Waves','Flame','Thermometer','ArrowUpDown','Trash','SprayCan','TreePine','Lightbulb','Wind','ShieldCheck','UserCheck','Tv','MoreHorizontal','Wrench','Briefcase','Building2','Euro']
  const COLOR_CHOICES = ['#14B8A6','#0EA5E9','#06B6D4','#F97316','#EF4444','#8B5CF6','#A855F7','#78716C','#EC4899','#22C55E','#EAB308','#64748B','#6366F1','#0D9488','#7C3AED','#475569','#DC2626','#94A3B8','#2563EB','#F472B6']

  /* ══════════════════════════════════════════ */
  /*               RENDER                      */
  /* ══════════════════════════════════════════ */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: font }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Receipt size={32} color={C.teal} />
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      variants={container} initial="hidden" animate="show"
      style={{ fontFamily: font, maxWidth: 1200, margin: '0 auto', padding: '0 4px' }}
    >
      {/* ── Header ── */}
      <motion.div variants={fadeItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: '-0.5px', margin: 0, lineHeight: 1.2 }}>
            Gider Yönetimi
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: '4px 0 0', fontWeight: 500 }}>
            Yan gider takibi & hesap kesimi
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowAbrechnung(true)}
            style={{
              fontFamily: font, fontSize: 13, fontWeight: 700,
              padding: '10px 18px', borderRadius: 12,
              background: 'linear-gradient(135deg, #025864, #03363D)',
              color: '#fff', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <FileText size={16} /> Hesap Kesimi
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowCategoryModal(true)}
            style={{
              fontFamily: font, fontSize: 13, fontWeight: 600,
              padding: '10px 14px', borderRadius: 12,
              background: C.card, color: C.text, border: `1.5px solid ${C.border}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <Settings2 size={16} /> Kategoriler
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            onClick={openAddExpense}
            style={{
              fontFamily: font, fontSize: 13, fontWeight: 700,
              padding: '10px 18px', borderRadius: 12,
              background: C.green, color: '#fff', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <Plus size={16} strokeWidth={2.5} /> Gider Ekle
          </motion.button>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <motion.div variants={fadeItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          {
            label: 'Toplam', sub: filterYear ? String(filterYear) : 'Tümü',
            value: money(totalAll), icon: TrendingUp,
            gradient: 'linear-gradient(135deg, #025864 0%, #03363D 100%)', iconBg: 'rgba(255,255,255,0.15)'
          },
          {
            label: 'Bu Ay', sub: MONTH_SHORT[currentMonth - 1],
            value: money(totalThisMonth), icon: Calendar,
            gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', iconBg: 'rgba(255,255,255,0.15)'
          },
          {
            label: 'Yansıtılabilir', sub: 'Kiracıya',
            value: money(totalBillableThisMonth), icon: Receipt,
            gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)', iconBg: 'rgba(255,255,255,0.15)'
          },
          {
            label: 'Yansıtılamaz', sub: 'Ev Sahibi',
            value: money(totalNonBillableThisMonth), icon: Wrench,
            gradient: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)', iconBg: 'rgba(255,255,255,0.15)'
          },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
            style={{
              background: kpi.gradient, borderRadius: 16, padding: '22px 24px',
              color: '#fff', position: 'relative', overflow: 'hidden', cursor: 'default'
            }}
          >
            <div style={{ position: 'absolute', top: 16, right: 16, background: kpi.iconBg, borderRadius: 12, padding: 10 }}>
              <kpi.icon size={20} color="rgba(255,255,255,0.8)" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 2 }}>{kpi.label}</div>
            <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.6, marginBottom: 10 }}>{kpi.sub}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>₺{kpi.value}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Filters ── */}
      <motion.div variants={fadeItem} style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 280 }}>
          <Search size={16} color={C.textFaint} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            placeholder="Ara..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 36 }}
          />
        </div>
        <select
          value={filterBuilding}
          onChange={e => { setFilterBuilding(e.target.value); setFilterApartment('') }}
          style={{ ...inputStyle, width: 180, cursor: 'pointer' }}
        >
          <option value="">Tüm Binalar</option>
          {buildings.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={filterApartment} onChange={e => setFilterApartment(e.target.value)}
          style={{ ...inputStyle, width: 180, cursor: 'pointer' }}
        >
          <option value="">Tüm Daireler</option>
          {apartments
            .filter(a => !filterBuilding || a.building_id === filterBuilding)
            .map(a => {
              const floor = a.floor_no ? `Kat ${a.floor_no} ` : ''
              return <option key={a.id} value={a.id}>{floor}Daire {a.unit_no || '—'}</option>
            })}
        </select>
        <select
          value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          style={{ ...inputStyle, width: 180, cursor: 'pointer' }}
        >
          <option value="">Tüm Kategoriler</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterYear} onChange={e => setFilterYear(Number(e.target.value))}
          style={{ ...inputStyle, width: 110, cursor: 'pointer' }}
        >
          {availableYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          style={{ ...inputStyle, width: 140, cursor: 'pointer' }}
        >
          <option value="">Tüm Aylar</option>
          {MONTH_NAMES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
      </motion.div>

      {/* ── Main Content: Table + Sidebar ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* ── Expense Accordion ── */}
        <motion.div variants={fadeItem} style={cardBox}>
          {filteredExpenses.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: C.textFaint, fontSize: 14 }}>
              {expenses.length === 0 ? 'Henüz gider kaydı yok.' : 'Seçili filtrelere uygun sonuç bulunamadı.'}
            </div>
          ) : (
            <div>
              {groupedByBuilding.map((group, gIdx) => {
                const isOpen = expandedBuildings.has(group.key)
                const aptCount = group.apartmentGroups.length
                const buildingScopeTotal = group.buildingScope.reduce((s, e) => s + Number(e.amount), 0)
                return (
                  <div key={group.key} style={{ borderTop: gIdx > 0 ? `1px solid ${C.borderLight}` : 'none' }}>
                    {/* ── Building header row ── */}
                    <div
                      onClick={() => toggleBuilding(group.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 20px',
                        background: isOpen ? 'var(--row-bg-open)' : 'var(--row-bg-closed)',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      <motion.div
                        animate={{ rotate: isOpen ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', alignItems: 'center' }}
                      >
                        <ChevronRight size={16} color={C.textMuted} />
                      </motion.div>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: C.teal, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(2,88,100,0.25)', flexShrink: 0
                      }}>
                        <Building2 size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: '-0.1px' }}>
                          {group.building.name}
                        </div>
                        <div style={{ fontSize: 11, color: C.textFaint, fontWeight: 600, marginTop: 2 }}>
                          {group.count} kayıt · {aptCount} daire
                          {group.buildingScope.length > 0 && ` · ${group.buildingScope.length} bina geneli`}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 14, fontWeight: 800, color: C.teal,
                        fontVariantNumeric: 'tabular-nums'
                      }}>
                        ₺{money(group.total)}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                        onClick={(e) => { e.stopPropagation(); openBuildingSheet(group.building, aptCount) }}
                        style={{
                          fontFamily: font, fontSize: 12, fontWeight: 700,
                          padding: '8px 14px', borderRadius: 10,
                          border: 'none', cursor: 'pointer',
                          background: C.green, color: '#fff',
                          display: 'flex', alignItems: 'center', gap: 6,
                          boxShadow: '0 2px 8px rgba(0,212,126,0.25)'
                        }}
                      >
                        <Plus size={13} />
                        Ay Gideri
                      </motion.button>
                    </div>

                    {/* ── Collapsible content ── */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          {/* Building-scope block */}
                          {group.buildingScope.length > 0 && (
                            <div style={{
                              background: 'var(--accent-tint-bg)',
                              borderTop: `1px solid ${C.borderLight}`,
                              padding: '12px 20px 14px 50px',
                            }}>
                              <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: 10
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Layers size={13} color={C.teal} />
                                  <span style={{ fontSize: 11, fontWeight: 800, color: C.teal, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Bina Geneli Giderler
                                  </span>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: C.teal, fontVariantNumeric: 'tabular-nums' }}>
                                  ₺{money(buildingScopeTotal)}
                                </span>
                              </div>
                              {group.buildingScope.map((exp, idx) => {
                                const dk = getDistributionKey(exp.distribution_key || 'equal')
                                const DKIcon = dk.Icon
                                return (
                                  <motion.div
                                    key={exp.id}
                                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                                    whileHover={{ backgroundColor: isDark ? 'rgba(0,180,199,0.12)' : 'rgba(2,88,100,0.05)' }}
                                    onClick={() => openEditExpense(exp)}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '80px 1.4fr auto auto 90px 60px',
                                      gap: 10, alignItems: 'center',
                                      padding: '10px 12px', borderRadius: 8,
                                      cursor: 'pointer', fontSize: 13,
                                      transition: 'background 0.15s'
                                    }}
                                  >
                                    <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
                                      {formatDate(exp.expense_date)}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                      <div style={{
                                        width: 24, height: 24, borderRadius: 7,
                                        background: `${exp.expense_categories?.color || '#94A3B8'}15`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                      }}>
                                        <CategoryIcon name={exp.expense_categories?.icon} size={13} color={exp.expense_categories?.color || '#94A3B8'} />
                                      </div>
                                      <span style={{ fontWeight: 600, fontSize: 12, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {exp.expense_categories?.name || '—'}
                                      </span>
                                    </div>
                                    <span style={{
                                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                                      background: dk.chipBg, color: dk.chipFg,
                                      display: 'flex', alignItems: 'center', gap: 4,
                                    }}>
                                      <DKIcon size={10} />
                                      {dk.short}
                                    </span>
                                    <span style={{
                                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                                      background: exp.is_tenant_billed ? C.greenBg : C.redBg,
                                      color: exp.is_tenant_billed ? C.greenFg : C.redFg,
                                    }}>
                                      {exp.is_tenant_billed ? 'Yansıt.' : 'Yansıtılmaz'}
                                    </span>
                                    <span style={{ textAlign: 'right', fontWeight: 800, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                                      ₺{money(exp.amount)}
                                    </span>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                      <motion.button
                                        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                                        onClick={(e) => { e.stopPropagation(); openEditExpense(exp) }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                                      >
                                        <Pencil size={13} color={C.textFaint} />
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteExpense(exp.id) }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                                      >
                                        <Trash2 size={13} color={C.red} />
                                      </motion.button>
                                    </div>
                                  </motion.div>
                                )
                              })}
                            </div>
                          )}

                          {/* Apartment groups */}
                          {group.apartmentGroups.map((aptGroup) => {
                            const aptId = aptGroup.apt.id
                            const aptOpen = expandedApartments.has(aptId)
                            const floor = aptGroup.apt?.floor_no ? `Kat ${aptGroup.apt.floor_no} · ` : ''
                            const unitLabel = `${floor}Daire ${aptGroup.apt?.unit_no || '—'}`
                            return (
                              <div key={aptId} style={{ borderTop: `1px solid ${C.borderLight}` }}>
                                <div
                                  onClick={() => toggleApartment(aptId)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 20px 12px 50px',
                                    cursor: 'pointer',
                                    background: aptOpen ? 'var(--row-bg-soft)' : 'var(--card)',
                                    transition: 'background 0.15s',
                                  }}
                                >
                                  <motion.div
                                    animate={{ rotate: aptOpen ? 90 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ display: 'flex', alignItems: 'center' }}
                                  >
                                    <ChevronRight size={14} color={C.textFaint} />
                                  </motion.div>
                                  <Home size={13} color={C.textMuted} />
                                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                                    {unitLabel}
                                  </span>
                                  <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, flex: 1 }}>
                                    {aptGroup.tenant?.full_name || <span style={{ color: C.textFaint, fontStyle: 'italic' }}>— boş —</span>}
                                  </span>
                                  <span style={{
                                    fontSize: 11, fontWeight: 700, color: C.textMuted,
                                    background: C.borderLight, padding: '2px 8px', borderRadius: 10
                                  }}>
                                    {aptGroup.rows.length}
                                  </span>
                                  <span style={{
                                    fontSize: 13, fontWeight: 800, color: C.text,
                                    fontVariantNumeric: 'tabular-nums', minWidth: 84, textAlign: 'right'
                                  }}>
                                    ₺{money(aptGroup.total)}
                                  </span>
                                </div>
                                <AnimatePresence initial={false}>
                                  {aptOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                      style={{ overflow: 'hidden', background: 'var(--row-bg-soft-2)' }}
                                    >
                                      {aptGroup.rows.map((exp, idx) => (
                                        <motion.div
                                          key={exp.id}
                                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.18, delay: idx * 0.02 }}
                                          whileHover={{ backgroundColor: isDark ? '#1B242F' : '#F1F5F9' }}
                                          onClick={() => openEditExpense(exp)}
                                          style={{
                                            display: 'grid',
                                            gridTemplateColumns: '80px 1.4fr auto 90px 60px',
                                            gap: 10, alignItems: 'center',
                                            padding: '10px 20px 10px 82px',
                                            borderTop: idx > 0 ? `1px solid ${C.borderLight}` : 'none',
                                            cursor: 'pointer', fontSize: 13,
                                            transition: 'background 0.15s',
                                          }}
                                        >
                                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
                                            {formatDate(exp.expense_date)}
                                          </span>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                            <div style={{
                                              width: 24, height: 24, borderRadius: 7,
                                              background: `${exp.expense_categories?.color || '#94A3B8'}15`,
                                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                            }}>
                                              <CategoryIcon name={exp.expense_categories?.icon} size={13} color={exp.expense_categories?.color || '#94A3B8'} />
                                            </div>
                                            <span style={{ fontWeight: 600, fontSize: 12, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {exp.expense_categories?.name || '—'}
                                            </span>
                                          </div>
                                          <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                                            background: exp.is_tenant_billed ? C.greenBg : C.redBg,
                                            color: exp.is_tenant_billed ? C.greenFg : C.redFg,
                                          }}>
                                            {exp.is_tenant_billed ? 'Yansıt.' : 'Yansıtılmaz'}
                                          </span>
                                          <span style={{ textAlign: 'right', fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                                            ₺{money(exp.amount)}
                                          </span>
                                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                            <motion.button
                                              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                                              onClick={(e) => { e.stopPropagation(); openEditExpense(exp) }}
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                                            >
                                              <Pencil size={13} color={C.textFaint} />
                                            </motion.button>
                                            <motion.button
                                              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                                              onClick={(e) => { e.stopPropagation(); handleDeleteExpense(exp.id) }}
                                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                                            >
                                              <Trash2 size={13} color={C.red} />
                                            </motion.button>
                                          </div>
                                        </motion.div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}

          {/* Footer summary */}
          {filteredExpenses.length > 0 && (
            <div style={{
              padding: '14px 24px', borderTop: `1px solid ${C.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 13, color: C.textMuted, fontWeight: 600
            }}>
              <span>{filteredExpenses.length} kayıt · {groupedByBuilding.length} bina</span>
              <span style={{ fontWeight: 800, color: C.text }}>Toplam: ₺{money(totalAll)}</span>
            </div>
          )}
        </motion.div>

        {/* ── Sidebar: Category Distribution ── */}
        <motion.div variants={fadeItem} style={cardBox}>
          <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${C.borderLight}` }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>Gider Dağılımı</h3>
            <p style={{ fontSize: 11, color: C.textFaint, margin: '2px 0 0' }}>Kategoriye Göre</p>
          </div>
          <div style={{ padding: '12px 20px 16px' }}>
            {categoryDistribution.length === 0 ? (
              <p style={{ fontSize: 13, color: C.textFaint, textAlign: 'center', padding: 20 }}>Veri yok</p>
            ) : (
              categoryDistribution.map((cat, i) => {
                const pct = totalAll > 0 ? (cat.total / totalAll * 100) : 0
                return (
                  <div key={cat.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CategoryIcon name={cat.icon} size={13} color={cat.color} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{cat.name}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                        ₺{money(cat.total)}
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: C.borderLight, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: '100%', borderRadius: 3, background: cat.color }}
                      />
                    </div>
                    <div style={{ fontSize: 10, color: C.textFaint, marginTop: 2, textAlign: 'right' }}>
                      {pct.toFixed(1)}%
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* ══════════════════════════════════ */}
      {/*   EXPENSE MODAL                   */}
      {/* ══════════════════════════════════ */}
      <AnimatePresence>
        {showExpenseModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, backdropFilter: 'blur(4px)'
            }}
            onClick={() => setShowExpenseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: C.card, borderRadius: 20, padding: 32, width: 520,
                maxHeight: '85vh', overflow: 'auto',
                boxShadow: 'var(--modal-shadow)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>
                  {editingExpense ? 'Gider Düzenle' : 'Yeni Gider'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setShowExpenseModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} color={C.textMuted} />
                </motion.button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Scope Toggle — only when adding */}
                {!editingExpense && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Kapsam</label>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
                      background: '#FAFBFC', border: `1.5px solid ${C.border}`,
                      borderRadius: 10, padding: 4
                    }}>
                      {[
                        { key: 'building', label: 'Tüm Bina', Icon: Building2 },
                        { key: 'apartment', label: 'Tek Daire', Icon: Home }
                      ].map(opt => {
                        const active = expenseForm.scope === opt.key
                        const Icon = opt.Icon
                        return (
                          <motion.button
                            key={opt.key}
                            type="button"
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setExpenseForm(prev => ({
                              ...prev, scope: opt.key, apartment_id: '', building_id: ''
                            }))}
                            style={{
                              fontFamily: font, fontSize: 12, fontWeight: 700,
                              padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              background: active ? C.teal : 'transparent',
                              color: active ? '#fff' : C.textMuted,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              transition: 'background 0.15s, color 0.15s'
                            }}
                          >
                            <Icon size={14} />
                            {opt.label}
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Building picker (when scope=building) */}
                {!editingExpense && expenseForm.scope === 'building' ? (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Bina *</label>
                    <select
                      value={expenseForm.building_id}
                      onChange={e => setExpenseForm(prev => ({ ...prev, building_id: e.target.value }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      <option value="">Bina seçin...</option>
                      {buildings.map(b => {
                        const count = apartments.filter(a => a.building_id === b.id).length
                        return (
                          <option key={b.id} value={b.id} disabled={count === 0}>
                            {b.name} ({count} daire)
                          </option>
                        )
                      })}
                    </select>
                  </div>
                ) : (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Mülk *</label>
                    <select
                      value={expenseForm.apartment_id}
                      onChange={e => setExpenseForm(prev => ({ ...prev, apartment_id: e.target.value }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      <option value="">Mülk seçin...</option>
                      {apartments.map(a => (
                        <option key={a.id} value={a.id}>{apartmentLabel(a)}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Category */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Kategori *</label>
                  <select
                    value={expenseForm.category_id}
                    onChange={e => onCategorySelect(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">Kategori seçin...</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.is_tenant_billable ? ' (yansıtılabilir)' : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Distribution Key */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>
                    Dağıtım Anahtarı
                    {expenseForm.scope === 'apartment' && (
                      <span style={{ fontSize: 10, fontWeight: 500, color: C.textFaint, marginLeft: 6 }}>
                        (daire kapsamı · bilgilendirici)
                      </span>
                    )}
                  </label>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
                    background: '#FAFBFC', border: `1.5px solid ${C.border}`,
                    borderRadius: 10, padding: 4
                  }}>
                    {DISTRIBUTION_KEY_ORDER.map(k => {
                      const dk = DISTRIBUTION_KEYS[k]
                      const DKIcon = dk.Icon
                      const active = expenseForm.distribution_key === k
                      return (
                        <motion.button
                          key={k}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setExpenseForm(prev => ({ ...prev, distribution_key: k }))}
                          style={{
                            fontFamily: font, fontSize: 11, fontWeight: 700,
                            padding: '8px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: active ? C.teal : 'transparent',
                            color: active ? '#fff' : C.textMuted,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            transition: 'background 0.15s, color 0.15s'
                          }}
                        >
                          <DKIcon size={12} />
                          {dk.short}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label style={labelStyle}>Tutar (₺) *</label>
                  <input
                    type="number" step="0.01" min="0"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0,00"
                    style={inputStyle}
                  />
                  {!editingExpense && expenseForm.scope === 'building' && expenseForm.building_id && Number(expenseForm.amount) > 0 && (() => {
                    const bldApts = apartments.filter(a => a.building_id === expenseForm.building_id)
                    const count = bldApts.length
                    if (count === 0) return null
                    const dk = getDistributionKey(expenseForm.distribution_key)
                    return (
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: C.teal,
                        marginTop: 8, display: 'flex', alignItems: 'center', gap: 6
                      }}>
                        <ChevronRight size={12} />
                        {count} daireye {dk.label.toLowerCase()} üzerinden paylaştırılacak
                      </div>
                    )
                  })()}
                </div>

                {/* Date */}
                <div>
                  <label style={labelStyle}>Tarih</label>
                  <input
                    type="date"
                    value={expenseForm.expense_date}
                    onChange={e => setExpenseForm(prev => ({ ...prev, expense_date: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                {/* Period Month */}
                <div>
                  <label style={labelStyle}>Dönem Ayı</label>
                  <select
                    value={expenseForm.period_month}
                    onChange={e => setExpenseForm(prev => ({ ...prev, period_month: e.target.value }))}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Period Year */}
                <div>
                  <label style={labelStyle}>Dönem Yılı</label>
                  <input
                    type="number" min="2020" max="2030"
                    value={expenseForm.period_year}
                    onChange={e => setExpenseForm(prev => ({ ...prev, period_year: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                {/* Tenant Billable Toggle */}
                <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setExpenseForm(prev => ({ ...prev, is_tenant_billed: !prev.is_tenant_billed }))}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: expenseForm.is_tenant_billed ? C.green : C.border,
                      position: 'relative', transition: 'background 0.2s'
                    }}
                  >
                    <motion.div
                      animate={{ x: expenseForm.is_tenant_billed ? 20 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      style={{
                        width: 20, height: 20, borderRadius: 10, background: '#fff',
                        position: 'absolute', top: 2, left: 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                      }}
                    />
                  </motion.button>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                    Kiracıya yansıtılabilir
                  </span>
                </div>

                {/* Notes */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Notlar</label>
                  <textarea
                    value={expenseForm.notes}
                    onChange={e => setExpenseForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="İsteğe bağlı notlar..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowExpenseModal(false)}
                  style={{
                    fontFamily: font, fontSize: 13, fontWeight: 600,
                    padding: '10px 20px', borderRadius: 10,
                    background: 'none', color: C.textMuted, border: `1.5px solid ${C.border}`, cursor: 'pointer'
                  }}
                >
                  İptal
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleSaveExpense}
                  style={{
                    fontFamily: font, fontSize: 13, fontWeight: 700,
                    padding: '10px 24px', borderRadius: 10,
                    background: C.green, color: '#fff', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <Check size={16} /> {editingExpense ? 'Kaydet' : 'Ekle'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════ */}
      {/*   CATEGORY MANAGEMENT MODAL       */}
      {/* ══════════════════════════════════ */}
      <AnimatePresence>
        {showCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, backdropFilter: 'blur(4px)'
            }}
            onClick={() => setShowCategoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: C.card, borderRadius: 20, padding: 32, width: 600,
                maxHeight: '85vh', overflow: 'auto',
                boxShadow: 'var(--modal-shadow)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>
                  Gider Kategorileri
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setShowCategoryModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <X size={20} color={C.textMuted} />
                </motion.button>
              </div>

              {/* Category List */}
              <div style={{ maxHeight: 320, overflow: 'auto', marginBottom: 20 }}>
                {categories.map(cat => (
                  <div
                    key={cat.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      borderRadius: 10, marginBottom: 4,
                      background: editingCategory?.id === cat.id ? '#F0F9FF' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: `${cat.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <CategoryIcon name={cat.icon} size={16} color={cat.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{cat.name}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                        {cat.is_tenant_billable && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#ECFDF5', color: '#059669' }}>
                            Yansıtılabilir
                          </span>
                        )}
                        {cat.is_recurring && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB' }}>
                            Aylık
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <motion.button
                        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                        onClick={() => openEditCategory(cat)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                      >
                        <Pencil size={13} color={C.textFaint} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteCategory(cat.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                      >
                        <Trash2 size={13} color={C.red} />
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add/Edit Category Form */}
              <div style={{
                background: '#F8FAFC', borderRadius: 14, padding: 20,
                border: `1px solid ${C.borderLight}`
              }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 14px' }}>
                  {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori'}
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Name</label>
                    <input
                      value={categoryForm.name}
                      onChange={e => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="ör: Emlak Vergisi"
                      style={inputStyle}
                    />
                  </div>

                  {/* Icon Picker */}
                  <div>
                    <label style={labelStyle}>Icon</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {ICON_CHOICES.map(iconName => (
                        <motion.button
                          key={iconName}
                          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          onClick={() => setCategoryForm(prev => ({ ...prev, icon: iconName }))}
                          style={{
                            width: 30, height: 30, borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: categoryForm.icon === iconName ? `${categoryForm.color}20` : 'transparent',
                            outline: categoryForm.icon === iconName ? `2px solid ${categoryForm.color}` : 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          <CategoryIcon name={iconName} size={14} color={categoryForm.icon === iconName ? categoryForm.color : C.textFaint} />
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label style={labelStyle}>Renk</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {COLOR_CHOICES.map(color => (
                        <motion.button
                          key={color}
                          whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}
                          onClick={() => setCategoryForm(prev => ({ ...prev, color }))}
                          style={{
                            width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: color,
                            outline: categoryForm.color === color ? '2px solid #0F172A' : 'none',
                            outlineOffset: 2
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setCategoryForm(prev => ({ ...prev, is_tenant_billable: !prev.is_tenant_billable }))}
                      style={{
                        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: categoryForm.is_tenant_billable ? C.green : C.border,
                        position: 'relative', transition: 'background 0.2s'
                      }}
                    >
                      <motion.div
                        animate={{ x: categoryForm.is_tenant_billable ? 16 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{
                          width: 16, height: 16, borderRadius: 8, background: '#fff',
                          position: 'absolute', top: 2, left: 2,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                        }}
                      />
                    </motion.button>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Yansıtılabilir</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setCategoryForm(prev => ({ ...prev, is_recurring: !prev.is_recurring }))}
                      style={{
                        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: categoryForm.is_recurring ? C.blue : C.border,
                        position: 'relative', transition: 'background 0.2s'
                      }}
                    >
                      <motion.div
                        animate={{ x: categoryForm.is_recurring ? 16 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{
                          width: 16, height: 16, borderRadius: 8, background: '#fff',
                          position: 'absolute', top: 2, left: 2,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
                        }}
                      />
                    </motion.button>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Aylık</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                  {editingCategory && (
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={() => { setEditingCategory(null); setCategoryForm(EMPTY_CATEGORY) }}
                      style={{
                        fontFamily: font, fontSize: 12, fontWeight: 600,
                        padding: '8px 14px', borderRadius: 8,
                        background: 'none', color: C.textMuted, border: `1px solid ${C.border}`, cursor: 'pointer'
                      }}
                    >
                      İptal
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleSaveCategory}
                    style={{
                      fontFamily: font, fontSize: 12, fontWeight: 700,
                      padding: '8px 16px', borderRadius: 8,
                      background: C.teal, color: '#fff', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    <Check size={14} /> {editingCategory ? 'Kaydet' : 'Ekle'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════ */}
      {/*   NEBENKOSTENABRECHNUNG MODAL     */}
      {/* ══════════════════════════════════ */}
      <AnimatePresence>
        {showAbrechnung && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, backdropFilter: 'blur(4px)'
            }}
            onClick={() => setShowAbrechnung(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: C.card, borderRadius: 20, padding: 0, width: 680,
                maxHeight: '90vh', overflow: 'auto',
                boxShadow: 'var(--modal-shadow)'
              }}
            >
              {/* Header */}
              <div style={{
                background: 'linear-gradient(135deg, #025864, #03363D)',
                padding: '28px 32px', borderRadius: '20px 20px 0 0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
              }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>
                    Yan Gider Hesap Kesimi
                  </h2>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
                    Dönemsel gider raporu oluştur
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {abrechnungData && (
                    <motion.button
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      onClick={generatePDF}
                      style={{
                        background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                        cursor: 'pointer', padding: '8px 14px', borderRadius: 8,
                        display: 'flex', alignItems: 'center', gap: 6,
                        color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: font
                      }}
                    >
                      <Download size={14} /> PDF İndir
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setShowAbrechnung(false)}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8 }}
                  >
                    <X size={18} color="#fff" />
                  </motion.button>
                </div>
              </div>

              <div style={{ padding: '24px 32px 32px' }}>
                {/* Scope toggle */}
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Kapsam</label>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
                    background: '#FAFBFC', border: `1.5px solid ${C.border}`,
                    borderRadius: 10, padding: 4
                  }}>
                    {[
                      { key: 'building', label: 'Tüm Bina', Icon: Building2 },
                      { key: 'apartment', label: 'Tek Daire', Icon: Home }
                    ].map(opt => {
                      const active = abrechnungScope === opt.key
                      const Icon = opt.Icon
                      return (
                        <motion.button
                          key={opt.key}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            setAbrechnungScope(opt.key)
                            setAbrechnungApt('')
                            setAbrechnungBld('')
                          }}
                          style={{
                            fontFamily: font, fontSize: 12, fontWeight: 700,
                            padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: active ? C.teal : 'transparent',
                            color: active ? '#fff' : C.textMuted,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            transition: 'background 0.15s, color 0.15s'
                          }}
                        >
                          <Icon size={14} />
                          {opt.label}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Selection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
                  {abrechnungScope === 'apartment' ? (
                    <div>
                      <label style={labelStyle}>Mülk</label>
                      <select
                        value={abrechnungApt}
                        onChange={e => setAbrechnungApt(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="">Seçin...</option>
                        {apartments.map(a => {
                          const occupied = !!tenantsByApt[a.id]
                          return (
                            <option key={a.id} value={a.id} disabled={!occupied}>
                              {apartmentLabel(a)}{occupied ? '' : ' — Boş'}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label style={labelStyle}>Bina</label>
                      <select
                        value={abrechnungBld}
                        onChange={e => setAbrechnungBld(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        <option value="">Seçin...</option>
                        {buildings.map(b => {
                          const count = apartments.filter(a => a.building_id === b.id).length
                          return (
                            <option key={b.id} value={b.id} disabled={count === 0}>
                              {b.name} ({count} daire)
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Başlangıç</label>
                    <input
                      type="date" value={abrechnungStart}
                      onChange={e => setAbrechnungStart(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Bitiş</label>
                    <input
                      type="date" value={abrechnungEnd}
                      onChange={e => setAbrechnungEnd(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Report Content */}
                {abrechnungData ? (
                  <div>
                    {/* Info strip */}
                    <div style={{
                      background: '#F8FAFC', borderRadius: 12, padding: '14px 18px',
                      marginBottom: 20, border: `1px solid ${C.borderLight}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        {abrechnungData.mode === 'building' ? (
                          <>
                            <div>
                              <div style={{ fontSize: 11, color: C.textFaint, fontWeight: 600 }}>Bina</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                                {abrechnungData.building?.name || '—'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: C.textFaint, fontWeight: 600 }}>Daire Sayısı</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                                {abrechnungData.apartmentRows.length}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: C.textFaint, fontWeight: 600 }}>Dönem</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                                {abrechnungData.monthsInPeriod} Ay
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <div style={{ fontSize: 11, color: C.textFaint, fontWeight: 600 }}>Mülk</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                                {apartmentLabel(abrechnungData.apt)}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: C.textFaint, fontWeight: 600 }}>Kiracı</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                                {abrechnungData.tenant?.full_name || 'Aktif kiracı yok'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, color: C.textFaint, fontWeight: 600 }}>Dönem</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                                {abrechnungData.monthsInPeriod} Ay
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Daire Bazlı Dağılım (building mode) */}
                    {abrechnungData.mode === 'building' && (
                      <>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 4, height: 16, borderRadius: 2, background: C.teal }} />
                          Daire Bazlı Dağılım
                        </h4>
                        <div style={{
                          borderRadius: 12, border: `1px solid ${C.borderLight}`,
                          overflow: 'hidden', marginBottom: 20
                        }}>
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1.3fr 1.4fr 1fr 1fr 1fr',
                            padding: '10px 16px', background: '#F8FAFC',
                            fontSize: 10, fontWeight: 700, color: C.textFaint,
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                            borderBottom: `1px solid ${C.borderLight}`
                          }}>
                            <div>Daire</div>
                            <div>Kiracı</div>
                            <div style={{ textAlign: 'right' }}>Yansıtılabilir</div>
                            <div style={{ textAlign: 'right' }}>Aidat</div>
                            <div style={{ textAlign: 'right' }}>Fark</div>
                          </div>
                          {abrechnungData.apartmentRows.map((r, i) => {
                            const diffColor = r.difference > 0 ? '#DC2626' : r.difference < 0 ? '#059669' : C.text
                            const floor = r.apt?.floor_no ? `Kat ${r.apt.floor_no} ` : ''
                            const label = `${floor}Daire ${r.apt?.unit_no || '—'}`
                            return (
                              <div key={i} style={{
                                display: 'grid', gridTemplateColumns: '1.3fr 1.4fr 1fr 1fr 1fr',
                                padding: '10px 16px', alignItems: 'center',
                                borderBottom: i < abrechnungData.apartmentRows.length - 1 ? `1px solid ${C.borderLight}` : 'none',
                                fontSize: 12
                              }}>
                                <div style={{ fontWeight: 700, color: C.text }}>{label}</div>
                                <div style={{ color: r.tenant ? C.text : C.textFaint, fontWeight: 500 }}>
                                  {r.tenant?.full_name || '— boş —'}
                                </div>
                                <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                  ₺{money(r.totalBillable)}
                                </div>
                                <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: C.textMuted }}>
                                  ₺{money(r.totalVorauszahlung)}
                                </div>
                                <div style={{
                                  textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                                  fontWeight: 800, color: diffColor
                                }}>
                                  {r.difference > 0 ? '+' : ''}₺{money(Math.abs(r.difference))}
                                </div>
                              </div>
                            )
                          })}
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1.3fr 1.4fr 1fr 1fr 1fr',
                            padding: '12px 16px', background: '#F0FDF4',
                            borderTop: `1px solid ${C.borderLight}`,
                            fontSize: 12, fontWeight: 800
                          }}>
                            <div style={{ gridColumn: '1 / 3', color: '#059669' }}>Bina Toplamı</div>
                            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#059669' }}>
                              ₺{money(abrechnungData.totalBillable)}
                            </div>
                            <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#059669' }}>
                              ₺{money(abrechnungData.totalVorauszahlung)}
                            </div>
                            <div style={{
                              textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                              color: abrechnungData.difference > 0 ? '#DC2626' : abrechnungData.difference < 0 ? '#059669' : C.text
                            }}>
                              {abrechnungData.difference > 0 ? '+' : ''}₺{money(Math.abs(abrechnungData.difference))}
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Umlagefähige Kosten */}
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 4, height: 16, borderRadius: 2, background: C.green }} />
                      Kiracıya Yansıtılabilir Giderler
                    </h4>
                    <div style={{
                      borderRadius: 12, border: `1px solid ${C.borderLight}`, overflow: 'hidden', marginBottom: 16
                    }}>
                      {abrechnungData.mode === 'apartment' ? (
                        <>
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 130px 150px',
                            gap: 14, padding: '14px 22px', background: '#FFFBF5',
                            fontSize: 10, fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '1px',
                            borderBottom: `1px solid #FCD9A8`
                          }}>
                            <div>Kalem</div>
                            <div>Anahtar</div>
                            <div style={{ textAlign: 'right' }}>Toplam (₺)</div>
                            <div style={{ textAlign: 'right' }}>Sizin Payınız (₺)</div>
                          </div>
                          {abrechnungData.byCategory.length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: C.textFaint, fontSize: 13 }}>
                              Bu dönemde yansıtılabilir gider bulunamadı
                            </div>
                          ) : (
                            abrechnungData.byCategory.map((cat, i) => {
                              const dk = getDistributionKey(cat.distKey)
                              const isAptScope = cat.keyLabel === 'Daire özel'
                              const anahtarText = isAptScope
                                ? 'Daire Özel'
                                : `${dk.label} · ${cat.keyLabel}`
                              return (
                                <div key={i} style={{
                                  display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 130px 150px',
                                  gap: 14, padding: '14px 22px', alignItems: 'center',
                                  borderBottom: i < abrechnungData.byCategory.length - 1 ? `1px solid ${C.borderLight}` : 'none'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 500, color: C.text, minWidth: 0 }}>
                                    <CategoryIcon name={cat.icon} size={14} color={cat.color} />
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</span>
                                  </div>
                                  <div style={{
                                    fontSize: 13, fontStyle: 'italic', color: '#8A7A5E',
                                    fontWeight: 400, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                  }}>
                                    {anahtarText}
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 500, color: C.textMuted, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                    {money2(cat.totalCost)} ₺
                                  </div>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                    {money2(cat.share)} ₺
                                  </div>
                                </div>
                              )
                            })
                          )}
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 130px 150px',
                            gap: 14, padding: '16px 22px', background: '#F0FDF4',
                            borderTop: `2px solid #BBF7D0`, fontWeight: 800, fontSize: 14
                          }}>
                            <div style={{ color: '#059669' }}>Toplam Pay</div>
                            <div />
                            <div />
                            <div style={{ color: '#059669', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money2(abrechnungData.totalBillable)} ₺</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{
                            display: 'grid', gridTemplateColumns: '32px 1.2fr 1.7fr 150px',
                            gap: 14, padding: '14px 22px', background: '#FFFBF5',
                            fontSize: 10, fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '1px',
                            borderBottom: `1px solid #FCD9A8`
                          }}>
                            <div />
                            <div>Kalem</div>
                            <div>Anahtar · Dağıtım</div>
                            <div style={{ textAlign: 'right' }}>Toplam (₺)</div>
                          </div>
                          {abrechnungData.byCategory.length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: C.textFaint, fontSize: 13 }}>
                              Bu dönemde yansıtılabilir gider bulunamadı
                            </div>
                          ) : (
                            abrechnungData.byCategory.map((cat, i) => {
                              const dk = getDistributionKey(cat.distKey)
                              const catKey = `${cat.name}__${i}`
                              const open = expandedAbrechnungCats.has(catKey)
                              const isAptScope = !cat.isBuildingScope
                              const scopeLabel = isAptScope ? 'Daire Özel' : 'Bina Geneli'
                              const perApts = (cat.perApartment || []).filter(p => p.share > 0)
                              const expandable = perApts.length > 0
                              const isLast = i === abrechnungData.byCategory.length - 1
                              return (
                                <div key={i} style={{
                                  borderBottom: !isLast ? `1px solid ${C.borderLight}` : 'none',
                                  background: open ? '#FFFDF8' : 'transparent', transition: 'background 0.15s'
                                }}>
                                  <div
                                    onClick={() => expandable && setExpandedAbrechnungCats(prev => {
                                      const next = new Set(prev)
                                      next.has(catKey) ? next.delete(catKey) : next.add(catKey)
                                      return next
                                    })}
                                    style={{
                                      display: 'grid', gridTemplateColumns: '32px 1.2fr 1.7fr 150px',
                                      gap: 14, padding: '14px 22px', alignItems: 'center',
                                      cursor: expandable ? 'pointer' : 'default',
                                    }}
                                  >
                                    <div style={{ color: C.textFaint, display: 'flex', alignItems: 'center' }}>
                                      {expandable && (
                                        <ChevronRight
                                          size={14}
                                          style={{
                                            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s',
                                          }}
                                        />
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 500, color: C.text, minWidth: 0 }}>
                                      <CategoryIcon name={cat.icon} size={14} color={cat.color} />
                                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</span>
                                    </div>
                                    <div style={{
                                      fontSize: 13, fontStyle: 'italic', color: '#8A7A5E',
                                      fontWeight: 400, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}>
                                      {dk.label} · {scopeLabel}
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                      {money2(cat.total)} ₺
                                    </div>
                                  </div>
                                  {open && expandable && (
                                    <div style={{
                                      background: '#FFFBF0', borderTop: '1px solid #FDEEC6',
                                      padding: '8px 22px 14px 68px',
                                    }}>
                                      {perApts.map((p, pi) => (
                                        <div key={pi} style={{
                                          display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 150px',
                                          gap: 12, padding: '8px 0', alignItems: 'center',
                                          borderBottom: pi < perApts.length - 1 ? '1px dashed #F3E4C3' : 'none',
                                          fontSize: 12,
                                        }}>
                                          <div style={{ color: C.textMuted, fontWeight: 500, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {apartmentLabel(p.aptLabel)}
                                            {p.tenantName && (
                                              <span style={{ color: C.textFaint, marginLeft: 6, fontWeight: 400 }}>· {p.tenantName}</span>
                                            )}
                                          </div>
                                          <div style={{ color: '#8A7A5E', fontStyle: 'italic', fontSize: 11 }}>
                                            {p.keyLabel}
                                          </div>
                                          <div style={{ textAlign: 'right', fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums' }}>
                                            {money2(p.share)} ₺
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                          <div style={{
                            display: 'grid', gridTemplateColumns: '32px 1.2fr 1.7fr 150px',
                            gap: 14, padding: '16px 22px', background: '#F0FDF4',
                            borderTop: `2px solid #BBF7D0`, fontWeight: 800, fontSize: 14
                          }}>
                            <div />
                            <div style={{ color: '#059669' }}>Toplam Yansıtılabilir</div>
                            <div />
                            <div style={{ color: '#059669', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money2(abrechnungData.totalBillable)} ₺</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Aidat */}
                    <div style={{
                      borderRadius: 12, border: `1px solid ${C.borderLight}`, overflow: 'hidden', marginBottom: 16
                    }}>
                      <div style={{
                        display: 'grid', gridTemplateColumns: '1fr auto',
                        padding: '12px 16px', alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {abrechnungData.mode === 'building' ? 'Bina Toplam Aidat' : 'Aylık Aidat'}
                          </div>
                          <div style={{ fontSize: 11, color: C.textFaint }}>
                            {abrechnungData.mode === 'building'
                              ? `${abrechnungData.apartmentRows.length} daireden ${abrechnungData.monthsInPeriod} aylık dönem`
                              : `${abrechnungData.monthsInPeriod} ay × ₺${money(abrechnungData.vorauszahlung)}/ay`}
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          ₺{money(abrechnungData.totalVorauszahlung)}
                        </div>
                      </div>
                    </div>

                    {/* Difference — Nachzahlung or Guthaben */}
                    <div style={{
                      borderRadius: 14, overflow: 'hidden', marginBottom: 20,
                      background: abrechnungData.difference > 0
                        ? 'linear-gradient(135deg, #FEF2F2, #FEE2E2)'
                        : abrechnungData.difference < 0
                          ? 'linear-gradient(135deg, #F0FDF4, #DCFCE7)'
                          : 'linear-gradient(135deg, #F8FAFC, #F1F5F9)',
                      border: `2px solid ${abrechnungData.difference > 0 ? '#FECACA' : abrechnungData.difference < 0 ? '#BBF7D0' : C.border}`
                    }}>
                      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{
                            fontSize: 16, fontWeight: 800,
                            color: abrechnungData.difference > 0 ? '#DC2626' : abrechnungData.difference < 0 ? '#059669' : C.text
                          }}>
                            {abrechnungData.difference > 0
                              ? 'Ek Ödeme Gerekli'
                              : abrechnungData.difference < 0
                                ? 'Kiracıya İade'
                                : 'Dengede'}
                          </div>
                          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                            {abrechnungData.difference > 0
                              ? 'Kiracı ek ödeme yapmalı'
                              : abrechnungData.difference < 0
                                ? 'Kiracıya geri ödeme yapılmalı'
                                : 'Fark yok — tam dengelenmiş'}
                          </div>
                        </div>
                        <div style={{
                          fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                          color: abrechnungData.difference > 0 ? '#DC2626' : abrechnungData.difference < 0 ? '#059669' : C.text
                        }}>
                          {abrechnungData.difference > 0 ? '+' : ''}₺{money(Math.abs(abrechnungData.difference))}
                        </div>
                      </div>
                    </div>

                    {/* Non-billable costs (reference) */}
                    {abrechnungData.nonBillableByCategory.length > 0 && (
                      <>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 4, height: 16, borderRadius: 2, background: C.red }} />
                          Yansıtılamaz Giderler (Referans)
                        </h4>
                        <div style={{
                          borderRadius: 12, border: `1px solid ${C.borderLight}`, overflow: 'hidden', marginBottom: 16
                        }}>
                          {abrechnungData.nonBillableByCategory.map((cat, i) => {
                            const amount = abrechnungData.mode === 'apartment' ? cat.share : cat.total
                            return (
                              <div key={i} style={{
                                display: 'grid', gridTemplateColumns: '1fr auto',
                                padding: '10px 16px', alignItems: 'center',
                                borderBottom: i < abrechnungData.nonBillableByCategory.length - 1 ? `1px solid ${C.borderLight}` : 'none'
                              }}>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{cat.name}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>₺{money(amount)}</div>
                              </div>
                            )
                          })}
                          <div style={{
                            display: 'grid', gridTemplateColumns: '1fr auto',
                            padding: '10px 16px', background: '#FEF2F2',
                            borderTop: `1px solid ${C.borderLight}`, fontWeight: 700, fontSize: 13
                          }}>
                            <div style={{ color: '#DC2626' }}>Toplam yansıtılamaz</div>
                            <div style={{ color: '#DC2626' }}>₺{money(abrechnungData.totalNonBillable)}</div>
                          </div>
                        </div>
                      </>
                    )}

                  </div>
                ) : (
                  <div style={{ padding: 32, textAlign: 'center', color: C.textFaint, fontSize: 14 }}>
                    <FileText size={32} color={C.textFaint} style={{ marginBottom: 12 }} />
                    <div>
                      {abrechnungScope === 'building'
                        ? 'Rapor oluşturmak için bir bina seçin.'
                        : 'Rapor oluşturmak için bir mülk seçin.'}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        {/* ── Delete Confirmation Modal ── */}
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1100, backdropFilter: 'blur(4px)'
            }}
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: C.card, borderRadius: 16, padding: 0, width: 400,
                boxShadow: 'var(--modal-shadow)', overflow: 'hidden'
              }}
            >
              <div style={{
                background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 14
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <AlertTriangle size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>Silme Onayı</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Bu işlem geri alınamaz</p>
                </div>
              </div>
              <div style={{ padding: '24px 28px' }}>
                <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.6 }}>
                  {confirmDelete.message}
                </p>
              </div>
              <div style={{
                padding: '16px 28px', borderTop: `1px solid ${C.borderLight}`,
                display: 'flex', justifyContent: 'flex-end', gap: 10
              }}>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    padding: '10px 20px', borderRadius: 10, border: `1px solid ${C.border}`,
                    background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    color: C.textMuted, fontFamily: font
                  }}
                >
                  Vazgeç
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={confirmDelete.onConfirm}
                  style={{
                    padding: '10px 20px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    color: '#fff', fontFamily: font
                  }}
                >
                  Evet, Sil
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════ */}
      {/*   BUILDING MONTHLY EXPENSE SHEET  */}
      {/* ══════════════════════════════════ */}
      <BuildingExpenseSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSaved={() => { setSheetOpen(false); loadExpenses() }}
        building={sheetCtx.building}
        apartmentCount={sheetCtx.apartmentCount}
        categories={categories}
        initialMonth={sheetCtx.month}
        initialYear={sheetCtx.year}
      />
    </motion.div>
  )
}
