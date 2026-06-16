-- NUTRITRACK DATABASE SCHEMA INITIALIZATION
-- Paste this script into the Supabase SQL Editor (Dashboard > SQL Editor > New Query > Run)

-- Drop existing tables if they exist to start fresh
drop table if exists public.comments cascade;
drop table if exists public.likes cascade;
drop table if exists public.follows cascade;
drop table if exists public.water_logs cascade;
drop table if exists public.meals cascade;
drop table if exists public.profiles cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Profiles Table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  avatar text default '⚡',
  bio text default 'Crushing fitness targets on NutriTrack!',
  weight numeric default 70,
  height numeric default 175,
  age integer default 28,
  gender text default 'male',
  activity_level text default 'moderate',
  goal text default 'maintain',
  calorie_target integer default 2000,
  protein_target integer default 120,
  streak integer default 0,
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS) for profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile." on public.profiles
  for update using (auth.uid() = id);

-- 2. Create Meals Table
create table public.meals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  meal_name text not null,
  calories integer not null,
  protein numeric not null,
  items jsonb default '[]'::jsonb,
  image_url text,
  shared_to_feed boolean default true,
  timestamp timestamp with time zone default now() not null
);

alter table public.meals enable row level security;

-- Meals Policies
create policy "Meals are viewable by everyone." on public.meals
  for select using (true);

create policy "Users can insert their own meals." on public.meals
  for insert with check (auth.uid() = user_id);

create policy "Users can update/delete their own meals." on public.meals
  for all using (auth.uid() = user_id);

-- 3. Create Water Logs Table
create table public.water_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  log_date date default current_date not null,
  count integer default 0 not null,
  unique (user_id, log_date)
);

alter table public.water_logs enable row level security;

-- Water Logs Policies
create policy "Water logs are viewable by everyone." on public.water_logs
  for select using (true);

create policy "Users can modify their own water logs." on public.water_logs
  for all using (auth.uid() = user_id);

-- 4. Create Follows Table (to track fit buddies)
create table public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  unique (follower_id, following_id)
);

alter table public.follows enable row level security;

create policy "Follow relationships are viewable by everyone." on public.follows
  for select using (true);

create policy "Users can follow others." on public.follows
  for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow others." on public.follows
  for delete using (auth.uid() = follower_id);

-- 5. Create Likes Table
create table public.likes (
  id uuid default gen_random_uuid() primary key,
  meal_id uuid references public.meals(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  unique (meal_id, user_id)
);

alter table public.likes enable row level security;

create policy "Likes are viewable by everyone." on public.likes
  for select using (true);

create policy "Users can like meals." on public.likes
  for insert with check (auth.uid() = user_id);

create policy "Users can unlike meals." on public.likes
  for delete using (auth.uid() = user_id);

-- 6. Create Comments Table
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  meal_id uuid references public.meals(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  created_at timestamp with time zone default now() not null
);

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone." on public.comments
  for select using (true);

create policy "Users can post comments." on public.comments
  for insert with check (auth.uid() = user_id);

create policy "Users can delete their own comments." on public.comments
  for delete using (auth.uid() = user_id);

-- 7. Trigger to automatically create a profile when a new user signs up in Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar, bio)
  values (
    new.id,
    regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g') || '_' || floor(random() * 1000)::text,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    '⚡',
    'Crushing fitness targets on NutriTrack!'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Remove the trigger if it already exists before creating it
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. Storage Setup for 'meal-photos' bucket and RLS policies
-- Create the 'meal-photos' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', true)
on conflict (id) do nothing;

-- Enable Row Level Security (RLS) on storage objects
alter table storage.objects enable row level security;

-- Drop existing policies if they exist to avoid duplicate errors
drop policy if exists "Allow public read access to meal-photos" on storage.objects;
drop policy if exists "Allow authenticated users to upload meal-photos" on storage.objects;
drop policy if exists "Allow users to modify their own meal-photos" on storage.objects;

-- Allow public read access to the 'meal-photos' bucket
create policy "Allow public read access to meal-photos"
on storage.objects for select
using (bucket_id = 'meal-photos');

-- Allow authenticated users to upload/insert files
create policy "Allow authenticated users to upload meal-photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'meal-photos');

-- Allow authenticated users to update/delete their own files
create policy "Allow users to modify their own meal-photos"
on storage.objects for all
to authenticated
using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

