-- ═══════════════════════════════════════════════════════════
-- Faz: bina düzeyinde utility (kWh elektrik, m³ su) bilgileri
--
-- Sadece info amaçlı — abrechnung hesaplarına dahil değil.
-- Yapı:
-- {
--   "electricity": { "provider": "Yedaş", "unit_price": 1.85 },
--   "water":       { "provider": "İski",  "unit_price": 12.50 }
-- }
-- ═══════════════════════════════════════════════════════════

alter table public.buildings
  add column if not exists utilities jsonb default '{}'::jsonb;
