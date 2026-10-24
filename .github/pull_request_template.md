## What this changes

<!-- One or two sentences. -->

## Before you ask for a review

- [ ] `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass on this branch (the pull request check runs the same four).
- [ ] If this pull request loosens or changes a value rule (a limit, a set of allowed values, a length, a price band), I added the old wording ("30, 45, 60 and 90", "only 30", and so on) to the list in `tests/support/old-rules.ts` and the scan in `npm test` finds no comment or sentence that still states it. Old wording that is meant as history is marked `allow-old-rule: <reason>` in its own comment.
- [ ] Nothing in the change holds a key, a password, an `.env` file or a real email address or phone number.
