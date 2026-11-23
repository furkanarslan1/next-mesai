-- Raporlu gün mesaiden düşer mi? Bazı iş yerlerinde raporlu her gün için günlük çalışma saati
-- aylık mesaiden düşülür. false (varsayılan): düşmez.
alter table public.user_settings
  add column sick_deducts_overtime boolean not null default false;
