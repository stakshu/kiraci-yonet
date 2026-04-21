// tenants.household_info JSONB = { spouse: bool, children: n, roommate: n }
// Toplam kişi sayısı = 1 (kiracının kendisi) + (spouse?1:0) + children + roommate
// Kiracı yoksa 0 döner (boş daire kişi hesabına dahil edilmez).
export function householdSize(tenant) {
  if (!tenant) return 0
  const h = tenant.household_info || {}
  const spouse = h.spouse ? 1 : 0
  const children = parseInt(h.children) || 0
  const roommate = parseInt(h.roommate) || 0
  return 1 + spouse + children + roommate
}
