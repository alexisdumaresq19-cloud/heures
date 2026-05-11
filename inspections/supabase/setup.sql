-- =========================================================================
-- SETUP COMPLET — à coller en une fois dans Supabase → SQL Editor → Run
-- =========================================================================
-- Ce fichier regroupe les 3 migrations:
--   20260510000000_initial_schema.sql
--   20260510000001_email_trigger.sql
--   20260510000002_auth_profiles.sql
-- C'est idempotent-ish: à exécuter sur un projet vierge. Si tu réexécutes,
-- des erreurs "already exists" sont normales — relance plutôt sur projet neuf.
-- =========================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------
-- 1. TABLES
-- ------------------------------------------------------------------------
create table machines (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  name            text not null,
  type            text,
  brand           text,
  model           text,
  serial_number   text,
  year            int,
  site            text,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_machines_code on machines(code);
create index idx_machines_active on machines(is_active);

create table inspections (
  id                  uuid primary key default gen_random_uuid(),
  machine_id          uuid not null references machines(id) on delete cascade,
  inspector_name      text not null,
  inspector_email     text,
  hours_meter         numeric,
  odometer_km         numeric,
  overall_status      text not null check (overall_status in ('ok', 'minor_issues', 'major_issues', 'out_of_service')),
  checklist           jsonb not null default '{}'::jsonb,
  general_comments    text,
  inspected_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);
create index idx_inspections_machine on inspections(machine_id);
create index idx_inspections_date on inspections(inspected_at desc);
create index idx_inspections_status on inspections(overall_status);

create table defects (
  id              uuid primary key default gen_random_uuid(),
  inspection_id   uuid not null references inspections(id) on delete cascade,
  category        text not null,
  severity        text not null check (severity in ('minor', 'major', 'critical')),
  description     text not null,
  created_at      timestamptz not null default now()
);
create index idx_defects_inspection on defects(inspection_id);
create index idx_defects_severity on defects(severity);

create table inspection_photos (
  id              uuid primary key default gen_random_uuid(),
  inspection_id   uuid not null references inspections(id) on delete cascade,
  defect_id       uuid references defects(id) on delete set null,
  storage_path    text not null,
  caption         text,
  created_at      timestamptz not null default now()
);
create index idx_photos_inspection on inspection_photos(inspection_id);
create index idx_photos_defect on inspection_photos(defect_id);

-- ------------------------------------------------------------------------
-- 2. TRIGGERS UTILITAIRES
-- ------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

alter function set_updated_at() set search_path = public;

create trigger trg_machines_updated_at
  before update on machines
  for each row execute function set_updated_at();

-- ------------------------------------------------------------------------
-- 3. PROFILES + RÔLES
-- ------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'inspector' check (role in ('admin', 'inspector')),
  created_at  timestamptz not null default now()
);
create index idx_profiles_role on profiles(role);

create or replace function handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'inspector')
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;
revoke execute on function public.is_admin() from anon, public;

-- ------------------------------------------------------------------------
-- 4. AUDIT: inspections.inspector_id
-- ------------------------------------------------------------------------
alter table inspections add column inspector_id uuid references auth.users(id) on delete set null;
create index idx_inspections_inspector on inspections(inspector_id);

-- ------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ------------------------------------------------------------------------
alter table machines           enable row level security;
alter table inspections        enable row level security;
alter table defects            enable row level security;
alter table inspection_photos  enable row level security;
alter table profiles           enable row level security;

-- profiles
create policy "profiles_read_self"   on profiles for select to authenticated using (id = auth.uid());
create policy "profiles_read_admin"  on profiles for select to authenticated using (is_admin());
create policy "profiles_update_admin" on profiles for update to authenticated using (is_admin()) with check (is_admin());
create policy "profiles_update_self" on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- machines
create policy "machines_read"  on machines for select to authenticated using (true);
create policy "machines_write" on machines for all    to authenticated using (is_admin()) with check (is_admin());

-- inspections
create policy "inspections_read"   on inspections for select to authenticated using (true);
create policy "inspections_insert" on inspections for insert to authenticated with check (inspector_id = auth.uid() or is_admin());
create policy "inspections_update" on inspections for update to authenticated using (is_admin()) with check (is_admin());
create policy "inspections_delete" on inspections for delete to authenticated using (is_admin());

-- defects
create policy "defects_read"   on defects for select to authenticated using (true);
create policy "defects_insert" on defects for insert to authenticated with check (true);
create policy "defects_update" on defects for update to authenticated using (is_admin()) with check (is_admin());
create policy "defects_delete" on defects for delete to authenticated using (is_admin());

-- inspection_photos
create policy "photos_read"   on inspection_photos for select to authenticated using (true);
create policy "photos_insert" on inspection_photos for insert to authenticated with check (true);
create policy "photos_delete" on inspection_photos for delete to authenticated using (is_admin());

-- ------------------------------------------------------------------------
-- 6. STORAGE: policies pour le bucket "inspection-photos"
--    (créer le bucket "inspection-photos" en mode privé AVANT d'exécuter ceci,
--     ou commenter cette section et la relancer après)
-- ------------------------------------------------------------------------
-- Tout authentifié peut uploader/lire les photos d'inspection.
do $$
begin
  if exists (select 1 from storage.buckets where id = 'inspection-photos') then
    execute $p$
      create policy "inspection_photos_authenticated_all"
        on storage.objects for all to authenticated
        using (bucket_id = 'inspection-photos')
        with check (bucket_id = 'inspection-photos');
    $p$;
  end if;
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------------------
-- 7. (OPTIONNEL) Courriel automatique au bureau via Edge Function
--    Décommenter SEULEMENT après avoir déployé la fonction send-inspection-email
--    et configuré app.settings.supabase_url + app.settings.service_role_key.
--    Sans config, la fonction ne fait rien (pas d'erreur), donc c'est safe.
-- ------------------------------------------------------------------------
-- create extension if not exists pg_net;
--
-- create or replace function notify_inspection_created()
-- returns trigger as $$
-- declare
--   function_url text;
--   service_key  text;
-- begin
--   function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-inspection-email';
--   service_key  := current_setting('app.settings.service_role_key', true);
--   if function_url is null or service_key is null then return new; end if;
--   perform net.http_post(
--     url     := function_url,
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || service_key),
--     body    := jsonb_build_object('inspection_id', new.id)
--   );
--   return new;
-- end;
-- $$ language plpgsql security definer;
--
-- create trigger trg_inspections_notify
--   after insert on inspections
--   for each row execute function notify_inspection_created();
