-- Durcissement sécurité (suite aux advisors Supabase):
--  - fixe le search_path des fonctions trigger
--  - retire l'accès RPC public aux fonctions internes
--  - resserre la policy d'insertion des inspections (un employé ne peut pas
--    créer une inspection au nom d'un autre; un admin le peut toujours)

alter function public.set_updated_at() set search_path = public;
alter function public.handle_new_user() set search_path = public;

revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.is_admin() from anon, public;

drop policy if exists "inspections_insert" on inspections;
create policy "inspections_insert" on inspections for insert to authenticated
  with check (inspector_id = auth.uid() or is_admin());
