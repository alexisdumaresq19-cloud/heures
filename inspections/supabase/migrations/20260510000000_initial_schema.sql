-- Inspections QR — Schéma initial
-- Tables: machines, inspections, defects, inspection_photos

create extension if not exists "pgcrypto";

-- =========================================================================
-- machines : la flotte de machinerie de l'entreprise
-- =========================================================================
create table machines (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,                  -- ex: "EXC-001" (encodé dans le QR)
  name            text not null,                          -- ex: "Excavatrice Cat 320"
  type            text,                                   -- ex: "excavatrice", "camion", "génératrice"
  brand           text,
  model           text,
  serial_number   text,
  year            int,
  site            text,                                   -- chantier où elle se trouve actuellement
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_machines_code on machines(code);
create index idx_machines_active on machines(is_active);

-- =========================================================================
-- inspections : une inspection effectuée sur une machine
-- =========================================================================
create table inspections (
  id                  uuid primary key default gen_random_uuid(),
  machine_id          uuid not null references machines(id) on delete cascade,
  inspector_name      text not null,                       -- nom de l'employé qui inspecte
  inspector_email     text,
  hours_meter         numeric,                             -- heures moteur au moment de l'inspection
  odometer_km         numeric,                             -- kilométrage (si applicable)
  overall_status      text not null check (overall_status in ('ok', 'minor_issues', 'major_issues', 'out_of_service')),
  checklist           jsonb not null default '{}'::jsonb,  -- ex: {"freins": "ok", "huile": "ok", "pneus": "défaut"}
  general_comments    text,
  inspected_at        timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index idx_inspections_machine on inspections(machine_id);
create index idx_inspections_date on inspections(inspected_at desc);
create index idx_inspections_status on inspections(overall_status);

-- =========================================================================
-- defects : défauts identifiés lors d'une inspection
-- =========================================================================
create table defects (
  id              uuid primary key default gen_random_uuid(),
  inspection_id   uuid not null references inspections(id) on delete cascade,
  category        text not null,                          -- ex: "freins", "moteur", "hydraulique"
  severity        text not null check (severity in ('minor', 'major', 'critical')),
  description     text not null,
  created_at      timestamptz not null default now()
);

create index idx_defects_inspection on defects(inspection_id);
create index idx_defects_severity on defects(severity);

-- =========================================================================
-- inspection_photos : photos prises pendant une inspection (souvent liées à un défaut)
-- =========================================================================
create table inspection_photos (
  id              uuid primary key default gen_random_uuid(),
  inspection_id   uuid not null references inspections(id) on delete cascade,
  defect_id       uuid references defects(id) on delete set null,
  storage_path    text not null,                          -- chemin dans le bucket "inspection-photos"
  caption         text,
  created_at      timestamptz not null default now()
);

create index idx_photos_inspection on inspection_photos(inspection_id);
create index idx_photos_defect on inspection_photos(defect_id);

-- =========================================================================
-- updated_at trigger pour machines
-- =========================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_machines_updated_at
  before update on machines
  for each row execute function set_updated_at();

-- =========================================================================
-- Trigger: appel de l'Edge Function "send-inspection-email" après insertion
-- =========================================================================
-- Note: pour activer ce trigger, configurer l'extension pg_net et la variable
-- app.supabase_url + app.service_role_key dans la config Supabase, puis exécuter
-- la migration 20260510000001_email_trigger.sql

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table machines           enable row level security;
alter table inspections        enable row level security;
alter table defects            enable row level security;
alter table inspection_photos  enable row level security;

-- Lecture machines: tout utilisateur authentifié peut lire (pour scanner les QR).
create policy "machines_read_authenticated"
  on machines for select
  to authenticated
  using (true);

-- Écriture machines: réservée aux utilisateurs avec le rôle "admin" (claim JWT).
create policy "machines_write_admin"
  on machines for all
  to authenticated
  using ((auth.jwt() ->> 'role') = 'admin')
  with check ((auth.jwt() ->> 'role') = 'admin');

-- Inspections: lecture pour tous les authentifiés, insertion pour tous les authentifiés.
create policy "inspections_read_authenticated"
  on inspections for select
  to authenticated
  using (true);

create policy "inspections_insert_authenticated"
  on inspections for insert
  to authenticated
  with check (true);

-- Defects et photos: même logique que inspections.
create policy "defects_read_authenticated"
  on defects for select
  to authenticated
  using (true);

create policy "defects_insert_authenticated"
  on defects for insert
  to authenticated
  with check (true);

create policy "photos_read_authenticated"
  on inspection_photos for select
  to authenticated
  using (true);

create policy "photos_insert_authenticated"
  on inspection_photos for insert
  to authenticated
  with check (true);
