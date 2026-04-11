-- ═══════════════════════════════════════════════════════════
-- KiraciYonet — Kiraciya kira alani ekleme
-- Bu SQL'i Supabase Dashboard → SQL Editor'de calistirin.
-- ═══════════════════════════════════════════════════════════

alter table public.tenants
  add column if not exists rent numeric(12,2) default 0;

comment on column public.tenants.rent is 'Aylik kira tutari (TL)';
