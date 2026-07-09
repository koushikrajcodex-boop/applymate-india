# Scholarship Radar Pro

Scholarship Radar Pro is the automatic checker and automatic scholarship adder for ApplyMate India.

## What it does

1. Scans official scholarship source pages listed in `data/scholarship-sources.json`.
2. Detects scholarship-like links and text.
3. Extracts name, source URL, state, course, category, gender, disability rule, income clues, amount clues, and deadline clues.
4. Checks confidence and safety.
5. Skips duplicates and expired records.
6. Auto-publishes only high-confidence official records.
7. Auto-adds medium-confidence official records as drafts.
8. Auto-closes active scholarships after their deadline passes.
9. Writes reports to:
   - `data/discovery-candidates.json`
   - `data/radar-report.json`

## Auto decision rules

- `autoActive`: official source, valid URL, strong name, future deadline, good eligibility note, good income note, confidence >= 90.
- `autoDraft`: official source, usable data, confidence >= 70, but not safe enough to publish automatically.
- `review`: weak or incomplete candidate.
- `skipDuplicate`: already exists in Firestore by normalized name or source URL.
- `skipExpired`: deadline is already expired.

## Important safety behavior

Draft records are added to Firestore but are not shown publicly because public student pages only show `status == active` verified scholarships.

Active records can be published automatically only when strict checks pass.

## GitHub secret required for Firestore writes

The workflow can run without secrets, but it will only write JSON reports.

To let it add scholarships into Firestore, create this GitHub repository secret:

`FIREBASE_SERVICE_ACCOUNT_JSON`

Value: the full Firebase service account JSON for the `applymate-india` Firebase project.

## How to add the secret

1. Open GitHub repository.
2. Go to Settings.
3. Go to Secrets and variables.
4. Open Actions.
5. Click New repository secret.
6. Name it `FIREBASE_SERVICE_ACCOUNT_JSON`.
7. Paste the full service account JSON.
8. Save.

## How to run manually

GitHub repository → Actions → Scholarship Radar Pro → Run workflow.

Keep `write_firestore` as `true` to add safe records to Firestore.

Set it to `false` for dry-run report only.

## Daily automation

The workflow runs every day using `.github/workflows/scholarship-radar.yml`.

## Files

- `tools/scholarship-radar.mjs` — scanner, auto-checker, Firestore writer.
- `data/scholarship-sources.json` — official sources to scan.
- `.github/workflows/scholarship-radar.yml` — scheduled automation.
- `data/radar-report.json` — latest run report.
- `data/discovery-candidates.json` — latest candidate list.
