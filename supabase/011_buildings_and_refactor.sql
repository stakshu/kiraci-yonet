-- ═══════════════════════════════════════════════════════════
-- KiraciYonet — Faz 11: Binalar (buildings) tablosu + apartments refactor
-- Bu SQL'i Supabase Dashboard → SQL Editor'de calistirin.
--
-- UYARI: Bu migration mevcut `apartments` verisini SILER (truncate cascade).
-- Mevcut kiracilar ve odemeler de silinecek. Temel kurulurken calistirilmali.
-- ═══════════════════════════════════════════════════════════

-- 1) buildings tablosu
create table if not exists public.buildings (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  city          text default '',
  district      text default '',
  address       text default '',
  building_age  int,
  notes         text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2) updated_at trigger (apartments'taki fonksiyonu yeniden kullaniyoruz)
drop trigger if exists set_updated_at_buildings on public.buildings;
create trigger set_updated_at_buildings
  before update on public.buildings
  for each row execute function public.handle_updated_at();

-- 3) RLS
alter table public.buildings enable row level security;

drop policy if exists "Users can view own buildings" on public.buildings;
create policy "Users can view own buildings"
  on public.buildings for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own buildings" on public.buildings;
create policy "Users can insert own buildings"
  on public.buildings for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own buildings" on public.buildings;
create policy "Users can update own buildings"
  on public.buildings for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own buildings" on public.buildings;
create policy "Users can delete own buildings"
  on public.buildings for delete
  using (auth.uid() = user_id);

-- 4) Index
create index if not exists idx_buildings_user_id on public.buildings(user_id);

-- 5) apartments refactor — once bagli veriyi temizle (cascade)
truncate table public.apartments cascade;

-- 6) apartments'tan artik bina seviyesine tasinan kolonlari dus
alter table public.apartments drop column if exists building;
alter table public.apartments drop column if exists city;
alter table public.apartments drop column if exists district;
alter table public.apartments drop column if exists address;
alter table public.apartments drop column if exists building_age;

-- 7) apartments'a building_id FK ekle (NOT NULL, cascade)
alter table public.apartments
  add column if not exists building_id uuid references public.buildings(id) on delete cascade not null;

-- 8) apartments icin yeni index
create index if not exists idx_apartments_building_id on public.apartments(building_id);
