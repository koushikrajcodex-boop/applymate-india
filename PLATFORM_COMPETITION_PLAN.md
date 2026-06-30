# ApplyMate India Platform Competition Plan

Goal: make ApplyMate India feel like a serious scholarship platform, not only a static scholarship website.

## What was added now

- `scholarship-hub.html` for a stronger scholarship discovery experience.
- `scholarship-hub.js` for Firestore-powered active scholarship filtering.
- Homepage scholarship links route users to the Scholarship Hub.

## Competitive platform features

### 1. Discovery engine

- Live active scholarships from Firestore.
- Search by name, source, category, amount, and eligibility notes.
- Filters for state, education, category, and sort order.
- Deadline soon sorting.
- Newly added sorting.
- Highest amount sorting.
- Recommended priority sorting.

### 2. Trust layer

- Active-only records.
- Closed and expired scholarships hidden.
- Verified date shown on cards.
- Official link shown on cards.
- Report wrong information link.

### 3. Student utility

- Save and track through dashboard.
- Compare up to 3 scholarships.
- Deadline countdown.
- Featured scholarships: deadline soon, high value, newly verified.

### 4. Admin quality

- Active Import Assistant should be used only for open scholarships.
- Old Bulk Assistant should be used for draft/unverified records.
- Admin should verify official links and deadlines before activating.

## Next upgrades

1. Connect homepage eligibility finder directly to Firestore.
2. Upgrade dashboard recommendation scoring.
3. Add student alert preferences.
4. Add admin data health dashboard.
5. Add scholarship correction/report workflow.
6. Add guide pages for top scholarship categories.
7. Add sitemap entry for Scholarship Hub.

## Product rule

Accuracy beats quantity. A smaller verified active database is better than a large expired database.
