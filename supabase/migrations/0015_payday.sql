-- Maaş günü (ayın kaçında yatar): özet kartında "Maaşa N gün" geri sayımı için. Boşsa gösterilmez.
-- Ay o günden kısaysa (ör. 31, şubat) ayın son günü sayılır.
alter table public.user_settings
  add column payday smallint check (payday between 1 and 31);
