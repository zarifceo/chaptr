alter table public.user_profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_version text;

comment on column public.user_profiles.terms_accepted_at is 'UTC timestamp when the user accepted the displayed Terms of Service version.';
comment on column public.user_profiles.privacy_accepted_at is 'UTC timestamp when the user accepted the displayed Privacy Policy version.';
comment on column public.user_profiles.terms_version is 'Version identifier for the accepted Terms of Service.';
comment on column public.user_profiles.privacy_version is 'Version identifier for the accepted Privacy Policy.';
