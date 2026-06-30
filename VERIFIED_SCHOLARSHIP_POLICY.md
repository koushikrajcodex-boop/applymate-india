# ApplyMate India Verified Scholarship Data Policy

ApplyMate India should prioritize accuracy over quantity.

## Publishing rule

Only publish scholarships as `active` when they meet these conditions:

- The scholarship is from an official government, university, foundation, company, or verified scholarship portal.
- The official source link is available.
- The scholarship is currently open, officially recurring, or has a current/upcoming application cycle.
- The eligibility rules are clear enough for students to understand.
- The scholarship has been manually checked before publishing.

## Status usage

Use these Firestore status values carefully:

- `active` = visible to students. Use only for verified open, current, or recurring scholarships.
- `draft` = not visible to students. Use for unverified, incomplete, or doubtful scholarships.
- `closed` = not visible to students. Use for expired, discontinued, or outdated scholarships.

## Recommended fields for every scholarship

Each scholarship record should include:

- `name`
- `state`
- `stateLabel`
- `status`
- `amount`
- `maxIncome`
- `minPercentage`
- `deadline`
- `deadlineDate`
- `link`
- `education`
- `categories`
- `genders`
- `disability`
- `eligibilityNote`
- `incomeNote`
- `priority`
- `sourceName`
- `applicationWindow`
- `academicYear`
- `verifiedOn`
- `verificationNote`

## Application window values

Use these values for `applicationWindow`:

- `open` = applications are open now.
- `upcoming` = official cycle announced but not open yet.
- `verify` = recurring scheme, but current window must be checked on the official portal.
- `closed` = application window is closed.

## Bulk Assistant format

Use this format when adding new scholarships:

```text
Add Scholarship Name.
State national.
Education degree, engineering.
Gender any.
Amount Varies as per official rules.
Income limit ₹500000.
Categories general, sc, st, obc, ews, minority.
Disability any.
Source Official Source Name.
Official link https://official-portal.example/
Application window open.
Academic year 2026-27.
Verified on 2026-06-30.
Deadline check official portal.
Deadline date 2026-12-31.
Priority 90.
Eligibility: Short verified eligibility note.
Income note: Verified income rule.
Verification note: Checked from official source before publishing.
```

## Database quality goal

ApplyMate India should aim for fewer but better records first:

1. Start with 100 verified scholarships.
2. Expand to 250 verified scholarships.
3. Expand to 500+ only after verification workflow is stable.

Never add random or uncertain scholarships as active just to increase count.
