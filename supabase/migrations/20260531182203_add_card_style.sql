alter table questions
  add column if not exists card_style text not null default 'auto'
  check (card_style in ('auto', 'gauge', 'bars'));
