-- Normal çalışma saati (giriş/çıkış) her kullanıcıda var; vardiya ise gündüz/akşam/gece türüyle ek bilgi.
-- Eski shift_start/shift_end artık "çalışma giriş/çıkış" olarak kullanılır.
alter table public.user_settings rename column shift_start to work_start;
alter table public.user_settings rename column shift_end to work_end;
alter table public.user_settings
  add column shift_type text check (shift_type in ('day','evening','night'));

update public.user_settings set shift_type = 'day' where has_shift and shift_type is null;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := coalesce(m->>'role','employee');
  h text;
  hv numeric;
  n int := 0;
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(m->>'full_name',''), case when r='manager' then 'manager' else 'employee' end);

  insert into user_settings (
    user_id, monthly_salary, hourly_rate, daily_hours, has_shift, shift_type, work_start, work_end,
    sunday_rate, holiday_rate
  ) values (
    new.id,
    _meta_num(m,'monthly_salary'),
    _meta_num(m,'hourly_rate'),
    least(coalesce(nullif(_meta_num(m,'daily_hours'), 0), 8), 24),
    coalesce(m->>'has_shift','false') = 'true',
    case when m->>'shift_type' in ('day','evening','night') then m->>'shift_type' else null end,
    _meta_time(m,'work_start'),
    _meta_time(m,'work_end'),
    _meta_num(m,'sunday_rate'),
    _meta_num(m,'holiday_rate')
  );

  -- Kayıt formundan "2.5,6.5" biçiminde gelen sık mesai saatleri kısayol olur (en fazla 8)
  foreach h in array string_to_array(coalesce(m->>'shortcut_hours',''), ',') loop
    begin
      hv := h::numeric;
    exception when others then
      continue;
    end;
    if hv > 0 and hv <= 24 and n < 8 then
      n := n + 1;
      insert into shortcuts (user_id,label,hours,sort)
      values (new.id, hv::float8::text || ' saat', hv, n);
    end if;
  end loop;
  return new;
end $$;
