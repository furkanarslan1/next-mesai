-- Maaşa dahil aylık mesai saati: bu kadar saat maaşın içindedir, ayrıca ücret hesaplanmaz
alter table public.user_settings
  add column included_overtime_hours numeric(5,2) not null default 0
    check (included_overtime_hours >= 0 and included_overtime_hours <= 200);
