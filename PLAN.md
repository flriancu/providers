# Providers directory plan

Phases follow [REQUIREMENTS.md](REQUIREMENTS.md). Each phase is reviewed before the next one
starts; the plan is adjusted on the way and changes are dated here.

The folders `seed/`, `evidence/` and `docs/research/` are kept on the owner's machine and are
not in the repository (owner, 2026-11-17); links to them work in the local copy only.

2026-11-16: replanned for the static, Drive-backed architecture (D-21). The earlier Django
Phase 0 was not run or committed.

2026-11-16, after Phase 5: labels have one level (D-35). Sub-labels are gone from the data,
editing, filters, search, sharing and the demo sample; a file with labels under a parent
reads them as top-level labels. The phase results below describe each phase as it was built.

2026-11-18, adversarial test round: five agents tested isolated copies, four re-verified the
fixes. Fixed in commits 08f3e08 to 764e720 and drive-doc-sync 0.4.0 to 0.7.0, each with a
regression test that fails without it; decisions D-42 to D-45. FR-08's "move" now moves a label
to another group (`moveLabel`); the "move" in Phase 3 below was moving a label under a parent,
which D-35 removed. Known and not fixed:
- Labels added to one provider on two devices at once keep one device's list (`labelIds`
  merges as one value; a set that merges per label would keep both).
- A label moved into a group while another device makes that name there gives two labels of
  that name; Merge on the Labels page joins them.
- Import line numbers count rows, not lines, after a "sep=" line or a value with a line break.
- NFR-10 on a slowed phone at 10,000 providers (D-42).

| Phase | Title | Status |
|---|---|---|
| 0a | Shared package drive-doc-sync, planner moved onto it | Done 2026-11-16; planner branch not merged |
| 0b | Providers setup and proof of the Drive sharing assumptions | In progress: setup done; link sharing proven; Picker and editing wait for a second account |
| 1 | Seed names from the board photo | Done 2026-11-16, approved by the owner |
| 2 | Domain core | Done 2026-11-16 |
| 3 | Provider and label pages (in-memory demo) | Done 2026-11-16 |
| 4 | Browse, filter, search | Done 2026-11-16 |
| 5 | Drive storage, sync, device copy | Done 2026-11-17; the owner signed in with the real account |
| 6 | Import, export, duplicates, seed import | Built 2026-11-17; the owner's seed import open |
| 7 | Sharing | Not started |
| 8 | One-off contact lookup for the seed vendors | Done 2026-11-17, approved by the owner |
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

Result 2026-11-16:

- Filters, list and provider side by side from 1200 px; list and provider from 840 px with the
  filters opening over the page; one pane at a time on a phone (D-29, D-34).
- Filter panel: one group per facet, values with counts (spoken as "Photo, 2 providers"),
  sub-labels indented, "No <facet>" (D-33), 8 values then "Show all", values that would empty
  the list greyed out and not tickable; chosen values as removable chips with "Clear all".
- Search above the list, within the filters, best match first (FR-13).
- Filters and search in the address: reload, bookmarks, Back and opening a provider keep them;
  values whose label no longer exists are ignored rather than emptying the list.
- Q-02: both phone behaviours were built and tried live; the owner chose instant (D-34).
- 82 unit tests and 29 end-to-end tests pass (7 skipped: each layout test runs on its own
  screen size only).
- Possible later: named saved queries on top of the address ("photographers in Bucharest");
  not in the requirements yet.

## Phase 5: Drive storage, sync, device copy

- Directory file in Drive, auto-save, merge on conflict, device copy, refresh by version (D-24),
  sign-out clears the device copy.
- The signed-out demo starts with a made-up sample provider (`src/ui/demoDirectory.ts`); at
  sign-in only what the visitor added is carried into their directory, never the sample.

Deliverable: the directory persists across devices. Verifies: D-24, D-25, NFR-01, NFR-02,
NFR-10 (refresh part).

Result 2026-11-16:

- Signed out: the demo, as before. "Sign in with Google" (or "Continue as <name>" for the last
  account on this device) opens the account's directory: one JSON file,
  `providers-directory.json`, in the account's own Drive, created on first use and marked as
  this app's (`drive.file`, NFR-01). Changes save 1.5 s after the last edit, when the page is
  hidden or closed, and when the network returns; the header says "Saved", "Saving..." or "Not
  saved - Try again", and "Reconnect" when the Google session ran out.
- Device copy (D-24): drive-doc-sync 0.3.0 records which version of the file the copy holds. A
  reload shows the copy at once, lists the files (metadata only), and downloads the file only
  if its version changed; changes made while Drive answers are kept. If Drive does not answer,
  the copy stays on screen with a note, and edits wait on this device. Signing out deletes the
  copy unless it holds changes that never reached Drive.
- Demo at sign-in (D-25): only what the visitor added comes along (their providers and log, the
  labels those use and their parents, labels and facets they made); never the made-up sample,
  even if edited. Absorbing a directory matches labels by name, facet and parent, so a carried
  "Photo" joins the account's "Photo" instead of doubling it.
- Load problems each say what happened and offer a way on: try again, reconnect, restore from
  this device's copy, start a new directory (file in the trash or gone), sign out.
- Tests: 87 unit tests (5 new on carry and absorb) and 37 end-to-end tests (7 new against a fake
  Drive that counts downloads: sign-in carry, reload without download, another device's change,
  failed save and retry, sign-out, file in the trash, header at 360 px). Breaking the
  no-download path makes its test fail. drive-doc-sync: 64 unit tests (6 new).
- Deviations: the Content Security Policy part of NFR-02 moves to Phase 9: on GitHub Pages it is
  a `<meta>` tag that needs the final origin and a hash of the page's inline frame guard. The
  token part of NFR-02 holds (the tab's session lives in sessionStorage only, drive-doc-sync
  `tests/unit/auth.test.ts`). Saving the search index with the device copy (noted in Phase 2)
  is not done: the index builds in about 0.3 s on this desktop; revisit if a phone shows a delay.
- 2026-11-17: the owner signed in on `http://localhost:5173` with the real account. drive-doc-sync
  0.3.0 is published (tag `v0.3.0`) and the app depends on `^0.3.0`.
- Changed after the owner's review, 2026-11-17: labels have one level (D-35); a label shows as
  its chip inside sentences (merge, delete); the header stays one row, with language and theme
  in the account menu, or in a Settings menu when signed out (D-38); a light, dark or device
  theme (D-36); "label group" instead of "facet" on screen (D-37); helper text in one smaller
  size. 84 unit tests and 39 end-to-end tests pass (13 skipped: each layout test runs on its own
  screen size); the end-to-end suite passed three runs in a row.
- Then, 2026-11-17: the provider form has one field per phone, email address and link, with
  "+ Add" and a remove button; each label group in the form finds labels as you type and offers
  to create one when none has the typed name (FR-07; Downshift 9.4.1 combobox); no Cancel above
  the form; the Labels page has no big heading and opens at its top; header texts share one
  centre line. 84 unit tests and 43 end-to-end tests pass.
- Lessons from the owner's course app (dm), 2026-11-17, first batch: a crash screen for the
  whole app and a page-level one that keeps the header working; errors from an action shown as a
  notice; a failed save as an alert that says why, where the change is and what to do (the
  header word is no longer read out after every edit); Drive messages say where the data is and
  the next step; buttons name what they act on; empty log says what to do; a deleted log entry
  can be undone; a loading line, and a reload offer if the app cannot load; a wording test for
  NFR-08. 87 unit tests and 49 end-to-end tests pass.
- Second batch: what is typed in the provider form is kept as a draft for the tab (leaving the
  form, a click elsewhere or a reload loses nothing; the list or the provider says so, with
  Continue editing; Discard them on return); opening a provider or the form moves focus to its
  heading, and Back to the list to its row; the date field has Choose today and Cancel and
  closes when focus leaves it. 87 unit tests and 57 end-to-end tests pass, twice in a row.

## Phase 6: Import, export, duplicates, seed import

- CSV import with preview and duplicate review (keep both, skip, merge); CSV export of all or of
  the filtered view.
- Import the approved `seed/exhibitors.csv`.

Deliverable: the seed vendors in the owner's directory. Verifies: FR-21..25, D-26, NFR-09.

Result 2026-11-17:

- An "Import and export" page, reached from the providers list ("Import or export").
- Export: all providers, or those the list shows (filters and search), as a CSV file with every
  field and one column per label group; a spreadsheet opens its diacritics correctly.
- Import: the same layout (English or Romanian column names; comma or semicolon separated). A
  preview shows every row, the labels it would create, columns it ignores and rows without a
  name. A row like a provider already there, or like an earlier row of the file, waits for the
  owner: keep both, leave it out, or merge into the provider (phones, emails, links and labels
  combined; the owner picks between differing single values). Nothing is saved until Import.
- Found on the way: links were compared without their query, so every Facebook page of the form
  profile.php?id=... looked the same; now only tracking parameters are ignored.
- Seed: `seed/build-import.mjs` builds `seed/import.csv` (162 exhibitors, 779 approved values,
  Source "AllWeddings Fest 2026", 126 with a Category from their AllWeddings section, D-40). Its
  preview in the demo: 162 rows to add, none waiting for a choice, 17 labels to create.
- 98 unit tests and 61 end-to-end tests pass.
- Open: the owner signs in and imports `seed/import.csv` through the preview.
- After the owner's review, 2026-11-17: each list row has one-tap actions on the right (call,
  website, Instagram, TikTok; Lucide and Simple Icons glyphs, each link named in full); in a
  narrow list they go on their own line under the row. Then: no contact text line (the icons replace it),
  an email action, fixed slots per kind so the icons line up in columns (a missing one drawn
  barely visible), muted grey icons, the link colour on hover (owner's choices from renders).

## Phase 7: Sharing

- Snapshot files per shared label, rewritten on change; share by email (reader) and by link;
  revoke; regenerate.
- Whole-directory sharing for editors.
- Guards: shared-label markers, "visible to N more people" confirmation, the number of
  providers before sharing a label; "who can see this" and "what can this person see".
- Viewer side: open by link (signed out) and by email through the Picker; read-only display.

Deliverable: a second Google account sees exactly what was shared. Verifies: FR-14..20, D-22,
NFR-01, NFR-03.

## Phase 8: One-off contact lookup for the seed vendors

- Settle the permitted Google route (Q-04) and the sites that may be contacted.
- For each vendor: website, phone, email, social links, each with its source URL, into
  `seed/contacts_review.csv`; uncertain matches marked.
- Owner approves rows; approved values are imported through the Phase 6 preview.

Deliverable: contact details on the seed vendors. Verifies: FR-26, D-08.

Result 2026-11-17:

- Route (D-39): a pilot of 10 vendors with standard web search found 1; extended search found 6
  of 10. The fair organiser's directory (allweddings.ro) then gave the best source: an index of
  its 438 supplier profiles (`seed/lookup/allweddings-index.csv`), matched to the board's names
  by `seed/match-allweddings.mjs` (78 exact, 47 likely), the unclear ones confirmed by the owner.
- Results: 146 of 162 board entries have at least one value (125 websites, 86 phones, 60
  emails, 136 Instagram, 57 TikTok, 100 AllWeddings profiles); 16 have nothing found.
- The owner settled every unclear match (`seed/lookup/decisions.csv`, 34 decisions);
  `seed/merge-contacts.mjs` builds `seed/contacts_review.csv` from the lookup batches and the
  decisions, with the names as printed on the board and an `approved` column.
- Limits met: the web search tool allows 200 searches per turn shared by all agents; batches 5
  and 6 and one pass were cut short by it and finished through the directory instead.
- The gathered contacts (`seed/lookup/`, `seed/contacts_review.csv`) stay on the owner's machine and
  out of the public repository (`.gitignore`), as the directory is private (D-01).
- 2026-11-17: the owner approved every row (753 values; recorded in `decisions.csv`, applied by
  the merge script). Phase 6 imports them through its preview.

## Phase 9: Romanian, accessibility, acceptance, deploy

- Romanian dictionary; per-user language switch.
- Accessibility audit; interface-text stranger-read.
- Deploy to GitHub Pages on the subdomain (Q-06); Google settings updated for it.
- Full acceptance run plus phone check by the owner.
- README and DESIGN.md.

Deliverable: v1 accepted. Verifies: FR-27, NFR-05..08, acceptance.
