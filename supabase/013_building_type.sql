-- ═══════════════════════════════════════════════════════════
-- KiraciYonet — Faz 13: Bina tipi (apartman | mustakil | villa | dukkan | ofis | diger)
-- Bu SQL'i Supabase Dashboard → SQL Editor'de calistirin.
-- ═══════════════════════════════════════════════════════════

-- 1) building_type kolonu ekle
alter table public.buildings
  add column if not exists building_type text default 'apartman';

-- 2) Backfill: mevcut tum binalar apartman kabul edilir
update public.buildings
  set building_type = 'apartman'
  where building_type is null;

-- 3) CHECK constraint
alter table public.buildings
  drop constraint if exists buildings_type_check;
alter table public.buildings
  add constraint buildings_type_check
  check (building_type in ('apartman','mustakil'));

-- 4) Index (liste filtrelemesi icin)
create index if not exists idx_buildings_type on public.buildings(building_type);

comment on column public.buildings.building_type is
  'Bina tipi: apartman (cok daireli) | mustakil (tek birim: ev/villa/dukkan/ofis vb.)';
