-- Toplam mesai saati sunucuda toplanır (istemci tüm satırları çekmesin)
create or replace function public.total_overtime_hours() returns numeric
language sql stable security invoker set search_path = public as $$
  select coalesce(sum(hours), 0) from public.entries
  where user_id = auth.uid() and type in ('overtime', 'holiday')
$$;

-- Bir mesai kaydının hangi kısayoldan eklendiği (kısayol "aktif" göstergesi için)
alter table public.entries
  add column shortcut_id uuid references public.shortcuts on delete set null;
