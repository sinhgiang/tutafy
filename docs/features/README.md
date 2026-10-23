# Feature entries, one file for each ticket

`docs/feature-map.md` lists what each feature is and where it lives, but it is one long file, and
every pull request that added a bullet to it edited the same lines as the next one. New entries now
go here instead.

## Rules

- One file for each ticket: `docs/features/<ticket>-<short-name>.md`, for example
  `docs/features/T-0860-refunds.md`. The file starts with a heading `# <ticket>: <name>`.
- Write what the old bullets in `docs/feature-map.md` say: what the page or route does, the files that
  hold it, the tests that keep it, and what is not done.
- Add the file in the same pull request as the change. Do not add a bullet to `docs/feature-map.md`
  and do not list the new file anywhere else: an index would be the next place two pull requests
  conflict. Find entries with `git grep` or by the ticket number.
- If your ticket changes a feature that has an old bullet in `docs/feature-map.md`, change that bullet
  in place (only its words) and also say so in your own file.
- Do not write the number of test files or of any list that grows with every pull request. Write a
  count of a list only with the marker `[count: NAME=N]` that `tests/counted-lists.test.ts` checks, and
  only when the list changes rarely.
- Never put a real e-mail address, phone number, key or password in an entry.
