-- Migration 005 : support pipeline RAG (Sprint S5)

-- Colonne indexed_at sur documents (null = pas encore indexé)
alter table public.documents
  add column if not exists indexed_at timestamptz default null;

-- Index pour retrouver rapidement les documents non indexés
create index if not exists idx_documents_indexed_at
  on public.documents(indexed_at)
  where indexed_at is null;

-- S'assurer que document_chunks a bien la colonne metadata (jsonb)
-- (au cas où la migration 001 ne l'aurait pas incluse)
alter table public.document_chunks
  add column if not exists metadata jsonb default '{}';

-- Index GIN sur metadata pour filtrer les chunks d'exercice
create index if not exists idx_chunks_metadata
  on public.document_chunks using gin(metadata);

-- Vue pratique pour l'admin : documents avec état d'indexation
create or replace view public.documents_index_status as
select
  d.id,
  d.title,
  d.type,
  d.level,
  d.indexed_at,
  count(c.id) as chunk_count,
  case
    when d.indexed_at is not null then 'indexed'
    else 'pending'
  end as index_status
from public.documents d
left join public.document_chunks c on c.document_id = d.id
group by d.id, d.title, d.type, d.level, d.indexed_at;
