# ApplyMate India Project Status

Date: 2026-07-09

This file gives a visible repo-level summary of the production-readiness cleanup.

## Cleanup status

**Status: Complete for the requested cleanup scope.**

The remaining work is operational, not code cleanup: deploy the latest Firestore rules and assign Firebase custom claims to real admin users.

## Completed reliability work

### Data source cleanup

- Homepage scholarship finder no longer uses an embedded static scholarship list.
- Firestore is the single source for student-facing scholarship records.
- `home-finder-override.js` has been removed.
- `home-polish.js` has been merged into `live-count.js` and removed.
- `scholarships-live.html` redirects to the canonical directory section in `scholarships.html#live-directory`.
- `tools/validate-scholarship-data.js` no longer treats legacy static files as dataset candidates.
- `scholarships-data.js` has been deleted.
- `dashboard.js` and `admin.js` no longer import `scholarships-data.js`.

### Verification enforcement

- Active scholarship records require verification metadata in validator/schema logic.
- Active scholarship writes are enforced in `firestore.rules`.
- Public scholarship cards show last verified dates where the Firestore UI has been updated.

### Admin security

- `firestore.rules` uses Firebase custom claims for admin write/delete access.
- Personal admin email allow-lists were removed from Firestore rules.
- The main `admin.html` / `admin.js` panel uses claim-based admin access.
- `admin-health.html` / `admin-health.js` use claim-based admin access.
- `docs/admin-custom-claims.md` documents the required `admin == true` custom claim.

### Testing

- `npm test` runs plain JavaScript unit tests.
- Validator tests cover missing deadlines, expired active records, and duplicate scholarship names.
- Schema tests cover missing required fields.
- Live count tests use a fixed date and confirm expired scholarships are excluded.
- Existing Data Quality GitHub Action runs tests on PRs and pushes to `main`.

## Production checklist

- [x] Firestore-first public scholarship finder
- [x] Verified active scholarship gate
- [x] Last verified visibility on updated public cards
- [x] Data quality tests in CI
- [x] Canonical scholarship directory
- [x] Main admin panel custom-claim access
- [x] Admin health custom-claim access
- [x] Remove final `scholarships-data.js` imports
- [x] Delete `scholarships-data.js`
- [x] Remove legacy homepage patch file
- [x] Remove local static import UI from admin panel

## Operational checklist before real production use

- [ ] Deploy latest Firestore rules.
- [ ] Set Firebase custom claim `{ "admin": true }` for real admin users.
- [ ] Sign out and sign back in after claims are set.
- [ ] Add/update verified scholarship records in Firestore with official links and deadline dates.
- [ ] Run `npm test` before future merges.

## Current architecture decision

- `dashboard.js` owns the core dashboard: profile, saved scholarships, application tracker, comparison, and recommendations.
- `dashboard-insights.js` owns optional insight cards above the core recommendation list.
- `scholarships.html` is the canonical public scholarship directory.
- `scholarship-hub.html` remains a separate discovery/comparison hub.
