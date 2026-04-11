-- ═══════════════════════════════════════════════════════════
-- KiraciYonet — Faz 4: Kiracılar (tenants) tablosu
-- Bu SQL'i Supabase Dashboard → SQL Editor'de calistirin.
-- ═══════════════════════════════════════════════════════════

-- 1) Tablo olustur
create table if not exists public.tenants (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  full_name       text not null,                          -- Ad Soyad
  email           text not null default '',                -- E-posta
  phone           text default '',                        -- Telefon
  tc_no           text default '',                        -- TC Kimlik (opsiyonel)
  apartment_id    uuid references public.apartments(id) on delete set null, -- Atanan daire
  lease_start     date,                                   -- Sozlesme baslangic
  lease_end       date,                                   -- Sozlesme bitis
  deposit         numeric(12,2) default 0,                -- Depozito tutari (TL)
  notes           text default '',                        -- Notlar
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 2) updated_at otomatik guncelleme trigger'i
drop trigger if exists set_updated_at on public.tenants;
create trigger set_updated_at
  before update on public.tenants
  for each row execute function public.handle_updated_at();

-- 3) Row Level Security (RLS)
alter table public.tenants enable row level security;

create policy "Users can view own tenants"
  on public.tenants for select
  using (auth.uid() = user_id);

create policy "Users can insert own tenants"
  on public.tenants for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tenants"
  on public.tenants for update
  using (auth.uid() = user_id);

create policy "Users can delete own tenants"
  on public.tenants for delete
  using (auth.uid() = user_id);

-- 4) Performans icin index
create index if not exists idx_tenants_user_id      on public.tenants(user_id);
create index if not exists idx_tenants_apartment_id on public.tenants(apartment_id);
