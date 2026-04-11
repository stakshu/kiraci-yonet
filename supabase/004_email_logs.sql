-- ═══════════════════════════════════════════════════════════
-- KiraciYonet — Faz 7: E-posta Loglari (email_logs) tablosu
-- Bu SQL'i Supabase Dashboard → SQL Editor'de calistirin.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.email_logs (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  tenant_id     uuid references public.tenants(id) on delete set null,
  payment_id    uuid references public.rent_payments(id) on delete set null,
  email_type    text not null,                       -- reminder | due_today | overdue | payment_received
  recipient     text not null,                       -- Alici e-posta
  subject       text not null,
  status        text not null default 'sent',        -- sent | failed
  error_message text,
  created_at    timestamptz default now()
);

alter table public.email_logs enable row level security;

create policy "Users can view own email_logs"
  on public.email_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own email_logs"
  on public.email_logs for insert
  with check (auth.uid() = user_id);

create index if not exists idx_email_logs_user_id on public.email_logs(user_id);
create index if not exists idx_email_logs_tenant_id on public.email_logs(tenant_id);
