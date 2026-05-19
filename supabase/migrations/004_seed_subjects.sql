-- Alpha Kelassi — Données de base
-- Migration 004: matières Congo Brazzaville (BEPC + BAC)

-- Matières BEPC
insert into public.subjects (name, level, country_code, icon) values
  ('Mathématiques',       'bepc', 'CG', '📐'),
  ('Physique-Chimie',     'bepc', 'CG', '⚗️'),
  ('SVT',                 'bepc', 'CG', '🌿'),
  ('Français',            'bepc', 'CG', '📝'),
  ('Histoire-Géographie', 'bepc', 'CG', '🗺️'),
  ('Anglais',             'bepc', 'CG', '🇬🇧'),
  ('Espagnol',            'bepc', 'CG', '🇪🇸'),
  ('Éducation Civique',   'bepc', 'CG', '⚖️');

-- Matières BAC C (Maths-Sciences)
insert into public.subjects (name, level, country_code, icon) values
  ('Mathématiques',       'bac_c', 'CG', '📐'),
  ('Physique-Chimie',     'bac_c', 'CG', '⚗️'),
  ('SVT',                 'bac_c', 'CG', '🌿'),
  ('Français',            'bac_c', 'CG', '📝'),
  ('Histoire-Géographie', 'bac_c', 'CG', '🗺️'),
  ('Philosophie',         'bac_c', 'CG', '🧠'),
  ('Anglais',             'bac_c', 'CG', '🇬🇧');

-- Matières BAC D (Sciences Naturelles)
insert into public.subjects (name, level, country_code, icon) values
  ('Mathématiques',       'bac_d', 'CG', '📐'),
  ('Physique-Chimie',     'bac_d', 'CG', '⚗️'),
  ('SVT',                 'bac_d', 'CG', '🌿'),
  ('Français',            'bac_d', 'CG', '📝'),
  ('Histoire-Géographie', 'bac_d', 'CG', '🗺️'),
  ('Philosophie',         'bac_d', 'CG', '🧠'),
  ('Anglais',             'bac_d', 'CG', '🇬🇧');

-- Matières BAC A (Lettres)
insert into public.subjects (name, level, country_code, icon) values
  ('Français',            'bac_a', 'CG', '📝'),
  ('Histoire-Géographie', 'bac_a', 'CG', '🗺️'),
  ('Philosophie',         'bac_a', 'CG', '🧠'),
  ('Anglais',             'bac_a', 'CG', '🇬🇧'),
  ('Espagnol',            'bac_a', 'CG', '🇪🇸'),
  ('Mathématiques',       'bac_a', 'CG', '📐'),
  ('Latin',               'bac_a', 'CG', '🏛️');
