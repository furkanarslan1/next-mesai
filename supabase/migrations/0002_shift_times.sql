-- Kısayol ve kayıtlara başlangıç/bitiş saati
alter table public.shortcuts add column start_time time, add column end_time time;
alter table public.entries add column start_time time, add column end_time time;
