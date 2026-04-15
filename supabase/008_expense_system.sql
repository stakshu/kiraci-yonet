-- ══════════════════════════════════════════════════════════════
-- 008 — Expense System (Nebenkostenabrechnung / Betriebskosten)
-- ══════════════════════════════════════════════════════════════

-- 1. Gider Kategorileri (Betriebskostenarten)
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  icon text DEFAULT 'Receipt',
  color text DEFAULT '#64748B',
  is_tenant_billable boolean DEFAULT false,
  is_recurring boolean DEFAULT false,
  description text DEFAULT '',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id ON expense_categories(user_id);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own categories" ON expense_categories
  FOR ALL USING (auth.uid() = user_id);

-- 2. Mülk Giderleri (Betriebskosten)
CREATE TABLE IF NOT EXISTS property_expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  apartment_id uuid REFERENCES apartments(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  expense_date date NOT NULL,
  period_month int,
  period_year int,
  is_tenant_billed boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_expenses_user_id ON property_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_property_expenses_apartment_id ON property_expenses(apartment_id);
CREATE INDEX IF NOT EXISTS idx_property_expenses_category_id ON property_expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_property_expenses_date ON property_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_property_expenses_period ON property_expenses(period_year, period_month);

ALTER TABLE property_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own expenses" ON property_expenses
  FOR ALL USING (auth.uid() = user_id);

-- 3. Kiracı Vorauszahlung (aylık yan gider avansı)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS nebenkosten_vorauszahlung numeric(12,2) DEFAULT 0;
