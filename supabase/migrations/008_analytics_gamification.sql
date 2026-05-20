-- Migration 008 : Analytics & Gamification (Sprint S9)

-- XP cumulé sur les utilisateurs
alter table public.users
  add column if not exists xp integer not null default 0;

-- Badges gagnés
create table if not exists public.user_badges (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.users(id) on delete cascade,
  badge_code text not null,
  earned_at  timestamptz not null default now(),
  unique(user_id, badge_code)
);

create index if not exists idx_user_badges_user on public.user_badges(user_id);

-- Vues de documents (1 ligne par visite — pour analytics admin)
create table if not exists public.document_views (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  viewed_at   timestamptz not null default now()
);

create index if not exists idx_doc_views_document on public.document_views(document_id, viewed_at desc);
create index if not exists idx_doc_views_user     on public.document_views(user_id,     viewed_at desc);

-- Vue agrégée pour le dashboard admin : documents les plus consultés
create or replace view public.top_documents_7d as
select
  dv.document_id,
  d.title,
  d.type,
  d.level,
  count(*) as view_count
from public.document_views dv
join public.documents d on d.id = dv.document_id
where dv.viewed_at >= now() - interval '7 days'
group by dv.document_id, d.title, d.type, d.level
order by view_count desc
limit 20;

-- Vue agrégée : utilisateurs actifs (progression dans les 7 derniers jours)
create or replace view public.active_users_stats as
select
  date_trunc('day', last_active::timestamptz) as day,
  count(distinct user_id) as active_users
from public.user_progress
where last_active >= current_date - 6
group by 1
order by 1;

-- Fonction RPC pour incrémenter XP de façon atomique
create or replace function public.increment_xp(p_user_id uuid, p_amount integer)
returns void language sql security definer as $$
  update public.users set xp = xp + p_amount where id = p_user_id;
$$;

-- RLS user_badges
alter table public.user_badges enable row level security;
create policy "user voit ses badges"
  on public.user_badges for select
  using (auth.uid() = user_id);

-- RLS document_views (admin seulement en lecture)
alter table public.document_views enable row level security;
create policy "user insère ses vues"
  on public.document_views for insert
  with check (auth.uid() = user_id);
create policy "admin lit tout"
  on public.document_views for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );
