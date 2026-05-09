-- Add 'pending' status for user-submitted questions awaiting admin approval
alter type question_status add value if not exists 'pending';
