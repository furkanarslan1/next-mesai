-- Cumartesi tatil mi? İş yerine göre değişir (5 gün / 6 gün çalışma).
-- true (varsayılan): cumartesi hafta tatili; false: cumartesi normal iş günü.
alter table public.user_settings
  add column saturday_off boolean not null default true;
