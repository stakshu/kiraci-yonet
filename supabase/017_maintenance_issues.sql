-- ═══════════════════════════════════════════════════════════
-- Faz: Arıza Kaydı (maintenance_issues) tablosu
--
-- Mülk sahibinin arıza/onarım taleplerini takip etmesi için
-- basit bir CRUD tablosu. Maliyet bilgisi sadece bu tabloda
-- yaşar; property_expenses / abrechnung'a karışmaz.
--
-- apartment_id nullable: bina-geneli arızalar (lobi, çatı, vs.)
-- için. building_id zorunlu.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.maintenance_issues (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  building_id  uuid not null references public.buildings(id) on delete cascade,
  apartment_id uuid references public.apartments(id) on delete set null,
  title        text not null,
  description  text default '',
  priority     text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  status       text not null default 'open'
    check (status in ('open','in_progress','resolved','cancelled')),
  reported_at  date not null default current_date,
  resolved_at  date,
  cost         numeric(12,2) not null default 0,
  assignee     text default '',
  notes        text default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_mi_user      on public.maintenance_issues(user_id);
create index if not exists idx_mi_building  on public.maintenance_issues(building_id);
create index if not exists idx_mi_apartment on public.maintenance_issues(apartment_id);
create index if not exists idx_mi_status    on public.maintenance_issues(status);

drop trigger if exists set_updated_at on public.maintenance_issues;
create trigger set_updated_at
  before update on public.maintenance_issues
  for each row execute function public.handle_updated_at();

alter table public.maintenance_issues enable row level security;

create policy "Users can view own issues"
  on public.maintenance_issues for select
  using (auth.uid() = user_id);

create policy "Users can insert own issues"
  on public.maintenance_issues for insert
  with check (auth.uid() = user_id);

create policy "Users can update own issues"
  on public.maintenance_issues for update
  using (auth.uid() = user_id);

create policy "Users can delete own issues"
  on public.maintenance_issues for delete
  using (auth.uid() = user_id);
