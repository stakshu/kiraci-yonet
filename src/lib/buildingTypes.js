/* ── KiraciYonet — Bina tipi tanimlari ── */
import { Building2, Home, Store, Briefcase, Package } from 'lucide-react'

export const BUILDING_TYPES = {
  apartman: {
    label: 'Apartman',
    Icon: Building2,
    multiUnit: true,
    chipBg: 'rgba(2,88,100,0.08)',
    chipFg: '#025864'
  },
  mustakil: {
    label: 'Mustakil Ev',
    Icon: Home,
    multiUnit: false,
    chipBg: 'rgba(5,150,105,0.10)',
    chipFg: '#059669'
  },
  villa: {
    label: 'Villa',
    Icon: Home,
    multiUnit: false,
    chipBg: 'rgba(124,58,237,0.10)',
    chipFg: '#7C3AED'
  },
  dukkan: {
    label: 'Dukkan',
    Icon: Store,
    multiUnit: false,
    chipBg: 'rgba(217,119,6,0.10)',
    chipFg: '#D97706'
  },
  ofis: {
    label: 'Ofis',
    Icon: Briefcase,
    multiUnit: false,
    chipBg: 'rgba(37,99,235,0.10)',
    chipFg: '#2563EB'
  },
  diger: {
    label: 'Diger',
    Icon: Package,
    multiUnit: false,
    chipBg: 'rgba(100,116,139,0.10)',
    chipFg: '#475569'
  }
}

export const BUILDING_TYPE_ORDER = ['apartman', 'mustakil', 'villa', 'dukkan', 'ofis', 'diger']

export const isMultiUnit = (type) => BUILDING_TYPES[type]?.multiUnit ?? true
export const getBuildingType = (type) => BUILDING_TYPES[type] || BUILDING_TYPES.apartman
