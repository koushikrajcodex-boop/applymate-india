# Firestore rules testing

This repository includes a lightweight regression check for `firestore.rules`.

Run it locally with:

```bash
node tests/firestore.rules.test.js
```

What it checks:

- Firestore rules version is present.
- Owner-only user rules exist.
- Saved scholarship rules exist.
- Application tracker rules exist.
- Public scholarship read access exists.
- Admin-only scholarship create/update access exists.
- The old broad `allow read, write: if isOwner(userId);` rule is not reintroduced.

This test does not replace the Firebase emulator. It is a fast safety check to prevent accidental rule regressions before publishing.

Before deploying rules, also test the app manually:

1. Register or log in as a student.
2. Save profile details.
3. Save a scholarship.
4. Add a scholarship to the tracker.
5. Update tracker status.
6. Remove a saved scholarship.
7. Confirm public scholarships still load.

Deploy rules with:

```bash
firebase deploy --only firestore:rules --project applymate-india
```
