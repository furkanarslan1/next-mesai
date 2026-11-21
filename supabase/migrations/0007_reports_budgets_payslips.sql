-- Yıllık izin hakkı, kategori bütçe limitleri ve bordro kontrolü

alter table public.user_settings
  add column annual_leave_days int not null default 14 check (annual_leave_days between 0 and 60),
  add column budgets jsonb not null default '{}'::jsonb;

-- Bordroda yazan mesai: kullanıcı girer, uygulama kendi hesabıyla karşılaştırır
create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  month date not null, -- ayın ilk günü
  paid_hours numeric(6,2) not null default 0 check (paid_hours >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  note text,
  unique (user_id, month)
);
alter table public.payslips enable row level security;
create policy "own payslips" on public.payslips for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
