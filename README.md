# ApplyMate India

**Production-focused scholarship finder, personalized recommendation dashboard, admin management system, AI scholarship import assistant, and application tracker for Indian students.**

ApplyMate India helps students discover verified scholarships, check possible eligibility, save scholarships, compare schemes, prepare documents, plan applications, and track application progress. It also includes admin tools for maintaining scholarship data safely.

> **Reviewer note:** This README is intentionally written so a parent, teacher, mentor, or another AI tool can review the repository link and quickly understand the full current project status.

---

## Quick review links

| Item | Link / File |
| --- | --- |
| GitHub repository | https://github.com/koushikrajcodex-boop/applymate-india |
| Live site | https://koushikrajcodex-boop.github.io/applymate-india/ |
| Student dashboard | `dashboard.html` |
| Public scholarship directory | `scholarships.html` |
| Admin panel | `admin.html` |
| AI scholarship bot panel | `scholarship-bots-panel.html` |
| Admin data health page | `admin-health.html` |
| AI/parent review summary | `AI_REVIEW_SUMMARY.md` |
| Firestore rules | `firestore.rules` |

---

## 1. Project summary

| Item | Details |
| --- | --- |
| Project name | ApplyMate India |
| Purpose | Help Indian students find, compare, save, and track scholarships |
| Current stage | Phase 2 / production hardening in progress |
| Frontend | HTML, CSS, JavaScript modules |
| Backend services | Firebase Authentication and Cloud Firestore |
| Hosting | GitHub Pages |
| Repo owner | `koushikrajcodex-boop` |
| Main public page | `scholarships.html` |
| Main student page | `dashboard.html` |
| Main admin page | `admin.html` |
| Bot/automation page | `scholarship-bots-panel.html` |

---

## 2. What the project currently does

ApplyMate India has two main sides:

### Student side

Students can:

- Register and log in using Firebase Authentication.
- Create/update a student profile.
- Get personalized scholarship recommendations.
- Search and filter scholarships.
- Save scholarships for later.
- Compare scholarships.
- Track scholarship application status.
- View notifications and deadline-style alerts.
- Use the site on mobile and desktop.

### Admin side

The admin can:

- Log in to a protected admin area.
- View live scholarship analytics.
- Add new scholarships.
- Edit existing scholarships.
- Duplicate scholarship records.
- Publish scholarships as active.
- Keep uncertain scholarships as drafts.
- Close expired scholarships.
- Delete invalid records.
- Export scholarship backup data as JSON.
- Use a bulk import assistant.
- Open a data health dashboard to detect weak records.
- Use the AI scholarship bot panel for discovery/import reports.

---

## 3. Current progress status

| Area | Status | Notes |
| --- | --- | --- |
| Public homepage | Working | Public landing page and scholarship finder are present. |
| Login / Register | Working | Firebase Authentication is connected. |
| Student dashboard | Working | Uses Firestore-backed scholarship data. |
| Student profile | Working | Captures state, course, category, gender, income, percentage/CGPA, and disability status. |
| Public scholarship directory | Working | `scholarships.html` is the canonical verified directory. |
| Personalized recommendations | Implemented | Eligibility filtering is based on student profile and scholarship fields. |
| Search and filters | Implemented | Filters include state, education/course, category, gender, disability, and deadline status. |
| Saved scholarships | Implemented | Students can save scholarships for later. |
| Application tracker | Implemented | Tracks Not Applied, Applied, Under Review, Approved, and Rejected. |
| Scholarship comparison | Implemented / needs real-data testing | Comparison tools exist and should be tested with real scholarship records. |
| Notification center | Implemented / in progress | Dashboard includes notification UI for profile, saved scholarship, tracker, and deadline alerts. |
| Document checklist | Implemented | Helps students plan required documents. |
| Admin panel | Implemented | Admin can add, edit, duplicate, publish, close, delete, and export records. |
| Bulk import assistant | Implemented | Parses pasted scholarship text and imports validated records. |
| Admin data health dashboard | Implemented | Checks duplicates, expired active records, missing links, weak verification, and incomplete data. |
| AI Scholarship Bot panel | Implemented | Shows import reports, tracker reports, discovery feed, source packs, skipped records, and errors. |
| Link analyzer / discovery helper | Implemented, needs real-world testing | Attempts to analyze official scholarship links and falls back to pasted official text when blocked. |
| Scholarship Radar Pro | Implemented | GitHub Actions scanner/report system for official sources and Firestore drafts/active records when secrets are configured. |
| Firestore rules | Updated in repo | Must be deployed separately to Firebase Console/CLI. |
| PWA / service worker | Implemented | Cache versioning exists for browser updates. |
| CI checks | Implemented | Data quality and static checks exist through GitHub Actions. |

---

## 4. Main student features

### 4.1 Authentication

- Email/password login and registration through Firebase Authentication.
- Student pages check login state.
- Logout support.

### 4.2 Student profile

The dashboard collects important eligibility fields:

- State
- Course / education level
- Current year of study
- Category
- Gender
- Disability status
- Annual family income
- Percentage / CGPA

These fields are used to decide which scholarships may match the student.

### 4.3 Personalized scholarship recommendations

After profile completion, the dashboard automatically recommends scholarships using profile-based matching.

Matching considers:

- State / national eligibility
- Education/course level
- Category
- Gender
- Disability rule
- Income limit
- Percentage/CGPA requirement
- Deadline status

### 4.4 Search and filters

Students can search recommended scholarships by name, portal, eligibility text, or state.

Filters include:

- State
- Course / education
- Category
- Gender
- Disability
- Deadline status

### 4.5 Saved scholarships

Students can save scholarships they want to apply for later.

### 4.6 Application tracker

Students can manually track each scholarship application with these statuses:

- 🟢 Not Applied
- 🟡 Applied
- 🔵 Under Review
- ✅ Approved
- ❌ Rejected

### 4.7 Scholarship comparison

Students can select scholarships and compare eligibility, income limits, deadline, and official portal link.

---

## 5. Main admin features

### 5.1 Admin access control

The admin panel is protected. Admin access works with Firebase custom claim `admin == true` or the approved admin email configured in the project.

### 5.2 Admin analytics

The admin dashboard shows live overview numbers such as:

- Total scholarships
- Active / published scholarships
- Draft scholarships
- Closed scholarships
- National scholarships
- State scholarships
- Scholarships with deadline date
- Firestore source count

### 5.3 Add / edit scholarship

The admin can create and update scholarship records with fields such as:

- Scholarship name
- State
- Publish status
- Amount
- Max income limit
- Minimum percentage
- Deadline text
- Deadline date
- Official link
- Education levels
- Categories
- Genders
- Disability rule
- Eligibility note
- Income note
- Priority score
- Source name

### 5.4 Publish safety

Active scholarships require important verification fields before being accepted:

- Official link
- Source name
- Deadline date
- Eligibility note
- Income note
- Verification metadata

This prevents weak or fake records from being shown to students as active.

### 5.5 Manage scholarships

Admin can:

- Search records
- Filter by state
- Filter by status
- Edit records
- Duplicate records
- Publish records
- Close records
- Delete records

### 5.6 Bulk import assistant

Admin can paste multiple scholarship records separated by `---`, preview extracted fields, and import them after validation.

### 5.7 Backup export

Admin can export current Firestore scholarship records as JSON.

### 5.8 Session activity log

The admin page shows actions completed in the current session.

---

## 6. AI scholarship bot and automation features

The project includes a dedicated AI scholarship bot panel at:

```text
scholarship-bots-panel.html
```

The bot panel is designed to help with automatic scholarship discovery, safe import, tracking, and reporting.

### Bot workflow

```text
Discover official/trusted sources
→ Score confidence and trust
→ Import as active or review draft
→ Track expired records
→ Report results through dashboard and JSON logs
```

### Bot panel shows

- Latest AI import report
- Generated report time
- Import mode
- Added records
- Refreshed / duplicate records
- Skipped records
- Failed records
- Active candidates
- Review drafts
- Firebase secret status
- Source packs
- Discovery feed
- Imported/refreshed records
- Skipped/duplicate records
- Bot errors

### Automatic active scholarship tracker

The tracker is designed to:

- Check Firestore scholarship records.
- Promote safe drafts when confidence is high.
- Flag weak records for review.
- Close expired scholarships.
- Show tracker reports in the bot panel.

### Important bot safety rule

The bot should not blindly publish data. If a source is weak, blocked, dynamic, incomplete, duplicated, or expired, it should skip the record or save it as a review draft instead of showing it to students as active.

---

## 7. Link analyzer / discovery helper

The Link Analyzer works best with clean official scholarship detail pages or official PDF text.

Some government sites, especially dynamic/filter pages like NSP scheme filters, may not expose real scholarship text to browser JavaScript. In that case, the analyzer intentionally refuses to create a fake scholarship record and asks the admin to paste the official scheme text manually.

This is safer than blindly scraping and adding wrong data.

Example:

```text
NSP filter/dynamic page detected
→ paste exact official scheme text/PDF text
→ Analyze Pasted Text
→ import draft/active after review
```

---

## 8. Scholarship data safety model

ApplyMate India uses a safety-first model:

1. Public students should only see verified active scholarships.
2. Uncertain or incomplete scholarships should be saved as drafts.
3. Duplicate records should be skipped or refreshed.
4. Expired records should be closed or skipped.
5. Every active scholarship should have official source information.
6. Final scholarship details must still be verified on the official portal before applying.

Every active scholarship should include:

- Name
- State
- Amount
- Deadline date
- Official link
- Source name
- Eligibility note
- Income note
- Verification metadata

---

## 9. Key project files

| File | Purpose |
| --- | --- |
| `index.html`, `script.js` | Public homepage and finder logic |
| `login.html`, `auth.js` | Firebase login/register |
| `dashboard.html`, `dashboard.js` | Student dashboard, recommendations, saved scholarships, comparison, and tracker |
| `scholarships.html` | Canonical public scholarship directory |
| `admin.html`, `admin.js` | Admin scholarship management |
| `admin.css` | Admin UI styling |
| `admin-health.html`, `admin-health.js` | Admin data quality dashboard |
| `scholarship-bots-panel.html` | AI bot report and tracker dashboard |
| `scholarship-bulk-import-dashboard.js` | Bot panel report rendering logic |
| `scholarship-discovery.html` | Link analyzer and official-text import helper |
| `scholarship-bots-panel.js` | Link analyzer extraction, parsing, classification, and import logic |
| `states.js` | Shared Indian states/UT/National configuration |
| `scholarship-validator.js` | Scholarship validation logic |
| `scholarship-schema.js` | Scholarship schema helpers |
| `scholarship-verification.js` | Verified active scholarship checks |
| `firestore.rules` | Firestore security and validation rules |
| `tools/scholarship-radar.mjs` | Scholarship Radar Pro scanner/checker |
| `.github/workflows/scholarship-radar.yml` | Daily/manual radar workflow |
| `.github/workflows/data-quality.yml` | Data quality checks |
| `.github/workflows/static-checks.yml` | Static syntax/required-file checks |
| `AI_REVIEW_SUMMARY.md` | Simple review guide for parent/mentor/AI reviewer |

---

## 10. Firebase setup needed

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

## 11. Firestore rules note

The repo contains updated `firestore.rules`, but Firebase does not automatically use the repo file unless rules are deployed.

Deploy rules with Firebase CLI:

```bash
firebase deploy --only firestore:rules --project applymate-india
```

Or paste the rules manually in Firebase Console → Firestore Database → Rules → Publish.

---

## 12. GitHub Actions / automation

### Scholarship Radar Pro

The repository includes a workflow:

```text
.github/workflows/scholarship-radar.yml
```

It can:

- Scan official scholarship sources listed in `data/scholarship-sources.json`.
- Create candidate reports.
- Skip duplicates.
- Skip expired records.
- Add safe active records to Firestore when configured.
- Add uncertain records as drafts.
- Close expired active scholarships.

It requires `FIREBASE_SERVICE_ACCOUNT_JSON` to write to Firestore.

### Quality checks

The project also includes CI checks for:

- JavaScript/static file sanity
- Required file presence
- Data validation
- Scholarship schema logic

---

## 13. How to test the project

### Test public user flow

1. Open the live site.
2. Register/login.
3. Complete or update student profile.
4. Open dashboard.
5. Check recommendations.
6. Use search and filters.
7. Save a scholarship.
8. Compare scholarships.
9. Track an application.
10. Open public directory and test filters.

### Test admin flow

1. Open `admin.html`.
2. Login with admin account.
3. Check admin analytics.
4. Add a scholarship as draft.
5. Add required verification fields.
6. Publish as active.
7. Confirm it appears in `scholarships.html`.
8. Duplicate/edit/close a test record.
9. Export JSON backup.
10. Open `admin-health.html` and check quality warnings.

### Test bot flow

1. Open `scholarship-bots-panel.html`.
2. Review the latest AI import report.
3. Check source packs.
4. Open discovery feed.
5. Review imported/refreshed records.
6. Check skipped/duplicate records.
7. Check bot errors.
8. Open tracker report.

### Test link analyzer flow

1. Open `scholarship-discovery.html`.
2. Paste a clean official scholarship detail URL.
3. Click `Fetch Link + Auto Fill Format`.
4. If blocked, paste official page/PDF text into fallback.
5. Click `Analyze Pasted Text`.
6. Review generated format.
7. Import as draft or active only if confidence is good.

---

## 14. Known limitations

- GitHub Pages is static hosting, so it cannot safely run private server-side crawling.
- Browser JavaScript may be blocked by CORS when trying to read government websites.
- NSP filter pages are dynamic and may not expose specific scholarship details directly.
- The Link Analyzer should be treated as an assistant, not an authority.
- Final scholarship details must always be verified on the official portal before publishing.
- Firestore rules must be deployed separately after updating the repo.
- GitHub Actions Firestore writes require a correctly configured service-account secret.
- Some automation may only generate reports unless Firebase secrets are configured.

---

## 15. Recommended next improvements

1. Add a Cloud Function or Firebase backend endpoint for safer server-side link extraction.
2. Add OCR/PDF parsing for official scholarship PDFs.
3. Add an admin approval queue for Link Analyzer drafts.
4. Add real email or in-app deadline reminders.
5. Add logs showing who imported or edited each scholarship.
6. Add more automated tests for admin import and Link Analyzer parsing.
7. Add more real scholarship seed data from official sources.
8. Improve SEO pages and scholarship guide pages for organic traffic.
9. Add user notification preferences.
10. Add analytics for most viewed/saved scholarships.

---

## 16. Suggested prompt for an AI reviewer

A parent, mentor, or reviewer can copy this prompt into another AI tool:

```text
Review this GitHub repository and evaluate the student's progress:

Repository: https://github.com/koushikrajcodex-boop/applymate-india
Live site: https://koushikrajcodex-boop.github.io/applymate-india/

Please check:
1. Whether the project idea is useful and realistic for Indian students.
2. Whether the implementation matches the README progress report.
3. Whether Firebase Authentication and Firestore usage look correct.
4. Whether Firestore rules are safe.
5. Whether the student dashboard, recommendations, saved scholarships, comparison, and tracker are logically designed.
6. Whether the admin panel can safely add/edit/publish/close scholarship records.
7. Whether the AI Scholarship Bot and Link Analyzer are safe or likely to create wrong data.
8. What bugs, security issues, or production problems remain.
9. What the student should improve next.
10. Give a progress rating out of 10 for a B.Tech CSE student project.
```

---

## 17. Security notes

- The Firebase web API key is not a server secret, but it should still be restricted in Google Cloud/Firebase settings.
- Never commit Firebase service-account JSON or private keys.
- Admin writes must be protected by Firestore rules.
- Active scholarship records must include official source and verification metadata.
- Students should only be able to access their own profile, saved scholarships, and application records.
- Public scholarship data should be read-only for normal users.

---

## 18. Important notice

ApplyMate India is not an official scholarship portal. Scholarship rules, deadlines, income limits, and required documents may change. Always verify final details on the relevant official portal before applying.

---

## 19. Contact

Project maintainer: `koushikrajcodex@gmail.com`
