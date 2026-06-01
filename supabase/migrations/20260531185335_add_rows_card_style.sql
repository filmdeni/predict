alter table questions
  drop constraint if exists questions_card_style_check;

alter table questions
  add constraint questions_card_style_check
  check (card_style in ('auto', 'gauge', 'bars', 'rows'));
