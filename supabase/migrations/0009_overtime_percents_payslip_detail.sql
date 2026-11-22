-- Mesai oranları (yüzde), raporlu günün maaştan düşmesi ve bordro ayrıntıları

-- Saatlik ücret artık %100 (normal) saatlik ücrettir; hafta içi/pazar/tatil mesaisi oranla çarpılır.
-- base_hourly_rate boşsa eski hourly_rate (hafta içi mesai ücreti) kullanılır: eski kayıtlar değişmeden çalışır.
alter table public.user_settings
  add column base_hourly_rate numeric(10,2),
  add column weekday_percent numeric(6,2) not null default 150 check (weekday_percent between 50 and 500),
  add column sunday_percent  numeric(6,2) not null default 100 check (sunday_percent between 50 and 500),
  add column holiday_percent numeric(6,2) not null default 200 check (holiday_percent between 50 and 500),
  add column sick_leave_unpaid boolean not null default false; -- true: raporlu günler maaştan düşer ("Raporlu (Ücretsiz)")

-- Bordro ayrıntıları (hepsi isteğe bağlı): gün dağılımı, mesai oran kırılımı, kesinti ve net ödenen
alter table public.payslips
  add column unpaid_days numeric(5,2) check (unpaid_days between 0 and 31),
  add column sick_unpaid_days numeric(5,2) check (sick_unpaid_days between 0 and 31),
  add column sick_paid_days numeric(5,2) check (sick_paid_days between 0 and 31),
  add column paid_leave_days numeric(5,2) check (paid_leave_days between 0 and 31),
  add column overtime_by_pct jsonb, -- {"150": 27.5, "100": 10.5} oran -> saat
  add column special_deductions numeric(12,2) check (special_deductions >= 0),
  add column net_paid numeric(12,2) check (net_paid >= 0);

-- Kayıt formundan gelen yeni alanlar
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := coalesce(m->>'role','employee');
  h text;
  hv numeric;
  n int := 0;
  base numeric := nullif(_meta_num(m,'hourly_rate'), 0);
  wd numeric := least(greatest(coalesce(nullif(_meta_num(m,'weekday_percent'), 0), 150), 50), 500);
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(m->>'full_name',''), case when r='manager' then 'manager' else 'employee' end);

  insert into user_settings (
    user_id, monthly_salary, hourly_rate, base_hourly_rate, weekday_percent, sunday_percent, holiday_percent,
    included_overtime_hours, sick_leave_unpaid, daily_hours, has_shift, shift_type, work_start, work_end,
    sunday_rate, holiday_rate
  ) values (
    new.id,
    _meta_num(m,'monthly_salary'),
    coalesce(round(base * wd / 100, 2), 0),
    base,
    wd,
    least(greatest(coalesce(nullif(_meta_num(m,'sunday_percent'), 0), 100), 50), 500),
    least(greatest(coalesce(nullif(_meta_num(m,'holiday_percent'), 0), 200), 50), 500),
    least(greatest(coalesce(_meta_num(m,'included_overtime_hours'), 0), 0), 200),
    coalesce(m->>'sick_leave_unpaid','false') = 'true',
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
