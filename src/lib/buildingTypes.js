/* ── KiraciYonet — Bina tipi tanimlari ── */
import { Building2, Home } from 'lucide-react'

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
  }
}

export const BUILDING_TYPE_ORDER = ['apartman', 'mustakil']

export const isMultiUnit = (type) => BUILDING_TYPES[type]?.multiUnit ?? true
export const getBuildingType = (type) => BUILDING_TYPES[type] || BUILDING_TYPES.apartman
