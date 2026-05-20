-- Migration 006 : fonction RPC de recherche vectorielle (RAG)
create or replace function public.search_chunks(
  query_embedding  vector(768),
  match_count      int     default 5,
  min_similarity   float   default 0.72,
  filter_document  uuid    default null
)
returns table (
  id              uuid,
  document_id     uuid,
  content         text,
  chunk_index     int,
  page_number     int,
  metadata        jsonb,
  similarity      float
)
language plpgsql
security definer
as $$
begin
  return query
  select
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    c.page_number,
    c.metadata,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where
    (filter_document is null or c.document_id = filter_document)
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Quota journalier : stocké dans Redis, mais cette vue aide le monitoring
create or replace view public.daily_chat_usage as
select
  user_id,
  date_trunc('day', cm.created_at) as day,
  count(*) filter (where cm.role = 'user') as questions_count
from public.chat_messages cm
join public.chat_sessions cs on cs.id = cm.session_id
group by cs.user_id, date_trunc('day', cm.created_at);
