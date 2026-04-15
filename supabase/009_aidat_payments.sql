-- ══════════════════════════════════════════════════════════════
-- 009 — Aidat (Nebenkosten) Ödeme Takibi
-- rent_payments tablosuna type sütunu eklenir
-- ══════════════════════════════════════════════════════════════

ALTER TABLE rent_payments
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'rent'
  CHECK (type IN ('rent', 'aidat'));

CREATE INDEX IF NOT EXISTS idx_rent_payments_type ON rent_payments(type);
