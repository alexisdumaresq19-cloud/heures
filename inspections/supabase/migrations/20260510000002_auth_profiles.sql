-- Auth: profiles + rôles + helper is_admin() + nouvelles RLS policies
-- Cette migration:
--  1. Crée une table `profiles` liée à auth.users (1-1) avec un rôle.
--  2. Crée un trigger qui auto-crée un profil à chaque signup.
--  3. Crée le helper `is_admin()` utilisable dans les policies.
--  4. Remplace les anciennes policies (qui se basaient sur (auth.jwt()->>'role'))
--     par des policies qui consultent `profiles.role`.

-- =========================================================================
-- profiles
-- =========================================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'inspector' check (role in ('admin', 'inspector')),
  created_at  timestamptz not null default now()
);

create index idx_profiles_role on profiles(role);

-- Auto-création du profil à chaque signup, avec full_name (et optionnellement
-- role) lus depuis raw_user_meta_data si fournis.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'inspector')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =========================================================================
-- Helper: is_admin()
-- Utilise SECURITY DEFINER pour pouvoir lire profiles depuis n'importe quelle
-- policy, sans entrer dans une boucle de RLS.
-- =========================================================================
create or replace function is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =========================================================================
-- RLS sur profiles
-- =========================================================================
alter table profiles enable row level security;

-- Tout utilisateur authentifié peut lire son propre profil.
create policy "profiles_read_self"
  on profiles for select
  to authenticated
  using (id = auth.uid());

-- Les admins peuvent lire tous les profils.
create policy "profiles_read_admin"
  on profiles for select
  to authenticated
  using (is_admin());

-- Les admins peuvent modifier n'importe quel profil (pour promouvoir/rétrograder).
create policy "profiles_update_admin"
  on profiles for update
  to authenticated
  using (is_admin())
  with check (is_admin());

-- Un utilisateur peut mettre à jour son propre full_name (mais pas son rôle —
-- garde-fou applicatif côté client; la sécurité réelle vient de la policy admin).
create policy "profiles_update_self"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- =========================================================================
-- Remplacer les policies créées dans la migration initiale
-- =========================================================================
drop policy if exists "machines_read_authenticated" on machines;
drop policy if exists "machines_write_admin"        on machines;
drop policy if exists "inspections_read_authenticated"    on inspections;
drop policy if exists "inspections_insert_authenticated"  on inspections;
drop policy if exists "defects_read_authenticated"        on defects;
drop policy if exists "defects_insert_authenticated"      on defects;
drop policy if exists "photos_read_authenticated"         on inspection_photos;
drop policy if exists "photos_insert_authenticated"       on inspection_photos;

-- machines: lecture par tous les authentifiés, écriture par admins seulement.
create policy "machines_read"  on machines for select to authenticated using (true);
create policy "machines_write" on machines for all    to authenticated using (is_admin()) with check (is_admin());

-- inspections: lecture par tous les authentifiés.
-- Insertion: tout authentifié peut créer une inspection (terrain).
-- Update/delete: admins seulement.
create policy "inspections_read"   on inspections for select to authenticated using (true);
create policy "inspections_insert" on inspections for insert to authenticated with check (true);
create policy "inspections_update" on inspections for update to authenticated using (is_admin()) with check (is_admin());
create policy "inspections_delete" on inspections for delete to authenticated using (is_admin());

-- defects: même logique.
create policy "defects_read"   on defects for select to authenticated using (true);
create policy "defects_insert" on defects for insert to authenticated with check (true);
create policy "defects_update" on defects for update to authenticated using (is_admin()) with check (is_admin());
create policy "defects_delete" on defects for delete to authenticated using (is_admin());

-- inspection_photos: même logique.
create policy "photos_read"   on inspection_photos for select to authenticated using (true);
create policy "photos_insert" on inspection_photos for insert to authenticated with check (true);
create policy "photos_delete" on inspection_photos for delete to authenticated using (is_admin());

-- =========================================================================
-- Lien d'audit: inspections.inspector_id → auth.users.id
-- inspector_name est conservé en sus pour permettre à un admin de saisir
-- un nom différent (inspection au nom de quelqu'un, papier transcrit, etc.)
-- =========================================================================
alter table inspections add column inspector_id uuid references auth.users(id) on delete set null;
create index idx_inspections_inspector on inspections(inspector_id);
