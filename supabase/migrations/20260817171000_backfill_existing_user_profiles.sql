insert into public.user_profiles (user_id, onboarding_step, onboarding_completed)
select id, 7, true
from auth.users
on conflict (user_id) do nothing;
