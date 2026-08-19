alter table public.user_profiles drop constraint if exists user_profiles_onboarding_step_check;
alter table public.user_profiles add constraint user_profiles_onboarding_step_check check (onboarding_step between 0 and 11);

notify pgrst, 'reload schema';
