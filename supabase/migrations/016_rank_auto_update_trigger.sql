-- Auto-update user rank whenever reputation changes
create or replace function public.sync_rank_from_reputation()
returns trigger language plpgsql as $$
begin
  new.rank := case
    when new.reputation >= 15000 then 'จักรวาลเลือก'
    when new.reputation >= 7000  then 'เทพทำนาย'
    when new.reputation >= 3000  then 'เซียนทำนาย'
    when new.reputation >= 1200  then 'โหรมือทอง'
    when new.reputation >= 500   then 'นักพยากรณ์'
    when new.reputation >= 150   then 'ผู้ตื่นรู้'
    else 'ผู้มาใหม่'
  end::rank_tier;
  return new;
end;
$$;

drop trigger if exists trg_sync_rank on public.users;
create trigger trg_sync_rank
  before insert or update of reputation on public.users
  for each row execute function public.sync_rank_from_reputation();
