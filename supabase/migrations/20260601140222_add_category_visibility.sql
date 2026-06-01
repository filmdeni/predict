create table category_visibility (
  slug text primary key,
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table category_visibility enable row level security;

-- anyone can read (used by CategoryFilter on the frontend)
create policy "public read" on category_visibility
  for select using (true);

-- only admin email can mutate
create policy "admin write" on category_visibility
  for all using (
    (auth.jwt() ->> 'email') = 'zwwzww19192@gmail.com'
  );

-- seed all known slugs as visible
insert into category_visibility (slug, hidden) values
  ('all',      false),
  ('politics', false),
  ('crypto',   false),
  ('drama',    false),
  ('stock',    false),
  ('viral',    false),
  ('esports',  false),
  ('sports',   false)
on conflict (slug) do nothing;
