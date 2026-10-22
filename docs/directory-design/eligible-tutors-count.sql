-- Tutafy: how many tutors would the directory list under the proposed "bookable" rule?   READ ONLY: one SELECT, writes nothing.
-- T-0764. Run it in the Supabase SQL editor of the project "tutafy". It returns ONE row of counts and no names, no emails.
--
-- The rule (docs/directory-design/bookable-rule.md). A tutor is listed when ALL of these hold:
--   1. page_on        the booking page is switched on (tutors.booking_url_active)
--   2. named          the name has at least 2 characters once spaces are trimmed
--   3. intro_ok       the introduction (tutors.bio) has at least 80 characters once spaces are trimmed
--   4. free_time_14d  at least one lesson-length slot is still free between 1 hour from now and 14 days from now, counted the way
--                     the booking page counts: the tutor's weekly hours (availability), one slot every lesson length + buffer,
--                     minus the dates in availability_exceptions, minus slots that overlap a lesson that is not cancelled.
--   A photo is NOT required (the card shows a coloured tile with initials); the photo only helps the ranking.
-- Columns after "eligible" are the same count with one more condition, to show what each would cost:
--   eligible_and_priced  also has a lesson price (default_lesson_price > 0)
--   eligible_and_photo   also has a photo (avatar_url)
-- eligible_test_like_accounts counts eligible tutors whose address looks like a test address (example.com, .test ...): a hint that some
-- of the number is the owner's own test accounts. page_on_unknown_time_zone are tutors whose time zone Postgres does not know:
-- they cannot be counted, and the directory code would have to skip them too.
-- The first lines of the CTE block (down to "flags") are the same in eligible-tutors-by-language.sql; a test keeps the two equal.

with
params as (
  select now() as t0, interval '14 days' as horizon, interval '1 hour' as lead, 80 as min_intro_chars
),
t as (
  select t.id, t.name, t.email, t.bio, t.avatar_url, t.languages, t.booking_url_active, t.default_lesson_price,
         coalesce(t.default_lesson_duration, 60) as dur,
         coalesce(t.buffer_minutes, 0) as buf,
         z.name as tz
  from public.tutors t
  left join pg_timezone_names z on z.name = t.timezone
),
days as (
  select t.id, t.tz, t.dur, t.buf, ((p.t0 at time zone t.tz)::date + g) as day
  from t cross join params p cross join generate_series(0, 14) g
  where t.booking_url_active and t.tz is not null
),
starts as (
  select d.id, d.day, d.dur, (d.day + (m * interval '1 minute')) at time zone d.tz as slot_start
  from days d
  join public.availability a on a.tutor_id = d.id and a.day_of_week = extract(dow from d.day)::int
  cross join lateral generate_series((extract(epoch from a.start_time) / 60)::int, (extract(epoch from a.end_time) / 60)::int - d.dur, d.dur + d.buf) as m
),
free as (
  select distinct s.id
  from starts s cross join params p
  where s.slot_start >= p.t0 + p.lead and s.slot_start <= p.t0 + p.horizon
    and not exists (select 1 from public.availability_exceptions e where e.tutor_id = s.id and e.date = s.day)
    and not exists (
      select 1 from public.lessons l
      where l.tutor_id = s.id and l.status <> 'cancelled'
        and l.starts_at < s.slot_start + s.dur * interval '1 minute'
        and coalesce(l.ends_at, l.starts_at + coalesce(l.duration_minutes, 60) * interval '1 minute') > s.slot_start)
),
flags as (
  select t.id, t.email, t.languages,
         coalesce(t.booking_url_active, false) as page_on,
         char_length(btrim(coalesce(t.name, ''))) >= 2 as named,
         char_length(btrim(coalesce(t.bio, ''))) >= (select min_intro_chars from params) as intro_ok,
         f.id is not null as free_time_14d,
         coalesce(t.default_lesson_price, 0) > 0 as priced,
         btrim(coalesce(t.avatar_url, '')) <> '' as has_photo,
         t.tz is null as unknown_tz
  from t left join free f on f.id = t.id
)
select
  count(*)                                                                     as tutors_total,
  count(*) filter (where page_on)                                              as page_on,
  count(*) filter (where page_on and named)                                    as page_on_named,
  count(*) filter (where page_on and intro_ok)                                 as page_on_intro_ok,
  count(*) filter (where page_on and free_time_14d)                            as page_on_free_time_14d,
  count(*) filter (where page_on and named and intro_ok and free_time_14d)     as eligible,
  count(*) filter (where page_on and named and intro_ok and free_time_14d and priced)     as eligible_and_priced,
  count(*) filter (where page_on and named and intro_ok and free_time_14d and has_photo)  as eligible_and_photo,
  count(*) filter (where page_on and named and intro_ok and free_time_14d
                     and email ~* '@(example\.(com|org|net)|[^@]*\.(test|invalid|localhost))$')   as eligible_test_like_accounts,
  count(*) filter (where page_on and unknown_tz)                               as page_on_unknown_time_zone
from flags;
