# ApplyMate India

**Scholarship finder, personalized recommendation dashboard, admin management system, AI scholarship import assistant, and application tracker for Indian students.**

[![Project Status](https://img.shields.io/badge/status-Phase%202%20Production%20Hardening-blue)](#current-completion)
[![Frontend](https://img.shields.io/badge/frontend-HTML%20CSS%20JavaScript-orange)](#technology-stack)
[![Firebase](https://img.shields.io/badge/backend-Firebase%20Auth%20%2B%20Firestore-yellow)](#firebase-setup-needed)
[![Hosting](https://img.shields.io/badge/hosting-GitHub%20Pages-black)](https://koushikrajcodex-boop.github.io/applymate-india/)
[![AI Review Ready](https://img.shields.io/badge/AI%20Review-Ready-success)](AI_REVIEW_SUMMARY.md)

ApplyMate India helps students discover verified scholarships, check possible eligibility, save scholarships, compare schemes, plan applications, and track application progress. It also includes admin tools for maintaining scholarship data safely.

> **Reviewer note:** This repository is documented so a parent, teacher, mentor, or AI reviewer can quickly understand the full current project status.

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
| Parent / AI review summary | `AI_REVIEW_SUMMARY.md` |
| Roadmap and changelog | `PROJECT_ROADMAP.md` |
| Firestore rules | `firestore.rules` |

---

## Current completion

| Area | Completion | Status |
| --- | --- | --- |
| Frontend / UI | 95% | Core pages and responsive layout are present. |
| Student features | 90% | Profile, recommendations, saved scholarships, comparison, and tracker are implemented. |
| Admin panel | 90% | Add/edit/publish/close/delete/export and bulk assistant are implemented. |
| Firebase integration | 85% | Auth and Firestore are used; rules must be deployed separately. |
| AI / automation bot | 75% | Bot panel, reports, scanner workflow, and tracker flow exist; needs more real-world source testing. |
| Production readiness | 70% | Strong prototype/MVP; needs more official data, tests, backend extraction, and final security review. |

### Honest status

ApplyMate India is **not just a basic static website**. It is a working student project with authentication, Firestore data, student tools, admin tools, validation logic, and AI/bot-assisted scholarship import workflows.

At the same time, it should still be treated as a **student MVP / Phase 2 project**, not a finished official scholarship portal.

---

## Project summary

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

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript |
| Auth | Firebase Authentication |
| Database | Firebase Cloud Firestore |
| Hosting | GitHub Pages |
| Automation | GitHub Actions |
| Validation | Custom JavaScript schema/verification helpers |
| Security | Firestore rules + admin checks |

---

## What the project currently does

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

Admin can:

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

## Completed features

### Student features

- Firebase email/password login and registration.
- Student dashboard.
- Profile form with eligibility fields.
- Personalized scholarship recommendations.
- Search and filters.
- Saved scholarships.
- Scholarship comparison.
- Application tracker with five statuses.
- Notification center UI.
- Mobile-friendly layout.

### Admin features

- Protected admin panel.
- Admin analytics cards.
- Add/edit scholarship form.
- Draft, active, and closed states.
- Duplicate scholarship action.
- Publish/close/delete management flow.
- Bulk scholarship import assistant.
- Export JSON backup.
- Session activity log.
- Admin data health page.

### AI / automation features

- AI Scholarship Bot dashboard.
- Import report UI.
- Discovery feed UI.
- Source pack display.
- Skipped/duplicate/error report sections.
- Automatic active scholarship tracker report UI.
- GitHub Actions workflow for scholarship radar/scanning.
- Safety-first draft/active model.

---

## In progress

- More real official scholarship seed data.
- Stronger real-world testing for government portals and dynamic pages.
- Better deadline reminder system.
- More automated tests for admin and bot workflows.
- Final Firebase security deployment check.
- More SEO guide pages and content depth.

---

## Planned improvements

- Firebase Cloud Function for safer server-side scholarship extraction.
- OCR/PDF parsing for official scholarship PDFs.
- Admin approval queue for AI/imported drafts.
- Email or in-app deadline reminders.
- Audit logs showing who edited/imported scholarship records.
- Analytics for most viewed/saved scholarships.
- More screenshots/GIFs in README after UI is finalized.

---

## Main student features

### Student profile

The dashboard collects:

- State
- Course / education level
- Current year of study
- Category
- Gender
- Disability status
- Annual family income
- Percentage / CGPA

### Personalized recommendations

After profile completion, the dashboard recommends scholarships using profile-based matching.

Matching considers:

- State / national eligibility
- Education/course level
- Category
- Gender
- Disability rule
- Income limit
- Percentage/CGPA requirement
- Deadline status

### Search and filters

Students can search recommended scholarships by name, portal, eligibility text, or state.

Filters include:

- State
- Course / education
- Category
- Gender
- Disability
- Deadline status

### Application tracker

Students can manually track each scholarship application with these statuses:

- 🟢 Not Applied
- 🟡 Applied
- 🔵 Under Review
- ✅ Approved
- ❌ Rejected

---

## Main admin features

### Admin access control

The admin panel is protected. Admin access works with Firebase custom claim `admin == true` or the approved admin email configured in the project.

### Admin analytics

The admin dashboard shows:

- Total scholarships
- Active / published scholarships
- Draft scholarships
- Closed scholarships
- National scholarships
- State scholarships
- Scholarships with deadline date
- Firestore source count

### Add / edit scholarship

Admin can create and update records with:

- Scholarship name
- State
- Publish status
- Amount
- Max income limit
- Minimum percentage
- Deadline text/date
- Official link
- Education levels
- Categories
- Genders
- Disability rule
- Eligibility note
- Income note
- Priority score
- Source name

### Publish safety

Active scholarships should include official link, source name, deadline date, eligibility note, income note, and verification metadata before being shown to students.

---

## AI scholarship bot and automation

The project includes a dedicated AI scholarship bot panel:

```text
scholarship-bots-panel.html
```

Bot workflow:

```text
Discover official/trusted sources
→ Score confidence and trust
→ Import as active or review draft
→ Track expired records
→ Report results through dashboard and JSON logs
```

The bot is designed to avoid blindly publishing weak data. If a source is blocked, dynamic, incomplete, duplicated, or expired, the record should be skipped or saved as a review draft.

---

## Folder / file structure overview

```text
applymate-india/
├── index.html                         # Public homepage
├── login.html                         # Login/register page
├── dashboard.html                     # Student dashboard
├── scholarships.html                  # Public scholarship directory
├── admin.html                         # Admin scholarship management
├── admin-health.html                  # Data quality dashboard
├── scholarship-bots-panel.html        # AI bot/import tracker dashboard
├── scholarship-discovery.html         # Link analyzer / import helper
├── script.js                          # Public page logic
├── auth.js                            # Firebase auth logic
├── dashboard.js                       # Student dashboard logic
├── admin.js                           # Admin CRUD logic
├── scholarship-bulk-import-dashboard.js
├── scholarship-validator.js
├── scholarship-verification.js
├── scholarship-schema.js
├── states.js
├── firestore.rules                    # Firestore security rules
├── tools/
│   └── scholarship-radar.mjs          # Scholarship radar automation tool
├── data/
│   └── scholarship-sources.json       # Source list for radar/scanner
├── .github/workflows/
│   ├── scholarship-radar.yml
│   ├── data-quality.yml
│   └── static-checks.yml
├── AI_REVIEW_SUMMARY.md
└── PROJECT_ROADMAP.md
```

---

## Firebase setup needed

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

## Firestore rules note

The repo contains updated `firestore.rules`, but Firebase does not automatically use the repo file unless rules are deployed.

Deploy rules with Firebase CLI:

```bash
firebase deploy --only firestore:rules --project applymate-india
```

Or paste the rules manually in Firebase Console → Firestore Database → Rules → Publish.

---

## How to test the project

### Public user flow

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

### Admin flow

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

### Bot flow

1. Open `scholarship-bots-panel.html`.
2. Review the latest AI import report.
3. Check source packs.
4. Open discovery feed.
5. Review imported/refreshed records.
6. Check skipped/duplicate records.
7. Check bot errors.
8. Open tracker report.

---

## Known limitations

- GitHub Pages is static hosting, so it cannot safely run private server-side crawling.
- Browser JavaScript may be blocked by CORS when trying to read government websites.
- NSP filter pages are dynamic and may not expose specific scholarship details directly.
- The Link Analyzer should be treated as an assistant, not an authority.
- Final scholarship details must always be verified on the official portal before publishing.
- Firestore rules must be deployed separately after updating the repo.
- GitHub Actions Firestore writes require a correctly configured service-account secret.
- Some automation may only generate reports unless Firebase secrets are configured.

---

## Suggested AI reviewer prompt

```text
Review this GitHub repository and live site as a B.Tech CSE student software project.

Repository: https://github.com/koushikrajcodex-boop/applymate-india
Live site: https://koushikrajcodex-boop.github.io/applymate-india/

Evaluate:
1. Whether the project idea is useful and realistic for Indian students.
2. Whether student features are clear and working.
3. Whether admin features are logically designed.
4. Whether Firebase Authentication and Firestore usage look safe.
5. Whether Firestore rules protect private and admin data.
6. Whether the AI scholarship bot/import workflow is safe or risky.
7. Whether the README accurately describes the code.
8. What bugs/security risks remain.
9. What should be improved next.
10. Give a rating out of 10.
```

---

## Security notes

- The Firebase web API key is not a server secret, but it should still be restricted in Google Cloud/Firebase settings.
- Never commit Firebase service-account JSON or private keys.
- Admin writes must be protected by Firestore rules.
- Active scholarship records must include official source and verification metadata.
- Students should only be able to access their own profile, saved scholarships, and application records.
- Public scholarship data should be read-only for normal users.

---

## Important notice

ApplyMate India is not an official scholarship portal. Scholarship rules, deadlines, income limits, and required documents may change. Always verify final details on the relevant official portal before applying.

---

## Contact

Project maintainer: `koushikrajcodex@gmail.com`
