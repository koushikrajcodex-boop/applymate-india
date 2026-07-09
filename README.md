# ApplyMate India

**Production-focused scholarship finder, recommendation dashboard, admin system, and application tracker for Indian students.**

ApplyMate India helps students discover verified scholarships, check possible eligibility, save scholarships, compare options, prepare documents, plan applications, and track application progress.

This README is written as a progress report so a parent, mentor, teacher, or another AI tool can quickly understand what has been built and what still needs review.

---

## 1. Project summary

| Item | Details |
| --- | --- |
| Project name | ApplyMate India |
| Purpose | Help Indian students find and manage scholarship opportunities |
| Current stage | Phase 2 / production hardening in progress |
| Frontend | HTML, CSS, JavaScript modules |
| Backend services | Firebase Authentication and Cloud Firestore |
| Hosting | GitHub Pages |
| Repo owner | `koushikrajcodex-boop` |
| Live site | https://koushikrajcodex-boop.github.io/applymate-india/ |
| Main public directory | `scholarships.html` |
| Main admin page | `admin.html` |
| Link analyzer / scholarship import helper | `scholarship-discovery.html` |

---

## 2. Current progress status

| Area | Status | Notes |
| --- | --- | --- |
| Public homepage | Working | Public landing page and scholarship finder are present. |
| Login / Register | Working | Firebase Authentication is connected. |
| Student dashboard | Working | Uses Firestore-backed scholarship data. |
| Public scholarship directory | Working | `scholarships.html` is the canonical verified directory. |
| Scholarship recommendations | Implemented | Eligibility filtering is based on profile and scholarship fields. |
| Saved scholarships | Implemented | Students can save scholarships for later. |
| Application tracker | Implemented | Tracks application status such as Not Applied, Applied, Under Review, Approved, Rejected. |
| Scholarship comparison | Implemented / in progress | Comparison tools exist and should be tested with real records. |
| Document checklist | Implemented | Helps students plan required documents. |
| Admin panel | Implemented | Admin can add, edit, duplicate, publish, close, and delete scholarship records. |
| Bulk import assistant | Implemented | Parses pasted scholarship text and imports validated records. |
| Data health dashboard | Implemented | Checks duplicates, expired active records, missing links, weak verification, and incomplete data. |
| Link analyzer bot | Implemented, needs real-world testing | Tries to read official scholarship links and auto-fill the Add Scholarship format. Uses fallback pasted text when websites block reading. |
| Scholarship Radar Pro | Implemented | GitHub Actions scanner/report system for official sources and Firestore drafts/active records when secrets are configured. |
| Firestore rules | Updated in repo | Must be deployed separately to Firebase Console/CLI. |
| PWA / service worker | Implemented | Cache was bumped during bot/debug work. |
| CI checks | Implemented | Data quality and static checks exist through GitHub Actions. |

---

## 3. Main features completed

### Student-side features

- Firebase email/password login and registration.
- Student profile/dashboard.
- Firestore-backed scholarship recommendations.
- Scholarship search and filters.
- Saved scholarships / bookmark option.
- Application tracker with statuses:
  - Not Applied
  - Applied
  - Under Review
  - Approved
  - Rejected
- Scholarship comparison tools.
- Document checklist planner.
- Application roadmap planner.
- Apply-first priority planner.
- Responsive UI for mobile and desktop.

### Admin-side features

- Admin panel at `admin.html`.
- Add/edit scholarship form.
- Draft, active, and closed scholarship statuses.
- Active scholarships require verification fields before being accepted by Firestore rules.
- Bulk scholarship import assistant.
- Admin data health dashboard.
- Duplicate detection by normalized scholarship name and source URL.
- Expired active scholarship detection.
- Export backup as JSON.

### Automation / bot features

- `scholarship-discovery.html` is now a **Scholarship Link Analyzer**.
- It accepts an official scholarship URL.
- It tries to read the page and auto-fill the Add Scholarship format.
- If the site blocks reading or returns weak dynamic content, it asks the admin to paste official page/PDF text.
- It prevents low-quality extraction from being auto-published.
- It avoids using URLs as fake scholarship names or eligibility text.
- It classifies generated records as:
  - Auto Active
  - Auto Draft
  - Review
  - Duplicate
  - Expired

---

## 4. Important technical note about the Link Analyzer

The Link Analyzer works best with clean official scholarship detail pages or official PDF text.

Some government sites, especially dynamic/filter pages like NSP scheme filters, may not expose real scholarship text to browser JavaScript. In that case, the analyzer intentionally refuses to create a fake scholarship record and asks the admin to paste the official scheme text manually.

This is safer than blindly scraping and adding wrong data.

Example of weak link behavior:

```text
NSP filter/dynamic page detected → paste exact official scheme text/PDF text → Analyze Pasted Text → import draft/active after review
```

---

## 5. Scholarship data safety model

ApplyMate India uses a safety-first model:

1. Public students should only see verified active scholarships.
2. Uncertain or incomplete scholarships should be saved as drafts.
3. Duplicate records should be skipped.
4. Expired records should be closed or skipped.
5. Every active scholarship should have:
   - name
   - state
   - amount
   - deadline date
   - official link
   - source name
   - eligibility note
   - income note
   - verification metadata

---

## 6. Key project files

| File | Purpose |
| --- | --- |
| `index.html`, `script.js` | Public homepage and finder logic |
| `login.html`, `auth.js` | Firebase login/register |
| `dashboard.html`, `dashboard.js` | Student dashboard and recommendations |
| `scholarships.html` | Canonical public scholarship directory |
| `admin.html`, `admin.js` | Admin scholarship management |
| `scholarship-discovery.html` | Link Analyzer and official-text import helper |
| `scholarship-bots-panel.js` | Link analyzer extraction, parsing, classification, and import logic |
| `admin-health.html`, `admin-health.js` | Admin data quality dashboard |
| `states.js` | Shared Indian states/UT/National configuration |
| `scholarship-validator.js` | Scholarship validation logic |
| `scholarship-schema.js` | Scholarship schema helpers |
| `scholarship-verification.js` | Verified active scholarship checks |
| `firestore.rules` | Firestore security and validation rules |
| `tools/scholarship-radar.mjs` | Scholarship Radar Pro scanner/checker |
| `.github/workflows/scholarship-radar.yml` | Daily/manual radar workflow |
| `.github/workflows/data-quality.yml` | Data quality checks |
| `.github/workflows/static-checks.yml` | Static syntax/required-file checks |

---

## 7. Firebase setup needed

Firebase services used:

- Firebase Authentication
- Cloud Firestore
- Firebase security rules

Required Firebase setup:

1. Enable Email/Password login.
2. Add GitHub Pages domain to Firebase authorized domains.
3. Deploy `firestore.rules` to Firebase.
4. Ensure the admin account has admin permission.
5. If using GitHub Actions Firestore write automation, add this GitHub repository secret:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
```

Do not commit service-account keys to the repository.

---

## 8. Firestore rules note

The repo contains updated `firestore.rules`, but Firebase does not automatically use the repo file unless rules are deployed.

Deploy rules with Firebase CLI:

```bash
firebase deploy --only firestore:rules --project applymate-india
```

Or paste the rules manually in Firebase Console → Firestore Database → Rules → Publish.

---

## 9. GitHub Actions / automation

### Scholarship Radar Pro

The repository includes a workflow:

```text
.github/workflows/scholarship-radar.yml
```

It can:

- scan official scholarship sources listed in `data/scholarship-sources.json`
- create candidate reports
- skip duplicates
- skip expired records
- add safe active records to Firestore when configured
- add uncertain records as drafts
- close expired active scholarships

It requires `FIREBASE_SERVICE_ACCOUNT_JSON` to write to Firestore.

### Quality checks

The project also includes CI checks for:

- JavaScript/static file sanity
- required file presence
- data validation
- scholarship schema logic

---

## 10. How to test the project

### Test public user flow

1. Open the live site.
2. Register/login.
3. Complete or update student profile.
4. Open dashboard.
5. Check recommendations.
6. Save a scholarship.
7. Track an application.
8. Open public directory and test filters.

### Test admin flow

1. Open `admin.html`.
2. Login with admin account.
3. Add a scholarship as draft.
4. Add required verification fields.
5. Publish as active.
6. Confirm it appears in `scholarships.html`.
7. Open `admin-health.html` and check quality warnings.

### Test link analyzer flow

1. Open `scholarship-discovery.html`.
2. Paste a clean official scholarship detail URL.
3. Click `Fetch Link + Auto Fill Format`.
4. If blocked, paste official page/PDF text into fallback.
5. Click `Analyze Pasted Text`.
6. Review generated format.
7. Import as draft or active only if confidence is good.

---

## 11. Known limitations

- GitHub Pages is static hosting, so it cannot safely run private server-side crawling.
- Browser JavaScript may be blocked by CORS when trying to read government websites.
- NSP filter pages are dynamic and may not expose specific scholarship details directly.
- Link Analyzer should be treated as an assistant, not an authority.
- Final scholarship details must always be verified on the official portal before publishing.
- Firestore rules must be deployed separately after updating the repo.
- GitHub Actions Firestore writes require a correctly configured service-account secret.

---

## 12. Recommended next improvements

1. Add a Cloud Function or Firebase backend endpoint for safer server-side link extraction.
2. Add OCR/PDF parsing for official scholarship PDFs.
3. Add an admin approval queue for Link Analyzer drafts.
4. Add email or in-app deadline reminders.
5. Add logs showing who imported or edited each scholarship.
6. Add more automated tests for admin import and Link Analyzer parsing.
7. Add real scholarship seed data from official sources.
8. Improve SEO pages and scholarship guide pages for organic traffic.
9. Add user notification preferences.
10. Add analytics for most viewed/saved scholarships.

---

## 13. Suggested prompt for an AI reviewer

A parent, mentor, or reviewer can copy this prompt into another AI tool:

```text
Review this GitHub repository and evaluate the student's progress:

Repository: https://github.com/koushikrajcodex-boop/applymate-india
Live site: https://koushikrajcodex-boop.github.io/applymate-india/

Please check:
1. Whether the project idea is useful and realistic.
2. Whether the implementation matches the README progress report.
3. Whether Firebase Authentication and Firestore usage look correct.
4. Whether Firestore rules are safe.
5. Whether the admin panel and scholarship import flow are logically designed.
6. Whether the Link Analyzer is safe or likely to create wrong data.
7. What bugs, security issues, or production problems remain.
8. What the student should improve next.
9. Give a progress rating out of 10 for a B.Tech CSE student project.
```

---

## 14. Security notes

- The Firebase web API key is not a server secret, but it should still be restricted in Google Cloud/Firebase settings.
- Never commit Firebase service-account JSON or private keys.
- Admin writes must be protected by Firestore rules.
- Active scholarship records must include official source and verification metadata.
- Students should only be able to access their own profile, saved scholarships, and application records.
- Public scholarship data should be read-only for normal users.

---

## 15. Important notice

ApplyMate India is not an official scholarship portal. Scholarship rules, deadlines, income limits, and required documents may change. Always verify final details on the relevant official portal before applying.

---

## 16. Contact

Project maintainer: `koushikrajcodex@gmail.com`
