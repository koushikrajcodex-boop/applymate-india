# Dashboard modularization plan

The dashboard currently combines authentication, profile management, scholarship recommendations, filters, comparisons, saved scholarships, applications, notifications, DOM rendering, and utility helpers in one large file.

## Phase 1

- Add `dashboard/constants.js` for shared limits, labels, and statuses.
- Add `dashboard/utils.js` for pure reusable text, score, percentage, and number helpers.
- Add `dashboard/url-utils.js` for safe HTTP/HTTPS URL normalization.
- Add unit tests for the extracted utility behavior.

These files are introduced without changing the live dashboard entry point, keeping this phase low-risk.

## Phase 2

Update `dashboard.js` to import constants and utilities, then remove the duplicate local definitions.

## Phase 3

Extract feature modules:

- `dashboard/profile.js`
- `dashboard/recommendations.js`
- `dashboard/saved-scholarships.js`
- `dashboard/application-tracker.js`
- `dashboard/notifications.js`
- `dashboard/comparison.js`

## Phase 4

Keep `dashboard.js` as the thin entry point responsible only for authentication startup, event initialization, and coordinating feature modules.

## Test command

Run:

```bash
node tests/dashboard-utils.test.js
```
