-- Run this command in Supasbase SQL Editor
-- Create files table
create table if not exists
  files (
    id bigint primary key generated always as identity,
    share_code text not null unique,
    file_name text not null,
    file_path text not null,
    file_size bigint not null,
    file_type text not null,
    public_url text not null,
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null,
    expires_at timestamp with time zone not null,
    downloads_count integer default 0
  );

-- Create index for querying by share code
create index if not exists idx_files_share_code on files (share_code);

-- Create index for cleaning up expired files
create index if not exists idx_files_expires_at on files (expires_at);

-- Drop existing policies if they exist
drop policy if exists "Files are publicly accessible" on storage.objects;

drop policy if exists "Anyone can upload files" on storage.objects;

drop policy if exists "Files can be deleted by anyone" on storage.objects;

-- Set up Storage security policies
create policy "Files are publicly accessible" on storage.objects for
select
  using (bucket_id = 'files');

create policy "Anyone can upload files" on storage.objects for insert
with
  check (bucket_id = 'files');

create policy "Files can be deleted by anyone" on storage.objects for delete using (bucket_id = 'files');

-- Allow public downloads
CREATE POLICY "Allow public downloads"
ON storage.objects FOR SELECT
USING (bucket_id = 'files');

-- Allow public uploads
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'files');