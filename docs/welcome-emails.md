# Welcome series for new tutors (T-0724 the words, T-0737 the sending)

Status: **built, and OFF. Nothing is sent to anybody, and nothing was run against the real mail service or the real database.**
The owner approved the copy, the recipient rule and the decisions below (W-2225). What exists:

- `src/lib/welcome-series.ts` (the three mails and the rule for who is due which one) and `tests/welcome-series.test.ts`;
- `src/lib/welcome-send.ts` (the two switches, the daily run, the day-0 mail at sign-up), `src/app/api/cron/welcome-series/route.ts`
  (09:00 UTC in `vercel.json`), `src/app/unsubscribe/page.tsx`, `src/app/api/unsubscribe/route.ts`, `src/lib/unsubscribe-token.ts`;
- `supabase/migrations/023_welcome_emails.sql` (the two tables), **written but NOT applied: the owner runs it**;
- `tests/welcome-send.test.ts` and `tests/welcome-emails-migration.test.ts`, which run the real code on a throwaway Postgres (PGlite)
  with the mail service replaced by a recorder.

Two things differ from the draft below, on purpose:

1. **While the series is off (or in dry run, or before the start date), the OLD welcome mail of each sign-up place still goes**, exactly as
   before. Replacing it with a switch that is off would leave every new tutor with no welcome mail at all. Once the series is live, the new
   day-0 mail goes INSTEAD of the old one (one mail, not two).
2. **The day-0 mail is sent from the two sign-up places, never from the daily run**; the daily run does only the day-2 nudge and the day-7 check-in.

The sections "How it would send" and "Rollout" below describe the design as it is built.

## Why

723 tutors signed up and about 14 use Tutafy for real. The first days decide whether a new tutor ever gets a first booking, and today the
only thing that reaches them is one welcome mail at sign-up. This series adds two short follow-ups, only for tutors who have no lesson yet.

## What exists today (facts, checked in the code)

- A welcome mail is already sent at sign-up, in two places: `src/app/api/auth/register/route.ts` (email sign-up) and
  `src/app/auth/callback/route.ts` (Google sign-up). The two have different words. **The new day-0 mail replaces both**, so a new tutor
  gets one welcome mail, not two.
- There is **no unsubscribe anywhere** (no opt-out column, table or page) and **no record of which mail went to whom**.
- A tutor's booking link name (`tutafy.com/book/<name>`) is made at sign-up (`name-xxxx`) and **cannot be changed in the product**
  (Settings, Booking page tab, shows it read-only). So "name your link" cannot be a day-0 job today; see decision 1.
- Mail goes through `createMailer` (`src/lib/email.ts`): sender "Tutafy <booking@tutafy.com>", Reply-To the company mailbox, a plain-text
  copy beside the HTML, and the domain is already verified at Resend. A daily Vercel cron already exists for lesson reminders
  (`/api/cron/reminders`, closed unless `CRON_SECRET` is sent), so the same pattern fits.

## The three mails (English; the exact words are in `src/lib/welcome-series.ts`)

Pictures of each, with made-up data: `inbox/screens/toiuuram/T-0724/` in the Helme Brain, and HTML previews in `inbox/previews/T-0724/`.

### 1. Day 0, the moment a tutor signs up. Everyone.

Subject: `Welcome to Tutafy, Maria: three things to do first`

> Hi Maria,
>
> Welcome to Tutafy. You can be ready for your first booking in about ten minutes. Do these three things, in this order:
>
> 1. **Make your page yours**: Add your photo and a line about you. It is the first thing a student sees. [Open your profile]
> 2. **Choose your free hours**: Tick the days and times students can book you. [Set your hours]
> 3. **Share your booking link**: Your link is tutafy.com/book/maria-santos-ab12. Send it to one student, or put it wherever people find you. They pick a time and the lesson lands in your calendar. [Copy your link]
>
> Stuck anywhere? Just reply to this email. A real person reads it.
>
> The Tutafy team

(then the usual "Can't find our email? Check your spam or junk folder…" line and the unsubscribe line)

### 2. Day 2, only if the tutor has no lesson yet.

Subject: `Your Tutafy page is ready. Have you sent the link?`

> Hi Maria,
>
> Your booking page is live, and nobody has booked a lesson yet. That is normal: no one can book you until they have your link.
>
> The quickest way to a first lesson is to send the link to one person you already teach or talk to. No students yet? Book a test lesson with yourself and see what a student sees.
>
> [Open your booking page]
>
> Not sure your free hours are set? Check them here.
>
> If something is confusing, reply and tell us. We will help.
>
> The Tutafy team

### 3. Day 7, only if the tutor still has no lesson.

Subject: `What got in the way?`

> Hi Maria,
>
> You signed up for Tutafy a week ago and have not had a lesson on it yet. We would like to know what is stopping you.
>
> Was it not enough time, a step you could not work out, something Tutafy does not do, or is it simply not what you need? Reply with one line. We read every answer, and if we can fix it or help, we will.
>
> The Tutafy team

No stories, no discount, no statistics: nothing in these mails claims a number the product cannot back up. Every mail ends with
"You are getting this because you created a Tutafy account. Unsubscribe from these tips."

## Who gets what (the recipient rule, the part to approve)

A tutor is due a mail only when ALL of these are true (this is exactly what `dueWelcomeSteps` does, and the tests prove each line):

1. **The series is switched on, and the tutor signed up on or after the day it was switched on.** There is a start date, set by the owner
   when switching on. Without one the series is off and nobody is due anything. Every tutor who signed up before it (the 723) is never due
   anything from this series, on any day. Mailing them is a separate decision (decision 5).
2. The address is a real, plain address and has **not unsubscribed**. A made-up address is left out only when it ends in one of the endings of `TEST_DOMAIN` in `src/lib/welcome-series.ts`: example.com, example.org, example.net, .test, .invalid, .localhost. Other example endings (for instance .example and .local) are NOT filtered and would be mailed; `tests/absolute-claims.test.ts` keeps this sentence and the pattern in step.
3. The mail was **not already sent** to this tutor (each of the three goes at most once).
4. It is **inside its window**: welcome on day 0 (the first 24 hours), nudge from day 2 for two days, check-in from day 7 for three days.
   A cron that was down for a week does not send a "day 2" mail on day 6.
5. For the nudge and the check-in: the tutor has **no lesson yet** (any lesson counts: a student booked, or the tutor booked a test one).
   A tutor who is already teaching on Tutafy gets the welcome and nothing more.

At most one mail per tutor per run.

## How it would send (the design; nothing of this is built yet)

**Day 0** is sent from the two sign-up places, replacing their current welcome mails. **Days 2 and 7** by one new daily cron,
`/api/cron/welcome-series` (09:00 UTC, next to the reminders cron), closed unless `CRON_SECRET` is sent, like the reminders cron.

Each run: read the tutors who signed up in the last ten days and after the start date; read the two small tables below; for each, call
`dueWelcomeSteps`; for the first due step, **claim it first** (insert the row; the unique key makes a double run harmless), then send one
mail with `createMailer(key, 'general')` (sender "Tutafy <booking@tutafy.com>", Reply-To the company mailbox, plain-text copy added by the
mailer); if Resend refuses, remove the claim so the next run can try again inside the window.

Safeguards, all on by default:

- **Two switches, both off until the owner turns them on:** `WELCOME_EMAILS_START` (the start date; empty means off) and
  `WELCOME_EMAILS_SEND` (must be exactly `true`). With the start date set and SEND not `true`, the cron runs in **dry-run**: it answers how
  many mails it would send per step, **without addresses**, and calls nothing at Resend. The owner can watch a day of dry-runs first.
- A cap per run (50 mails) and one mail per tutor per run.
- **Fail closed:** no unsubscribe secret means nothing is sent.
- No mass send: the 723 existing tutors are excluded by rule 1, and there is no "send to everyone" path in the code.

### Unsubscribe (a hard requirement of the owner)

- Every mail has a personal link `https://www.tutafy.com/unsubscribe?t=<signed token>`: the token is the address plus a signature
  (HMAC, same pattern as the student links; it does not expire and cannot be forged or changed to another address).
- The page shows "Unsubscribe <address> from Tutafy tips?" with a button. **The button, not the link, does it** (POST), so a mail
  scanner that opens links cannot unsubscribe anyone by accident.
- Each mail also carries `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers, so Gmail and Apple Mail
  show their own "Unsubscribe" button; that calls the same endpoint.
- It writes the lowercase address to `email_optouts`. The list is by **address**, so it holds even if the tutor deletes the account and
  signs up again. It covers this series and any later lifecycle series; it does not stop mail the tutor needs to run lessons
  (booking confirmations, reminders, invoices), which are not part of it.
- A reply that says "stop" or "unsubscribe" to the company mailbox: the owner adds the address by hand (one line of SQL, given in the
  how-to that comes with the build). Honoured the same day.

### Data (two small tables, a migration the owner runs; written only when approved)

```sql
create table if not exists public.welcome_email_sends (
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  step text not null check (step in ('welcome', 'nudge', 'checkin')),
  sent_at timestamptz not null default now(),
  primary key (tutor_id, step)
);
create table if not exists public.email_optouts (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
-- both: row level security on, no policy, rights of anon and authenticated revoked (only the server reads and writes),
-- like public.feedback (020_feedback.sql); a test with a second user, run on PGlite, comes with it.
```

`welcome_email_sends` also lets the funnel report (T-0716) compare "mail sent" with "had a first lesson later".

### Secrets and settings the owner would set on Vercel (only after approval)

`UNSUBSCRIBE_SECRET` (a long random string, new; never reused from another secret), `WELCOME_EMAILS_START` and `WELCOME_EMAILS_SEND`.
The agent never reads or sets them.

### Rollout, in order, each step waits for the owner

1. The owner approves the copy, the recipient rule and the decisions below.
2. The build: migration file, unsubscribe page and endpoint, cron route, the two sign-up places switched to the new day-0 mail. Reviewed
   and merged like any change. Still nothing sends: no start date.
3. The owner runs the migration and sets `UNSUBSCRIBE_SECRET`.
4. The owner sets `WELCOME_EMAILS_START` to a date, leaving `WELCOME_EMAILS_SEND` off. A day or two of dry-run counts.
5. The owner sets `WELCOME_EMAILS_SEND=true`. The first real mail goes only to tutors who sign up after that date.
6. After two weeks: how many of the tutors who got the series had a first lesson, compared with the two weeks before.

## Decisions for the owner

1. **"Name your link" cannot be a day-0 job** (the product has no way to change it). The draft uses "Make your page yours" (photo and a
   line about you) instead. Alternatives: keep as drafted; or build link editing first (a separate ticket: unique names, old links
   keep working, search engines see the new address).
2. **Day 7 to everyone with no lesson, or only those who also did not open the earlier mails?** Drafted: everyone with no lesson
   (opens are not tracked).
3. **Who signs the mails?** Drafted: "The Tutafy team" (no person's name). A named person (the owner's first name) usually gets more
   replies. Your call.
4. **The start date** (rule 1): the day you want the first sign-ups to receive it.
5. **The 723 who signed up earlier:** nothing is sent to them by this series. If you want to try to win some back, that is a separate
   mail with its own copy, sent in small batches, only after your explicit order.
6. **A postal address in the footer.** Some countries require one in marketing mail. These mails are help for an account the person made,
   but the day-2 and day-7 ones are close to marketing. Do you want a postal address added?
7. **The old welcome mails (sign-up and Google sign-up) are replaced** by the new day 0. Confirm.
