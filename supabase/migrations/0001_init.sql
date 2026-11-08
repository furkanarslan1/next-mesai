-- Mesai: şema + RLS
create extension if not exists pgcrypto;

-- Herkese açık (yöneticiyle paylaşılabilir) profil: sadece ad ve rol
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  role text not null default 'employee' check (role in ('employee','manager')),
  invite_code text unique not null default upper(substr(encode(gen_random_bytes(5),'hex'),1,8)),
  created_at timestamptz not null default now()
);

-- ÖZEL: ücret, hedef. Yönetici ASLA göremez.
create table public.user_settings (
  user_id uuid primary key references public.profiles on delete cascade,
  hourly_rate numeric(10,2) not null default 0,
  sunday_multiplier numeric(4,2) not null default 2,
  holiday_multiplier numeric(4,2) not null default 2,
  monthly_goal_amount numeric(12,2) not null default 0,
  currency text not null default 'TRY'
);

-- Hazır mesai kısayolları (2.5 saat, 6.5 saat ...)
create table public.shortcuts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  label text not null,
  hours numeric(4,2) not null check (hours > 0 and hours <= 24),
  sort int not null default 0
);

-- Günlük kayıtlar
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  work_date date not null,
  type text not null check (type in ('overtime','paid_leave','unpaid_leave','sick','absent','holiday')),
  hours numeric(4,2) not null default 0 check (hours >= 0 and hours <= 24),
  note text,
  created_at timestamptz not null default now()
);
create index entries_user_date on public.entries (user_id, work_date);

-- ÖZEL: gelir/gider hesaplayıcı
create table public.finance_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  month date not null, -- ayın ilk günü
  kind text not null check (kind in ('income','expense')),
  category text not null,
  amount numeric(12,2) not null check (amount >= 0)
);
create index finance_user_month on public.finance_items (user_id, month);

-- Çalışan <-> yönetici bağlantısı (çalışanın onayı şart)
create table public.manager_links (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles on delete cascade,
  manager_id uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now(),
  unique (employee_id, manager_id)
);

-- Yeni kullanıcı için profil + ayar + varsayılan kısayollar
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data->>'role','employee');
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), case when r='manager' then 'manager' else 'employee' end);
  insert into user_settings (user_id) values (new.id);
  insert into shortcuts (user_id,label,hours,sort) values
    (new.id,'2.5 saat',2.5,1),(new.id,'6.5 saat',6.5,2);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Yardımcı: bu yönetici bu çalışanı görebilir mi?
create or replace function public.is_manager_of(emp uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from manager_links
    where employee_id = emp and manager_id = auth.uid() and status = 'accepted');
$$;

-- Yönetici davet koduyla bağlantı isteği gönderir
create or replace function public.request_link(code text) returns text
language plpgsql security definer set search_path = public as $$
declare emp uuid;
begin
  if (select role from profiles where id = auth.uid()) <> 'manager' then return 'not_manager'; end if;
  select id into emp from profiles where invite_code = upper(code) and role = 'employee';
  if emp is null then return 'not_found'; end if;
  insert into manager_links (employee_id, manager_id) values (emp, auth.uid())
    on conflict (employee_id, manager_id) do update set status = 'pending';
  return 'ok';
end $$;

alter table profiles enable row level security;
alter table user_settings enable row level security;
alter table shortcuts enable row level security;
alter table entries enable row level security;
alter table finance_items enable row level security;
alter table manager_links enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid());
create policy "manager sees linked profiles" on profiles for select using (is_manager_of(id));
create policy "employee sees manager names" on profiles for select using (
  exists (select 1 from manager_links l where l.manager_id = profiles.id and l.employee_id = auth.uid()));
create policy "update own profile" on profiles for update using (id = auth.uid());

create policy "own settings" on user_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own shortcuts" on shortcuts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own finance" on finance_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own entries" on entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "manager reads linked entries" on entries for select using (is_manager_of(user_id));

create policy "participants read links" on manager_links for select
  using (employee_id = auth.uid() or manager_id = auth.uid());
create policy "employee responds to links" on manager_links for update
  using (employee_id = auth.uid()) with check (employee_id = auth.uid());
create policy "employee removes link" on manager_links for delete
  using (employee_id = auth.uid() or manager_id = auth.uid());
