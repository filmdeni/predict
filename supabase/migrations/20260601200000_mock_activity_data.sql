-- Mock realistic activity: boost total_pool and predictions_count so questions
-- look like an active community is playing. Values are random-seeded per question
-- so each card looks naturally varied (not identical).

update questions
set
  total_pool = greatest(
    total_pool,
    (floor(random() * 80000 + 40000))::int
  ),
  predictions_count = greatest(
    predictions_count,
    (floor(random() * 800 + 200))::int
  )
where status in ('open', 'closed', 'resolved');
