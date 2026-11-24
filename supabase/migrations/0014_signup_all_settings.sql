-- Kayıt formu artık Ayarlar'daki her şeyi sorar: cumartesi tatil, raporlu günün mesaiden düşmesi,
-- aylık hedef (tür + tutar/saat) ve yıllık izin hakkı da user_settings'e yazılır.
-- Gönderilmeyen alanlar sütun varsayılanında kalır (eski uygulama sürümleriyle uyumlu).
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
    sunday_rate, holiday_rate,
    saturday_off, sick_deducts_overtime, goal_mode, monthly_goal_amount, monthly_goal_hours, annual_leave_days
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
    _meta_num(m,'holiday_rate'),
    coalesce(m->>'saturday_off','true') <> 'false',
    coalesce(m->>'sick_deducts_overtime','false') = 'true',
    case when m->>'goal_mode' = 'hours' then 'hours' else 'amount' end,
    _meta_num(m,'monthly_goal_amount'),
    least(_meta_num(m,'monthly_goal_hours'), 9999),
    case when m ? 'annual_leave_days' then least(round(_meta_num(m,'annual_leave_days'))::int, 60) else 14 end
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
