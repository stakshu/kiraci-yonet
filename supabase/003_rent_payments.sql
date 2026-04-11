-- ═══════════════════════════════════════════════════════════
-- KiraciYonet — Faz 6: Kira Odemeleri (rent_payments) tablosu
-- Bu SQL'i Supabase Dashboard → SQL Editor'de calistirin.
-- ═══════════════════════════════════════════════════════════

-- 1) Tablo olustur
create table if not exists public.rent_payments (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  tenant_id     uuid references public.tenants(id) on delete cascade not null,
  apartment_id  uuid references public.apartments(id) on delete set null,
  due_date      date not null,                       -- Vade tarihi
  amount        numeric(12,2) not null default 0,    -- Kira tutari (TL)
  status        text not null default 'pending'      -- pending | paid | overdue
    check (status in ('pending', 'paid', 'overdue')),
  paid_date     date,                                -- Odeme yapilan tarih
  notes         text default '',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2) updated_at otomatik guncelleme trigger'i
drop trigger if exists set_updated_at on public.rent_payments;
create trigger set_updated_at
  before update on public.rent_payments
  for each row execute function public.handle_updated_at();

-- 3) Row Level Security (RLS)
alter table public.rent_payments enable row level security;

create policy "Users can view own rent_payments"
  on public.rent_payments for select
  using (auth.uid() = user_id);

create policy "Users can insert own rent_payments"
  on public.rent_payments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own rent_payments"
  on public.rent_payments for update
  using (auth.uid() = user_id);

create policy "Users can delete own rent_payments"
  on public.rent_payments for delete
  using (auth.uid() = user_id);

-- 4) Performans icin index
create index if not exists idx_rent_payments_user_id      on public.rent_payments(user_id);
create index if not exists idx_rent_payments_tenant_id    on public.rent_payments(tenant_id);
create index if not exists idx_rent_payments_apartment_id on public.rent_payments(apartment_id);
create index if not exists idx_rent_payments_status       on public.rent_payments(status);
create index if not exists idx_rent_payments_due_date     on public.rent_payments(due_date);
