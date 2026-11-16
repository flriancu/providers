# Phase 0b sharing test (Q-07)

Run 2026-11-16 by the owner on `http://localhost:5173/spike.html` (src/spike/Spike.tsx),
against the real Google Drive, Cloud project `providers-directory-514913`, publishing status
Testing.

| Step | Assumption | Result | Evidence |
|---|---|---|---|
| A | A file shared "Anyone with the link" (reader) can be read without signing in, with the app's API key only (`files.get?alt=media&key=...`). | Worked, 15:39:58: 124 characters read, diacritics intact. | [screenshot](phase0b-step-a-read-by-link.png) |
| D | Taking the link away (deleting the `anyone` permission) stops step A. | Worked, 15:40:19: the read failed; Drive answered 404, reported as "The file no longer exists in Google Drive". | [screenshot](phase0b-step-d-link-removed.png) |
| B | A file shared by email (reader) can be opened by the other account through the Picker, under `drive.file`. | Not run: needs a second Google account. | - |
| C | A file shared by email (writer) can be changed by the other account. | Not run: needs a second Google account. | - |

Notes:

- The read in step A ran in a private window with no Google session; the request carried only
  the API key (restricted to `http://localhost:5173/*` and `https://docs.google.com/*`).
- Whether Drive gave the new file a resource key was not recorded in the screenshots; the link
  carries one only if Drive returned it.
- A revoked link answers 404, not 403: the app can tell "link taken away" apart from refusals
  such as a key restriction, which keep Google's text.
