-- Visitor session tracking (anonymous + authenticated)
create table visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  anon_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  user_agent text,
  device_type text check (device_type in ('mobile', 'tablet', 'desktop'))
);

create index on visitor_sessions (anon_id);
create index on visitor_sessions (first_seen);
create index on visitor_sessions (user_id) where user_id is not null;

alter table visitor_sessions enable row level security;

-- Page views per session
create table page_views (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references visitor_sessions(id) on delete cascade,
  anon_id uuid not null,
  path text not null,
  viewed_at timestamptz not null default now()
);

create index on page_views (session_id);
create index on page_views (viewed_at);
create index on page_views (path);

alter table page_views enable row level security;

-- Only admin can read; writes go through service role via API route
create policy "admin_read_visitor_sessions" on visitor_sessions
  for select using (auth.jwt() ->> 'email' = 'zwwzww19192@gmail.com');

create policy "admin_read_page_views" on page_views
  for select using (auth.jwt() ->> 'email' = 'zwwzww19192@gmail.com');