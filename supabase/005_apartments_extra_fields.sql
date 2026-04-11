-- ═══════════════════════════════════════════════════════════
-- KiraciYonet — Mulklerim: Ek alanlar (apartments tablosuna)
-- Bu SQL'i Supabase Dashboard → SQL Editor'de calistirin.
-- ═══════════════════════════════════════════════════════════

-- Yeni kolonlar ekle
alter table public.apartments add column if not exists property_type text default 'daire';
  -- daire | mustakil | villa | dukkan | ofis | arsa | diger

alter table public.apartments add column if not exists address text default '';
  -- Tam adres (mahalle, sokak, no)

alter table public.apartments add column if not exists floor_no text default '';
  -- Bulundugu kat

alter table public.apartments add column if not exists room_count text default '';
  -- Oda sayisi (ör: 2+1, 3+1)

alter table public.apartments add column if not exists m2_gross numeric(8,2) default null;
  -- Brut m2

alter table public.apartments add column if not exists m2_net numeric(8,2) default null;
  -- Net m2

alter table public.apartments add column if not exists furnished boolean default false;
  -- Esyali mi?

alter table public.apartments add column if not exists building_age int default null;
  -- Bina yasi

alter table public.apartments add column if not exists deposit numeric(12,2) default 0;
  -- Depozito tutari
