-- Migration 010: système de notifications admin

create type notification_type as enum ('annonce', 'promo', 'pub', 'alerte');

create table public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  type        notification_type not null default 'annonce',
  title       text not null,
  message     text not null,
  cta_label   text,
  cta_url     text,
  is_active   boolean not null default true,
  target_plan text not null default 'all',   -- 'all' | 'free' | 'premium'
  expires_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger set_updated_at before update on public.notifications
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;

-- Admins : accès total
create policy "admins manage notifications"
  on public.notifications for all
  using (exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  ));

-- Utilisateurs : lecture seule des notifs actives non expirées
create policy "users read active notifications"
  on public.notifications for select
  using (
    is_active = true
    and (expires_at is null or expires_at > now())
  );

create index on public.notifications (is_active, expires_at);
