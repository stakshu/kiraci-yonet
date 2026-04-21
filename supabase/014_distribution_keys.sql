-- ══════════════════════════════════════════════════════════════
-- 014 — Distribution Keys (Umlageschlüssel) + Building-scope expenses
-- ══════════════════════════════════════════════════════════════
-- Nebenkostenabrechnung standardı her gider kalemi için bir dağıtım anahtarı
-- kullanır: alan (m²), kişi sayısı, daire sayısı, eşit pay. Bu migration:
--   · expense_categories'e default_distribution_key ekler
--   · property_expenses'e distribution_key + building_id ekler
--   · apartment_id'yi NULLABLE yapar → bina-kapsamlı (scope=building) giderler
--     apartment_id=NULL + building_id=<bina> olarak saklanır ve runtime'da
--     dairelere paylaştırılır. Kiracı/m² değişse bile geçmiş hesap doğru kalır.
-- ══════════════════════════════════════════════════════════════

-- 1) expense_categories.default_distribution_key
alter table public.expense_categories
  add column if not exists default_distribution_key text default 'equal';

alter table public.expense_categories
  drop constraint if exists expense_categories_dist_key_check;
alter table public.expense_categories
  add constraint expense_categories_dist_key_check
  check (default_distribution_key in ('equal','area','persons','units'));

-- 2) property_expenses.distribution_key
alter table public.property_expenses
  add column if not exists distribution_key text default 'equal';

alter table public.property_expenses
  drop constraint if exists property_expenses_dist_key_check;
alter table public.property_expenses
  add constraint property_expenses_dist_key_check
  check (distribution_key in ('equal','area','persons','units'));

-- 3) apartment_id nullable → bina-kapsamlı giderler için
alter table public.property_expenses
  alter column apartment_id drop not null;

-- 4) building_id → bina-kapsamlı giderin bina referansı
alter table public.property_expenses
  add column if not exists building_id uuid references public.buildings(id) on delete cascade;

create index if not exists idx_property_expenses_building
  on public.property_expenses(building_id);

create index if not exists idx_property_expenses_building_period
  on public.property_expenses(building_id, period_year, period_month);

-- 5) Kategori default'larını backfill (Türkçe isimler)
update public.expense_categories set default_distribution_key = 'area'
  where name in ('Emlak Vergisi','Isıtma','Bina Temizliği','Bahçe Bakımı',
                 'Ortak Alan Aydınlatma','Bina Sigortası','Kapıcı / Görevli');

update public.expense_categories set default_distribution_key = 'persons'
  where name in ('Su','Kanalizasyon','Sıcak Su','Sokak Temizliği','Çöp Toplama');

update public.expense_categories set default_distribution_key = 'units'
  where name in ('Baca Temizliği','Kablo TV / Anten','Asansör');

-- geri kalan tüm kategoriler → 'equal' (default)
