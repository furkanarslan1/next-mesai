-- RLS performansı (Supabase "auth_rls_initplan" önerisi): politikalarda çıplak auth.uid() her satır için
-- yeniden çağrılır. (select auth.uid()) bir kez hesaplanır. Yöneticinin bağlı çalışan kontrolü de satır başına
-- fonksiyon çağrısı yerine tek seferlik alt sorguya çevrilir. Kurallar aynı kalır, yalnızca hızlanır.

alter policy "own profile" on public.profiles using (id = (select auth.uid()));
alter policy "update own profile" on public.profiles using (id = (select auth.uid()));
alter policy "manager sees linked profiles" on public.profiles using (
  id in (select employee_id from public.manager_links where manager_id = (select auth.uid()) and status = 'accepted'));
alter policy "employee sees manager names" on public.profiles using (
  id in (select manager_id from public.manager_links where employee_id = (select auth.uid())));

alter policy "own settings" on public.user_settings using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "own shortcuts" on public.shortcuts using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "own finance" on public.finance_items using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "own entries" on public.entries using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy "manager reads linked entries" on public.entries using (
  user_id in (select employee_id from public.manager_links where manager_id = (select auth.uid()) and status = 'accepted'));
alter policy "own payslips" on public.payslips using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter policy "participants read links" on public.manager_links
  using (employee_id = (select auth.uid()) or manager_id = (select auth.uid()));
alter policy "employee responds to links" on public.manager_links
  using (employee_id = (select auth.uid())) with check (employee_id = (select auth.uid()));
alter policy "employee removes link" on public.manager_links
  using (employee_id = (select auth.uid()) or manager_id = (select auth.uid()));

-- Yönetici tarafı sorguları manager_id ile başlar; mevcut unique (employee_id, manager_id) bunu kapsamaz
create index if not exists manager_links_manager on public.manager_links (manager_id, status);
create index if not exists shortcuts_user_sort on public.shortcuts (user_id, sort);
