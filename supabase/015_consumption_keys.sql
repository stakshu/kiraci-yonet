-- ═══════════════════════════════════════════════════════════
-- Faz: kwh + m³ tüketim bazlı dağıtım anahtarları
--
-- 1) property_expenses.distribution_key constraint'ini günceller:
--    + 'kwh', 'm3'  − 'equal' (units ile özdeşti)
-- 2) expense_categories.default_distribution_key constraint'ini günceller
-- 3) Eski 'equal' satırlarını 'units'e taşır (matematiksel olarak özdeş)
-- 4) expense_meter_readings tablosunu oluşturur (her gider için
--    daire-bazlı sayaç değerleri).
--
-- Bu SQL'i Supabase Dashboard → SQL Editor'de çalıştırın.
-- ═══════════════════════════════════════════════════════════

-- 1) Eski 'equal' verisini 'units'e taşı (eşit pay = daire sayısına göre)
update public.property_expenses
   set distribution_key = 'units'
 where distribution_key = 'equal';

update public.expense_categories
   set default_distribution_key = 'units'
 where default_distribution_key = 'equal';

-- 2) Yeni constraint set'i: equal kaldırıldı, kwh + m3 eklendi
alter table public.property_expenses
  drop constraint if exists property_expenses_dist_key_check;
alter table public.property_expenses
  add constraint property_expenses_dist_key_check
  check (distribution_key in ('area', 'persons', 'units', 'kwh', 'm3'));

alter table public.expense_categories
  drop constraint if exists expense_categories_dist_key_check;
alter table public.expense_categories
  add constraint expense_categories_dist_key_check
  check (default_distribution_key in ('area', 'persons', 'units', 'kwh', 'm3'));

-- 3) expense_meter_readings — her property_expenses satırı için daire başına
--    sayaç değeri (kwh veya m³). Tek tablo, distribution_key her ikisinde aynı.
create table if not exists public.expense_meter_readings (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references public.property_expenses(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  reading      numeric(14,3) not null default 0,
  created_at   timestamptz default now(),
  unique (expense_id, apartment_id)
);

create index if not exists idx_emr_expense on public.expense_meter_readings(expense_id);
create index if not exists idx_emr_apartment on public.expense_meter_readings(apartment_id);

-- 4) RLS — okuma izinleri property_expenses'ın sahibine bağlı
alter table public.expense_meter_readings enable row level security;

create policy "select own meter readings via expense"
  on public.expense_meter_readings for select
  using (
    exists (
      select 1 from public.property_expenses pe
       where pe.id = expense_meter_readings.expense_id
         and pe.user_id = auth.uid()
    )
  );

create policy "insert own meter readings via expense"
  on public.expense_meter_readings for insert
  with check (
    exists (
      select 1 from public.property_expenses pe
       where pe.id = expense_meter_readings.expense_id
         and pe.user_id = auth.uid()
    )
  );

create policy "update own meter readings via expense"
  on public.expense_meter_readings for update
  using (
    exists (
      select 1 from public.property_expenses pe
       where pe.id = expense_meter_readings.expense_id
         and pe.user_id = auth.uid()
    )
  );

create policy "delete own meter readings via expense"
  on public.expense_meter_readings for delete
  using (
    exists (
      select 1 from public.property_expenses pe
       where pe.id = expense_meter_readings.expense_id
         and pe.user_id = auth.uid()
    )
  );
