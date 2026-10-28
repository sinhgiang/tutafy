# T-1043: "Get ready for the tutor directory" on the tutor dashboard

The owner chose option 1 of W-3289: keep the directory threshold at 6 (`DIRECTORY_OPENS_AT` in `src/lib/directory.ts`, unchanged) and bring more tutors to
fill in their free hours. The measured bottleneck was 724 tutors signed up and only 6 who had ever chosen free hours.

## What the tutor sees (`/dashboard`, the page a tutor lands on after signing in)

- A card at the top, `src/components/dashboard/DirectorySetupCard.tsx` (`data-testid="directory-setup"`): the title "Get ready for the tutor directory", "N steps left",
  a bar and "X of 3 done", one big button to the first step still open, a smaller button on every other open step, and a tick and "Done" on a step that is done.
- Three steps, in this order (`src/lib/directory-setup.ts`, `buildDirectorySetup`): free hours (at least one `availability` row, the same test as the
  no-hours banner), an introduction of `MIN_INTRO_CHARS` (80) characters or more (counted by `introLength` in `src/lib/directory.ts`, the directory's own count),
  and at least one language (`tutors.languages`, written from Settings, Profile by T-1032).
- The bar fills from the left by how many steps are done, whichever steps those are.
- When all three are done the card is not drawn at all.
- One click goes to the right step: `/availability`, `/settings?tab=profile&focus=intro` and `/settings?tab=profile&focus=languages`. In Settings the field
  is scrolled into view and the cursor is put in it (`src/components/settings/focusField.ts`, the anchors in `ProfileSection.tsx`). `focus` takes only `intro`
  or `languages` (`parseSettingsFocus`); anything else is ignored. Arriving this way changes and saves nothing.
- The old "no free hours" banner (T-0739) gives way to this card while it shows (its first step is the same prompt); if the card's read fails the banner still shows.

## Who may see what

Only the signed-in tutor's own progress. `loadDirectorySetup(supabase, user.id)` runs on the session client with the id from the session, and each of its two
queries names the tutor (`tutors.id`, `availability.tutor_id`). The page reads nothing from the request. It reads only: no insert, update, upsert, delete or rpc,
no email, no message, no notification.

## Tests

`tests/directory-setup.test.ts`: the three steps and their order, the 79/80 boundary against the directory's own rule, what counts as a language, both states on
the real dashboard page (unfinished tutor sees the card with progress and the right button, finished tutor sees nothing), a second tutor (the other tutor's hours,
introduction and languages neither complete mine nor show theirs; a loader without the tutor filter fails that check), a failed read shows no card, the page
writes nothing, the threshold is still 6, and the Settings focus. `tests/no-hours-banner.test.ts` changed to say the banner gives way to the card.

## Not done

- The profile-completion card (T-0765) and the listing card (T-0769) below it still ask for hours and an introduction too; they were left as they are.
- Free hours count as done from the first weekly row. The "next 14 days fully booked or blocked" case is still the listing card's to explain.
- No email or message: the owner asked for in-app only.
