/* ── KiraciYonet — Daire + Bina gosterim util ──
 *
 * Bu fonksiyonlar React ağacı dışından da çağrılabildiği için i18n hook
 * yerine i18next singleton'unu doğrudan kullanıyor. i18n.t() aktif dili
 * okur; dil değişince yeniden render edildiğinde güncel metin çıkar.
 */

import i18n from '../i18n'

export function apartmentLabel(apt) {
  if (!apt) return '—'
  const building = apt.buildings?.name || apt.building?.name || apt.building_name || '—'
  const location = unitLabel(apt)
  return i18n.t('common.buildingSlashLocation', { building, location })
}

export function buildingLabel(apt) {
  if (!apt) return '—'
  return apt.buildings?.name || apt.building?.name || apt.building_name || '—'
}

export function unitLabel(apt) {
  if (!apt) return '—'
  const unit = apt.unit_no || '—'
  if (apt.floor_no) {
    return i18n.t('common.floorAndUnit', { floor: apt.floor_no, unit })
  }
  return i18n.t('common.unit', { n: unit })
}

/* Kiracı adı gibi ayırt edici bir etiket başka bir yerde gösterildiğinde
 * daireye sadece kat üzerinden atıf yapmak için kullanılır. Kat bilgisi
 * yoksa unitLabel'a düşer (hiç şeysiz bir etiket kalmasın). */
export function floorOnlyLabel(apt) {
  if (!apt) return '—'
  if (apt.floor_no) return i18n.t('common.floor', { n: apt.floor_no })
  return unitLabel(apt)
}
