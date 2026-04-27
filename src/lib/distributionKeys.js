import { Ruler, Users, Home, Zap, Droplets } from 'lucide-react'

export const DISTRIBUTION_KEYS = {
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
  kwh: {
    label: 'Tüketim (kWh)',
    short: 'kWh',
    Icon: Zap,
    unit: 'kWh',
    chipBg: 'rgba(217,119,6,0.10)',
    chipFg: '#D97706',
    consumptionBased: true,
  },
  m3: {
    label: 'Tüketim (m³)',
    short: 'm³',
    Icon: Droplets,
    unit: 'm³',
    chipBg: 'rgba(14,165,233,0.10)',
    chipFg: '#0EA5E9',
    consumptionBased: true,
  },
}

export const DISTRIBUTION_KEY_ORDER = ['area', 'persons', 'units', 'kwh', 'm3']

// kwh / m³ için her dairenin sayaç okumasının girilmesi gerekiyor.
export const CONSUMPTION_KEYS = ['kwh', 'm3']
export const isConsumptionKey = (k) => CONSUMPTION_KEYS.includes(k)

export function getDistributionKey(k) {
  return DISTRIBUTION_KEYS[k] || DISTRIBUTION_KEYS.units
}
