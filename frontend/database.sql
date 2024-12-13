-- Run this command in Supasbase SQL Editor
-- Create users table
create table if not exists
  users (
    id uuid references auth.users on delete cascade primary key,
    email text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    last_login timestamp with time zone
  );

-- Create files table with user reference
create table if not exists
  files (
    id bigint primary key generated always as identity,
    user_id uuid references users(id) on delete cascade,
    share_code text not null unique,
    file_name text not null,
    file_path text not null,
    file_size bigint not null,
    file_type text not null,
    public_url text not null,
    created_at timestamp with time zone default timezone ('utc'::text, now()) not null,
    expires_at timestamp with time zone not null,
    downloads_count integer default 0,
    is_password_protected boolean default false,
    password_hash text,
    encryption_key text
  );

-- Create index for querying by share code
create index if not exists idx_files_share_code on files (share_code);

-- Create index for cleaning up expired files
create index if not exists idx_files_expires_at on files (expires_at);

-- Create index for user files
create index if not exists idx_files_user_id on files (user_id);

-- Enable Row Level Security
alter table users enable row level security;
alter table files enable row level security;

-- Create policies for users table
create policy "Users can view their own data" on users
  for select using (auth.uid() = id);

create policy "Users can update their own data" on users
  for update using (auth.uid() = id);

-- Create policies for files table
create policy "Files are accessible by their owners" on files
  for select using (auth.uid() = user_id);

create policy "Users can insert their own files" on files
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own files" on files
  for update using (auth.uid() = user_id);

create policy "Users can delete their own files" on files
  for delete using (auth.uid() = user_id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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

-- Add new columns if they don't exist (safe migration)
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE files ADD COLUMN is_password_protected boolean default false;
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column is_password_protected already exists';
    END;

    BEGIN
        ALTER TABLE files ADD COLUMN password_hash text;
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column password_hash already exists';
    END;

    BEGIN
        ALTER TABLE files ADD COLUMN encryption_key text;
    EXCEPTION
        WHEN duplicate_column THEN 
            RAISE NOTICE 'Column encryption_key already exists';
    END;
END $$;