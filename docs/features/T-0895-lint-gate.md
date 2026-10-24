# T-0895: lint is a required check, and the 177 errors are gone

`npm run lint` (`eslint --max-warnings 0`) reports nothing on the repository, and a new error or a new warning makes it exit 1.

## What keeps it

- `package.json`: the `lint` script has `--max-warnings 0`, so a warning fails it too.
- `.github/workflows/pull-request.yml`: the step "Lint" runs `npm run lint` before the type check, the tests and the build, so a lint problem turns the pull request red. The pull request template lists the same four commands.
- `tests/lint-gate.test.ts`: reads the script and the workflow, and runs the real eslint configuration on made-up sources (an `any`, a variable nobody reads, state set at once in an effect, clean code), so a loosened configuration shows up as a failing test.
- `eslint.config.mjs`: one rule is off, only for `scripts/**/*.cjs` (a CommonJS script can only use `require`).

## What was in the 177 errors and 49 warnings, and what was done

| Kind | Count | What was done |
| --- | --- | --- |
| `no-explicit-any` | 137 | Casts that were not needed were removed (`.update(... as any)`, `(row as any).column`). A to-one embed such as `students(name)` is typed as an array by the client but is an object at run time: `one()` in `src/lib/relation.ts` reads either. The rest got real types (row types, `Record<string, unknown>` for a request body, `SupabaseClient`, the install-prompt event, Jitsi listeners). Types only: no run-time change. |
| `no-unused-vars` and `prefer-const`, `no-unused-expressions` | 32 + 2 + 3 | Unused imports, variables and props removed (`studentName` of the chat panel and of the payment panel, `homework` of the homework box, `firstName` of the gamification card, with their callers). Two `a ? b : c` statements became `if` statements. |
| `react/no-unescaped-entities` | 16 | `'` in page text became `&apos;`. The page shows the same text. |
| `@next/next/*` | 5 | The import page's "View students" is a `Link`. Three `<img>` for a photo whose address can be any host, and the "View as student" navigation to a route handler, are kept with a one-line reason. |
| `react-hooks/immutability` | 5 | The four lists that called `load` before it was declared now call it after. The Stripe checkout redirect uses `window.location.assign`. |
| `react-hooks/set-state-in-effect` | 12 | The invite code of the register page is read straight from the address. The mobile hook uses `useSyncExternalStore`. The other effects read something only the browser has (the saved cookie choice, `localStorage`, the time zone, the address) or fetch once on arrival; each stays with a disable comment that says why. |
| `react-hooks/exhaustive-deps` | 10 | `supabase` (a singleton in the browser) and `router` were added to the lists. Three `playDing` effects stay without it with a comment: it only touches refs, and listing it would restart the poll on every render. |
| `react-hooks/purity` | 2 | `RescheduleCancel` reads the time once when the page opens. `LessonActions` has a test that is always false (see below). |

## Found on the way, not changed (behaviour must stay the same in this ticket)

- `src/app/(dashboard)/lessons/[id]/LessonActions.tsx`: the "Student didn't show up?" card is shown when `new Date() > new Date(Date.now())`, which is never true, so the card never appears. It needs the lesson time to work.
- `src/app/api/lessons/[id]/group-students/route.ts`: DELETE and PATCH use the admin client and never check that the entry belongs to a lesson of the signed-in tutor (the lesson id in the address was read and not used).
- `src/app/api/lessons/[id]/sync-gcal/route.ts`: the lesson is selected without `google_event_id`, so an existing calendar event is never found and each sync creates a new one.
- `src/app/api/webhooks/stripe/route.ts`: reads `current_period_start` and `current_period_end` from the subscription object; the Stripe typings of this API version do not have them there.

## Not done

- The fetch-on-arrival effects were not moved to a data library; they keep a disable comment.
