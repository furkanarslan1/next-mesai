-- Çalışma profili: maaş, günlük saat, vardiya, pazar/tatil saatlik ücreti, hedef modu
alter table public.user_settings
  add column monthly_salary numeric(12,2) not null default 0,
  add column daily_hours numeric(4,2) not null default 8 check (daily_hours > 0 and daily_hours <= 24),
  add column has_shift boolean not null default false,
  add column shift_start time,
  add column shift_end time,
  -- 0 = belirtilmedi, saatlik ücret x çarpan kullanılır
  add column sunday_rate numeric(10,2) not null default 0,
  add column holiday_rate numeric(10,2) not null default 0,
  add column goal_mode text not null default 'amount' check (goal_mode in ('amount','hours')),
  add column monthly_goal_hours numeric(6,2) not null default 0;

-- Kayıt formundan gelen metadata'yı güvenle çevirmek için yardımcılar (hatalı değer kaydı bozmasın)
create or replace function public._meta_num(m jsonb, k text) returns numeric
language plpgsql immutable as $$
begin return greatest(coalesce((m->>k)::numeric, 0), 0);
exception when others then return 0; end $$;

create or replace function public._meta_time(m jsonb, k text) returns time
language plpgsql immutable as $$
begin return nullif(m->>k, '')::time;
exception when others then return null; end $$;

revoke execute on function public._meta_num(jsonb, text) from public, anon, authenticated;
revoke execute on function public._meta_time(jsonb, text) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := coalesce(m->>'role','employee');
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(m->>'full_name',''), case when r='manager' then 'manager' else 'employee' end);

  insert into user_settings (
    user_id, monthly_salary, hourly_rate, daily_hours, has_shift, shift_start, shift_end,
    sunday_rate, holiday_rate
  ) values (
    new.id,
    _meta_num(m,'monthly_salary'),
    _meta_num(m,'hourly_rate'),
    least(coalesce(nullif(_meta_num(m,'daily_hours'), 0), 8), 24),
    coalesce(m->>'has_shift','false') = 'true',
    _meta_time(m,'shift_start'),
    _meta_time(m,'shift_end'),
    _meta_num(m,'sunday_rate'),
    _meta_num(m,'holiday_rate')
  );

  insert into shortcuts (user_id,label,hours,sort) values
    (new.id,'2.5 saat',2.5,1),(new.id,'6.5 saat',6.5,2);
  return new;
end $$;
