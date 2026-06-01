-- Enable realtime for predictions table so ResolvedRewardPopup receives UPDATE events
do $$ begin
  alter publication supabase_realtime add table predictions;
exception when others then null;
end $$;
alter table predictions replica identity full;
