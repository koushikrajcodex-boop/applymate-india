# Scholarship Data Source Audit

Date: 2026-07-09

## Goal

Move ApplyMate India toward a single source of truth for scholarship records: Firestore.

## Audited files

| File | Current source | Notes |
| --- | --- | --- |
| `script.js` | Firestore via `window.applymateLiveFinderData` | Static embedded scholarship array removed in Priority 1-A. |
| `home-finder-data.js` | Firestore | Loads active, non-closed, non-expired scholarships into the homepage finder cache. |
| `home-finder-override.js` | Removed | The override patch was deleted because `script.js` now handles Firestore-only matching directly. |
| `scholarship-hub.html` / `scholarship-hub.js` | Firestore | Reads `scholarships` collection directly. |
| `scholarships.html` | Firestore plus static official portal references | Live scholarship cards read Firestore. Static official portal reference cards are not scholarship records. |
| `scholarships-live.html` | Firestore | Reads `scholarships` collection directly. |
| `dashboard.js` | Firestore primary; compatibility shim import remains | `scholarships-data.js` now exports an empty array, so it no longer supplies static records. Remove the import in the next dashboard-focused refactor. |
| `dashboard-insights.js` | Firestore | Reads active, non-closed, non-expired scholarships from Firestore. |
| `admin.js` | Firestore primary; compatibility shim import remains | Local import tool now imports zero records because the legacy dataset was retired. Remove this import/tool in the next admin-focused refactor. |

## Priority 1-A completed

- Removed actual static scholarship records from `script.js`.
- Homepage eligibility finder now uses Firestore-loaded data only.
- Removed `home-finder-override.js`.
- Removed the homepage script tag for `home-finder-override.js`.
- Replaced `scholarships-data.js` contents with an empty compatibility shim so older imports do not break while dashboard/admin are refactored.

## Remaining Priority 1 work

These should be done in a small follow-up PR to avoid breaking working pages:

1. Remove `scholarships-data.js` imports from `dashboard.js` and `admin.js`.
2. Remove or replace the Admin Panel "Import Local Scholarships" button and related JS.
3. Delete `scholarships-data.js` after those imports are gone.
4. Confirm no script tag or import references `scholarships-data.js`.

## Why the file was not deleted in Priority 1-A

`dashboard.js` and `admin.js` still import `scholarships-data.js`. Deleting it in the same pass would break those module imports and could prevent dashboard/admin JavaScript from loading. The data inside the file is retired now, but the compatibility shim remains temporarily until those imports are removed safely.
