-- Migrate rank_tier enum from 5 old tiers to 7 new tiers
-- Old: มือใหม่ | นักพยากรณ์ | โหรมือทอง | เซียนฟันธง | เทพทำนาย
-- New: ผู้มาใหม่ | ผู้ตื่นรู้ | นักพยากรณ์ | โหรมือทอง | เซียนทำนาย | เทพทำนาย | จักรวาลเลือก

-- Step 1: Drop default first (it depends on the enum type)
alter table public.users alter column rank drop default;

-- Step 2: Change column to text temporarily so we can swap the enum
alter table public.users alter column rank type text;

-- Step 3: Drop old enum (no dependents remain)
drop type if exists rank_tier;

-- Step 3: Create new enum
create type rank_tier as enum (
  'ผู้มาใหม่',
  'ผู้ตื่นรู้',
  'นักพยากรณ์',
  'โหรมือทอง',
  'เซียนทำนาย',
  'เทพทำนาย',
  'จักรวาลเลือก'
);

-- Step 4: Remap existing user data to new tiers
--   มือใหม่     → ผู้มาใหม่     (coins < 150 → Wanderer)
--   นักพยากรณ์  → ผู้ตื่นรู้    (closest match by rep threshold)
--   โหรมือทอง   → นักพยากรณ์   (keep name but shift threshold)
--   เซียนฟันธง  → เซียนทำนาย   (rename)
--   เทพทำนาย    → เทพทำนาย     (keep)
update public.users set rank = case rank
  when 'มือใหม่'     then 'ผู้มาใหม่'
  when 'นักพยากรณ์'  then 'ผู้ตื่นรู้'
  when 'โหรมือทอง'   then 'นักพยากรณ์'
  when 'เซียนฟันธง'  then 'เซียนทำนาย'
  when 'เทพทำนาย'    then 'เทพทำนาย'
  else 'ผู้มาใหม่'
end;

-- Step 5: Cast column back to new enum type
alter table public.users
  alter column rank type rank_tier using rank::rank_tier;

-- Step 6: Update default
alter table public.users
  alter column rank set default 'ผู้มาใหม่';

-- Step 7: Recalculate rank from actual reputation to fix any edge cases
-- (reputation column drives real rank — coins is display balance)
update public.users set rank =
  case
    when reputation >= 15000 then 'จักรวาลเลือก'
    when reputation >= 7000  then 'เทพทำนาย'
    when reputation >= 3000  then 'เซียนทำนาย'
    when reputation >= 1200  then 'โหรมือทอง'
    when reputation >= 500   then 'นักพยากรณ์'
    when reputation >= 150   then 'ผู้ตื่นรู้'
    else 'ผู้มาใหม่'
  end::rank_tier;
