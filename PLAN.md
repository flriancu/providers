# Providers directory plan

Phases follow [REQUIREMENTS.md](REQUIREMENTS.md). Each phase is reviewed before the next one
starts; the plan is adjusted on the way and changes are dated here.

2026-11-16: replanned for the static, Drive-backed architecture (D-21). The earlier Django
Phase 0 was not run or committed.

| Phase | Title | Status |
|---|---|---|
| 0a | Shared package drive-doc-sync, planner moved onto it | Done 2026-11-16; planner branch not merged |
| 0b | Providers setup and proof of the Drive sharing assumptions | In progress: setup done; link sharing proven; Picker and editing wait for a second account |
| 1 | Seed names from the board photo | Done 2026-11-16, approved by the owner |
| 2 | Domain core | Done 2026-11-16 |
| 3 | Provider and label pages (in-memory demo) | Done 2026-11-16 |
| 4 | Browse, filter, search | Not started |
| 5 | Drive storage, sync, device copy | Not started |
| 6 | Import, export, duplicates, seed import | Not started |
| 7 | Sharing | Not started |
| 8 | One-off contact lookup for the seed vendors | Not started |
| 9 | Romanian, accessibility, acceptance, deploy | Not started |

## Phase 0a: Shared package drive-doc-sync, planner moved onto it

Goal: D-27 and D-28, with vacation_planner behaving exactly as before.

- New repository `drive-doc-sync` at `c:\Users\fiancu\Desktop\aa\drive-doc-sync`: Google
  sign-in, Drive calls, Picker, storage interface with Drive and in-memory storages, sharing,
  document sync, device copy, retry. Storage and sync are generic over the document type; the
  app passes in its merge, migrate and absorb functions.
- The planner's tests for this code move with it; the package gets its own CI.
- vacation_planner, on a local branch, depends on the package by local path while it settles,
  then by tag; all its unit and end-to-end tests pass unchanged.
- Nothing is pushed or published without the owner's go-ahead (new GitHub repository, planner
  branch, tag).

Deliverable: package with passing tests; planner branch with passing tests. Verifies: D-27,
D-28.

Result 2026-11-16 (local, nothing committed or pushed):

- Package: type check, lint and format clean; 53 unit tests pass.
- Planner branch `use-drive-doc-sync`: type check, lint, format and build clean. Unit tests:
  213 pass, against 214 on `main` (the one sign-in test moved into the package). End-to-end
  tests: 78 pass, as on `main`, in two consecutive full runs. The planner's private tests pass.
- Deviation: the fake Drive in the planner's end-to-end tests now reads the multipart boundary
  from the request instead of assuming the planner's old prefix.
- Seen once: the planner's legend-swatch end-to-end test failed in one full parallel run and
  passed 3 of 3 times alone, on the branch and on `main`; it does not touch the moved code.
- Published 2026-11-16: [drive-doc-sync](https://github.com/flriancu/drive-doc-sync) `main`
  and tag `v0.1.0`; planner branch `use-drive-doc-sync` (commit `cf48c2d`) depends on the tag
  and passes every check above again. A clean install with SSH disabled and an empty npm cache
  fetches the package over HTTPS (`codeload.github.com`), as CI will.
- Open: merging the planner branch into `main` deploys the live site; that is the owner's call.

## Phase 0b: Providers setup and proof of the Drive sharing assumptions

Goal: settle Q-06, and prove Q-07 before building on it.

- Vite + React + TypeScript (strict), Node 24, oxlint, Prettier, Vitest, Playwright, CI on
  GitHub Actions (checks only, no deploy yet), as in vacation_planner.
- Lint rule for NFR-04 (no React, DOM or Google imports under `src/domain/`).
- Dependency on drive-doc-sync; i18n set up like the planner's.
- Owner actions: Google Cloud project and OAuth client with `http://localhost:5173` as origin;
  API key for the Picker (steps provided in the phase report).
- Spike, kept as tests where possible: sign in on localhost; create the directory file; write a
  snapshot file, share it "anyone with the link" and read it from a signed-out page; share one
  with a second Google account and open it there through the Picker.
- git init with the repo-local noreply identity.

Deliverable: the spike results (what works, what doesn't), a passing empty CI run. Verifies:
Q-07, D-21, D-13, NFR-04.

## Phase 1: Seed names from the board photo

Goal: the exhibitor list as reviewed data. No code.

- Transcribe every name exactly as printed into `seed/exhibitors.csv` (board column and
  position for checking, name, note). The "500 LEI" badge is not recorded (2026-11-16).
- Owner reviews against the photo; corrections are proposed and marked, never silent.

Deliverable: owner-approved `seed/exhibitors.csv`. Verifies: FR-25 (data part), NFR-09.

Result 2026-11-16: 162 exhibitors (board columns of 41, 40, 40 and 41), no duplicates. The
owner reviewed the list against close-ups of the photo and approved it, including the five
noted spots as transcribed: the missing-character box before the ice cream bar (column 2,
position 27) and KINDRED EVENTS left out, the two long dashes kept, and PORTETE 3D.RO kept as printed.

## Phase 2: Domain core

Goal: the rules in plain TypeScript, with unit tests.

- Document schema, provider, label, facet, log entry; record-by-record merge.
- Facet filtering (OR within, AND across, parent includes children) and counts.
- Search (MiniSearch, D-23) with diacritic folding.
- Snapshot projection per label (D-16, D-22) and "who can see / what can they see".
- Duplicate matching.

Deliverable: `src/domain` with unit tests, including a 10,000-provider speed test. Verifies:
FR-04..05, FR-10..11, FR-13, FR-16, FR-18, FR-23 (logic), NFR-04, NFR-10 (search part).

Result 2026-11-16:

- Modules: `schema` (document, starting facets and Unsorted with fixed ids), `records` (add,
  update, delete with stamps that never go backwards), `merge`, `migrate` (unreadable records set
  aside and written back), `document` (the model drive-doc-sync uses), `labels` (tree, matching
  by name, alias or either language, rarely used labels), `filter` (OR within, AND across,
  counts), `search` (MiniSearch, D-23), `sharing` (label snapshot, who sees what, new audiences,
  coverage), `duplicates` (name, phone, email, link).
- Shares are records in the directory, so who sees what is computed from the document alone.
- Type check, lint (including the NFR-04 domain rule), format and build clean; 57 unit tests and
  4 end-to-end tests pass.
- Speed with 10,000 providers on this desktop ([evidence](evidence/phase2-speed.txt)): filter
  plus counts 14 ms, searches 3 to 9 ms, against the 100 ms phone budget. Building the search
  index takes about 270 ms once per directory version; on a phone it may take about a second,
  so Phase 5 saves the index with the device copy if that shows.
- Deviation: a parent label counts the providers under its children in the "rarely used" list
  (FR-08), so "Wedding" is not offered for clean-up while its children are in use.

## Phase 3: Provider and label pages (in-memory demo)

- Provider create, view, edit, archive; interaction log; label and facet management (rename,
  merge, move, aliases, unused labels); English dictionary.
- Runs on in-memory storage, like the planner's signed-out demo.

Deliverable: a usable address book in the browser. Verifies: FR-01..09.

Result 2026-11-16:

- Adaptive list-detail layout (D-29): side by side from 840 px wide, one pane at a time below,
  with Back to the list; addresses in the hash (`#/p/<id>`), so reload and Back work.
- Provider form (lists one per line; labels per facet with sub-labels; main category when more
  than one), provider details (phone, email and web links), delete after asking; interaction
  log with full dates; Labels page with add, rename and aliases, move, merge, delete, rename
  facet, add facet, and the rarely used list.
- Editing rules in `src/domain/edits.ts`, each refusal a code shown as a sentence.
- Type check, lint, format and build clean; 70 unit tests and 18 end-to-end tests pass on
  desktop and phone sizes (2 layout tests apply to one size each and are skipped on the other).
- Deviations: the Romanian dictionary is written now, alongside English (the type check needs
  every key in both); Phase 9 reviews it instead of writing it. The confirmation button for
  deleting a label names the label ("Delete Wedding"), so it is not mistaken for the row's
  Delete button.
- Changed after the owner's review, 2026-11-16: labels and facets have one name as typed, and
  only the interface is translated (D-30); labels are coloured chips with a contrast-checked
  palette (D-31); the provider status is gone (D-32). 72 unit tests and 18 end-to-end tests
  pass after the change.
- Further review fixes, 2026-11-16: the demo starts with a made-up sample provider; the log
  form is one column with one left edge, and its date is a button showing the day in full
  with a calendar (`@daypicker/react`, as in vacation_planner) instead of the browser's
  short-format date input; denser list rows (name and contact person, all labels as chips,
  first phone, email and website) with a correct plural count; a triangle between a label and
  its parent; search includes label names and aliases (FR-13). 78 unit tests and 22
  end-to-end tests pass.
- Then: on a phone, a provider opens at its top and Back returns to the same place in the list;
  the Labels page has one Edit per label (name, colour, other words, place, merge, delete in
  one editor) and lays facets out in columns on wide screens; no Unsorted label (D-33); a
  denser header and one-line demo notice. 77 unit tests and 25 end-to-end tests pass.
- Base text size 18 px (112.5% of the browser default), chosen by the owner from 16, 17 and
  18 px rendered side by side; spacing grows with it.

## Phase 4: Browse, filter, search

- Facet panel with counts, chips, URL state, search within filters.
- Two mobile filter variants shown side by side at real phone size; owner picks one (Q-02).

Deliverable: the browse view on desktop and phone. Verifies: FR-10..13, NFR-06, NFR-07.

## Phase 5: Drive storage, sync, device copy

- Directory file in Drive, auto-save, merge on conflict, device copy, refresh by version (D-24),
  sign-out clears the device copy.
- The signed-out demo starts with a made-up sample provider (`src/ui/demoDirectory.ts`); at
  sign-in only what the visitor added is carried into their directory, never the sample.

Deliverable: the directory persists across devices. Verifies: D-24, D-25, NFR-01, NFR-02,
NFR-10 (refresh part).

## Phase 6: Import, export, duplicates, seed import

- CSV import with preview and duplicate review (keep both, skip, merge); CSV export of all or of
  the filtered view.
- Import the approved `seed/exhibitors.csv`.

Deliverable: the seed vendors in the owner's directory. Verifies: FR-21..25, D-26, NFR-09.

## Phase 7: Sharing

- Snapshot files per shared label, rewritten on change; share by email (reader) and by link;
  revoke; regenerate.
- Whole-directory sharing for editors.
- Guards: shared-label markers, "visible to N more people" confirmation, subtree count before
  sharing a parent; "who can see this" and "what can this person see".
- Viewer side: open by link (signed out) and by email through the Picker; read-only display.

Deliverable: a second Google account sees exactly what was shared. Verifies: FR-14..20, D-22,
NFR-01, NFR-03.

## Phase 8: One-off contact lookup for the seed vendors

- Settle the permitted Google route (Q-04) and the sites that may be contacted.
- For each vendor: website, phone, email, social links, each with its source URL, into
  `seed/contacts_review.csv`; uncertain matches marked.
- Owner approves rows; approved values are imported through the Phase 6 preview.

Deliverable: contact details on the seed vendors. Verifies: FR-26, D-08.

## Phase 9: Romanian, accessibility, acceptance, deploy

- Romanian dictionary; per-user language switch.
- Accessibility audit; interface-text stranger-read.
- Deploy to GitHub Pages on the subdomain (Q-06); Google settings updated for it.
- Full acceptance run plus phone check by the owner.
- README and DESIGN.md.

Deliverable: v1 accepted. Verifies: FR-27, NFR-05..08, acceptance.
