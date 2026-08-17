create index if not exists recommendation_feedback_user_id_idx on public.recommendation_feedback(user_id);

alter policy learning_preferences_select_own on public.learning_preferences using ((select auth.uid()) = user_id);
alter policy learning_preferences_insert_own on public.learning_preferences with check ((select auth.uid()) = user_id);
alter policy learning_preferences_update_own on public.learning_preferences using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy subject_assessments_select_own on public.subject_assessments using ((select auth.uid()) = user_id);
alter policy subject_assessments_insert_own on public.subject_assessments with check ((select auth.uid()) = user_id);
alter policy subject_assessments_update_own on public.subject_assessments using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter policy recommendation_feedback_select_own on public.recommendation_feedback using ((select auth.uid()) = user_id);
alter policy recommendation_feedback_insert_own on public.recommendation_feedback with check ((select auth.uid()) = user_id);
