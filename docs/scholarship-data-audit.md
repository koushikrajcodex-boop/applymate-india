# Scholarship Data Source Audit

Date: 2026-07-09

## Goal

Use Firestore as the single source of truth for student-facing scholarship records.

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
| `dashboard.js` | Firestore | Core dashboard now loads verified scholarships from Firestore only. |
| `dashboard-insights.js` | Firestore | Reads verified active scholarships from Firestore. |
| `admin.js` | Firestore | Main admin panel now uses Firestore only and Firebase custom claims. |
| `admin.html` | Firestore admin UI | Local static import UI removed. |
| `tools/validate-scholarship-data.js` | Open dataset paths only | Legacy static file is no longer a valid dataset candidate. |

## Completed

- Removed actual static scholarship records from `script.js`.
- Homepage eligibility finder now uses Firestore-loaded data only.
- Removed `home-finder-override.js`.
- Removed the homepage script tag for `home-finder-override.js`.
- Merged `home-polish.js` into `live-count.js` and deleted `home-polish.js`.
- Removed `scholarships-data.js` from dataset validation candidates.
- Removed `scholarships-data.js` imports from dashboard/admin code.
- Deleted `scholarships-data.js`.
- Removed Admin Panel local static import UI.
- Consolidated `scholarships-live.html` into the canonical scholarship directory.

## Result

No student-facing scholarship page should depend on a legacy static scholarship dataset. Scholarship records should be created, verified, read, filtered, saved, and tracked from Firestore.
