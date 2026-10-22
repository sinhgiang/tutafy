-- The storage bucket for tutors' profile photos (T-0766).
--
-- WRITTEN BUT NOT APPLIED: the owner runs this on the real database (Supabase SQL Editor, project "tutafy"). Safe to run again.
-- Tested on a local copy only (tests/tutor-avatars-migration.test.ts, PGlite with a small stand-in of Supabase's storage tables).
--
-- WHAT IT ADDS: one bucket, `tutor-avatars`. It is PUBLIC (a photo is shown on the public profile, the directory and the booking page, so
-- anyone may read a file by its address; a file's address holds a random name and the tutor's own folder), limited to 2 MB a file, and
-- to JPEG, PNG and WebP (the same limits src/lib/avatar-image.ts checks before it stores anything).
--
-- WHO MAY WRITE: nobody from a browser. Supabase turns row level security on for storage.objects and this file adds NO policy for
-- anon or authenticated, so a signed-in tutor cannot upload, replace or delete a file by calling the storage address directly.
-- The only writer is the server (src/app/api/tutors/avatar/route.ts, which uses the server's own key): it takes the tutor id from the
-- session, puts the file in that tutor's folder, and sets tutors.avatar_url on that tutor's own row. Reading a public bucket needs no policy.
--
-- Until this is applied nothing breaks: the upload route answers "Photo upload is not set up yet" (503) and no tutor has a photo.
-- Nothing is created at run time by the app; this file is the only thing that makes the bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tutor-avatars', 'tutor-avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
