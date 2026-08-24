-- Signed upload tokens are the only supported create/replace path for study
-- files. An owner UPDATE policy would let a browser enlarge existing objects
-- without obtaining a quota reservation, so remove that alternate path.
drop policy if exists "study resources owner update" on storage.objects;
revoke update on storage.objects from authenticated;

