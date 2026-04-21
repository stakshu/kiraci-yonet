// Nebenkostenabrechnung / Yan Gider Hesap Kesimi — saf hesaplayıcılar
//
// property_expenses iki moddadır:
//   · apartment-scope: apartment_id dolu, building_id boş. Tüm tutar o daireye aittir.
//   · building-scope : apartment_id=null, building_id dolu. Distribution_key'e göre
//                      bina içindeki dairelere runtime'da paylaştırılır.
//
// apartmentShare() yalnızca building-scope kayıtları için çağrılır.
// tenantsByApt: { [apartment_id]: tenant } — kişi hesabı için.

import { householdSize } from './householdSize'
import { getDistributionKey } from './distributionKeys'

const round2 = (n) => Math.round(Number(n) * 100) / 100
const nz = (n) => Number(n) || 0
const aptArea = (a) => nz(a?.m2_net) || nz(a?.m2_gross) || 0
const fmt2 = (n) => Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Bina içindeki bir daireye, bir bina-kapsamlı gider kaleminden düşen pay.
// Anahtar m²/kişi verisi yoksa eşit bölmeye (fallback) düşer.
export function apartmentShare({ totalCost, key, apt, apartments, tenantsByApt = {} }) {
  const total = nz(totalCost)
  const n = apartments?.length || 0
  if (!apt || n === 0) return { share: 0, keyLabel: '—' }

  if (key === 'area') {
    const a = aptArea(apt)
    const totalA = apartments.reduce((s, x) => s + aptArea(x), 0)
    if (totalA > 0 && a > 0) {
      return {
        share: round2(total * (a / totalA)),
        keyLabel: `${fmt2(a)} / ${fmt2(totalA)} m²`,
      }
    }
    return { share: round2(total / n), keyLabel: `m² yok · eşit` }
  }

  if (key === 'persons') {
    const p = householdSize(tenantsByApt[apt.id])
    const totalP = apartments.reduce((s, x) => s + householdSize(tenantsByApt[x.id]), 0)
    if (totalP > 0 && p > 0) {
      return {
        share: round2(total * (p / totalP)),
        keyLabel: `${p} / ${totalP}`,
      }
    }
    return { share: round2(total / n), keyLabel: `kişi yok · eşit` }
  }

  // 'equal' ve 'units' aynı sonucu verir (tek birim = bir daire)
  return {
    share: round2(total / n),
    keyLabel: `1 / ${n}`,
  }
}

// Tek daire rollup'u. Apartment-scope kayıtlar tam tutarla, building-scope kayıtlar
// apartmentShare() ile paylaştırılmış halde byCategory içine girer.
export function computeApartmentRollup({
  aptId,
  apartments,
  expenses,
  tenantsByApt = {},
  start,
  end,
}) {
  const apt = apartments.find(a => a.id === aptId)
  if (!apt) return null

  // Sadece kiracılı daireler denominator'a girer — boş daire payı aktif kiracılara
  // eşit şekilde yayılsın (m²/kişi/daire oranları kiracılı daireler üzerinden).
  const buildingApts = apartments.filter(
    a => a.building_id === apt.building_id && tenantsByApt[a.id]
  )
  const withinPeriod = (e) => {
    const d = new Date(e.expense_date)
    return d >= start && d <= end
  }

  const aptExp = expenses.filter(e => e.apartment_id === aptId && withinPeriod(e))
  const bldExp = expenses.filter(e =>
    e.apartment_id == null &&
    e.building_id === apt.building_id &&
    withinPeriod(e)
  )

  const addRow = (map, name, icon, color, distKey, keyLabel, totalCost, share, isBuildingScope) => {
    const k = `${name}__${keyLabel}`
    if (!map[k]) {
      map[k] = {
        name, icon, color, distKey, keyLabel,
        totalCost: 0, share: 0,
        isBuildingScope,
      }
    }
    map[k].totalCost += totalCost
    map[k].share += share
  }

  const billableMap = {}
  const nonBillableMap = {}

  aptExp.forEach(e => {
    const target = e.is_tenant_billed ? billableMap : nonBillableMap
    addRow(
      target,
      e.expense_categories?.name || 'Diğer',
      e.expense_categories?.icon,
      e.expense_categories?.color,
      'equal',
      'Daire özel',
      nz(e.amount),
      nz(e.amount),
      false,
    )
  })

  bldExp.forEach(e => {
    const distKey = e.distribution_key || 'equal'
    const { share, keyLabel } = apartmentShare({
      totalCost: nz(e.amount),
      key: distKey,
      apt,
      apartments: buildingApts,
      tenantsByApt,
    })
    const target = e.is_tenant_billed ? billableMap : nonBillableMap
    addRow(
      target,
      e.expense_categories?.name || 'Diğer',
      e.expense_categories?.icon,
      e.expense_categories?.color,
      distKey,
      keyLabel,
      nz(e.amount),
      share,
      true,
    )
  })

  const byCategory = Object.values(billableMap).map(r => ({
    ...r, totalCost: round2(r.totalCost), share: round2(r.share),
  }))
  const nonBillableByCategory = Object.values(nonBillableMap).map(r => ({
    ...r, totalCost: round2(r.totalCost), share: round2(r.share),
  }))

  const totalBillable = byCategory.reduce((s, r) => s + r.share, 0)
  const totalNonBillable = nonBillableByCategory.reduce((s, r) => s + r.share, 0)

  // Kiracı & lease dönemi
  const tenant = tenantsByApt[aptId] || null
  const vorauszahlung = tenant ? nz(tenant.nebenkosten_vorauszahlung) : 0
  const leaseStart = tenant?.lease_start ? new Date(tenant.lease_start) : null
  const leaseEnd = tenant?.lease_end ? new Date(tenant.lease_end) : null
  const effStart = leaseStart && leaseStart > start ? leaseStart : start
  const effEnd = leaseEnd && leaseEnd < end ? leaseEnd : end
  const monthsInPeriod = effStart <= effEnd
    ? (effEnd.getFullYear() - effStart.getFullYear()) * 12
      + (effEnd.getMonth() - effStart.getMonth()) + 1
    : 0
  const totalVorauszahlung = vorauszahlung * monthsInPeriod
  const difference = totalBillable - totalVorauszahlung
  const annualRent = tenant ? nz(tenant.rent) * monthsInPeriod : 0

  return {
    apt,
    tenant,
    byCategory,
    nonBillableByCategory,
    totalBillable: round2(totalBillable),
    totalNonBillable: round2(totalNonBillable),
    vorauszahlung,
    monthsInPeriod,
    totalVorauszahlung: round2(totalVorauszahlung),
    difference: round2(difference),
    annualRent: round2(annualRent),
    effectiveStart: effStart,
    effectiveEnd: effEnd,
  }
}

// Bina modu. Her daire için computeApartmentRollup çağrılır; sonuçlar toplam olarak
// aggregate edilir. byCategory/nonBillableByCategory name bazında birleştirilir; share
// toplamı o kategorinin bina içindeki toplam maliyetine eşit olur.
export function computeBuildingRollup({
  buildingId,
  buildings,
  apartments,
  expenses,
  tenantsByApt = {},
  start,
  end,
}) {
  const building = buildings.find(b => b.id === buildingId)
  // Sadece kiracılı daireler — hem bill satırı hem de denominator bunlardan üretilir.
  // Boş daire paydaya dahil değil, kalan kiracılar tüm maliyeti paylaşır.
  const occupiedApts = apartments.filter(
    a => a.building_id === buildingId && tenantsByApt[a.id]
  )

  const apartmentRows = occupiedApts
    .map(a => computeApartmentRollup({
      aptId: a.id, apartments, expenses, tenantsByApt, start, end,
    }))
    .filter(Boolean)

  const aggBy = {}
  const aggNonBy = {}

  apartmentRows.forEach(r => {
    r.byCategory.forEach(c => {
      if (!aggBy[c.name]) {
        aggBy[c.name] = {
          name: c.name, icon: c.icon, color: c.color,
          distKey: c.distKey, isBuildingScope: c.isBuildingScope,
          total: 0, perApartment: [],
        }
      }
      aggBy[c.name].total += c.share
      aggBy[c.name].perApartment.push({
        aptId: r.apt.id, aptLabel: r.apt, tenantName: r.tenant?.full_name || null,
        share: c.share, keyLabel: c.keyLabel,
      })
    })
    r.nonBillableByCategory.forEach(c => {
      if (!aggNonBy[c.name]) {
        aggNonBy[c.name] = { name: c.name, total: 0 }
      }
      aggNonBy[c.name].total += c.share
    })
  })

  const byCategory = Object.values(aggBy).map(c => ({ ...c, total: round2(c.total) }))
  const nonBillableByCategory = Object.values(aggNonBy).map(c => ({ ...c, total: round2(c.total) }))

  const totalBillable = apartmentRows.reduce((s, r) => s + r.totalBillable, 0)
  const totalNonBillable = apartmentRows.reduce((s, r) => s + r.totalNonBillable, 0)
  const totalVorauszahlung = apartmentRows.reduce((s, r) => s + r.totalVorauszahlung, 0)
  const annualRent = apartmentRows.reduce((s, r) => s + r.annualRent, 0)
  const difference = totalBillable - totalVorauszahlung

  const periodMonths = (end.getFullYear() - start.getFullYear()) * 12
    + (end.getMonth() - start.getMonth()) + 1

  return {
    mode: 'building',
    building,
    apartmentRows,
    byCategory,
    nonBillableByCategory,
    totalBillable: round2(totalBillable),
    totalNonBillable: round2(totalNonBillable),
    totalVorauszahlung: round2(totalVorauszahlung),
    annualRent: round2(annualRent),
    difference: round2(difference),
    monthsInPeriod: periodMonths,
  }
}
