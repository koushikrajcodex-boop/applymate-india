# ApplyMate India

**A scholarship discovery, eligibility, comparison, saving, application-tracking, admin-management, and automated scholarship-data platform for Indian students.**

[![Project Status](https://img.shields.io/badge/status-Phase%202%20Automation%20Hardening-blue)](#current-project-status)
[![Frontend](https://img.shields.io/badge/frontend-HTML%20CSS%20JavaScript-orange)](#technology-stack)
[![Firebase](https://img.shields.io/badge/student%20backend-Firebase%20Auth%20%2B%20Firestore-yellow)](#firebase-and-secrets)
[![Public Data](https://img.shields.io/badge/public%20engine-Secretless%20JSON-success)](#secretless-public-scholarship-engine)
[![Automation](https://img.shields.io/badge/automation-GitHub%20Actions-black)](#current-automated-processes)
[![Hosting](https://img.shields.io/badge/hosting-GitHub%20Pages-black)](https://koushikrajcodex-boop.github.io/applymate-india/)

ApplyMate India helps students discover scholarships, check possible eligibility, compare opportunities, save useful schemes, and track application progress. It also provides protected admin tools and scheduled automation for finding, checking, reviewing, publishing, refreshing, and closing scholarship records.

> **Important:** ApplyMate India is a student-built MVP and is not an official scholarship portal. Students must verify eligibility, deadlines, documents, income limits, and application instructions on the official source before applying.

---

## Quick links

| Item | Link / file |
| --- | --- |
| Live website | https://koushikrajcodex-boop.github.io/applymate-india/ |
| Main scholarship directory | `scholarships.html` |
| Automatically generated directory | `public-scholarships.html` |
| Student dashboard | `dashboard.html` |
| Admin panel | `admin.html` |
| Admin data-health page | `admin-health.html` |
| Scholarship bot panel | `scholarship-bots-panel.html` |
| Link/discovery assistant | `scholarship-discovery.html` |
| Secretless engine documentation | `SECRETLESS-SCHOLARSHIP-ENGINE.md` |
| Scholarship Radar documentation | `SCHOLARSHIP_RADAR_PRO.md` |
| Project review summary | `AI_REVIEW_SUMMARY.md` |
| Roadmap and changelog | `PROJECT_ROADMAP.md` |
| Firestore security rules | `firestore.rules` |

---

## Current project status

**Current stage: Phase 2 — automation and production hardening.**

ApplyMate India is no longer only a static scholarship-list website. The repository now contains working student features, Firebase-backed private data, admin management, public JSON data, scheduled source discovery, optional Firestore synchronization, data-quality checks, and safety-first publishing rules.

| Area | Current state | Honest assessment |
| --- | --- | --- |
| Public website and responsive UI | Working | Main pages are available on GitHub Pages. |
| Firebase login and student data | Working | Authentication, profiles, saved items, and application tracking use Firebase. |
| Student scholarship tools | Working MVP | Recommendations, search, filters, comparison, saving, and tracking are implemented. |
| Admin management | Working MVP | CRUD, status management, analytics, backup export, and data-health tools are present. |
| Secretless public JSON engine | Operational | It updates public scholarship data without requiring Firebase credentials. |
| Scholarship discovery and radar | Operational, still hardening | Scheduled workflows run and generate reports, but source extraction quality needs continued improvement. |
| Optional Firestore automation | Available | Runs when the required Firebase service-account secret is configured. |
| CI and integrity checks | Active | JavaScript syntax, tests, dataset validation, rules regression, and repository integrity are checked. |
| Official production readiness | Not complete | More verified scheme-level data, stronger extraction, security verification, and end-to-end testing are required. |

### Latest observed operational snapshot

At the time of this README update:

- The secretless public feed was successfully generated with a confidence threshold of `85` and published records to `data/public-scholarships.json`.
- Scholarship Radar completed its latest scheduled scan, identified candidates, and safely held or skipped records that were duplicates, expired, incomplete, or review-only.
- The latest bulk-import process refreshed existing records and placed uncertain discoveries into drafts instead of auto-publishing them.
- Some draft discoveries contain irrelevant or weak search-result text. This noise is not considered production-ready and remains a current data-quality priority.

That distinction matters: **the automation is running, but automatic discovery is not yet trusted as a replacement for official verification or admin review.**

---

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML, CSS, JavaScript and JavaScript modules |
| Authentication | Firebase Authentication |
| Private/student database | Firebase Cloud Firestore |
| Public automated database | Version-controlled JSON in `data/` |
| Hosting | GitHub Pages |
| Scheduled automation | GitHub Actions |
| Automation runtime | Node.js |
| Validation | Custom schema, verification, integrity, and test scripts |
| Security | Firestore rules, admin authorization checks, and active/draft publishing controls |

---

## System architecture

ApplyMate currently uses two connected data paths.

### 1. Student and admin Firebase path

```text
Student or admin
→ Firebase Authentication
→ Firestore
→ profile, saved scholarships, applications, notifications, and managed scholarship records
```

Firebase remains necessary for private student data and protected admin operations.

### 2. Secretless public scholarship path

```text
Official/trusted source packs
→ scheduled GitHub Actions discovery
→ confidence and safety checks
→ data/public-scholarships.json
→ public-scholarships.html
```

This public path works with the repository's GitHub Actions token and does not require a Firebase service-account key.

Optional Firestore synchronization can run after public JSON generation when Firebase secrets are available.

---

## What students can do

- Register and log in with Firebase Authentication.
- Create and update an eligibility profile.
- Receive profile-based scholarship recommendations.
- Search and filter scholarship records.
- Save scholarships for later.
- Compare selected scholarships.
- Track application progress.
- View deadline-style notifications and alerts.
- Browse the normal scholarship directory.
- Browse the automatically generated public JSON directory.
- Use the site on mobile and desktop layouts.

### Eligibility profile fields

The recommendation flow can consider:

- State or national eligibility
- Course or education level
- Current year of study
- Category
- Gender
- Disability status
- Annual family income
- Percentage or CGPA
- Deadline status

### Application tracker statuses

- 🟢 Not Applied
- 🟡 Applied
- 🔵 Under Review
- ✅ Approved
- ❌ Rejected

---

## What admins can do

- Enter the protected admin area.
- View scholarship analytics.
- Add and edit scholarship records.
- Duplicate records for faster entry.
- Keep uncertain records as drafts.
- Publish verified records as active.
- Close expired records.
- Delete invalid records.
- Export scholarship data as JSON backup.
- Use a bulk-import assistant.
- Inspect data-quality warnings.
- Review bot discovery, import, duplicate, skipped, error, and tracker reports.

### Scholarship record fields

Admin and automation records can include:

- Scholarship name
- State and state label
- Status and application window
- Amount
- Income limit and income note
- Minimum percentage
- Deadline text and normalized deadline date
- Official application/source URL
- Education levels
- Categories
- Gender rules
- Disability rule
- Eligibility note
- Source name and source trust
- Verification date and last-checked date
- Confidence score, decision, and signals

---

## Current automated processes

The repository now has multiple GitHub Actions workflows rather than one single bot.

### Scholarship Auto Discovery

File:

```text
.github/workflows/scholarship-auto-discovery.yml
```

Schedule:

```text
Every day at 02:30 UTC
```

Process:

```text
run source discovery
→ update data/auto-discovered-scholarships.json
→ update legacy discovery output
→ commit changed feed data
```

### Bulk Scholarship Auto Import / Secretless Engine

File:

```text
.github/workflows/scholarship-bulk-auto-import.yml
```

Schedule:

```text
Every day at 02:45 UTC
```

Process:

```text
discover source pack
→ build secretless public JSON database
→ optionally sync to Firestore
→ optionally run Firestore tracker
→ commit public feed and reports
```

Default workflow settings:

```text
source_pack = all
max_import = 100
import_mode = auto_active
auto_publish_threshold = 85
```

### Scholarship Radar Pro

File:

```text
.github/workflows/scholarship-radar.yml
```

Schedule:

```text
Every day at 03:30 UTC
```

Process:

```text
scan configured official sources
→ inspect scholarship-like links and text
→ extract structured clues
→ score confidence and safety
→ skip duplicates and expired records
→ optionally write safe records to Firestore
→ commit radar reports
```

### CI, data-quality, and integrity workflows

The repository also runs checks for:

- JavaScript and inline-script syntax
- Scholarship validator tests
- Scholarship schema tests
- Live-count tests
- Open dataset validation
- Firestore-rule regression checks
- Repository integrity checks

Important workflow files include:

```text
.github/workflows/data-quality.yml
.github/workflows/static-checks.yml
.github/workflows/integrity-check.yml
```

---

## Secretless public scholarship engine

The no-secret engine generates:

```text
data/public-scholarships.json
```

The automatically updated public page reads that file directly:

```text
public-scholarships.html
```

A record can enter the public JSON active feed only when it passes the engine's trust, relevance, confidence, and expiry checks. Records below the required quality should be excluded from the public feed or retained for review.

### Why this architecture exists

GitHub Pages cannot safely store private backend credentials. The version-controlled public JSON engine allows scheduled public-data updates while keeping Firebase service-account credentials optional.

### What it does not replace

The secretless engine does not replace:

- Firebase Authentication
- Private student profiles
- Saved scholarships
- Application tracking
- Protected admin writes
- Final official-source verification

---

## Safety and publishing policy

ApplyMate uses active, draft, review, duplicate, expired, and skipped outcomes to reduce unsafe publishing.

### Public JSON rule

The secretless engine currently uses a default public threshold of `85`. A record should also be scholarship-related, non-expired, and from an official or trusted source.

### Radar rule

Scholarship Radar uses stricter decision bands:

- `autoActive`: strong official record with sufficient fields and confidence of at least `90`.
- `autoDraft`: usable official record with confidence of at least `70`, but not safe enough for automatic publication.
- `review`: incomplete or weak candidate.
- `skipDuplicate`: an equivalent name or source already exists.
- `skipExpired`: the detected deadline has passed.

### Current safety limitation

Search and portal extraction can still produce misleading titles, redirects, generic pages, incomplete deadlines, or unrelated result text. Low-confidence content must remain draft/review-only and should be cleaned before any production launch.

---

## Main files and folders

```text
applymate-india/
├── index.html
├── login.html
├── dashboard.html
├── scholarships.html
├── public-scholarships.html
├── admin.html
├── admin-health.html
├── scholarship-bots-panel.html
├── scholarship-discovery.html
├── auth.js
├── dashboard.js
├── admin.js
├── public-scholarship-loader.js
├── scholarship-bulk-import-dashboard.js
├── scholarship-validator.js
├── scholarship-verification.js
├── scholarship-schema.js
├── firestore.rules
├── data/
│   ├── public-scholarships.json
│   ├── auto-discovered-scholarships.json
│   ├── discovery-candidates.json
│   ├── radar-report.json
│   ├── bulk-import-report.json
│   ├── scholarship-ai-tracker-report.json
│   └── scholarship-sources.json
├── scripts/
│   ├── auto-discover-scholarships-v2.mjs
│   ├── build-public-scholarship-feed-v2.mjs
│   ├── bulk-import-discovered-scholarships-v2.mjs
│   ├── auto-track-scholarships-v2.mjs
│   └── check-integrity.mjs
├── tools/
│   ├── scholarship-radar.mjs
│   └── validate-scholarship-data.js
├── tests/
├── .github/workflows/
├── SECRETLESS-SCHOLARSHIP-ENGINE.md
├── SCHOLARSHIP_RADAR_PRO.md
├── AI_REVIEW_SUMMARY.md
└── PROJECT_ROADMAP.md
```

---

## Local development and checks

Clone and install:

```bash
git clone https://github.com/koushikrajcodex-boop/applymate-india.git
cd applymate-india
npm install
```

Run the automated tests:

```bash
npm test
```

Validate scholarship data:

```bash
npm run validate:data
```

Run selected automation locally:

```bash
npm run discover:scholarships
npm run public:scholarships
npm run radar
```

Start a simple local web server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Do not open every page directly through `file://`, because module scripts and JSON fetches may be blocked by browser security rules.

---

## Firebase and secrets

### Firebase required for the application

Firebase is required for:

- Email/password authentication
- Student profiles
- Saved scholarships
- Application tracker data
- Notifications stored in Firestore
- Protected admin scholarship management

Required setup:

1. Enable Email/Password authentication.
2. Add the GitHub Pages domain to Firebase authorized domains.
3. Deploy `firestore.rules`.
4. Configure the approved admin account or admin custom claim.
5. Restrict the Firebase web API key appropriately in Google Cloud/Firebase settings.

Deploy rules with Firebase CLI:

```bash
firebase deploy --only firestore:rules --project applymate-india
```

### Secrets optional for the public engine

The public JSON workflow does **not** require Firebase secrets.

### Secrets required for automated Firestore writes

Optional GitHub Actions Firestore synchronization requires:

```text
FIREBASE_SERVICE_ACCOUNT_JSON
FIREBASE_PROJECT_ID
```

Never commit a service-account JSON file, private key, or other server credential to the repository.

---

## How to test the main flows

### Public flow

1. Open the live homepage.
2. Open `scholarships.html` and test search/filter behavior.
3. Open `public-scholarships.html`.
4. Confirm the generated timestamp and scholarship count load from JSON.
5. Search the automatic directory.
6. Open official-source links and confirm they use a new tab.

### Student flow

1. Register or log in.
2. Complete the student profile.
3. Check personalized recommendations.
4. Search and filter results.
5. Save a scholarship.
6. Compare scholarships.
7. Update an application status.
8. Refresh and confirm saved data persists.

### Admin flow

1. Log in using an authorized admin account.
2. Check analytics.
3. Add a scholarship as draft.
4. Complete source and verification fields.
5. Publish it as active.
6. Confirm it appears in the intended student directory.
7. Edit, duplicate, close, and delete a test record.
8. Export a JSON backup.
9. Review `admin-health.html` warnings.

### Automation review flow

1. Open the GitHub Actions tab.
2. Review the latest discovery, bulk-import, and radar runs.
3. Inspect `data/public-scholarships.json`.
4. Inspect `data/bulk-import-report.json`.
5. Inspect `data/radar-report.json`.
6. Confirm irrelevant records were not automatically published.
7. Review draft and skipped reasons before approving any candidate.

---

## Known limitations

- GitHub Pages is static hosting and cannot safely execute private server-side crawling.
- Government portals may block browser or workflow requests, use dynamic rendering, or expose incomplete HTML.
- CORS restrictions can prevent browser-based link analysis.
- Search-result redirects can produce generic or irrelevant candidate titles.
- The current bulk-discovery feed can create noisy draft records that require cleanup.
- A placeholder date such as `2099-12-31` means the real deadline was not confidently extracted and must not be treated as an actual deadline.
- Portal-level entries are not always the same as verified individual scholarship schemes.
- Firestore rules stored in the repository do not take effect until separately deployed.
- The link analyzer and automation reports are assistants, not official authorities.
- Scholarship information can change after the latest automated check.

---

## Next priorities

1. Strengthen discovery filtering so unrelated search results never enter the draft collection.
2. Prefer direct official scheme pages over portal homepages and search redirects.
3. Add an admin review queue with approve, reject, merge, and correction actions.
4. Improve deadline extraction and remove misleading placeholder behavior from student-facing views.
5. Add scheme-level document checklists and stronger deadline reminders.
6. Add audit logs for admin and automated changes.
7. Expand end-to-end tests for login, dashboard, admin, public JSON, and workflow reports.
8. Complete Firebase rules deployment and security verification.
9. Add architecture screenshots, UI screenshots, and a short demo video.
10. Move advanced extraction to a controlled backend or Cloud Function when needed.

---

## Suggested reviewer prompt

```text
Review ApplyMate India as a B.Tech CSE student software project.

Repository: https://github.com/koushikrajcodex-boop/applymate-india
Live site: https://koushikrajcodex-boop.github.io/applymate-india/

Evaluate:
1. Usefulness for Indian students.
2. Student and admin feature quality.
3. Firebase Authentication and Firestore safety.
4. Secretless public JSON architecture.
5. GitHub Actions automation and publishing safety.
6. Current discovery-data quality and false-positive risk.
7. Firestore security rules.
8. Testing and production-readiness gaps.
9. Whether the README accurately matches the repository.
10. Recommended next steps and an honest rating out of 10.
```

---

## Security notes

- Firebase web configuration is client-visible by design, but API restrictions and Firestore rules are still essential.
- Private service-account credentials must never be committed.
- Normal users must not be able to perform admin writes.
- Students should only access their own private profile, saved, and application records.
- Public scholarship data should remain read-only for normal users.
- Every active scholarship should retain an official source and verification metadata.
- Automated confidence scores are decision aids, not factual guarantees.

---

## Important notice

ApplyMate India is not affiliated with the Government of India, National Scholarship Portal, AICTE, UGC, state scholarship portals, or private scholarship providers unless explicitly stated. Scholarship rules and availability can change. Always verify final information on the relevant official website.

---

## Contact

Project maintainer: `koushikrajcodex@gmail.com`
