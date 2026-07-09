# ApplyMate AI Scholarship Bot

ApplyMate now has a GitHub Actions based AI scholarship auto-import and tracker system.

## What it does

1. Discovers scholarship sources from official and trusted portals.
2. Scores each source using an AI-style confidence engine.
3. Imports safe records into Firestore.
4. Auto-publishes only records that pass strict checks.
5. Keeps weaker records as drafts for admin review.
6. Tracks Firestore scholarships daily and closes expired active records.
7. Writes public JSON reports used by `scholarship-bots-panel.html`.

## Safety rules

A scholarship becomes `active` automatically only when all of these are true:

- Import mode is `auto_active`.
- AI confidence is at or above the configured threshold, default `90%`.
- Source is official or trusted.
- A real future deadline date is detected.
- The source text does not look closed or expired.

Everything else remains `draft` with `needsReview: true`.

## GitHub Action

Workflow file:

```text
.github/workflows/scholarship-bulk-auto-import.yml
```

Manual inputs:

- `source_pack`: all, national, engineering, ap_tel, categories, private_trusted, girls
- `max_import`: maximum number of records to import
- `dry_run`: true or false
- `import_mode`: auto_active, safe_draft, review_only
- `auto_publish_threshold`: default 90

Scheduled run:

```text
Every day at 02:45 UTC
```

## Required GitHub Secrets

Add these in GitHub repo settings:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
FIREBASE_PROJECT_ID
```

`FIREBASE_SERVICE_ACCOUNT_JSON` must be the full Firebase service account JSON. Keep it private. Never commit it to the repo.

## Bot reports

The workflow updates these files:

```text
data/auto-discovered-scholarships.json
data/auto-discovered-scholarships.legacy.txt
data/bulk-import-report.json
data/scholarship-ai-tracker-report.json
```

The admin bot dashboard reads those reports here:

```text
scholarship-bots-panel.html
```

## Firestore fields added by the bot

The bot writes useful tracking fields such as:

```text
autoDiscovered
autoImported
needsReview
sourceTrust
sourcePack
aiConfidence
aiDecision
aiSignals
verificationNote
lastChecked
trackerCheckedOn
trackerReason
```

## Recommended first run

1. Open GitHub Actions.
2. Run `Bulk Scholarship Auto Import` manually.
3. Use `dry_run=true` first.
4. Check the bot dashboard.
5. Run again with `dry_run=false`, `import_mode=auto_active`, threshold `90`.
6. Review drafts in the admin panel before publishing low-confidence scholarships.
