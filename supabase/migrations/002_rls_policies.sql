-- Alpha Kelassi — Row Level Security
-- Migration 002: isolation stricte par utilisateur

-- Activer RLS sur toutes les tables publiques
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subjects enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.flashcards enable row level security;
alter table public.user_progress enable row level security;

-- Helper: plan de l'utilisateur courant
create or replace function public.current_user_plan()
returns user_plan language sql security definer stable as $$
  select plan from public.users where id = auth.uid()
$$;

-- Helper: role de l'utilisateur courant
create or replace function public.current_user_role()
returns user_role language sql security definer stable as $$
  select role from public.users where id = auth.uid()
$$;

-- USERS: chaque utilisateur voit et modifie son propre profil
create policy "users: select own" on public.users
  for select using (id = auth.uid());
create policy "users: update own" on public.users
  for update using (id = auth.uid());
create policy "users: insert on signup" on public.users
  for insert with check (id = auth.uid());

-- SUBSCRIPTIONS: uniquement les siennes
create policy "subscriptions: select own" on public.subscriptions
  for select using (user_id = auth.uid());

-- SUBJECTS: lecture publique pour tous les authentifiés
create policy "subjects: select all authenticated" on public.subjects
  for select using (auth.uid() is not null);
create policy "subjects: admin only write" on public.subjects
  for all using (public.current_user_role() = 'admin');

-- DOCUMENTS: accès libre (free) + premium selon le plan
create policy "documents: select free content" on public.documents
  for select using (
    auth.uid() is not null
    and (is_premium = false or public.current_user_plan() = 'premium')
  );
create policy "documents: admin only write" on public.documents
  for all using (public.current_user_role() = 'admin');

-- DOCUMENT_CHUNKS: accès selon le document parent
create policy "chunks: select via document access" on public.document_chunks
  for select using (
    exists (
      select 1 from public.documents d
      where d.id = document_chunks.document_id
        and (d.is_premium = false or public.current_user_plan() = 'premium')
    )
    and auth.uid() is not null
  );
create policy "chunks: admin only write" on public.document_chunks
  for all using (public.current_user_role() = 'admin');

-- CHAT_SESSIONS: uniquement les siennes
create policy "chat_sessions: select own" on public.chat_sessions
  for select using (user_id = auth.uid());
create policy "chat_sessions: insert own" on public.chat_sessions
  for insert with check (user_id = auth.uid());
create policy "chat_sessions: delete own" on public.chat_sessions
  for delete using (user_id = auth.uid());

-- CHAT_MESSAGES: via session appartenant à l'utilisateur
create policy "chat_messages: select via own session" on public.chat_messages
  for select using (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );
create policy "chat_messages: insert via own session" on public.chat_messages
  for insert with check (
    exists (
      select 1 from public.chat_sessions s
      where s.id = chat_messages.session_id and s.user_id = auth.uid()
    )
  );

-- FLASHCARDS: uniquement les siennes
create policy "flashcards: select own" on public.flashcards
  for select using (user_id = auth.uid());
create policy "flashcards: insert own" on public.flashcards
  for insert with check (user_id = auth.uid());
create policy "flashcards: update own" on public.flashcards
  for update using (user_id = auth.uid());
create policy "flashcards: delete own" on public.flashcards
  for delete using (user_id = auth.uid());

-- USER_PROGRESS: uniquement le sien
create policy "user_progress: select own" on public.user_progress
  for select using (user_id = auth.uid());
create policy "user_progress: upsert own" on public.user_progress
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
