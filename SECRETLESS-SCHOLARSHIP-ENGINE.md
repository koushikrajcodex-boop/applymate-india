# ApplyMate Secretless Scholarship Engine

This is the no-secret version of the automated scholarship engine.

## Main idea

The bot no longer needs Firebase credentials to run the public scholarship engine.

Instead of writing directly to Firestore first, GitHub Actions does this:

```text
discover sources → AI score → build data/public-scholarships.json → commit the updated file
```

That works using GitHub's built-in workflow token. No Firebase service account secret is required for the public JSON engine.

## Output file

```text
data/public-scholarships.json
```

This file is the automated public scholarship database.

## What still uses Firebase secrets?

Only the optional Firestore sync needs:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
FIREBASE_PROJECT_ID
```

If those secrets are missing, the workflow now skips Firestore safely and still updates the public JSON database.

## Daily automation

Workflow:

```text
.github/workflows/scholarship-bulk-auto-import.yml
```

Scheduled run:

```text
Every day at 02:45 UTC
```

Manual run settings:

```text
source_pack = all
max_import = 100
dry_run = false
import_mode = auto_active
auto_publish_threshold = 85
```

## Safety policy

A record becomes active in the public JSON only if:

- the source is official or trusted
- the record looks scholarship-related
- AI confidence is above the threshold
- source text does not look closed or expired

Students must still verify final details on the official portal before applying.
