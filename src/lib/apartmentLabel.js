/* ── KiraciYonet — Daire + Bina gosterim util ── */

export function apartmentLabel(apt) {
  if (!apt) return '—'
  const name = apt.buildings?.name || apt.building?.name || apt.building_name || '—'
  const floor = apt.floor_no ? `Kat ${apt.floor_no} ` : ''
  const unit = apt.unit_no || '—'
  return `${name} / ${floor}Daire ${unit}`
}

export function buildingLabel(apt) {
  if (!apt) return '—'
  return apt.buildings?.name || apt.building?.name || apt.building_name || '—'
}

export function unitLabel(apt) {
  if (!apt) return '—'
  const floor = apt.floor_no ? `Kat ${apt.floor_no} ` : ''
  return `${floor}Daire ${apt.unit_no || '—'}`
}
