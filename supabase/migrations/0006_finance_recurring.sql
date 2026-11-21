-- Gelir/gider: kalemin günü ve her ay tekrarlayan kalemler
alter table public.finance_items
  add column spent_on date,
  add column recurring boolean not null default false,
  add column ends_month date; -- tekrarın bittiği son ay (ayın ilk günü); boşsa süresiz
