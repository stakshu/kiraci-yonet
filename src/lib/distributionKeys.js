import { Ruler, Users, Home, Divide } from 'lucide-react'

export const DISTRIBUTION_KEYS = {
  equal: {
    label: 'Eşit Pay',
    short: 'Eşit',
    Icon: Divide,
    unit: 'daire',
    chipBg: 'rgba(100,116,139,0.10)',
    chipFg: '#475569',
  },
  area: {
    label: 'Konut Alanı (m²)',
    short: 'm²',
    Icon: Ruler,
    unit: 'm²',
    chipBg: 'rgba(2,88,100,0.08)',
    chipFg: '#025864',
  },
  persons: {
    label: 'Kişi Sayısı',
    short: 'Kişi',
    Icon: Users,
    unit: 'kişi',
    chipBg: 'rgba(5,150,105,0.10)',
    chipFg: '#059669',
  },
  units: {
    label: 'Daire Sayısı',
    short: 'Daire',
    Icon: Home,
    unit: 'daire',
    chipBg: 'rgba(139,92,246,0.10)',
    chipFg: '#7C3AED',
  },
}

export const DISTRIBUTION_KEY_ORDER = ['equal', 'area', 'persons', 'units']

export function getDistributionKey(k) {
  return DISTRIBUTION_KEYS[k] || DISTRIBUTION_KEYS.equal
}
