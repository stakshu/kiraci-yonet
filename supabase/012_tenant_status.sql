-- ═══════════════════════════════════════════════════════════
-- KiraciYonet — Faz 12: Kiraci statu sistemi (active/inactive/former)
-- Bu SQL'i Supabase Dashboard → SQL Editor'de calistirin.
-- ═══════════════════════════════════════════════════════════

-- 1) status kolonu ekle
alter table public.tenants
  add column if not exists status text default 'inactive';

-- 2) Geçiş (backfill) — mevcut verileri dogru statuye tasi
-- Daireli olanlar: aktif
update public.tenants
  set status = 'active'
  where apartment_id is not null;

-- Dairesiz olanlar: eskiden moveToPast ile tasinmislar → former
update public.tenants
  set status = 'former'
  where apartment_id is null;

-- 3) CHECK constraint
alter table public.tenants
  drop constraint if exists tenants_status_check;
alter table public.tenants
  add constraint tenants_status_check
  check (status in ('active', 'inactive', 'former'));

-- 4) Index (filtreleme icin)
create index if not exists idx_tenants_status on public.tenants(status);

comment on column public.tenants.status is
  'Kiraci durumu: active (daireli) | inactive (atanmamis) | former (sozlesmesi biten)';
