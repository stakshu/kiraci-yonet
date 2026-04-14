-- ═══════════════════════════════════════════════════════════
-- KiraciYonet — Kiraci detay alanlari (acil durum, IBAN, hane)
-- Bu SQL'i Supabase Dashboard → SQL Editor'de calistirin.
-- ═══════════════════════════════════════════════════════════

alter table public.tenants
  add column if not exists emergency_contact_name text default '',
  add column if not exists emergency_contact_phone text default '',
  add column if not exists iban text default '',
  add column if not exists household_info jsonb default '{}';

comment on column public.tenants.emergency_contact_name is 'Acil durum kisisi adi';
comment on column public.tenants.emergency_contact_phone is 'Acil durum kisisi telefonu';
comment on column public.tenants.iban is 'Kiraci IBAN numarasi';
comment on column public.tenants.household_info is 'Hane bilgisi JSON: {spouse, children, roommate}';
