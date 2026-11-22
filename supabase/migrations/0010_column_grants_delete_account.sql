-- Güvenlik: satır politikaları (RLS) hangi satırın güncelleneceğini sınırlar, hangi sütunun değil.
-- "update own profile" politikası yüzünden kullanıcı kendi rolünü (employee -> manager) ve davet kodunu
-- değiştirebiliyordu; çalışan da bağlantı satırında yönetici kimliğini (manager_id) değiştirebiliyordu.
-- Güncellemeler yalnızca gereken sütunlara açılır.
revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

revoke update on public.manager_links from anon, authenticated;
grant update (status) on public.manager_links to authenticated;

-- Hesabı silme (KVKK / mağaza kuralları): kullanıcı kendi hesabını ve tüm verisini kalıcı olarak siler.
-- auth.users silinince profiles ve ona bağlı tüm tablolar (ayarlar, kayıtlar, gelir-gider, bordro, bağlantılar) zincirleme silinir.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
