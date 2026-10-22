-- Tutafy: which languages do the bookable tutors teach?   READ ONLY: one SELECT, writes nothing.
-- T-0764. Run it in the Supabase SQL editor of the project "tutafy", after eligible-tutors-count.sql. It returns one row per language
-- with how many eligible tutors teach it (a tutor who teaches two languages is counted in both), and no names or emails.
-- "Eligible" is the same rule as in eligible-tutors-count.sql (page on, named, introduction of 80+ characters, a free slot in the next
-- 14 days). The CTE block down to "flags" is the same text as in that file; a test keeps the two equal.

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
select initcap(btrim(lang)) as language, count(distinct id) as eligible_tutors
from flags, unnest(coalesce(languages, '{}'::text[])) as lang
where page_on and named and intro_ok and free_time_14d and btrim(lang) <> ''
group by initcap(btrim(lang))
order by eligible_tutors desc, language;
