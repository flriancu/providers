# Providers directory requirements

Agreed 2026-11-16. This file is the contract; changes are recorded here with a date.

The folders `seed/`, `evidence/` and `docs/research/` are kept on the owner's machine and are
not in the repository (owner, 2026-11-17); links to them work in the local copy only.

## Goal

A private "yellow pages" of product and service providers: contact details, faceted labels for
finding them, an interaction log, and sharing of selected labels with other people. Wedding
vendors come first (seed: the AllWeddings Fest 2026 exhibitor board, 13-15 November 2026); the
model must work for any provider category.

## Audience and use

- One owner per directory plus up to about 10 people the owner shares with.
- Desktop and phone browsers.
- Up to about 10,000 providers per directory.

## Scope

- Provider records with contact details and an interaction log.
- Faceted labels, read-only sharing per label (by email or by link), editing by sharing the whole
  directory.
- Tolerant search and facet filtering.
- CSV import and export, duplicate detection and merge.
- English and Romanian user interface.
- One-off seed: the exhibitor names from the fair board, plus contact details gathered from the
  web and approved by the owner.

## Non-goals (v1)

- Public directory or search-engine visibility.
- A server or database of our own (D-21).
- "Can edit" on a single label (D-22).
- Price fields, ratings, attachments.
- vCard export, full backup/restore format.
- In-app web lookup of contact details.
- JSON API.
- Sending email or messages from the app.

## Decisions

- D-01 The directory is private; single labels are shareable. (2026-11-16)
- D-02 Access is granted per label, Google Maps lists style; "can view" or "can edit" is chosen
  per share. (2026-11-16; amended by D-22)
- D-03 Ways in: Sign in with Google, and a revocable view-only secret link per label. No local
  passwords, no other identity providers. (2026-11-16; mechanism changed by D-22)
- D-04 Runs on localhost first; later a subdomain of the owner's website on the owner's AWS
  infrastructure. The AWS service is chosen at deployment time. (2026-11-16; reversed by D-21)
- D-05 Label model: faceted labels, any label shareable (Option C of
  [the label research](docs/research/Labels%20and%20facets%20for%20providers.md)). A provider is
  visible to whoever can see any of its labels. (2026-11-16; ancestors dropped by D-35)
- D-06 v1 stores an interaction log; no price, rating or attachments. (2026-11-16)
- D-07 One owner with guests in v1; every provider, label, share and log entry records its owner
  and every query filters by owner, so a hosted multi-owner version stays possible.
  (2026-11-16; superseded by D-25)
- D-08 Seed data: the exhibitor names are transcribed from the board photo and reviewed by the
  owner; contact details are gathered once from the web, each value with its source URL, and
  imported only after the owner approves them. No in-app lookup. (2026-11-16)
- D-09 Formats: CSV import and CSV export. (2026-11-16)
- D-10 Stack: Python + Django + htmx + django-allauth (Google) + SQLite. Domain logic in
  framework-free Python modules behind repository interfaces; Jinja2 templates; end-to-end tests
  over HTTP, so the web framework can be swapped by rewriting only the web and persistence
  adapters. (2026-11-16; reversed by D-21)
- D-11 User interface in English and Romanian, chosen per user. (2026-11-16)
- D-12 Duplicates: warn and offer merge; nothing merges automatically. (2026-11-16)
- D-13 Project at `c:\Users\fiancu\Desktop\aa\providers`, personal git repository with the
  owner's GitHub noreply identity in the repo-local config, unsigned. (2026-11-16)

Defaults taken without a question (change any of them here):

- D-14 Status is a fixed, owner-only field: New, Contacted, Quoted, Booked, Declined, Archived.
  It is filterable like a facet. (2026-11-16; reversed by D-32)
- D-15 Starting facets: Category (one primary value plus additional values), Area, Source,
  Lists. The owner can add, rename and merge facets and labels. (2026-11-16; one level of labels
  by D-35)
- D-16 What guests see: the listing part of a provider (name, contact person, phones, emails,
  links, address, the labels shared with them). Notes, status, interaction log and unshared
  labels are owner-only. (2026-11-16)
- D-17 Editors can change the listing part, add providers (which must carry one of their shared
  labels) and apply or remove their shared labels; only the owner deletes providers.
  (2026-11-16; reversed by D-22)
- D-18 Backups are on demand: CSV export plus a command that copies the database file.
  (2026-11-16; reversed by D-26)
- D-19 Python environment: the project's own `.venv` with a pinned `requirements.txt`.
  (2026-11-16; reversed by D-21)
- D-20 Amends D-16 and D-17: editors read and write the interaction log and notes of the
  providers they can access. Status and unshared labels stay owner-only; viewers still see the
  listing part only. (2026-11-16, answer to Q-01; status part changed by D-22)

Architecture change of 2026-11-16 (owner's choice: follow the
[vacation_planner](https://github.com/flriancu/vacation_planner) approach):

- D-21 Reverses D-04, D-10 and D-19. A static single-page app with no server of its own, built
  like vacation_planner ([DESIGN.md](https://github.com/flriancu/vacation_planner/blob/main/DESIGN.md)):
  React + TypeScript (strict) + Vite, Node 24 with a committed `package-lock.json`, Vitest and
  Playwright, oxlint and Prettier, GitHub Actions. The directory is one JSON document in the
  owner's Google Drive (`drive.file` permission). Deployed to GitHub Pages on a subdomain of the
  owner's website. Domain logic in plain TypeScript with no imports from React, the browser or
  Google. (2026-11-16)
- D-22 Amends D-02, D-03 and D-20; reverses D-17. Sharing:
  - Viewing, per label: for each shared label the app writes a read-only snapshot file into the
    owner's Drive with the listing part (D-16) of the providers under that label and its
    children, and shares it as "reader" with Google accounts, or with "anyone with the link" for
    the secret link. Revoking removes the Drive permission.
  - Editing, whole directory only: the owner shares the directory file itself as "writer". An
    editor then sees everything, including notes, status and log. "Can edit" on a single label
    is dropped. (2026-11-16)
- D-23 Amends FR-13. Search tolerates typos, matches word beginnings, ignores word order, case
  and diacritics, and ranks the best matches first (name above notes). Library: MiniSearch
  (MIT, no dependencies); a scratch test found "photografy", "flasbox" and "slacii" with
  tolerance 0.34, and searched 10,000 synthetic providers in about 10 ms per query on a desktop.
  (2026-11-16)
- D-24 Refresh: the app keeps a copy of the directory on the device; a refresh shows it at once,
  then checks the Drive file's version and downloads the file only if it changed. Signing out
  deletes the device copy. (2026-11-16)
- D-25 Supersedes D-07. Every Google account that signs in gets its own directory in its own
  Drive; shared labels and directories of others appear next to it. (2026-11-16)
- D-26 Reverses D-18. Backups: the Drive file itself, plus CSV export. (2026-11-16)
- D-27 Answers Q-05. vacation_planner's Google sign-in, Drive, Picker, storage, sync and
  device-copy code becomes a shared package used by both apps. Storage and sync are made generic
  first (any document type; merge, migrate and absorb passed in), and vacation_planner moves to
  the package with no change in behaviour. (2026-11-16)
- D-45 A label group cannot be deleted; its labels can be deleted, merged or moved (FR-08).
  (2026-11-18, owner: "no")
- D-44 Amends NFR-08. The calendar's weekday headings stay two letters ("Mo Tu We"): full
  names do not fit seven columns at 360 px, and the chosen day is written in full on the date
  button above it. (2026-11-18, owner: "a")
- D-43 A contact action a provider lacks keeps its place in the row, drawn fainter still than
  before, so it reads as absent rather than as a disabled button. (2026-11-18, owner: "faded as
  today, but even more faded")
- D-42 NFR-10 for now: the list draws every row (no virtual list), which keeps find-in-page,
  the list size screen readers announce, and the scroll and focus restore. Measured at commit
  28f85ff on the production build, 10,000 providers, input to next paint: a keystroke 24-40 ms
  and the list caught up with a search in 101 ms on a desktop; with the CPU slowed 4x (a
  mid-range phone) a keystroke 120-168 ms and the list 429 ms, above the 100 ms of NFR-10. A
  virtual list (`@tanstack/react-virtual`) is the way to close that gap if a directory grows
  that large. (2026-11-18, owner: "no virtual list, at least atm")
- D-41 Amends D-31. A new label without a chosen colour gets the colour least used over all
  labels, of every group, so labels of different groups on one provider seldom match; grey is
  never given automatically. Grey stays in the palette as a quiet colour the owner chooses, for
  example for a label on nearly every provider; the import preview also shows labels it would
  create in grey. Existing labels keep their colours. (2026-11-17, owner: "proceed per your rec")
- D-40 Amends FR-25. The seed import gives each exhibitor a Category label from its section in
  the AllWeddings directory (Foto, Video, Locatii and so on, in Romanian as the sections are
  named), where it has a profile; exhibitors without one get no category. The owner renames or
  merges them like any label. (2026-11-17, owner: "Romanian, as AllWeddings")
- D-39 Answers Q-04. The seed vendors' contact details come from: the supplier profiles of
  AllWeddings (allweddings.ro, the fair organiser's directory; robots.txt allows it; the owner
  pointed to it), matched to the board's names by a script and confirmed by the owner where
  unclear; the vendors' own websites; and the results of this environment's web search tool
  (not automated Google queries). Social networks and other directories are linked, never
  fetched. (2026-11-17, owner)
- D-38 Settings live in header menus, so the header stays one row: signed in, the account menu
  holds language and theme; signed out, a Settings menu beside "Sign in" holds them. Both
  placements were rendered at 750 and 390 px before the choice. (2026-11-17, owner)
- D-37 The interface calls a facet a "label group" ("grup de etichete"); "facet" stays in code and
  in these documents. (2026-11-17, owner: "'facet' is not a user-friendly term")
- D-36 Theme: light, dark, or the same as this device (the default, which follows the device when
  it changes), chosen per device and applied before the page first shows. (2026-11-17, owner)
- D-35 Amends D-05, D-15, FR-04, FR-10, FR-13, FR-16 and FR-17. Labels have one level: no
  sub-labels in any facet, Category included; every facet is a flat list of labels. Labels saved
  under a parent by an earlier version keep their name and become top-level labels.
  (2026-11-16, owner: "let's only have one level of labels and no nesting")
- D-34 Answers Q-02. Below 1200 px the filters open over the page (full screen on a phone,
  a side panel on a tablet) and each tick changes the list at once; the button says how many
  providers will show and closes the panel. From 1200 px the filters have their own column.
  Both behaviours were built and tried live before the choice. (2026-11-16, owner: "instant")
- D-33 Amends FR-09 and D-15. There is no Unsorted label: a provider without a category simply
  has none, and only the owner's labels exist. Each facet's filter has a "none" value for the
  providers with no label in it. (2026-11-16, owner: "'unsorted' is not a label, is it?")
- D-31 Labels have a colour, chosen from a palette of ten (grey, red, orange, yellow, green,
  teal, blue, purple, pink, brown), shown as a chip with the label's name, so colour is never
  the only cue. A new label gets the colour least used in its facet unless one is chosen. Text
  on every chip meets WCAG 1.4.3 contrast in light and dark mode
  ([evidence](evidence/label-colors-contrast.txt)). (2026-11-16)
- D-32 Reverses D-14. Providers have no status field (New, Contacted and so on are gone);
  amends FR-01, D-16, D-20 and D-22 where they name the status. The owner can track progress
  with labels, for example in the Lists facet. (2026-11-16, owner: "drop status")
- D-30 Amends FR-06 and D-11. Translation covers the interface only. Labels and facets are the
  owner's data, with one name each, shown as typed. The starting facets (Category, Area, Source,
  Lists) and Unsorted show the interface's word for them until the owner renames them.
  (2026-11-16, owner: "no need for bilingual labels; i18n should only cover the UI")
- D-29 Layout: adaptive list-detail (Material 3 canonical layout). Wide screens show the
  provider list and the chosen provider side by side; on a phone the list fills the screen and
  a provider opens full screen, with Back to the list. (2026-11-16, owner: "best for desktop
  and phones")
- D-28 The package has its own repository with tests and CI; both apps depend on it by version
  tag (`github:<owner>/<repo>#semver:^x.y`, git dependencies allowed in `.npmrc`). No registry.
  (2026-11-16)

## Functional requirements

Providers and log

- FR-01 A provider has: name, contact person, phones, emails, links (website and social
  profiles), address, notes, labels. Only the name is required. (Changed 2026-11-16 by D-32:
  no status.)
- FR-02 Each provider has an interaction log: dated entries with author and text.
- FR-03 Every change records who made it and when.

Labels and facets

- FR-04 Labels belong to exactly one facet. Every facet is a flat list of labels, with no
  sub-labels. (Changed 2026-11-16 by D-35.)
- FR-05 A provider can carry several labels per facet; in Category one of them is primary.
- FR-06 Labels have a stable id, one name, and aliases. Renaming keeps shares and links
  working. (Changed 2026-11-16 by D-30: one name, not one per interface language.)
- FR-07 Label autocomplete ignores case and diacritics and asks before creating a new label.
- FR-08 Label maintenance: rename, merge, move, and a list of labels used once or never.
- FR-09 Saving a provider never requires a Category. Every facet's filter offers "none" (for
  example "No category"), listing the providers with no label in it. (Changed 2026-11-16 by
  D-33: no Unsorted label.)

Finding

- FR-10 Facet filtering: OR within a facet, AND across facets. (Changed 2026-11-16 by D-35.)
- FR-11 Each facet value shows its result count; values with zero results cannot lead to an
  empty page.
- FR-12 Active filters show as removable chips with "Clear all"; filter state lives in the URL.
- FR-13 Search over name, contact person, address, links, notes, log, and the names and aliases
  of the provider's labels, runs within the current filters, with the tolerance of D-23; label
  matches rank below the provider's own fields. (Changed 2026-11-16 by D-23 and D-35; labels
  added 2026-11-16 at the owner's request.)

Sharing (changed 2026-11-16 by D-22)

- FR-14 The owner shares a label read-only with a Google account (by email), and the whole
  directory for editing with a Google account.
- FR-15 The owner can create and revoke a view-only link per label (Drive "anyone with the
  link" on the label's snapshot file); "regenerate" creates a new snapshot file and link.
- FR-16 A label's snapshot holds every provider carrying that label, and is rewritten whenever
  one of those providers or the label changes. (Changed 2026-11-16 by D-35.)
- FR-17 Shared labels are marked; applying one asks to confirm how many more people will see the
  provider; sharing a label first shows how many providers it covers. (Changed 2026-11-16 by
  D-35.)
- FR-18 Snapshot files never contain the owner-only fields of D-16.
- FR-19 The owner can see "who can see this provider" and "what can this person see".
- FR-20 A person opening a shared label (by link, or by email through Google's file picker) sees
  it read-only, next to their own directory. (Replaces the "no access" page.)

Import, export, duplicates

- FR-21 CSV import with a preview before saving.
- FR-22 CSV export of all providers or of the current filtered view.
- FR-23 On create and import, likely duplicates (same name ignoring case and diacritics, same
  phone, email or website) are shown side by side with keep both, skip or merge.
- FR-24 Merge combines labels, contacts and log; the owner picks conflicting fields.

Seed

- FR-25 The board's exhibitor names are transcribed exactly as printed (diacritics kept), and
  imported with Source = AllWeddings Fest 2026, and a Category from the exhibitor's AllWeddings
  section where it has one (D-40), after owner review.
  (Changed 2026-11-16: the "500 LEI" badge is not recorded, at the owner's request.)
- FR-26 Contact details for the seed vendors are gathered from web search results and the
  vendors' own websites only; every value carries its source URL; social networks are linked,
  not scraped; nothing is imported without owner approval.

Language

- FR-27 Every screen text exists in English and Romanian; each user picks their language.

## Constraints and non-functional requirements

(NFR-01, 02, 04 and 05 changed 2026-11-16 by D-21.)

- NFR-01 Isolation: a directory is readable only through its Drive file's permissions; the app
  never writes outside files it created.
- NFR-02 Security: Google sign-in only; access tokens kept per tab, never in long-lived storage;
  a Content Security Policy limits scripts and connections to the app and Google; shared-label
  pages are not indexed by search engines.
- NFR-03 Privacy: nothing is visible without sign-in or a valid shared link.
- NFR-04 Architecture: domain modules import nothing from React, the browser or Google.
- NFR-05 Portability: the build is static files, served by any static host; development runs on
  localhost.
- NFR-06 Phone browsers: every v1 feature works at 360 px width.
- NFR-07 Accessibility: facet controls follow the WAI-ARIA checkbox group pattern.
- NFR-08 Interface text: full sentences, full day and month names, no abbreviations.
- NFR-09 Fidelity: provider names and other owner data are never changed silently; imports and
  merges show every change before saving.
- NFR-10 Speed: with 10,000 providers, a search or filter change updates the list within 100 ms
  on a mid-range phone; a refresh with an unchanged Drive file downloads nothing but the
  version. (Added 2026-11-16, D-23, D-24.)

## Verification

| ID | Method | Evidence |
|---|---|---|
| FR-01..03 | Test | `tests/unit/provider.test.ts`, `tests/e2e/providers.spec.ts` |
| FR-04..09 | Test | `tests/unit/labels.test.ts`, `tests/e2e/labels.spec.ts` |
| FR-10..13 | Test | `tests/unit/filter.test.ts`, `tests/unit/search.test.ts`, `tests/e2e/browse.spec.ts` |
| FR-14..20 | Test | `tests/unit/snapshot.test.ts`, `tests/e2e/sharing.spec.ts` (fake Drive: reader, writer, link, revoked) |
| FR-21..24 | Test | `tests/unit/duplicates.test.ts`, `tests/e2e/import-export.spec.ts` |
| FR-25 | Inspection | `seed/exhibitors.csv` reviewed against the board photo; owner sign-off recorded in the PLAN |
| FR-26 | Inspection | `seed/contacts_review.csv` with source URL per value; owner approval recorded in the PLAN |
| FR-27 | Test | type check: a missing key in either dictionary fails the build |
| NFR-01 | Test | `tests/e2e/sharing.spec.ts` (a second account reads only what was shared) |
| NFR-02, 03 | Test, inspection | CSP test (Phase 9); drive-doc-sync `tests/unit/auth.test.ts` (token never in localStorage) |
| NFR-04 | Analysis | lint rule forbidding React, DOM and Google imports under `src/domain/`; output saved to `evidence/` |
| NFR-05 | Demonstration | production build served by `vite preview` and by GitHub Pages |
| NFR-06 | Test, demonstration | e2e suite at 360 px viewport; owner check on a real phone |
| NFR-07 | Inspection | accessibility audit output in `evidence/` |
| NFR-08 | Inspection | stranger-read of the interface text |
| NFR-09 | Test | `tests/e2e/import-export.spec.ts` (preview shows every change) |
| NFR-10 | Test | `tests/unit/search.perf.test.ts` on 10,000 synthetic providers; `tests/e2e/drive.spec.ts` (a reload with an unchanged file downloads nothing) |

Acceptance for v1: the automated end-to-end suite and a phone check show the ten points agreed
on 2026-11-16, as changed by D-22 and D-23: seed import; facet filters; tolerant search; a label
shared read-only with a Google account, showing no owner-only fields; a label link that works and
stops working when revoked; the whole directory shared for editing; duplicates and merge;
interaction log; language switch; CSV import and export; phone browser.

## Open questions

- Q-01 Closed 2026-11-16: yes, see D-20.
- Q-02 Closed 2026-11-16: instant, see D-34.
- Q-03 Closed 2026-11-16 by D-21: no AWS compute needed. (Earlier answer: S3; S3 serves static
  files only ([S3 website hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)).)
  DNS for the subdomain stays with the owner's existing provider.
- Q-04 Closed 2026-11-17 by D-39. Contact lookup source. Owner answer 2026-11-16: Google, then the vendors' own links where
  needed. Constraint: automated queries to Google Search without express permission violate
  Google's spam policies
  ([Spam policies](https://support.google.com/webmasters/answer/66357?hl=en)), and the Custom
  Search JSON API is closed to new customers and ends on 1 January 2027
  ([overview](https://developers.google.com/custom-search/v1/overview)). The permitted Google
  route is to be settled at the start of the lookup phase.
- Q-05 Closed 2026-11-16: shared package, see D-27 and D-28.
- Q-06 Subdomain name: open, needed before deployment. Google Cloud project: closed 2026-11-16,
  a new project `providers-directory` with its own consent screen, OAuth client and Picker key.
- Q-07 Riskiest assumption, proved in Phase 0: a label snapshot shared "anyone with the link" can
  be read by the app without sign-in, and one shared by email can be opened through Google's
  file picker under the `drive.file` permission. 2026-11-16: reading by link without sign-in
  and taking the link away both proven against the real Drive
  ([evidence](evidence/phase0b-sharing-test.md)); opening by email through the Picker, and
  editing a shared directory, wait for a second Google account.
