-- =========================================================================
-- DONNÉES DE DÉMO — quelques machines pour tester tout de suite.
-- À coller dans Supabase → SQL Editor → Run, APRÈS setup.sql.
-- Tu peux les supprimer plus tard avec: delete from machines where code like '%-00%';
-- =========================================================================

insert into machines (code, name, type, brand, model, year, site) values
  ('EXC-001', 'Excavatrice 320',      'excavatrice', 'Caterpillar', '320',     2021, 'Chantier A'),
  ('EXC-002', 'Mini-excavatrice 305',  'excavatrice', 'Caterpillar', '305 CR',  2019, 'Chantier B'),
  ('LOAD-001','Chargeuse 924',          'chargeuse',   'Caterpillar', '924K',    2020, 'Chantier A'),
  ('CAM-001', 'Camion benne',           'camion',      'Mack',        'Granite', 2018, 'Garage'),
  ('GEN-001', 'Génératrice 60kW',       'génératrice', 'Cummins',     'C60D6',   2022, 'Chantier B'),
  ('NACL-001','Nacelle ciseaux',        'nacelle',     'Genie',       'GS-2632', 2021, 'Chantier A');
