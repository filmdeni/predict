-- Enable realtime for predictions table so ResolvedRewardPopup receives UPDATE events
alter publication supabase_realtime add table predictions;
alter table predictions replica identity full;
