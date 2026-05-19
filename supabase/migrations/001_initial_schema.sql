-- Alpha Kelassi — Schema initial
-- Migration 001: tables de base + pgvector

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- Enum types
create type user_role as enum ('student', 'admin');
create type user_plan as enum ('free', 'premium');
create type subscription_status as enum ('active', 'canceled', 'past_due', 'trialing');
create type document_type as enum ('cours', 'examen');
create type exam_session as enum ('normale', 'rattrapage');
create type study_level as enum ('bepc', 'bac_a', 'bac_c', 'bac_d');
create type message_role as enum ('user', 'assistant');

-- Profils utilisateurs (étend auth.users de Supabase)
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique,
  phone       text unique,
  full_name   text,
  role        user_role not null default 'student',
  plan        user_plan not null default 'free',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Abonnements
create table public.subscriptions (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.users(id) on delete cascade,
  stripe_sub_id     text unique,
  cinetpay_ref      text unique,
  plan              user_plan not null,
  status            subscription_status not null default 'trialing',
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Matières (Maths, Physique-Chimie, SVT, Français, Histoire-Géo, Philosophie...)
create table public.subjects (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  level        study_level not null,
  country_code char(2) not null default 'CG',
  icon         text,
  created_at   timestamptz not null default now(),
  unique(name, level, country_code)
);

-- Documents (cours PDF + examens d'État)
create table public.documents (
  id           uuid primary key default uuid_generate_v4(),
  subject_id   uuid not null references public.subjects(id) on delete cascade,
  type         document_type not null,
  title        text not null,
  level        study_level not null,
  year         smallint,
  session      exam_session,
  country_code char(2) not null default 'CG',
  pdf_url      text not null,
  text_content text,
  is_premium   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Chunks vectorisés pour le RAG
create table public.document_chunks (
  id           uuid primary key default uuid_generate_v4(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  content      text not null,
  embedding    vector(768),        -- Gemini text-embedding-004
  chunk_index  smallint not null,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

-- Index vectoriel HNSW pour la recherche sémantique
create index on public.document_chunks using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Sessions de chat avec Kelassi
create table public.chat_sessions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  document_id  uuid references public.documents(id) on delete set null,
  title        text,
  created_at   timestamptz not null default now()
);

-- Messages dans une session
create table public.chat_messages (
  id           uuid primary key default uuid_generate_v4(),
  session_id   uuid not null references public.chat_sessions(id) on delete cascade,
  role         message_role not null,
  content      text not null,
  created_at   timestamptz not null default now()
);

-- Flashcards avec algorithme SM-2
create table public.flashcards (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  document_id  uuid not null references public.documents(id) on delete cascade,
  front        text not null,
  back         text not null,
  next_review  timestamptz not null default now(),
  ease_factor  real not null default 2.5,  -- SM-2: [1.3, 2.5]
  interval     smallint not null default 1, -- jours
  reps         smallint not null default 0,
  created_at   timestamptz not null default now()
);

-- Progression par matière
create table public.user_progress (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.users(id) on delete cascade,
  subject_id          uuid not null references public.subjects(id) on delete cascade,
  flashcards_reviewed integer not null default 0,
  score_avg           real not null default 0,
  streak_days         smallint not null default 0,
  last_active         date not null default current_date,
  unique(user_id, subject_id)
);

-- Index de performance
create index on public.documents(subject_id, type, level);
create index on public.documents(country_code, year desc);
create index on public.chat_sessions(user_id, created_at desc);
create index on public.chat_messages(session_id, created_at);
create index on public.flashcards(user_id, next_review);
create index on public.subscriptions(user_id, status);

-- Trigger updated_at automatique
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
