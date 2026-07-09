# Scholarship Data Source Audit

Date: 2026-07-09

## Goal

Move ApplyMate India toward a single source of truth for scholarship records: Firestore.

## Audited files

| File | Current source | Notes |
| --- | --- | --- |
| `script.js` | Firestore via `window.applymateLiveFinderData` | Static embedded scholarship array removed. |
| `home-finder-data.js` | Firestore | Loads verified active scholarships into the homepage finder cache. |
| `home-finder-override.js` | Removed | Override patch deleted because `script.js` owns Firestore-only matching. |
| `home-polish.js` | Removed | Merged into `live-count.js`. |
| `live-count.js` | Firestore | Owns homepage live stats and live highlight cards. |
| `scholarship-hub.html` / `scholarship-hub.js` | Firestore | Reads `scholarships` collection directly. Kept for comparison/hub behavior. |
| `scholarships.html` | Firestore plus static official portal references | Canonical public scholarship directory. Static official portal reference cards are not scholarship records. |
| `scholarships-live.html` | Redirect | Redirects to `scholarships.html#live-directory`. |
| `dashboard.js` | Firestore primary; compatibility shim import remains | `scholarships-data.js` exports an empty array, so it no longer supplies real static records. Remove the import in Issue #42. |
| `dashboard-insights.js` | Firestore | Reads verified active scholarships from Firestore. |
| `admin.js` | Firestore primary; compatibility shim import remains | Local import tool imports zero records because the legacy dataset was retired. Remove this import/tool in Issue #42/#44. |
| `tools/validate-scholarship-data.js` | Open dataset paths only | No longer treats `scholarships-data.js` as a valid open dataset candidate. |

## Completed

- Removed actual static scholarship records from `script.js`.
- Homepage eligibility finder now uses Firestore-loaded data only.
- Removed `home-finder-override.js`.
- Removed the homepage script tag for `home-finder-override.js`.
- Replaced `scholarships-data.js` contents with an empty compatibility shim so older imports do not break while dashboard/admin are refactored.
- Merged `home-polish.js` into `live-count.js` and deleted `home-polish.js`.
- Removed `scholarships-data.js` from dataset validation candidates.
- Consolidated `scholarships-live.html` into the canonical scholarship directory.

## Remaining work

1. Remove `scholarships-data.js` imports from `dashboard.js` and `admin.js`.
2. Remove or replace the Admin Panel local-import button and related JS.
3. Delete `scholarships-data.js` after those imports are gone.
4. Confirm no script tag or import references `scholarships-data.js`.

## Why the shim still exists

`dashboard.js` and `admin.js` still import `scholarships-data.js`. Deleting it before those imports are removed would break module loading. The file is retired and no longer contains real records, but the compatibility shim remains temporarily until Issue #42 is patched safely.
