-- Migration 007 : corrigé d'examen + index exercices (Sprint S8)

-- Colonne corrigé PDF optionnelle sur documents
alter table public.documents
  add column if not exists corrige_url text default null;

-- Index partiel pour accélérer la récupération des chunks exercices
create index if not exists idx_chunks_is_exercise
  on public.document_chunks ((metadata->>'is_exercise'))
  where metadata->>'is_exercise' = 'true';
