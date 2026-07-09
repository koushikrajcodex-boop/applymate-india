# ApplyMate India Project Status

Date: 2026-07-09

This file gives a visible repo-level summary of the current production-readiness cleanup.

## Completed reliability work

### Data source cleanup

- Homepage scholarship finder no longer uses an embedded static scholarship list.
- Firestore is the primary source for student-facing scholarship records.
- `home-finder-override.js` has been removed.
- `scholarships-live.html` now redirects to the canonical directory section in `scholarships.html#live-directory`.
- `home-polish.js` has been merged into `live-count.js` and removed.
- `tools/validate-scholarship-data.js` no longer treats `scholarships-data.js` as an open dataset candidate.

### Verification enforcement

- Active scholarship records require verification metadata in validator/schema logic.
- Active scholarship writes are enforced in `firestore.rules`.
- Public scholarship cards show last verified dates where the Firestore UI has been updated.

### Admin security

- `firestore.rules` uses Firebase custom claims for admin write/delete access.
- Personal admin email allow-lists were removed from Firestore rules.
- `admin-health.html` / `admin-health.js` use claim-based admin access.
- `docs/admin-custom-claims.md` documents the required `admin == true` custom claim.

### Testing

- `npm test` runs plain JavaScript unit tests.
- Validator tests cover missing deadlines, expired active records, and duplicate scholarship names.
- Schema tests cover missing required fields.
- Live count tests use a fixed date and confirm expired scholarships are excluded.
- Existing Data Quality GitHub Action runs tests on PRs and pushes to `main`.

## Known remaining blockers

These are intentionally tracked instead of being hidden:

1. `admin.js` still needs a precise custom-claims patch.
   - It is a large module controlling add/edit/delete/import/export behavior.
   - A blind replacement could break working admin flows.
   - Track in Issue #44.

2. `dashboard.js` and `admin.js` still import the retired compatibility shim `scholarships-data.js`.
   - The shim no longer contains real data.
   - Remove those imports in a precise patch before deleting the file.
   - Track in Issue #42.

3. `dashboard.js` and `dashboard-insights.js` should be consolidated or clearly separated.
   - Current intended split: `dashboard.js` owns core dashboard CRUD; `dashboard-insights.js` owns optional insight cards.

## Production checklist

- [x] Firestore-first public scholarship finder
- [x] Verified active scholarship gate
- [x] Last verified visibility on updated public cards
- [x] Data quality tests in CI
- [x] Canonical scholarship directory
- [x] Admin health custom-claim access
- [ ] Main admin panel custom-claim patch
- [ ] Remove final `scholarships-data.js` imports
- [ ] Delete `scholarships-data.js` after imports are removed
- [ ] Dashboard file responsibility cleanup

## Current recommendation

Do not add more public feature pages until the two remaining internal cleanup tasks are finished:

1. Patch `admin.js` with custom claims.
2. Remove final `scholarships-data.js` imports and delete the shim.
