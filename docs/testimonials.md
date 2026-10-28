# Tutor stories on /customers: how to add one (T-1032)

The page is `src/app/customers/page.tsx`. It draws what `src/lib/testimonials.ts` holds in `TESTIMONIALS`, which is **empty on purpose**. Two or three real tutors with real names is the goal; one made-up story would do more harm than none. The page shows "Your story could be the first" until an entry exists.

## The rule (the code enforces it)

An entry is drawn only when ALL of these hold; an entry that fails any of them is left out, never repaired (`publishable()`, tested in `tests/testimonials.test.ts`):

- `consent.given` is `true`, with the date it was given (not in the future) and how (for example "email reply kept by the owner", at least 10 characters). No consent, no card.
- The name and the one-line role are plain text (no address, no phone number).
- The quote is 40 to 600 characters, in the tutor's own words, with no link, address or phone number.
- A photo, if there is one, is an https address of a picture the tutor sent for this page.
- `tutorSlug`, if there is one, is the plain address part of the tutor's public profile (`/tutors/<slug>`); the card then links to it.
- At most three facts (`label` and `value`), and only numbers the tutor confirmed themselves.
- At most three cards on the page.

## How to ask a tutor (the owner writes this, never an agent: it goes to a real person)

1. Pick a tutor who really uses Tutafy: a public profile with an introduction, a photo and at least one student or lesson.
2. Send them a short message in English. Suggested words:

   > Hi NAME, thank you for using Tutafy. Would you be happy for us to feature you on our customer page with your name, a photo and two or three sentences about how Tutafy helps you? You would see the exact text first and you can ask us to change or remove it at any time.

3. Ask three questions and quote the answers as written (fix only spelling, with their agreement): *What did you use before? What changed for you? What would you tell another tutor?*
4. Keep their reply (it is the consent). Ask for a photo only if they want one on the page.
5. Add the entry below, run `npm test`, open a pull request. The owner merges.

## The entry

```ts
{
  id: 'ana-lagos',
  name: 'Ana Example',
  role: 'English tutor, Lagos',
  tutorSlug: 'ana-example-ab12',          // optional: her public profile
  photo: 'https://…',                     // optional: https only
  quote: 'Her own words, 40 to 600 characters, no link or phone number.',
  facts: [{ label: 'Students', value: '14' }],   // optional: only what she confirmed
  consent: { given: true, on: '2026-11-03', how: 'email reply kept by the owner' },
}
```

## What is not here, on purpose

- No star ratings and no `Review` markup on this page: a company's quotes about itself are not independent reviews, and search engines say so. The real reviews of a tutor are on the tutor's own profile (`/tutors/<slug>`), from students.
- No story is written by Tutafy, and none is paraphrased into something the tutor did not say.
- The page stays in the sitemap while it is empty; it says plainly that there are no stories yet.
