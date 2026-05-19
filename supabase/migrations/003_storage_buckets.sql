-- Alpha Kelassi — Storage Buckets
-- Migration 003: buckets Supabase Storage + policies

-- Bucket PDFs publics (cours free)
insert into storage.buckets (id, name, public)
values ('pdfs-public', 'pdfs-public', true);

-- Bucket PDFs premium (cours + examens premium)
insert into storage.buckets (id, name, public)
values ('pdfs-premium', 'pdfs-premium', false);

-- Bucket images (thumbnails, avatars)
insert into storage.buckets (id, name, public)
values ('images', 'images', true);

-- Policy PDFs publics: lecture par tous
create policy "pdfs-public: read all"
  on storage.objects for select
  using (bucket_id = 'pdfs-public');

-- Policy PDFs publics: écriture admin uniquement
create policy "pdfs-public: admin write"
  on storage.objects for insert
  using (
    bucket_id = 'pdfs-public'
    and public.current_user_role() = 'admin'
  );

-- Policy PDFs premium: lecture uniquement si plan premium
create policy "pdfs-premium: read premium users"
  on storage.objects for select
  using (
    bucket_id = 'pdfs-premium'
    and auth.uid() is not null
    and public.current_user_plan() = 'premium'
  );

-- Policy PDFs premium: écriture admin uniquement
create policy "pdfs-premium: admin write"
  on storage.objects for insert
  using (
    bucket_id = 'pdfs-premium'
    and public.current_user_role() = 'admin'
  );

-- Policy images: lecture publique, écriture authentifiée
create policy "images: read all"
  on storage.objects for select
  using (bucket_id = 'images');

create policy "images: authenticated write"
  on storage.objects for insert
  using (bucket_id = 'images' and auth.uid() is not null);
