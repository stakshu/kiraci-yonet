-- ═══════════════════════════════════════════════════════════
-- KiraciYonet — Faz 3: Daireler (apartments) tablosu
-- Bu SQL'i Supabase Dashboard → SQL Editor'de calistirin.
-- ═══════════════════════════════════════════════════════════

-- 1) Tablo olustur
create table if not exists public.apartments (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  building    text not null,                    -- Bina adi (ör: Güneş Apt.)
  unit_no     text not null,                    -- Daire no (ör: D-001)
  city        text not null default '',         -- Sehir
  district    text not null default '',         -- Ilce
  tenant_name text default '',                  -- Kiraci adi (gecici, ileride relation olacak)
  rent        numeric(12,2) default 0,          -- Aylik kira (TL)
  lease_end   date,                             -- Sozlesme bitis tarihi
  status      text not null default 'vacant'    -- occupied | vacant | expiring
    check (status in ('occupied', 'vacant', 'expiring')),
  notes       text default '',                  -- Notlar
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2) updated_at otomatik guncelleme trigger'i
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.apartments;
create trigger set_updated_at
  before update on public.apartments
  for each row execute function public.handle_updated_at();

-- 3) Row Level Security (RLS) — Kullanici sadece kendi dairelerini gorsun
alter table public.apartments enable row level security;

-- Okuma
create policy "Users can view own apartments"
  on public.apartments for select
  using (auth.uid() = user_id);

-- Ekleme
create policy "Users can insert own apartments"
  on public.apartments for insert
  with check (auth.uid() = user_id);

-- Guncelleme
create policy "Users can update own apartments"
  on public.apartments for update
  using (auth.uid() = user_id);

-- Silme
create policy "Users can delete own apartments"
  on public.apartments for delete
  using (auth.uid() = user_id);

-- 4) Performans icin index
create index if not exists idx_apartments_user_id on public.apartments(user_id);
create index if not exists idx_apartments_status  on public.apartments(status);
