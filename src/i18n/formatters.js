/* ── Currency + Date formatters — language-aware ── */
import i18n from './index'
import { SUPPORTED_LANGUAGES } from './index'

export function getLocaleConfig(lang) {
  const code = (lang || i18n.language || 'tr').split('-')[0]
  return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0]
}

export function formatMoney(value, opts = {}) {
  const cfg = getLocaleConfig(opts.lang)
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n)
}

export function formatNumber(value, opts = {}) {
  const cfg = getLocaleConfig(opts.lang)
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat(cfg.locale, {
    minimumFractionDigits: opts.min ?? 0,
    maximumFractionDigits: opts.max ?? 2
  }).format(n)
}

export function formatDate(value, opts = {}) {
  if (!value) return '—'
  const cfg = getLocaleConfig(opts.lang)
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(cfg.locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...opts.options
  }).format(d)
}

export function formatMonthYear(month, year, opts = {}) {
  const cfg = getLocaleConfig(opts.lang)
  if (month == null || year == null) return '—'
  const d = new Date(Number(year), Number(month) - 1, 1)
  return new Intl.DateTimeFormat(cfg.locale, {
    month: 'long',
    year: 'numeric'
  }).format(d)
}

export function currentCurrencySymbol(lang) {
  const cfg = getLocaleConfig(lang)
  const parts = new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency: cfg.currency
  }).formatToParts(0)
  return parts.find(p => p.type === 'currency')?.value || cfg.currency
}
