-- Pool snapshots for probability trend charts
create table public.pool_snapshots (
  id          bigserial primary key,
  question_id uuid not null references public.questions(id) on delete cascade,
  pool        jsonb not null,
  recorded_at timestamptz not null default now()
);

create index idx_pool_snapshots_question_recorded on public.pool_snapshots(question_id, recorded_at);

alter table public.pool_snapshots enable row level security;

create policy "Anyone can read pool_snapshots"
  on public.pool_snapshots for select using (true);

-- Trigger: record a snapshot whenever question.pool changes
create or replace function public.record_pool_snapshot()
returns trigger language plpgsql security definer as $$
begin
  if NEW.pool is distinct from OLD.pool then
    insert into public.pool_snapshots(question_id, pool)
    values (NEW.id, NEW.pool);
  end if;
  return NEW;
end;
$$;

create trigger trg_pool_snapshot
after update of pool on public.questions
for each row execute function public.record_pool_snapshot();
